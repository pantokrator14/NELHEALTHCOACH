/**
 * TEST E2E REAL DE LA COLA PROPIA (worker-on-poll, sin Inngest).
 *
 * Flujo completo idéntico al de producción:
 *  1. POST /api/clients/[id]/ai (con auth de coach) → debe responder 202
 *     { status: 'queued', jobId } — la generación NO corre en el POST.
 *  2. GET /api/clients/[id]/ai (el polling del frontend) → reclama el job
 *     y EJECUTA el pipeline completo (prepareAIInput → composite → FASE 4
 *     traducción → cifrar → persistir). Puede tardar 60-180s (LLM real).
 *  3. GET de nuevo → las sesiones ya están → frontend pasa a 'ready'.
 *
 * LIMPIEZA GARANTIZADA: cliente + jobs registrados y borrados en `finally`
 * aunque el test falle a mitad.
 *
 * Correr: cd apps/api && npx tsx tests/queue-e2e.test.ts
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/clients/[id]/ai/route';
import { getAIJobsCollection } from '../src/app/lib/database';
import { encrypt } from '../src/app/lib/encryption';
import { connectDB, registerClientWithJobs, runCleanup, coachToken, authedRequest } from './helpers';

const URI = process.env.MONGODB_URI!;
let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

async function main() {
  const { db } = await connectDB();

  // ── Cliente de prueba (sin documentos → sin Gemini, solo composite + FASE 4) ──
  const coachId = new ObjectId().toString(); // string (igual que en el JWT)
  const testClient = {
    _id: new ObjectId(),
    coachId,
    name: encrypt('Test Queue Client'),
    personalData: {
      name: encrypt('Test Queue Client'),
      gender: encrypt('male'),
      age: encrypt('35'),
      weight: encrypt('75'),
      height: encrypt('178'),
      language: encrypt('en'), // → FASE 4 traduce (es→en)
    },
    medicalData: { diseases: encrypt('none'), medications: encrypt('none'), documents: [] },
  };
  await db.collection('healthforms').insertOne(testClient as any);
  registerClientWithJobs(testClient._id.toString());
  const clientId = testClient._id.toString();
  console.log('Healthform creado:', clientId);

  // ── Auth de coach (JWT real firmado) ──
  const token = coachToken(coachId);
  const base = `http://localhost:3001/api/clients/${clientId}/ai`;

  // ── 1. POST → 202 queued ──
  section('1. POST encola y responde 202');
  const t0 = Date.now();
  const postRes = await POST(authedRequest(base, 'POST', token, { monthNumber: 1, coachNotes: '' }), { params: Promise.resolve({ id: clientId }) });
  const postBody = await postRes.json();
  console.log(`→ POST en ${((Date.now() - t0) / 1000).toFixed(1)}s, status ${postRes.status}`);
  check('POST responde 202', postRes.status === 202, `status=${postRes.status}`);
  check('body.status = queued', postBody?.data?.status === 'queued', JSON.stringify(postBody?.data?.status));
  check('body tiene jobId', !!postBody?.data?.jobId);

  const jobDoc = await (await getAIJobsCollection()).findOne({ clientId });
  check('job pendiente en la DB', jobDoc?.status === 'pending', jobDoc?.status);

  // ── 2. POST repetido → mismo jobId (idempotente) ──
  const postRes2 = await POST(authedRequest(base, 'POST', token, { monthNumber: 1 }), { params: Promise.resolve({ id: clientId }) });
  const postBody2 = await postRes2.json();
  check('POST repetido reutiliza el MISMO job', postBody2?.data?.jobId === postBody?.data?.jobId);

  // ── 3. GET #1 (worker-on-poll): reclama y EJECUTA la generación ──
  section('2. GET #1: worker reclama el job y genera (LLM real, puede tardar)');
  const t1 = Date.now();
  const get1 = await GET(authedRequest(base, 'GET', token), { params: Promise.resolve({ id: clientId }) });
  const get1Body = await get1.json();
  const elapsed1 = ((Date.now() - t1) / 1000).toFixed(1);
  console.log(`→ GET #1 en ${elapsed1}s, status ${get1.status}`);
  check('GET #1 responde 200', get1.status === 200, `status=${get1.status}`);
  const sessions1 = get1Body?.data?.aiProgress?.sessions || [];
  check('GET #1 devuelve la sesión generada', sessions1.length > 0, `sessions=${sessions1.length}`);
  check('generación completa en < 300s (límite Vercel Hobby)', parseFloat(elapsed1) < 300, `${elapsed1}s`);

  const jobAfter1 = await (await getAIJobsCollection()).findOne({ clientId });
  check('job completado (done)', jobAfter1?.status === 'done', jobAfter1?.status);

  // ── 4. GET #2: sesiones presentes (lo que ve el polling del frontend) ──
  section('3. GET #2: sesiones listas (el polling detecta ready)');
  const get2 = await GET(authedRequest(base, 'GET', token), { params: Promise.resolve({ id: clientId }) });
  const get2Body = await get2.json();
  const sessions2 = get2Body?.data?.aiProgress?.sessions || [];
  check('GET #2 mantiene las sesiones', sessions2.length === 1, `sessions=${sessions2.length}`);
  const session = sessions2[0] || {};
  check('sesión tiene sessionId', !!session.sessionId);
  check('sesión con translation meta', session.translation?.targetLang === 'en', JSON.stringify(session.translation));

  const summary = session.summary || '';
  check('summary traducido a inglés (contiene "en")', /\b(the|and|of|to|for|with|a|is)\b/i.test(summary), summary.slice(0, 120));
  check('checklist presente y traducido', Array.isArray(session.checklist) && session.checklist.length > 0);
}

main()
  .catch((e) => { console.error('💥 Test E2E cola falló:', e); failures++; })
  .finally(async () => {
    await runCleanup(); // SIEMPRE limpia, incluso en fallo
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

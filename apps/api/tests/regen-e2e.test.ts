/**
 * TEST E2E REAL DE LA REGENERACIÓN ENCOLADA (regen via cola propia).
 *
 * Flujo:
 *  1. Cliente con UNA sesión en estado 'draft' (creada con encryptSessionFields).
 *  2. PUT /api/clients/[id]/ai { action: 'regenerate_session' } → 202 queued.
 *  3. GET (worker-on-poll) → reclama el job tipo 'regen' → regenerateSession
 *     ejecuta el pipeline con LLM real → reemplaza la sesión.
 *  4. Verifica: currentSessionId CAMBIÓ, regenerationCount = 1, notas del
 *     coach aplicadas, traducción FASE 4 (cliente en 'en').
 *
 * Correr: cd apps/api && npx tsx tests/regen-e2e.test.ts
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../src/app/api/clients/[id]/ai/route';
import { getAIJobsCollection } from '../src/app/lib/database';
import { encrypt } from '../src/app/lib/encryption';
import { encryptSessionFields } from '../src/app/lib/recommendation-translator';
import { connectDB, registerClientWithJobs, runCleanup, coachToken, authedRequest } from './helpers';

const URI = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;
let failures = 0, passes = 0;
let lastElapsed = '?';
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

async function main() {
  const { db } = await connectDB();

  // ── Cliente de prueba con una sesión DRAFT existente ──
  const coachId = new ObjectId().toString();
  const oldSessionId = 'session_old_regen_test';
  const sessionPlain = {
    sessionId: oldSessionId,
    monthNumber: 1,
    totalWeeks: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft',
    summary: 'Plan original en español para verificar que la regeneración lo reemplaza.',
    vision: 'Visión original del cliente.',
    medicalSummary: 'Resumen médico original.',
    medicalComparativeAnalysis: '',
    labResults: [],
    structuredMedicalAnalysis: { exams: [], supplements: [] },
    baselineMetrics: { currentLifestyle: [], targetLifestyle: [] },
    weeks: [],
    checklist: [],
    regenerationCount: 0,
    regenerationHistory: [],
  };
  const encryptedOldSession = encryptSessionFields(sessionPlain, { targetLang: 'es', sourceLang: 'es' });

  const testClient = {
    _id: new ObjectId(),
    coachId,
    name: encrypt('Test Regen Client'),
    personalData: {
      name: encrypt('Test Regen Client'),
      gender: encrypt('male'),
      age: encrypt('35'),
      weight: encrypt('75'),
      height: encrypt('178'),
      language: encrypt('en'), // FASE 4 traduce es→en en la regenerada
    },
    medicalData: { diseases: encrypt('none'), medications: encrypt('none'), documents: [] },
    aiProgress: {
      clientId: new ObjectId().toString(),
      currentSessionId: oldSessionId,
      sessions: [encryptedOldSession],
      overallProgress: 0,
      lastEvaluation: new Date(),
      nextEvaluation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metrics: { nutritionAdherence: 0, exerciseConsistency: 0, habitFormation: 0 },
    },
  };
  await db.collection('healthforms').insertOne(testClient as any);
  registerClientWithJobs(testClient._id.toString());
  const clientId = testClient._id.toString();
  console.log('Healthform creado con sesión draft:', clientId);

  const token = coachToken(coachId);

  const base = `http://localhost:3001/api/clients/${clientId}/ai`;

  // ── 1. PUT regenerate_session → 202 queued ──
  section('1. PUT regenerate_session encola y responde 202');
  const putRes = await PUT(
    authedRequest(base, 'PUT', token, { action: 'regenerate_session', sessionId: oldSessionId, data: { coachNotes: 'Aumentar proteína y añadir más días de cardio' } }),
    { params: Promise.resolve({ id: clientId }) }
  );
  const putBody = await putRes.json();
  console.log(`→ PUT en status ${putRes.status}`);
  check('PUT responde 202', putRes.status === 202, `status=${putRes.status}`);
  check('body.status = queued', putBody?.data?.status === 'queued', JSON.stringify(putBody?.data?.status));
  check('body tiene jobId', !!putBody?.data?.jobId);

  const jobDoc = await (await getAIJobsCollection()).findOne({ clientId });
  check('job con type=regen y sessionId', jobDoc?.type === 'regen' && jobDoc?.sessionId === oldSessionId, JSON.stringify({ type: jobDoc?.type, sessionId: jobDoc?.sessionId }));

  // ── 2. PUT con sesión inexistente → 404 (fail-fast, no encola) ──
  section('2. PUT con sesión inexistente → 404 (validación fail-fast)');
  const putBad = await PUT(
    authedRequest(base, 'PUT', token, { action: 'regenerate_session', sessionId: 'session_no_existe', data: { coachNotes: '' } }),
    { params: Promise.resolve({ id: clientId }) }
  );
  check('sesión inexistente → 404', putBad.status === 404, `status=${putBad.status}`);

  // ── 3. GET #1 (worker): ejecuta la regeneración ──
  section('3. GET #1: worker regenera la sesión (LLM real, puede tardar)');
  const t1 = Date.now();
  const get1 = await GET(authedRequest(base, 'GET', token), { params: Promise.resolve({ id: clientId }) });
  const get1Body = await get1.json();
  const elapsed1 = ((Date.now() - t1) / 1000).toFixed(1);
  lastElapsed = elapsed1;
  console.log(`→ GET #1 en ${elapsed1}s, status ${get1.status}`);
  check('GET #1 responde 200', get1.status === 200, `status=${get1.status}`);
  const sessions1 = get1Body?.data?.aiProgress?.sessions || [];
  check('GET #1 devuelve la sesión regenerada', sessions1.length === 1, `sessions=${sessions1.length}`);
  const session1 = sessions1[0] || {};
  check('currentSessionId CAMBIÓ (sesión nueva)', get1Body?.data?.aiProgress?.currentSessionId !== oldSessionId, `${get1Body?.data?.aiProgress?.currentSessionId}`);
  check('regenerationCount = 1', session1.regenerationCount === 1, `count=${session1.regenerationCount}`);
  check('regeneración completa en < 300s', parseFloat(elapsed1) < 300, `${elapsed1}s`);

  const jobAfter = await (await getAIJobsCollection()).findOne({ clientId });
  check('job regen completado (done)', jobAfter?.status === 'done', jobAfter?.status);

  // ── 4. La sesión nueva está traducida (cliente en 'en') ──
  section('4. Sesión regenerada traducida a inglés');
  check('translation meta targetLang=en', session1.translation?.targetLang === 'en', JSON.stringify(session1.translation));
  const summary = session1.summary || '';
  check('summary en inglés', /\b(the|and|of|to|for|with|a|is)\b/i.test(summary), summary.slice(0, 120));
  check('coachNotes aplicadas en la sesión', (session1.coachNotes || '').includes('proteína') || (session1.coachNotes || '').includes('protein'), session1.coachNotes?.slice(0, 80));
  check('checklist presente', Array.isArray(session1.checklist) && session1.checklist.length > 0);

  // ── 5. GET #2: estable ──
  section('5. GET #2: sesión estable');
  const get2 = await GET(authedRequest(base, 'GET', token), { params: Promise.resolve({ id: clientId }) });
  const get2Body = await get2.json();
  check('GET #2 mantiene la sesión nueva', get2Body?.data?.aiProgress?.currentSessionId === get1Body?.data?.aiProgress?.currentSessionId);

}

main()
  .catch((e) => { console.error('💥 Test E2E regen falló:', e); failures++; })
  .finally(async () => {
    await runCleanup(); // SIEMPRE limpia, incluso en fallo
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 ${passes} checks pasaron, ${failures} fallaron (GET #1: ${lastElapsed}s)`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

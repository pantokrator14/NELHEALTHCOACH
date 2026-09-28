/**
 * SUITE DE LISTA DE ESPERA ÚNICA (libro + sesiones gratuitas) — TDD de /api/waitlist.
 *
 * Cubre:
 *  1. Registro válido: 201, email CIFRADO y emailHash en claro para dedupe.
 *  2. Duplicado: idempotente y FUSIONA el motivo (book + sessions) sin duplicar.
 *  3. Honeypot: 201 silencioso y NO se guarda.
 *  4. Validación: email/origen inválidos → 400.
 *  5. Rate limit: 5/min por IP → 429.
 *
 * PERFILES DESECHABLES: todo lo creado se limpia en finally. NUNCA quedan
 * registros de prueba en la DB.
 *
 * Correr: cd apps/api && npx tsx tests/waitlist.test.ts
 */
import 'dotenv/config';
import { NextRequest } from 'next/server';
import { POST as joinWaitlist } from '../src/app/api/waitlist/route';
import { hashEmail } from '../src/app/models/Coach';
import { isEncrypted } from '../src/app/lib/encryption';
import { connectDB, registerCleanup, runCleanup } from './helpers';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const base = 'http://localhost:3001/api/waitlist';

/** IP única por request: aísla del rate limiter real y hace repetible la suite. */
let reqCounter = 0;
function testRequest(body?: unknown): NextRequest {
  return new NextRequest(base, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `test-waitlist-${Date.now()}-${reqCounter++}`,
    },
    body: JSON.stringify(body ?? {}),
  });
}

async function main() {
  const { db } = await connectDB();
  const col = db.collection('waitlist');

  // ═══ 1. Registro válido (libro) ═══
  section('1. Registro en la lista de espera');
  const email = `vip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  const emailHash = hashEmail(email);

  let res = await joinWaitlist(testRequest({ email, source: 'book' }), { params: Promise.resolve({}) });
  check('POST válido → 201', res.status === 201, `status=${res.status}`);

  const doc = await col.findOne({ emailHash });
  check('registro guardado (emailHash)', !!doc, 'no encontrado');
  check('email CIFRADO en DB', typeof doc?.email === 'string' && isEncrypted(doc.email as string));
  check('email en claro NO almacenado', !JSON.stringify(doc ?? {}).includes(email));
  check('origen book guardado', Array.isArray(doc?.sources) && doc?.sources?.includes('book'));
  if (doc?._id) registerCleanup('waitlist', doc._id);

  // ═══ 2. Duplicado con otro motivo → fusiona ═══
  section('2. Deduplicación y fusión de motivos');
  res = await joinWaitlist(testRequest({ email, source: 'sessions' }), { params: Promise.resolve({}) });
  check('duplicado → 200 (ya estaba)', res.status === 200, `status=${res.status}`);
  const merged = await col.findOne({ emailHash });
  const sources = (merged?.sources ?? []) as string[];
  check('duplicado NO crea otro registro', (await col.countDocuments({ emailHash })) === 1);
  check('motivos fusionados (book + sessions)', sources.includes('book') && sources.includes('sessions'), JSON.stringify(sources));

  // Mismo motivo de nuevo: sin cambios
  res = await joinWaitlist(testRequest({ email, source: 'book' }), { params: Promise.resolve({}) });
  const again = await col.findOne({ emailHash });
  check('mismo motivo → sin duplicar motivos', (again?.sources ?? []).length === 2, JSON.stringify(again?.sources));

  // ═══ 3. Honeypot ═══
  section('3. Honeypot anti-spam');
  const spamEmail = `spam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  res = await joinWaitlist(
    testRequest({ email: spamEmail, source: 'book', website: 'http://spam.example.com' }),
    { params: Promise.resolve({}) },
  );
  check('honeypot → 201 (silencioso)', res.status === 201, `status=${res.status}`);
  check('honeypot NO se guarda', (await col.countDocuments({ emailHash: hashEmail(spamEmail) })) === 0);

  // ═══ 4. Validación ═══
  section('4. Validación');
  res = await joinWaitlist(testRequest({ email: 'no-es-email' }), { params: Promise.resolve({}) });
  check('email inválido → 400', res.status === 400, `status=${res.status}`);
  res = await joinWaitlist(testRequest({ email: `ok_${Date.now()}@test.local`, source: 'hack' }), { params: Promise.resolve({}) });
  check('origen inválido → 400', res.status === 400, `status=${res.status}`);

  // ═══ 5. Rate limit (IP fija) ═══
  section('5. Rate limit');
  const FIXED_IP = 'test-waitlist-rate-fixed';
  const rateEmails: string[] = [];
  let lastStatus = 0;
  let rateBody: { code?: string } = {};
  for (let i = 0; i < 7; i++) {
    const rateEmail = `rate_${Date.now()}_${i}@test.local`;
    rateEmails.push(rateEmail);
    const r = await joinWaitlist(
      new NextRequest(base, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': FIXED_IP },
        body: JSON.stringify({ email: rateEmail, source: 'book' }),
      }),
      { params: Promise.resolve({}) },
    );
    lastStatus = r.status;
    rateBody = await r.json();
    if (r.status === 429) break;
  }
  check('tras superar el límite → 429', lastStatus === 429, `status=${lastStatus}`);
  check('respuesta 429 con código RATE_LIMIT', rateBody?.code === 'RATE_LIMIT', JSON.stringify(rateBody));

  // Limpieza de los registros creados por la prueba de rate limit
  const rateHashes = rateEmails.map((e) => hashEmail(e));
  await col.deleteMany({ emailHash: { $in: rateHashes } });
  check('registros del test de rate limit limpiados', (await col.countDocuments({ emailHash: { $in: rateHashes } })) === 0);
}

main()
  .catch((e) => { console.error('💥 Waitlist suite falló:', e); failures++; })
  .finally(async () => {
    await runCleanup();
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 WAITLIST: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

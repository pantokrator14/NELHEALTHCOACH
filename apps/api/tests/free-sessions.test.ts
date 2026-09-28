/**
 * SUITE DE SESIONES GRATUITAS (cupo limitado) — TDD de:
 *   - GET  /api/free-sessions/availability  (público: disponible/cupos)
 *   - GET  /api/free-sessions               (admin)
 *   - PUT  /api/free-sessions               (admin: abrir/cerrar, límite, reset)
 *   - incrementFreeSessionUsage()           (se descuenta al enviar el lead)
 *
 * La configuración original se RESTAURA al final (la DB es compartida).
 *
 * Correr: cd apps/api && npx tsx tests/free-sessions.test.ts
 */
import 'dotenv/config';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { GET as getAvailability } from '../src/app/api/free-sessions/availability/route';
import { GET as getConfig, PUT as putConfig } from '../src/app/api/free-sessions/route';
import { incrementFreeSessionUsage } from '../src/app/lib/free-sessions';
import { leadSchema } from '../src/app/lib/schemas';
import { connectDB, authedRequest, coachToken } from './helpers';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const base = 'http://localhost:3001/api/free-sessions';
const adminTok = coachToken(new ObjectId().toString(), 'admin');
const coachTok = coachToken(new ObjectId().toString(), 'coach');

let reqCounter = 0;
function uniqueIp() {
  return `test-free-${Date.now()}-${reqCounter++}`;
}
function anonRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': uniqueIp(),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function main() {
  const { db } = await connectDB();
  const col = db.collection('free_sessions');

  // Guardar estado original para restaurarlo SIEMPRE
  const original = await col.findOne({ _id: 'config' as never });

  try {
    // ═══ 1. Seguridad de los endpoints admin ═══
    section('1. Permisos');
    let res = await getConfig(anonRequest(base), { params: Promise.resolve({}) });
    check('GET config sin token → 401', res.status === 401, `status=${res.status}`);
    res = await getConfig(authedRequest(base, 'GET', coachTok), { params: Promise.resolve({}) });
    check('GET config con coach → 403', res.status === 403, `status=${res.status}`);
    res = await putConfig(authedRequest(base, 'PUT', coachTok, { open: true }), { params: Promise.resolve({}) });
    check('PUT config con coach → 403', res.status === 403, `status=${res.status}`);
    res = await putConfig(anonRequest(base, 'PUT', { open: true }), { params: Promise.resolve({}) });
    check('PUT config sin token → 401', res.status === 401, `status=${res.status}`);

    // ═══ 2. Configuración inicial (admin) ═══
    section('2. Abrir con límite');
    res = await putConfig(authedRequest(base, 'PUT', adminTok, { open: true, limit: 3, resetUsed: true }), { params: Promise.resolve({}) });
    let body = await res.json();
    check('PUT admin (open/limit/reset) → 200', res.status === 200, `status=${res.status}`);
    check('config guardada: open=true, límite 3, usadas 0', body?.data?.open === true && body?.data?.limit === 3 && body?.data?.used === 0, JSON.stringify(body?.data));

    // ═══ 3. Disponibilidad pública ═══
    section('3. Disponibilidad pública');
    res = await getAvailability(anonRequest(`${base}/availability`), { params: Promise.resolve({}) });
    body = await res.json();
    check('GET availability → 200', res.status === 200, `status=${res.status}`);
    check('disponible con 3 cupos', body?.data?.available === true && body?.data?.remaining === 3, JSON.stringify(body?.data));

    // ═══ 4. Consumo de cupos (al enviar el lead) ═══
    section('4. Consumo de cupos');
    await incrementFreeSessionUsage();
    await incrementFreeSessionUsage();
    res = await getAvailability(anonRequest(`${base}/availability`), { params: Promise.resolve({}) });
    body = await res.json();
    check('tras 2 leads → remaining 1', body?.data?.remaining === 1, JSON.stringify(body?.data));

    // ═══ 5. Cierre manual y automático por cupo lleno ═══
    section('5. Cierre');
    await putConfig(authedRequest(base, 'PUT', adminTok, { open: false }), { params: Promise.resolve({}) });
    res = await getAvailability(anonRequest(`${base}/availability`), { params: Promise.resolve({}) });
    body = await res.json();
    check('cerrado manualmente → no disponible', body?.data?.available === false, JSON.stringify(body?.data));

    await putConfig(authedRequest(base, 'PUT', adminTok, { open: true }), { params: Promise.resolve({}) });
    await incrementFreeSessionUsage(); // usadas 3/3
    res = await getAvailability(anonRequest(`${base}/availability`), { params: Promise.resolve({}) });
    body = await res.json();
    check('cupo lleno (3/3) → no disponible aunque esté abierto', body?.data?.available === false && body?.data?.remaining === 0, JSON.stringify(body?.data));

    res = await putConfig(authedRequest(base, 'PUT', adminTok, { resetUsed: true, limit: 5 }), { params: Promise.resolve({}) });
    body = await res.json();
    check('reset + nuevo límite → disponible de nuevo', body?.data?.available === true && body?.data?.remaining === 5, JSON.stringify(body?.data));

    // ═══ 6. Validación ═══
    section('6. Validación');
    res = await putConfig(authedRequest(base, 'PUT', adminTok, { limit: -1 }), { params: Promise.resolve({}) });
    check('límite negativo → 400', res.status === 400, `status=${res.status}`);
    res = await putConfig(authedRequest(base, 'PUT', adminTok, {}), { params: Promise.resolve({}) });
    check('sin cambios → 400', res.status === 400, `status=${res.status}`);

    // ═══ 7. Disponibilidad derivada (used >= limit → cerrado) ═══
    section('7. Disponibilidad derivada');
    const { computeFreeSessionsAvailability } = await import('../src/app/lib/free-sessions');
    check('lleno → no disponible', computeFreeSessionsAvailability({ open: true, limit: 2, used: 2 }).available === false);
    check('cerrado → no disponible', computeFreeSessionsAvailability({ open: false, limit: 5, used: 0 }).available === false);
    check('abierto con cupo → disponible', computeFreeSessionsAvailability({ open: true, limit: 5, used: 2 }).available === true);
    check('remaining correcto', computeFreeSessionsAvailability({ open: true, limit: 5, used: 2 }).remaining === 3);

    // ═══ 8. El lead de sesión gratuita acepta el origen ═══
    section('7. Lead con origen free-session');
    const parsed = leadSchema.safeParse({ name: 'Test', email: 'lead@test.local', objective: 'probar', source: 'free-session' });
    check('leadSchema acepta source=free-session', parsed.success && parsed.data.source === 'free-session');
    const parsedDefault = leadSchema.safeParse({ name: 'Test', email: 'lead@test.local', objective: 'probar' });
    check('lead sin source → contact (default)', parsedDefault.success && parsedDefault.data.source === 'contact');
  } finally {
    // Restaurar la configuración original
    await col.deleteMany({});
    if (original) {
      await col.insertOne(original);
      check('config original restaurada', true);
    } else {
      check('config de test eliminada (no había config previa)', true);
    }
  }
}

main()
  .catch((e) => { console.error('💥 Free sessions suite falló:', e); failures++; })
  .finally(() => {
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 FREE SESSIONS: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

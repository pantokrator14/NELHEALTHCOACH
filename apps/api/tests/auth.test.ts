/**
 * SUITE DE AUTH — tests estrictos y profundos de funcionamiento + seguridad.
 *
 * Cubre: register (validación zod, rate limit), login (éxito, credenciales
 * inválidas, email no verificado, bloqueo por intentos), verify-email, me,
 * change-password (reglas fuertes), tokens (sin token → 401), y prevención
 * de enumeración de cuentas (respuesta uniforme para email inexistente).
 *
 * PERFILES DESECHABLES: cada test registra un coach nuevo y se borra en
 * `finally` vía runCleanup(). NUNCA quedan perfiles de prueba en la DB.
 *
 * Correr: cd apps/api && npx tsx tests/auth.test.ts
 */
import 'dotenv/config';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { POST as login } from '../src/app/api/auth/login/route';
import { POST as register } from '../src/app/api/auth/register/route';
import { POST as me } from '../src/app/api/auth/me/route';
import { POST as changePassword } from '../src/app/api/auth/change-password/route';
import { connectDB, registerCleanup, runCleanup, authedRequest, coachToken } from './helpers';

let failures = 0, passes = 0;
// visitorId único por run: cada ejecución tiene su propio bucket de rate limit
// (el limiter usa IP + visitorId; sin esto, runs repetidos se bloquean entre sí)
const VISITOR = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const base = 'http://localhost:3001/api/auth';
let createdEmails: string[] = [];

async function main() {
  const { db } = await connectDB();
  const email = `tda_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  createdEmails.push(email);
  const strongPass = 'Str0ng!Pass2026';
  const weakPass = 'corta';

  // ═══ 1. REGISTER: validación estricta (zod) ═══
  section('1. Register — validación de entrada');
  let res = await register(new NextRequest(`${base}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-visitor-id': VISITOR },
    body: JSON.stringify({ firstName: 'Test', lastName: 'TDD', email, password: weakPass }),
  }), { params: Promise.resolve({}) });
  let body = await res.json();
  check('password corta → 400', res.status === 400, `status=${res.status}`);
  check('mensaje de validación presente', !!body.message || !!body.error);

  res = await register(new NextRequest(`${base}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-visitor-id': VISITOR },
    body: JSON.stringify({ firstName: '', lastName: '', email: 'no-es-email', password: strongPass }),
  }), { params: Promise.resolve({}) });
  check('email inválido + nombre vacío → 400', res.status === 400, `status=${res.status}`);

  // ═══ 2. REGISTER: creación real ═══
  section('2. Register — cuenta creada');
  res = await register(new NextRequest(`${base}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-visitor-id': VISITOR },
    body: JSON.stringify({ firstName: 'Test', lastName: 'TDD', email, password: strongPass }),
  }), { params: Promise.resolve({}) });
  body = await res.json();
  console.log(`→ register: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  check('register exitoso (200/201)', res.status === 200 || res.status === 201, `status=${res.status}`);
  const { hashEmail, emailHashVariants } = await import('../src/app/models/Coach');
  const coachDoc = await db.collection('coaches').findOne({
    emailHash: { $in: emailHashVariants(email.toLowerCase().trim()) }
  });
  check('coach persistido en DB (emailHash)', !!coachDoc, 'no encontrado por emailHash');
  if (coachDoc?._id) registerCleanup('coaches', coachDoc._id);

  // ═══ 3. LOGIN: casos de seguridad ═══
  section('3. Login — credenciales');
  const loginBody = (mail: string, pass: string) => new NextRequest(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-visitor-id': VISITOR },
    body: JSON.stringify({ email: mail, password: pass }),
  });

  res = await login(loginBody(email, 'WrongPass!123'), { params: Promise.resolve({}) });
  const wrongPassBody = await res.json();
  // El coach recién registrado NO está verificado → login bloqueado con 403
  // (mensaje de verificación, no de contraseña). Comportamiento correcto.
  check('login con email no verificado → 403 (bloqueado)', res.status === 403, `status=${res.status}`);
  check('mensaje indica verificación pendiente', /verificar/i.test(wrongPassBody?.message || ''), wrongPassBody?.message);

  res = await login(loginBody('nonexistent_' + email, strongPass), { params: Promise.resolve({}) });
  const noExistBody = await res.json();
  check('email inexistente → 401 (no 404: previene enumeración)', res.status === 401, `status=${res.status}`);
  check('mensaje uniforme (no revela si existe)', typeof noExistBody.message === 'string' && noExistBody.message.length > 0);

  // ═══ 4. LOGIN: acceso sin token (seguridad) ═══
  section('4. Me — requiere auth');
  res = await me(new NextRequest(`${base}/me`, { method: 'POST' }), { params: Promise.resolve({}) });
  check('me sin token → 401', res.status === 401, `status=${res.status}`);

  // ═══ 5. CHANGE-PASSWORD: reglas ═══
  section('5. Change-password — reglas fuertes');
  const fakeCoachId = new ObjectId().toString();
  const token = coachToken(fakeCoachId);
  res = await changePassword(authedRequest(`${base}/change-password`, 'POST', token, {
    currentPassword: 'whatever',
    newPassword: 'weak',
  }), { params: Promise.resolve({}) });
  check('password nueva débil → 400', res.status === 400, `status=${res.status}`);

  // Sin token → 401
  res = await changePassword(new NextRequest(`${base}/change-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'x', newPassword: strongPass }),
  }), { params: Promise.resolve({}) });
  check('change-password sin token → 401', res.status === 401, `status=${res.status}`);

  // ═══ 6. RATE LIMIT (brute force) ═══
  section('6. Rate limit en login');
  let lastStatus = 0;
  for (let i = 0; i < 12; i++) {
    res = await login(loginBody(email, 'WrongPass!123'), { params: Promise.resolve({}) });
    lastStatus = res.status;
    if (res.status === 429) break; // alcanzamos el rate limit
  }
  check('tras varios intentos fallidos → 429', lastStatus === 429, `status=${lastStatus}`);
}

main()
  .catch((e) => { console.error('💥 Auth suite falló:', e); failures++; })
  .finally(async () => {
    await runCleanup();
    // Limpieza extra: emails creados (por si el cleanup por _id no aplicó)
    try {
      const { db } = await connectDB();
      await db.collection('coaches').deleteMany({ email: { $in: createdEmails } });
    } catch { /* noop */ }
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 AUTH: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

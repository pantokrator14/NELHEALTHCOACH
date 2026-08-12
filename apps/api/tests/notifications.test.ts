/**
 * SUITE NOTIFICATIONS + MISC (health, stats) — cobertura funcional + seguridad.
 *
 * Notifications: GET lista (solo del coach), POST markAllRead (validación de
 * acción), PATCH [id] (ownership: 404 para notif de otro coach), unread-count,
 * y 401 sin token.
 * Misc: GET /health (servicio vivo), GET /recipes/stats (auth requerida).
 *
 * PERFILES DESECHABLES: notificaciones creadas se registran y se borran en finally.
 */
import 'dotenv/config';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { GET as listNotifications, POST as markAllRead } from '../src/app/api/notifications/route';
import { PATCH as patchNotification } from '../src/app/api/notifications/[id]/route';
import { GET as unreadCount } from '../src/app/api/notifications/unread-count/route';
import { GET as health } from '../src/app/api/health/route';
import { GET as recipesStats } from '../src/app/api/recipes/stats/route';
import { connectDB, registerCleanup, runCleanup, authedRequest, coachToken } from './helpers';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const base = 'http://localhost:3001/api';

async function main() {
  const { db } = await connectDB();
  const coachId = new ObjectId().toString();
  const token = coachToken(coachId);
  const otherCoachId = new ObjectId().toString();

  // ═══ 1. HEALTH (público) ═══
  section('1. Health');
  const healthRes = await health(new NextRequest(`${base}/health`, { method: 'GET' }));
  check('GET /health → 200', healthRes.status === 200, `status=${healthRes.status}`);

  // ═══ 2. NOTIFICATIONS: sin token → 401 ═══
  section('2. Notifications — seguridad');
  let res = await listNotifications(new NextRequest(`${base}/notifications`, { method: 'GET' }), { params: Promise.resolve({}) });
  check('GET sin token → 401', res.status === 401, `status=${res.status}`);
  res = await markAllRead(new NextRequest(`${base}/notifications`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'markAllRead' }) }), { params: Promise.resolve({}) });
  check('POST sin token → 401', res.status === 401, `status=${res.status}`);
  res = await unreadCount(new NextRequest(`${base}/notifications/unread-count`, { method: 'GET' }), { params: Promise.resolve({}) });
  check('unread-count sin token → 401', res.status === 401, `status=${res.status}`);

  // ═══ 3. NOTIFICATIONS: crear + listar ═══
  section('3. Notifications — CRUD básico');
  const notif = {
    coachId: new ObjectId(coachId), // Mongoose cast en producción; insert directo necesita ObjectId
    title: 'Notificación TDD',
    message: 'Mensaje de prueba TDD',
    type: 'info',
    read: false,
    createdAt: new Date(),
  };
  const notifRes = await db.collection('notifications').insertOne(notif);
  registerCleanup('notifications', notifRes.insertedId);
  const notifId = notifRes.insertedId.toString();
  check('notificación creada', !!notifId);

  // Notificación de OTRO coach (para ownership)
  const otherNotif = {
    coachId: new ObjectId(otherCoachId),
    title: 'Notif de otro coach',
    message: 'No debería verse',
    type: 'info',
    read: false,
    createdAt: new Date(),
  };
  const otherRes = await db.collection('notifications').insertOne(otherNotif);
  registerCleanup('notifications', otherRes.insertedId);
  const otherNotifId = otherRes.insertedId.toString();

  res = await listNotifications(authedRequest(`${base}/notifications`, 'GET', token), { params: Promise.resolve({}) });
  const listBody = await res.json();
  check('GET lista → 200', res.status === 200, `status=${res.status}`);
  const items = listBody?.data || listBody?.notifications || [];
  check('lista incluye la notificación propia', Array.isArray(items) && items.some((n: any) => (n._id || n.id)?.toString() === notifId));
  check('lista NO incluye la de otro coach', Array.isArray(items) && !items.some((n: any) => (n._id || n.id)?.toString() === otherNotifId));

  // unread-count: 1 sin leer (la propia)
  res = await unreadCount(authedRequest(`${base}/notifications/unread-count`, 'GET', token), { params: Promise.resolve({}) });
  const unreadBody = await res.json();
  const unread = unreadBody?.data?.count ?? unreadBody?.count ?? -1;
  check('unread-count ≥ 1 (la propia sin leer)', typeof unread === 'number' && unread >= 1, `count=${unread}`);

  // ═══ 4. NOTIFICATIONS: PATCH read + ownership ═══
  section('4. Notifications — marcar leída + ownership');
  res = await patchNotification(authedRequest(`${base}/notifications/${notifId}`, 'PATCH', token, {}), { params: Promise.resolve({ id: notifId }) });
  check('PATCH propia → 200', res.status === 200, `status=${res.status}`);
  const storedNotif = await db.collection('notifications').findOne({ _id: new ObjectId(notifId) });
  check('notificación marcada como leída', storedNotif?.read === true, `read=${storedNotif?.read}`);

  // PATCH de notif de OTRO coach → 404 (no revela existencia)
  res = await patchNotification(authedRequest(`${base}/notifications/${otherNotifId}`, 'PATCH', token, {}), { params: Promise.resolve({ id: otherNotifId }) });
  check('PATCH notif de otro coach → 404', res.status === 404, `status=${res.status}`);

  // markAllRead
  res = await markAllRead(authedRequest(`${base}/notifications`, 'POST', token, { action: 'markAllRead' }), { params: Promise.resolve({}) });
  check('markAllRead → 200', res.status === 200, `status=${res.status}`);

  // Acción inválida → 400
  res = await markAllRead(authedRequest(`${base}/notifications`, 'POST', token, { action: 'deleteAll' }), { params: Promise.resolve({}) });
  check('acción inválida → 400', res.status === 400, `status=${res.status}`);

  // ═══ 5. RECIPES STATS (auth requerida) ═══
  section('5. Recipes stats');
  res = await recipesStats(new NextRequest(`${base}/recipes/stats`, { method: 'GET' }), { params: Promise.resolve({}) });
  check('stats sin token → 401', res.status === 401, `status=${res.status}`);
  res = await recipesStats(authedRequest(`${base}/recipes/stats`, 'GET', token), { params: Promise.resolve({}) });
  check('stats con token → 200', res.status === 200, `status=${res.status}`);
}

main()
  .catch((e) => { console.error('💥 Notifications suite falló:', e); failures++; })
  .finally(async () => {
    await runCleanup();
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 NOTIFICATIONS+MISC: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

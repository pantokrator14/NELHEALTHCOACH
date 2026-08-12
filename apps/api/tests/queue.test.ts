/**
 * TEST DE LA COLA PROPIA (ai-job-queue.ts) — sin LLM, solo lógica de cola.
 * Cubre: enqueue, dedupe idempotente, claim atómico, lease expirado,
 * reintentos (MAX_ATTEMPTS), complete, requeue y fail.
 *
 * Correr: cd apps/api && npx tsx scripts/test-queue.tmp.ts
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import {
  enqueueAIJob, claimAIJob, completeAIJob, failAIJob, requeueAIJob, getActiveAIJob,
  JOB_LEASE_MS, MAX_ATTEMPTS,
} from '../src/app/lib/ai-job-queue';

const URI = process.env.MONGODB_URI!;
let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

async function main() {
  const mongo = new MongoClient(URI);
  await mongo.connect();
  const db = mongo.db();

  const testClientId = new ObjectId().toString();
  const jobsColl = db.collection('ai_jobs');

  // Limpieza previa (por si un run anterior abortó)
  await jobsColl.deleteMany({ clientId: testClientId });

  // ── 1. Enqueue ──
  section('1. Enqueue + dedupe idempotente');
  const job1 = await enqueueAIJob({ clientId: testClientId, monthNumber: 1, coachNotes: 'nota test' });
  check('job creado con status pending', job1.status === 'pending', JSON.stringify(job1.status));
  check('job tiene _id', !!job1._id);
  check('job guarda monthNumber/coachNotes', job1.monthNumber === 1 && job1.coachNotes === 'nota test');
  check('attempts inicia en 0', job1.attempts === 0);

  const job2 = await enqueueAIJob({ clientId: testClientId, monthNumber: 2, coachNotes: 'segundo intento' });
  check('segundo enqueue reutiliza el MISMO job (dedupe)', job2._id?.toString() === job1._id?.toString());
  const countAfterDedupe = await jobsColl.countDocuments({ clientId: testClientId });
  check('solo existe UN job activo en la DB', countAfterDedupe === 1, `hay ${countAfterDedupe}`);

  // ── 2. Claim ──
  section('2. Claim atómico');
  const claimed = await claimAIJob(testClientId);
  check('claim devuelve el job', claimed?._id?.toString() === job1._id?.toString());
  check('claim marca status=running', claimed?.status === 'running', claimed?.status);
  check('claim incrementa attempts a 1', claimed?.attempts === 1);
  check('claim setea claimedAt', !!claimed?.claimedAt);

  const secondClaim = await claimAIJob(testClientId);
  check('segundo claim (lease vivo) devuelve null', secondClaim === null);

  // ── 3. Complete ──
  section('3. Complete');
  await completeAIJob(claimed!._id!);
  const doneDoc = await jobsColl.findOne({ _id: claimed!._id });
  check('job queda done', doneDoc?.status === 'done');

  const claimAfterDone = await claimAIJob(testClientId);
  check('job done NO se reclama', claimAfterDone === null);

  // ── 4. Requeue tras fallo recuperable ──
  section('4. Requeue (reintento inmediato)');
  const job3 = await enqueueAIJob({ clientId: testClientId, monthNumber: 1 });
  check('nuevo enqueue tras done crea OTRO job', job3._id?.toString() !== job1._id?.toString());
  const c3 = await claimAIJob(testClientId);
  await requeueAIJob(c3!._id!);
  const requeuedDoc = await jobsColl.findOne({ _id: c3!._id });
  check('requeue deja el job pending de nuevo', requeuedDoc?.status === 'pending');
  const c3b = await claimAIJob(testClientId);
  check('tras requeue se puede volver a reclamar', c3b?._id?.toString() === c3?._id?.toString());
  check('attempts acumula (2)', c3b?.attempts === 2);

  // ── 5. Lease expirado (worker murió) ──
  section('5. Lease expirado');
  await jobsColl.updateOne(
    { _id: c3b!._id },
    { $set: { claimedAt: new Date(Date.now() - JOB_LEASE_MS - 60_000) } }
  );
  const c4 = await claimAIJob(testClientId);
  check('job running con lease vencido se reclama (reintento)', c4?._id?.toString() === c3?._id?.toString());
  check('attempts = 3', c4?.attempts === 3);

  // ── 6. MAX_ATTEMPTS ──
  section('6. MAX_ATTEMPTS agotados');
  const claimAtLimit = await claimAIJob(testClientId);
  check('con attempts >= MAX_ATTEMPTS NO se reclama (null)', claimAtLimit === null);
  const stuckDoc = await jobsColl.findOne({ _id: c3!._id });
  check('el job queda running (stuck) para diagnóstico', stuckDoc?.status === 'running');

  // El enqueue NO debe quedar bloqueado por el zombie: lo abandona y crea uno nuevo
  const jobZombie = await enqueueAIJob({ clientId: testClientId, monthNumber: 1 });
  check('enqueue tras zombie crea job NUEVO (no bloqueado)', jobZombie._id?.toString() !== c3?._id?.toString());
  const zombieDoc = await jobsColl.findOne({ _id: c3!._id });
  check('el zombie queda failed (abandonado)', zombieDoc?.status === 'failed');
  check('zombie con mensaje de abandono', zombieDoc?.error === 'Abandonado: superó MAX_ATTEMPTS');

  // ── 7. Fail ──
  section('7. Fail');
  const c5 = await claimAIJob(testClientId);
  if (c5) {
    await failAIJob(c5._id!, 'boom: modelo devolvió vacío');
    const failedDoc = await jobsColl.findOne({ _id: c5._id });
    check('job queda failed', failedDoc?.status === 'failed');
    check('error guardado', failedDoc?.error === 'boom: modelo devolvió vacío');
    const claimAfterFail = await claimAIJob(testClientId);
    check('job failed NO se reclama', claimAfterFail === null);
  } else {
    check('job queda failed', false, 'no se pudo reclamar el job de la sección 7');
  }

  // ── 8. getActiveAIJob ──
  section('8. getActiveAIJob');
  const job5 = await enqueueAIJob({ clientId: testClientId, monthNumber: 1 });
  const active = await getActiveAIJob(testClientId);
  check('detecta el job activo', active?._id?.toString() === job5._id?.toString());

  // ── 9. Regen: type + sessionId ──
  section('9. Regen (type + sessionId)');
  await failAIJob(job5._id!, 'limpieza');
  const regenJob = await enqueueAIJob({
    clientId: testClientId,
    type: 'regen',
    sessionId: 'session_abc123',
    monthNumber: 2,
    coachNotes: 'más proteína',
  });
  check('job regen con type=regen', regenJob.type === 'regen');
  check('job regen guarda sessionId', regenJob.sessionId === 'session_abc123');
  check('job regen guarda monthNumber', regenJob.monthNumber === 2);
  const regenClaimed = await claimAIJob(testClientId);
  check('job regen se reclama igual', regenClaimed?.type === 'regen' && regenClaimed?.sessionId === 'session_abc123');

  // ── Limpieza ──
  await jobsColl.deleteMany({ clientId: testClientId });
  await mongo.close();

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`🎉 ${passes} checks pasaron, ${failures} fallaron`);
  console.log(`══════════════════════════════════════════════════════════`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => { console.error('💥 Test cola falló:', e); process.exit(1); });

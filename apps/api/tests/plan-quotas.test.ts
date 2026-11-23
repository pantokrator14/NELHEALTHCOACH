/**
 * SUITE PLAN QUOTAS & CLIENT PLAN FILTERING — TDD de:
 *   - GET/PUT /api/plan-quotas                (solo admin: 401 sin auth, 403 coach/client, 200 admin)
 *   - GET     /api/plans/availability         (público: mapa de los 5 planes)
 *   - GET     /api/plans                      (público: cada plan incluye `availability`)
 *   - Validación Zod en PUT /api/plan-quotas  (planId inválido, limit negativo, body vacío -> 400)
 *   - Bloqueo 409 QUOTA_FULL en:
 *       * POST /api/payments/create-plan-checkout    (cerrado manualmente y cupo lleno)
 *       * POST /api/payments/create-consult-checkout (cerrado manualmente y cupo lleno)
 *   - Descuento idempotente al completarse el pago:
 *       * recordClientPlanPurchase incrementa used 1 sola vez (repetir mismo stripeSessionId no duplica)
 *       * handleCheckoutCompleted (consult_1on1_lead) incrementa consult_1on1.used 1 sola vez
 *   - GET /api/clients                        (incluye `planId` y `planName` resueltos + null si sin plan)
 *
 * La colección `plan_quotas` original se RESTAURA SIEMPRE en `finally` (DB compartida)
 * y todos los documentos desechables se eliminan en `finally`.
 *
 * Correr: cd apps/api && npx tsx tests/plan-quotas.test.ts
 */
process.env.EMAIL_ENABLED = 'false';

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { ObjectId, type Document } from 'mongodb';
import {
  connectDB,
  authedRequest,
  anonRequest,
  coachToken,
  createDisposableCoach,
  createDisposableClient,
  registerCleanup,
  runCleanup,
  uniqueId,
  JWT_SECRET,
} from './helpers';

let failures = 0;
let passes = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passes++;
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n═══ ${title} ═══`);
}

let originalPlanQuotas: Document[] = [];
let planQuotasCaptured = false;
let testCoachId = '';
let consultLeadEmail = '';

async function main() {
  const { GET: getPlanQuotas, PUT: putPlanQuotas } = await import('../src/app/api/plan-quotas/route');
  const { GET: getPlansAvailability } = await import('../src/app/api/plans/availability/route');
  const { GET: getPlans } = await import('../src/app/api/plans/route');
  const { POST: createPlanCheckout } = await import('../src/app/api/payments/create-plan-checkout/route');
  const { POST: createConsultCheckout } = await import('../src/app/api/payments/create-consult-checkout/route');
  const { GET: listClients } = await import('../src/app/api/clients/route');
  const { recordClientPlanPurchase } = await import('../src/app/lib/plan-fulfillment');
  const { handleCheckoutCompleted } = await import('../src/app/lib/stripe-webhook');
  const { default: ClientAccount } = await import('../src/app/models/ClientAccount');
  const { emailHashVariants } = await import('../src/app/models/Coach');
  const { encrypt } = await import('../src/app/lib/encryption');
  const { connectMongoose } = await import('../src/app/lib/database');

  const { db, mongo } = await connectDB();
  await connectMongoose();

  originalPlanQuotas = await db.collection('plan_quotas').find({}).toArray();
  planQuotasCaptured = true;

  const base = 'http://localhost:3001/api';
  const adminTok = coachToken(new ObjectId().toString(), 'admin');
  const disposableCoach = await createDisposableCoach(db);
  testCoachId = disposableCoach.id.toString();
  const coachTok = coachToken(testCoachId, 'coach');

  // Crear ClientAccount desechable para probar permisos de cliente + checkout + fulfillment + GET /api/clients
  const clientEmail = `tdd_pq_client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  consultLeadEmail = `tdd_pq_consult_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;

  const clientAccount = await ClientAccount.create({
    email: encrypt(clientEmail),
    emailHash: emailHashVariants(clientEmail)[0],
    passwordHash: 'dummy-hash-not-used-in-test',
    coachId: testCoachId,
    emailVerified: true,
    isActive: true,
    activePlanId: 'reto_tres_nel',
    selectedPlanId: 'reto_tres_nel',
  });
  registerCleanup('client_accounts', clientAccount._id);

  const clientTok = jwt.sign(
    {
      clientAccountId: clientAccount._id.toString(),
      coachId: testCoachId,
      email: clientEmail,
      role: 'client',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ═══ 1. PERMISOS DE /api/plan-quotas ═══
  section('1. Permisos de /api/plan-quotas');
  {
    const resAnonGet = await getPlanQuotas(anonRequest(`${base}/plan-quotas`, 'GET'), {
      params: Promise.resolve({}),
    });
    check('GET /api/plan-quotas sin token → 401', resAnonGet.status === 401, `status=${resAnonGet.status}`);

    const resCoachGet = await getPlanQuotas(authedRequest(`${base}/plan-quotas`, 'GET', coachTok), {
      params: Promise.resolve({}),
    });
    check('GET /api/plan-quotas con coach → 403', resCoachGet.status === 403, `status=${resCoachGet.status}`);

    const resClientGet = await getPlanQuotas(authedRequest(`${base}/plan-quotas`, 'GET', clientTok), {
      params: Promise.resolve({}),
    });
    check('GET /api/plan-quotas con client → 403', resClientGet.status === 403, `status=${resClientGet.status}`);

    const resAnonPut = await putPlanQuotas(
      anonRequest(`${base}/plan-quotas`, 'PUT', { planId: 'plan_1_reinicio', open: true }),
      { params: Promise.resolve({}) }
    );
    check('PUT /api/plan-quotas sin token → 401', resAnonPut.status === 401, `status=${resAnonPut.status}`);

    const resCoachPut = await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', coachTok, { planId: 'plan_1_reinicio', open: true }),
      { params: Promise.resolve({}) }
    );
    check('PUT /api/plan-quotas con coach → 403', resCoachPut.status === 403, `status=${resCoachPut.status}`);

    const resClientPut = await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', clientTok, { planId: 'plan_1_reinicio', open: true }),
      { params: Promise.resolve({}) }
    );
    check('PUT /api/plan-quotas con client → 403', resClientPut.status === 403, `status=${resClientPut.status}`);

    const resAdminGet = await getPlanQuotas(authedRequest(`${base}/plan-quotas`, 'GET', adminTok), {
      params: Promise.resolve({}),
    });
    const adminGetJson = await resAdminGet.json();
    check(
      'GET /api/plan-quotas con admin → 200 y 5 planes',
      resAdminGet.status === 200 && Array.isArray(adminGetJson?.data) && adminGetJson.data.length === 5,
      `status=${resAdminGet.status} len=${adminGetJson?.data?.length}`
    );
  }

  // ═══ 2. VALIDACIÓN EN PUT /api/plan-quotas ═══
  section('2. Validación de entradas en PUT /api/plan-quotas');
  {
    const resNegLimit = await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, { planId: 'plan_1_reinicio', limit: -1 }),
      { params: Promise.resolve({}) }
    );
    check('limit negativo → 400', resNegLimit.status === 400, `status=${resNegLimit.status}`);

    const resInvalidPlan = await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, { planId: 'plan_inexistente', open: false }),
      { params: Promise.resolve({}) }
    );
    check('planId inválido → 400', resInvalidPlan.status === 400, `status=${resInvalidPlan.status}`);

    const resEmptyUpdate = await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, { planId: 'plan_1_reinicio' }),
      { params: Promise.resolve({}) }
    );
    check('sin cambios (solo planId) → 400', resEmptyUpdate.status === 400, `status=${resEmptyUpdate.status}`);
  }

  // ═══ 3. ENDPOINTS PÚBLICOS: /api/plans/availability Y /api/plans ═══
  section('3. Disponibilidad pública en /api/plans/availability y /api/plans');
  {
    await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'reto_tres_nel',
        open: true,
        limit: 4,
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );

    const availRes = await getPlansAvailability(anonRequest(`${base}/plans/availability`, 'GET'), {
      params: Promise.resolve({}),
    });
    const availJson = await availRes.json();
    check('GET /api/plans/availability → 200', availRes.status === 200, `status=${availRes.status}`);
    check(
      'contiene los 5 planes y refleja límite 4 en reto_tres_nel',
      availJson?.data?.reto_tres_nel?.limit === 4 &&
        availJson?.data?.reto_tres_nel?.remaining === 4 &&
        availJson?.data?.reto_tres_nel?.available === true &&
        Boolean(availJson?.data?.consult_1on1) &&
        Boolean(availJson?.data?.plan_1_reinicio) &&
        Boolean(availJson?.data?.plan_2_transformacion) &&
        Boolean(availJson?.data?.plan_3_maestria),
      JSON.stringify(availJson?.data?.reto_tres_nel)
    );

    const plansRes = await getPlans(anonRequest(`${base}/plans`, 'GET'), {
      params: Promise.resolve({}),
    });
    const plansJson = await plansRes.json();
    const plansList = (plansJson?.data || []) as Array<{ id: string; availability?: { available: boolean; remaining: number } }>;
    const retoItem = plansList.find((p) => p.id === 'reto_tres_nel');
    check(
      'GET /api/plans incluye availability en cada plan',
      plansRes.status === 200 &&
        plansList.length === 5 &&
        plansList.every((p) => typeof p.availability?.available === 'boolean') &&
        retoItem?.availability?.remaining === 4
    );
  }

  // ═══ 4. BLOQUEO 409 QUOTA_FULL EN CHECKOUT DE PLANES Y CONSULTA 1 A 1 ═══
  section('4. Bloqueo 409 QUOTA_FULL en endpoints de checkout');
  {
    // 4a. Cierre manual de plan_1_reinicio → 409 QUOTA_FULL
    await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'plan_1_reinicio',
        open: false,
        limit: 10,
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );

    const closedPlanCheckoutRes = await createPlanCheckout(
      authedRequest(`${base}/payments/create-plan-checkout`, 'POST', clientTok, {
        planId: 'plan_1_reinicio',
      }),
      { params: Promise.resolve({}) }
    );
    const closedPlanCheckoutJson = await closedPlanCheckoutRes.json();
    check(
      'POST /api/payments/create-plan-checkout con plan cerrado → 409 QUOTA_FULL',
      closedPlanCheckoutRes.status === 409 && closedPlanCheckoutJson?.code === 'QUOTA_FULL',
      `status=${closedPlanCheckoutRes.status} code=${closedPlanCheckoutJson?.code}`
    );

    // 4b. Cupo lleno (open: true, limit: 1, used: 1) → 409 QUOTA_FULL
    await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'plan_2_transformacion',
        open: true,
        limit: 1,
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );
    await recordClientPlanPurchase({
      clientAccountId: clientAccount._id.toString(),
      planId: 'plan_2_transformacion',
      stripeSessionId: uniqueId('cs_pq_fill'),
    });

    const fullPlanCheckoutRes = await createPlanCheckout(
      authedRequest(`${base}/payments/create-plan-checkout`, 'POST', clientTok, {
        planId: 'plan_2_transformacion',
      }),
      { params: Promise.resolve({}) }
    );
    const fullPlanCheckoutJson = await fullPlanCheckoutRes.json();
    check(
      'POST /api/payments/create-plan-checkout con cupo lleno (1/1) → 409 QUOTA_FULL',
      fullPlanCheckoutRes.status === 409 && fullPlanCheckoutJson?.code === 'QUOTA_FULL',
      `status=${fullPlanCheckoutRes.status} code=${fullPlanCheckoutJson?.code}`
    );

    // 4c. Cierre manual de consult_1on1 → 409 QUOTA_FULL en create-consult-checkout
    await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'consult_1on1',
        open: false,
        limit: 5,
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );

    const closedConsultRes = await createConsultCheckout(
      anonRequest(`${base}/payments/create-consult-checkout`, 'POST', {
        name: 'Lead Bloqueado',
        email: consultLeadEmail,
        phone: '+15550001122',
        objective: 'Probar bloqueo de cupo',
      }),
      { params: Promise.resolve({}) }
    );
    const closedConsultJson = await closedConsultRes.json();
    check(
      'POST /api/payments/create-consult-checkout con consult_1on1 cerrado → 409 QUOTA_FULL',
      closedConsultRes.status === 409 && closedConsultJson?.code === 'QUOTA_FULL',
      `status=${closedConsultRes.status} code=${closedConsultJson?.code}`
    );

    // 4d. Verificar que consult_1on1 lleno (limit: 1, used: 1) también bloquea con 409 QUOTA_FULL
    await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'consult_1on1',
        open: true,
        limit: 1,
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );
    const leadDoc = await db.collection('leads').insertOne({
      name: 'Lead Cupo',
      email: consultLeadEmail,
      phone: '+15550001122',
      objective: 'Evaluar cupos',
      source: 'consult_1on1',
      planId: 'consult_1on1',
      paymentStatus: 'pending',
      amountCents: 6000,
      createdAt: new Date(),
    });
    registerCleanup('leads', leadDoc.insertedId);

    const consultSessId = uniqueId('cs_pq_consult');
    await handleCheckoutCompleted({
      id: consultSessId,
      amount_total: 6000,
      metadata: {
        type: 'consult_1on1_lead',
        leadId: leadDoc.insertedId.toString(),
        planId: 'consult_1on1',
        clientEmail: consultLeadEmail,
        clientName: 'Lead Cupo',
      },
    });
    // Repetir el mismo webhook NO debe incrementar doble vez (idempotencia atómica)
    await handleCheckoutCompleted({
      id: consultSessId,
      amount_total: 6000,
      metadata: {
        type: 'consult_1on1_lead',
        leadId: leadDoc.insertedId.toString(),
        planId: 'consult_1on1',
        clientEmail: consultLeadEmail,
        clientName: 'Lead Cupo',
      },
    });

    const availAfterConsultRes = await getPlansAvailability(anonRequest(`${base}/plans/availability`, 'GET'), {
      params: Promise.resolve({}),
    });
    const availAfterConsultJson = await availAfterConsultRes.json();
    check(
      'handleCheckoutCompleted (consult_1on1_lead) incrementa used=1 de forma idempotente (repetir no duplica)',
      availAfterConsultJson?.data?.consult_1on1?.used === 1 &&
        availAfterConsultJson?.data?.consult_1on1?.available === false,
      JSON.stringify(availAfterConsultJson?.data?.consult_1on1)
    );

    const fullConsultRes = await createConsultCheckout(
      anonRequest(`${base}/payments/create-consult-checkout`, 'POST', {
        name: 'Lead Segundo',
        email: `extra_${consultLeadEmail}`,
        phone: '+15550009999',
        objective: 'Probar cupo lleno',
      }),
      { params: Promise.resolve({}) }
    );
    const fullConsultJson = await fullConsultRes.json();
    check(
      'POST /api/payments/create-consult-checkout con cupo lleno (1/1) → 409 QUOTA_FULL',
      fullConsultRes.status === 409 && fullConsultJson?.code === 'QUOTA_FULL',
      `status=${fullConsultRes.status} code=${fullConsultJson?.code}`
    );
  }

  // ═══ 5. IDEMPOTENCIA EN recordClientPlanPurchase ═══
  section('5. Incremento idempotente de cupos en recordClientPlanPurchase');
  {
    await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'plan_3_maestria',
        open: true,
        limit: 3,
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );

    const sessId = uniqueId('cs_pq_idemp');
    await recordClientPlanPurchase({
      clientAccountId: clientAccount._id.toString(),
      planId: 'plan_3_maestria',
      stripeSessionId: sessId,
    });
    await recordClientPlanPurchase({
      clientAccountId: clientAccount._id.toString(),
      planId: 'plan_3_maestria',
      stripeSessionId: sessId,
    });

    const availRes = await getPlansAvailability(anonRequest(`${base}/plans/availability`, 'GET'), {
      params: Promise.resolve({}),
    });
    const availJson = await availRes.json();
    check(
      'recordClientPlanPurchase con mismo stripeSessionId solo incrementa used=1 (remaining=2)',
      availJson?.data?.plan_3_maestria?.used === 1 &&
        availJson?.data?.plan_3_maestria?.remaining === 2 &&
        availJson?.data?.plan_3_maestria?.available === true,
      JSON.stringify(availJson?.data?.plan_3_maestria)
    );

    // Reiniciar usados desde admin
    const resetRes = await putPlanQuotas(
      authedRequest(`${base}/plan-quotas`, 'PUT', adminTok, {
        planId: 'plan_3_maestria',
        resetUsed: true,
      }),
      { params: Promise.resolve({}) }
    );
    const resetJson = await resetRes.json();
    const m3 = (resetJson?.data || []).find((q: { planId: string }) => q.planId === 'plan_3_maestria');
    check('resetUsed=true reinicia used=0 y remaining=3', resetRes.status === 200 && m3?.used === 0 && m3?.remaining === 3);
  }

  // ═══ 6. GET /api/clients DEVUELVE planId Y planName ═══
  section('6. GET /api/clients expone planId y planName');
  {
    // Cliente A vinculado por clientAccountId / healthFormId (activePlanId = 'plan_3_maestria' tras paso 5)
    const clientA = await createDisposableClient(db, testCoachId);
    await db.collection('healthforms').updateOne(
      { _id: clientA._id },
      { $set: { clientAccountId: clientAccount._id.toString(), submissionDate: new Date() } }
    );
    await ClientAccount.findByIdAndUpdate(clientAccount._id, { healthFormId: clientA._id.toString() });

    // Cliente B con planId directo en healthforms (compatibilidad legacy)
    const clientB = await createDisposableClient(db, testCoachId);
    await db.collection('healthforms').updateOne(
      { _id: clientB._id },
      { $set: { planId: 'plan_1_reinicio', submissionDate: new Date() } }
    );

    // Cliente C sin plan asignado
    const clientC = await createDisposableClient(db, testCoachId);
    await db.collection('healthforms').updateOne(
      { _id: clientC._id },
      { $set: { submissionDate: new Date() } }
    );

    const listRes = await listClients(authedRequest(`${base}/clients`, 'GET', coachTok), {
      params: Promise.resolve({}),
    });
    const listJson = await listRes.json();
    const rows = (listJson?.data || []) as Array<{ _id: string; planId: string | null; planName: string | null }>;

    const rowA = rows.find((r) => r._id === clientA._id.toString());
    const rowB = rows.find((r) => r._id === clientB._id.toString());
    const rowC = rows.find((r) => r._id === clientC._id.toString());

    check(
      'GET /api/clients → 200 y resuelve planId/planName desde ClientAccount y healthforms',
      listRes.status === 200 &&
        rowA?.planId === 'plan_3_maestria' &&
        rowA?.planName === 'Plan 3: Maestría y Longevidad' &&
        rowB?.planId === 'plan_1_reinicio' &&
        rowB?.planName === 'Plan 1: Reinicio Metabólico' &&
        rowC?.planId === null &&
        rowC?.planName === null,
      JSON.stringify({ rowA, rowB, rowC })
    );
  }

  await mongo.close();
}

main()
  .catch((e) => {
    console.error('💥 Plan quotas suite falló:', e);
    failures++;
  })
  .finally(async () => {
    await runCleanup();
    try {
      const { db, mongo } = await connectDB();
      if (testCoachId) {
        const coachFilters: Array<string | ObjectId> = ObjectId.isValid(testCoachId) ? [testCoachId, new ObjectId(testCoachId)] : [testCoachId];
        const n1 = await db.collection('notifications').deleteMany({ coachId: { $in: coachFilters } });
        if (n1.deletedCount > 0) {
          console.log(`🧹 Cleanup notifications (testCoach): ${n1.deletedCount} borrados`);
        }
      }
      if (consultLeadEmail) {
        const escaped = consultLeadEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const n2 = await db.collection('notifications').deleteMany({
          message: { $regex: escaped, $options: 'i' },
        });
        if (n2.deletedCount > 0) {
          console.log(`🧹 Cleanup notifications (consultLead): ${n2.deletedCount} borrados`);
        }
      }
      if (planQuotasCaptured) {
        const pqCol = db.collection('plan_quotas');
        await pqCol.deleteMany({});
        if (originalPlanQuotas.length > 0) {
          await pqCol.insertMany(originalPlanQuotas);
          console.log(`🧹 plan_quotas restaurada (${originalPlanQuotas.length} docs)`);
        } else {
          console.log('🧹 plan_quotas restaurada (vacía, como al inicio)');
        }
      }
      await mongo.close();
    } catch {
      /* noop */
    }
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 PLAN QUOTAS: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

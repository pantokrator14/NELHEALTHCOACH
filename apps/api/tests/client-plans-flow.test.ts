/**
 * SUITE CLIENT PLANS FLOW — 5 planes comerciales, autoregistro OTP, gate de pago,
 * formulario de salud in-dashboard, aislamiento por coach (Manuel Martínez),
 * autorización estricta del cliente (edición permitida, borrado prohibido),
 * filtrado de sesiones de IA (solo approved/sent visibles al cliente),
 * límites de evaluación IA por plan y flujo Lead de Consulta 1 a 1 (sin cuenta).
 *
 * PERFILES DESECHABLES: todo lo creado (client_accounts, healthforms, coaches,
 * leads, notifications, ai_jobs) se limpia en `finally`. Además se desactiva
 * EmailService antes de importar los routes para no enviar correos reales.
 *
 * Correr: cd apps/api && npx tsx tests/client-plans-flow.test.ts
 */
process.env.EMAIL_ENABLED = 'false';

import 'dotenv/config';
import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { ObjectId, type Document } from 'mongodb';
import {
  connectDB,
  createDisposableCoach,
  registerCleanup,
  registerClientWithJobs,
  runCleanup,
  authedRequest,
  anonRequest,
  coachToken,
  uniqueId,
  JWT_SECRET,
} from './helpers';
import jwt from 'jsonwebtoken';

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

let testEmail = '';
let consultLeadEmail = '';
let createdClientAccountId = '';
let createdHealthFormId = '';
let createdNotificationIdPattern = '';
let originalPlanQuotas: Document[] = [];
let planQuotasCaptured = false;

async function main() {
  // Imports dinámicos después de fijar EMAIL_ENABLED=false
  const { GET: getPlans } = await import('../src/app/api/plans/route');
  const { POST: registerClient } = await import('../src/app/api/auth/client/register/route');
  const { POST: verifyClientCode } = await import('../src/app/api/auth/client/verify-code/route');
  const { POST: login } = await import('../src/app/api/auth/login/route');
  const { GET: getMe } = await import('../src/app/api/auth/me/route');
  const { GET: getClientPortalMe } = await import('../src/app/api/client-portal/me/route');
  const { POST: submitClientHealthForm } = await import('../src/app/api/client-portal/health-form/route');
  const { GET: listClients } = await import('../src/app/api/clients/route');
  const {
    GET: getClientById,
    PUT: updateClientById,
    DELETE: deleteClientById,
  } = await import('../src/app/api/clients/[id]/route');
  const { DELETE: deleteClientUpload } = await import('../src/app/api/clients/[id]/upload/route');
  const { GET: getClientAI, POST: generateClientAI, PUT: updateClientAI } = await import(
    '../src/app/api/clients/[id]/ai/route'
  );
  const { GET: listRecipes, POST: createRecipe } = await import('../src/app/api/recipes/route');
  const { GET: getRecipeById } = await import('../src/app/api/recipes/[id]/route');
  const { GET: listExercises, POST: createExercise } = await import('../src/app/api/exercises/route');
  const { POST: analyzeRecipeImage } = await import('../src/app/api/recipes/analyze-image/route');
  const { resolveCoachTimezone, resolveClientTimezone } = await import('../src/app/lib/timezone');
  const { default: ClientAccount, hashVerificationCode } = await import('../src/app/models/ClientAccount');
  const { emailHashVariants } = await import('../src/app/models/Coach');
  const { resolveDefaultCoach } = await import('../src/app/lib/default-coach');
  const { recordClientPlanPurchase } = await import('../src/app/lib/plan-fulfillment');
  const { consultCheckoutSchema } = await import('../src/app/lib/schemas/index');
  const { handleCheckoutCompleted } = await import('../src/app/lib/stripe-webhook');
  const { encrypt, decrypt } = await import('../src/app/lib/encryption');

  const { db, mongo } = await connectDB();
  originalPlanQuotas = await db.collection('plan_quotas').find({}).toArray();
  planQuotasCaptured = true;
  const base = 'http://localhost:3001/api';

  const defaultCoach = await resolveDefaultCoach();
  const otherCoach = await createDisposableCoach(db);
  const otherCoachToken = coachToken(otherCoach.id.toString(), 'coach');
  const defaultCoachToken = coachToken(defaultCoach.coachId, 'coach');

  testEmail = `tdd_client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  consultLeadEmail = `tdd_consult_lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  const testPassword = `Tdd_${randomBytes(6).toString('hex')}A1!`;
  const visitorId = uniqueId('visitor_client');

  // ═══ 1. CATÁLOGO DE 5 PLANES COMERCIALES ═══
  section('1. GET /api/plans — 5 productos y especificaciones');
  {
    const res = await getPlans(anonRequest(`${base}/plans`, 'GET'), { params: Promise.resolve({}) });
    const json = await res.json();
    const plans = json?.data || [];

    check('GET /api/plans → 200', res.status === 200, `status=${res.status}`);
    check('devuelve exactamente 5 planes', Array.isArray(plans) && plans.length === 5, `len=${plans.length}`);

    const byId = Object.fromEntries(plans.map((p: Record<string, unknown>) => [p.id, p]));
    check(
      'consult_1on1: $60 launch / $80 reg / calendly / totalWeeks=0 / maxMonths=0 / whatsappTier=none',
      byId.consult_1on1?.launchPriceUsd === 60 &&
        byId.consult_1on1?.regularPriceUsd === 80 &&
        byId.consult_1on1?.videoProvider === 'calendly_meet' &&
        byId.consult_1on1?.requiresHealthForm === false &&
        byId.consult_1on1?.livekitSessionsIncluded === 0 &&
        byId.consult_1on1?.totalWeeks === 0 &&
        byId.consult_1on1?.maxMonths === 0 &&
        byId.consult_1on1?.whatsappTier === 'none' &&
        typeof byId.consult_1on1?.calendlyUrl === 'string' &&
        byId.consult_1on1.calendlyUrl.includes('calendly.com')
    );
    check(
      'reto_tres_nel: $97 launch / $130 reg / video=1 / totalWeeks=3 / maxMonths=1 / reto_3w',
      byId.reto_tres_nel?.launchPriceUsd === 97 &&
        byId.reto_tres_nel?.regularPriceUsd === 130 &&
        byId.reto_tres_nel?.videoProvider === 'livekit' &&
        byId.reto_tres_nel?.livekitSessionsIncluded === 1 &&
        byId.reto_tres_nel?.totalWeeks === 3 &&
        byId.reto_tres_nel?.maxMonths === 1 &&
        byId.reto_tres_nel?.whatsappTier === 'reto_3w' &&
        byId.reto_tres_nel?.requiresHealthForm === true
    );
    check(
      'plan_1_reinicio: $150 launch / $200 reg / video=2 / totalWeeks=4 / maxMonths=1',
      byId.plan_1_reinicio?.launchPriceUsd === 150 &&
        byId.plan_1_reinicio?.regularPriceUsd === 200 &&
        byId.plan_1_reinicio?.videoProvider === 'livekit' &&
        byId.plan_1_reinicio?.livekitSessionsIncluded === 2 &&
        byId.plan_1_reinicio?.totalWeeks === 4 &&
        byId.plan_1_reinicio?.maxMonths === 1 &&
        byId.plan_1_reinicio?.whatsappTier === 'weekly_async'
    );
    check(
      'plan_2_transformacion: $340 launch / $450 reg / sessions=4 / maxMonths=3 / RECOMENDADO',
      byId.plan_2_transformacion?.launchPriceUsd === 340 &&
        byId.plan_2_transformacion?.regularPriceUsd === 450 &&
        byId.plan_2_transformacion?.livekitSessionsIncluded === 4 &&
        byId.plan_2_transformacion?.totalWeeks === 4 &&
        byId.plan_2_transformacion?.maxMonths === 3 &&
        byId.plan_2_transformacion?.whatsappTier === 'direct' &&
        byId.plan_2_transformacion?.badge === 'RECOMENDADO'
    );
    check(
      'plan_3_maestria: $590 launch / $900 reg / sessions=7 / maxMonths=6 / priority',
      byId.plan_3_maestria?.launchPriceUsd === 590 &&
        byId.plan_3_maestria?.regularPriceUsd === 900 &&
        byId.plan_3_maestria?.livekitSessionsIncluded === 7 &&
        byId.plan_3_maestria?.totalWeeks === 4 &&
        byId.plan_3_maestria?.maxMonths === 6 &&
        byId.plan_3_maestria?.whatsappTier === 'priority'
    );

    const rawPlansText = JSON.stringify(plans).toLowerCase();
    const customerCopyText = plans
      .map((p: Record<string, unknown>) =>
        JSON.stringify([
          p.name,
          p.subtitle,
          p.badge,
          p.modalitySummary,
          p.whatsappSupport,
          p.description,
          p.roadmap,
          p.includes,
          p.ctaLabel,
        ])
      )
      .join(' ')
      .toLowerCase();
    check('sin mención de "biblioteca avanzada"', !rawPlansText.includes('biblioteca avanzada'));
    check('sin mención comercial de "livekit" en textos visibles al cliente', !customerCopyText.includes('livekit'));
    check('sin mención de "calendly" ni "google meet" en textos visibles al cliente', !customerCopyText.includes('calendly') && !customerCopyText.includes('google meet'));
    check('sin badge "más popular"', !customerCopyText.includes('más popular'));
    check('no filtra stripePriceEnvKey público', !rawPlansText.includes('stripepriceenvkey'));
  }

  // ═══ 2. AUTOREGISTRO DE CLIENTE + VERIFICACIÓN OTP DE 6 DÍGITOS ═══
  section('2. Autoregistro OTP y Login de Cliente');
  {
    const regReq = new NextRequest(`${base}/auth/client/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `test-reg-${Date.now()}`,
        'x-visitor-id': visitorId,
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        planId: 'plan_2_transformacion',
      }),
    });
    const regRes = await registerClient(regReq, { params: Promise.resolve({}) });
    const regJson = await regRes.json();
    check('POST /api/auth/client/register → 201', regRes.status === 201, `status=${regRes.status} msg=${regJson?.message}`);

    const accountDoc = await db.collection('client_accounts').findOne({
      emailHash: { $in: emailHashVariants(testEmail) },
    });
    check('ClientAccount creado en MongoDB', !!accountDoc);
    if (accountDoc?._id) {
      createdClientAccountId = accountDoc._id.toString();
      registerCleanup('client_accounts', accountDoc._id);
    }
    check(
      'asignado automáticamente al coach por defecto (Manuel Martínez)',
      accountDoc?.coachId === defaultCoach.coachId,
      `got=${accountDoc?.coachId} expected=${defaultCoach.coachId}`
    );
    check('emailVerified inicial es false', accountDoc?.emailVerified === false);

    // Login antes de verificar OTP → bloqueado 403
    const preLoginReq = new NextRequest(`${base}/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `test-login-pre-${Date.now()}`,
        'x-visitor-id': visitorId,
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const preLoginRes = await login(preLoginReq, { params: Promise.resolve({}) });
    const preLoginJson = await preLoginRes.json();
    check(
      'login antes de verificar OTP → 403 con needsEmailVerification',
      preLoginRes.status === 403 && preLoginJson?.needsEmailVerification === true,
      `status=${preLoginRes.status}`
    );

    // OTP inválido → 400 e incrementa attempts
    const badOtpReq = new NextRequest(`${base}/auth/client/verify-code`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `test-otp-bad-${Date.now()}`,
        'x-visitor-id': visitorId,
      },
      body: JSON.stringify({ email: testEmail, code: '000000' }),
    });
    const badOtpRes = await verifyClientCode(badOtpReq, { params: Promise.resolve({}) });
    check('OTP incorrecto → 400', badOtpRes.status === 400, `status=${badOtpRes.status}`);

    const afterBadOtp = await db.collection('client_accounts').findOne({ _id: accountDoc?._id });
    check(
      'verificationCodeAttempts incrementado tras fallo',
      Number(afterBadOtp?.verificationCodeAttempts || 0) >= 1
    );

    // Inyectar OTP conocido (no dependemos de buzón externo) y verificar vía endpoint real
    const knownOtp = '482913';
    await ClientAccount.findByIdAndUpdate(createdClientAccountId, {
      verificationCodeHash: hashVerificationCode(testEmail, knownOtp),
      verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verificationCodeAttempts: 0,
    });

    const goodOtpReq = new NextRequest(`${base}/auth/client/verify-code`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `test-otp-ok-${Date.now()}`,
        'x-visitor-id': visitorId,
      },
      body: JSON.stringify({ email: testEmail, code: knownOtp }),
    });
    const goodOtpRes = await verifyClientCode(goodOtpReq, { params: Promise.resolve({}) });
    check('OTP correcto → 200', goodOtpRes.status === 200, `status=${goodOtpRes.status}`);

    const verifiedDoc = await db.collection('client_accounts').findOne({ _id: accountDoc?._id });
    check(
      'emailVerified=true y verificationCodeHash limpiado',
      verifiedDoc?.emailVerified === true && verifiedDoc?.verificationCodeHash === null
    );
  }

  // Login tras verificar OTP
  let clientToken = '';
  {
    const okLoginReq = new NextRequest(`${base}/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `test-login-ok-${Date.now()}`,
        'x-visitor-id': visitorId,
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const okLoginRes = await login(okLoginReq, { params: Promise.resolve({}) });
    const okLoginJson = await okLoginRes.json();
    clientToken = okLoginJson?.token || '';
    check('login cliente verificado → 200 + token', okLoginRes.status === 200 && !!clientToken, `status=${okLoginRes.status}`);
    check('role === "client" en respuesta de login', okLoginJson?.coach?.role === 'client');
    check('coachId apunta a Manuel Martínez', okLoginJson?.coach?.coachId === defaultCoach.coachId);

    const meRes = await getMe(authedRequest(`${base}/auth/me`, 'GET', clientToken), { params: Promise.resolve({}) });
    const meJson = await meRes.json();
    check('GET /api/auth/me con token cliente → 200 y role=client', meRes.status === 200 && meJson?.data?.role === 'client');
  }

  // ═══ 3. GATE DE PAGO + ONBOARDING HEALTH FORM IN-DASHBOARD ═══
  section('3. Gate de pago y creación de historial de salud');
  {
    const portalPreRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalPreJson = await portalPreRes.json();
    check(
      'portal/me antes de pagar → hasPaidPlan=false, hasCompletedHealthForm=false',
      portalPreRes.status === 200 &&
        portalPreJson?.data?.hasPaidPlan === false &&
        !portalPreJson?.data?.healthFormId
    );

    const sampleHealthFormPayload = {
      coachId: otherCoach.id.toString(), // spoof intencional — el backend debe ignorarlo y forzar Manuel Martínez
      contractAccepted: true,
      contractVersion: 'v1.0-test',
      personalData: {
        name: `Test Client Plans ${Date.now()}`,
        email: 'spoof-attacker@evil.com', // spoof intencional — el backend debe forzar testEmail
        phone: '+15550199999',
        address: 'Calle Prueba 123',
        birthDate: '1990-05-15',
        gender: 'male',
        age: '35',
        weight: '78',
        height: '176',
        maritalStatus: 'soltero',
        education: 'universitario',
        occupation: 'ingeniero',
        language: 'es',
      },
      medicalData: {
        mainComplaint: 'Fatiga matutina',
        medications: 'Ninguno',
        supplements: 'Magnesio',
        currentPastConditions: 'Ninguna',
        additionalMedicalHistory: '',
        employmentHistory: '',
        hobbies: 'Caminar',
        allergies: 'Ninguna',
        surgeries: 'Ninguna',
        housingHistory: '',
        carbohydrateAddiction: [],
        leptinResistance: [],
        circadianRhythms: [],
        sleepHygiene: [],
        electrosmogExposure: [],
        generalToxicity: [],
        microbiotaHealth: [],
      },
    };

    // Sin pago → 402
    const unpaidRes = await submitClientHealthForm(
      authedRequest(`${base}/client-portal/health-form`, 'POST', clientToken, sampleHealthFormPayload),
      { params: Promise.resolve({}) }
    );
    check('POST /api/client-portal/health-form sin plan pagado → 402', unpaidRes.status === 402, `status=${unpaidRes.status}`);

    // Simular cumplimiento idempotente de pago Stripe (Plan 2 = 4 créditos de videollamada: inicial + 3 mensuales)
    const fakeSessionId = uniqueId('cs_test_plan2');
    await recordClientPlanPurchase({
      clientAccountId: createdClientAccountId,
      planId: 'plan_2_transformacion',
      stripeSessionId: fakeSessionId,
    });
    // Repetir con el mismo sessionId para validar idempotencia
    const fulfilledAccount = await recordClientPlanPurchase({
      clientAccountId: createdClientAccountId,
      planId: 'plan_2_transformacion',
      stripeSessionId: fakeSessionId,
    });

    check(
      'recordClientPlanPurchase es idempotente y asigna 4 créditos de videollamada',
      fulfilledAccount.purchasedPlans.length === 1 &&
        fulfilledAccount.activePlanId === 'plan_2_transformacion' &&
        fulfilledAccount.purchasedPlans[0].livekitCreditsTotal === 4
    );

    // Con pago → 201 + refresca JWT con clientId
    const paidRes = await submitClientHealthForm(
      authedRequest(`${base}/client-portal/health-form`, 'POST', clientToken, sampleHealthFormPayload),
      { params: Promise.resolve({}) }
    );
    const paidJson = await paidRes.json();
    check(
      'POST /api/client-portal/health-form tras pago → 201',
      paidRes.status === 201 && !!paidJson?.data?._id && !!paidJson?.data?.token,
      `status=${paidRes.status} msg=${paidJson?.message}`
    );

    createdHealthFormId = paidJson?.data?._id || '';
    createdNotificationIdPattern = createdHealthFormId;
    if (createdHealthFormId) {
      registerClientWithJobs(createdHealthFormId);
    }
    if (paidJson?.data?.token) {
      clientToken = paidJson.data.token;
    }

    const storedForm = await db.collection('healthforms').findOne({ _id: new ObjectId(createdHealthFormId) });
    check('healthForm guardado con coachId forzado a Manuel Martínez (anti-spoof)', storedForm?.coachId === defaultCoach.coachId);
    check(
      'personalData.email forzado al correo verificado (anti-spoof)',
      !!storedForm?.personalData?.email && decrypt(String(storedForm.personalData.email)) === testEmail
    );
    check('planId guardado en healthForm', storedForm?.planId === 'plan_2_transformacion');

    // Doble envío bloqueado con 409
    const dupRes = await submitClientHealthForm(
      authedRequest(`${base}/client-portal/health-form`, 'POST', clientToken, sampleHealthFormPayload),
      { params: Promise.resolve({}) }
    );
    check('segundo envío de health-form → 409 conflict', dupRes.status === 409, `status=${dupRes.status}`);

    // Verificar planLimits en GET /api/client-portal/me tras pago
    const portalPostRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalPostJson = await portalPostRes.json();
    const limits = portalPostJson?.data?.planLimits;
    check(
      'portal/me devuelve planLimits completo para Plan 2',
      portalPostRes.status === 200 &&
        limits?.totalWeeks === 4 &&
        limits?.maxMonths === 3 &&
        limits?.whatsappTier === 'direct' &&
        limits?.includesVideoCalls === true &&
        limits?.includesBiomarkerComparison === true
    );
  }

  // ═══ 4. AISLAMIENTO POR COACH (SOLO MANUEL MARTÍNEZ / ADMIN) ═══
  section('4. Aislamiento exclusivo hacia Manuel Martínez');
  {
    const otherListRes = await listClients(
      authedRequest(`${base}/clients`, 'GET', otherCoachToken),
      { params: Promise.resolve({}) }
    );
    const otherListJson = await otherListRes.json();
    const otherIds = (otherListJson?.data || []).map((c: Record<string, unknown>) => String(c._id));
    check('otro coach NO ve al cliente en GET /api/clients', !otherIds.includes(createdHealthFormId));

    const otherGetRes = await getClientById(
      authedRequest(`${base}/clients/${createdHealthFormId}`, 'GET', otherCoachToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('otro coach recibe 404 en GET /api/clients/[id]', otherGetRes.status === 404, `status=${otherGetRes.status}`);

    const manuelListRes = await listClients(
      authedRequest(`${base}/clients`, 'GET', defaultCoachToken),
      { params: Promise.resolve({}) }
    );
    const manuelListJson = await manuelListRes.json();
    const manuelIds = (manuelListJson?.data || []).map((c: Record<string, unknown>) => String(c._id));
    check('Manuel Martínez SÍ ve al cliente en GET /api/clients', manuelIds.includes(createdHealthFormId));

    const manuelGetRes = await getClientById(
      authedRequest(`${base}/clients/${createdHealthFormId}`, 'GET', defaultCoachToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const manuelGetJson = await manuelGetRes.json();
    const ps = manuelGetJson?.data?.planSummary;
    check('Manuel Martínez accede al perfil con GET /api/clients/[id] → 200', manuelGetRes.status === 200);
    check(
      'GET /api/clients/[id] incluye planSummary con créditos y límites del plan',
      ps?.id === 'plan_2_transformacion' &&
        ps?.totalWeeks === 4 &&
        ps?.maxMonths === 3 &&
        ps?.videoCreditsTotal === 4 &&
        ps?.videoCreditsRemaining === 4
    );
  }

  // ═══ 5. LÍMITES DE AUTORIZACIÓN DEL CLIENTE ═══
  section('5. Restricciones de rol client (sin rutas de coach ni eliminación)');
  {
    const listRes = await listClients(authedRequest(`${base}/clients`, 'GET', clientToken), {
      params: Promise.resolve({}),
    });
    check('cliente en GET /api/clients → 403', listRes.status === 403, `status=${listRes.status}`);

    const otherClientId = new ObjectId().toString();
    const foreignRes = await getClientById(
      authedRequest(`${base}/clients/${otherClientId}`, 'GET', clientToken),
      { params: Promise.resolve({ id: otherClientId }) }
    );
    check(
      'cliente consultando otro clientId → 403/404',
      foreignRes.status === 403 || foreignRes.status === 404,
      `status=${foreignRes.status}`
    );

    const recipeRes = await createRecipe(
      authedRequest(`${base}/recipes`, 'POST', clientToken, {
        title: 'Intento cliente',
        description: 'No permitido',
        category: ['desayuno'],
        ingredients: ['agua'],
        instructions: ['hervir'],
        cookTime: 5,
        difficulty: 'easy',
      }),
      { params: Promise.resolve({}) }
    );
    check('cliente en POST /api/recipes → 403', recipeRes.status === 403, `status=${recipeRes.status}`);

    const exerciseRes = await createExercise(
      authedRequest(`${base}/exercises`, 'POST', clientToken, {
        name: 'Intento cliente',
        description: 'No permitido',
        category: ['fuerza'],
        instructions: ['hacer'],
        equipment: ['ninguno'],
        difficulty: 'easy',
        clientLevel: 'principiante',
        muscleGroups: ['core'],
        sets: 3,
        repetitions: '10',
        timeUnderTension: '2-1-2',
        restBetweenSets: '60s',
        progression: 'Ninguna',
        tags: ['test'],
      }),
      { params: Promise.resolve({}) }
    );
    check('cliente en POST /api/exercises → 403', exerciseRes.status === 403, `status=${exerciseRes.status}`);

    const genAIRes = await generateClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'POST', clientToken, { monthNumber: 1 }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('cliente en POST /api/clients/[id]/ai → 403', genAIRes.status === 403, `status=${genAIRes.status}`);

    const putAIRes = await updateClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'PUT', clientToken, {
        action: 'approve',
        sessionId: 'fake',
      }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('cliente en PUT /api/clients/[id]/ai → 403', putAIRes.status === 403, `status=${putAIRes.status}`);

    const delClientRes = await deleteClientById(
      authedRequest(`${base}/clients/${createdHealthFormId}`, 'DELETE', clientToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('cliente en DELETE /api/clients/[id] → 403 (prohibido borrar perfil)', delClientRes.status === 403, `status=${delClientRes.status}`);

    const delDocRes = await deleteClientUpload(
      authedRequest(`${base}/clients/${createdHealthFormId}/upload`, 'DELETE', clientToken, {
        fileKey: 'documents/test.pdf',
      }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('cliente en DELETE /api/clients/[id]/upload → 403 (prohibido borrar docs)', delDocRes.status === 403, `status=${delDocRes.status}`);
  }

  // ═══ 6. AUTOEDICIÓN SEGURA Y FILTRADO DE IA (SOLO APPROVED/SENT) ═══
  section('6. Autoedición segura y filtrado de sesiones IA');
  {
    const encryptedTestDoc = {
      url: encrypt('https://example.com/lab.pdf'),
      key: encrypt('documents/lab-test.pdf'),
      name: encrypt('lab-test.pdf'),
      type: encrypt('application/pdf'),
      size: 12345,
      uploadedAt: new Date().toISOString(),
    };

    const draftSessionId = 'session_tdd_draft_01';
    const approvedSessionId = 'session_tdd_approved_02';

    const makeSession = (sessionId: string, status: 'draft' | 'approved', summary: string) => ({
      sessionId,
      monthNumber: 1,
      totalWeeks: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      status,
      summary: encrypt(summary),
      vision: encrypt(`Visión ${status}`),
      medicalSummary: encrypt(''),
      medicalComparativeAnalysis: encrypt(''),
      weeks: [],
      checklist: [],
    });

    // Solo sesión draft + generationError presente
    await db.collection('healthforms').updateOne(
      { _id: new ObjectId(createdHealthFormId) },
      {
        $set: {
          'medicalData.documents': [encryptedTestDoc],
          aiProgress: {
            clientId: createdHealthFormId,
            currentSessionId: draftSessionId,
            overallProgress: 0,
            generationError: { message: 'Error interno coach', timestamp: new Date() },
            sessions: [makeSession(draftSessionId, 'draft', 'Borrador privado del coach')],
          },
        },
      }
    );

    const draftOnlyClientAI = await getClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'GET', clientToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const draftOnlyClientJson = await draftOnlyClientAI.json();
    check(
      'cliente NO ve sesión draft ni generationError en GET /ai',
      draftOnlyClientAI.status === 200 &&
        draftOnlyClientJson?.data?.hasAIProgress === false &&
        (draftOnlyClientJson?.data?.aiProgress?.sessions || []).length === 0 &&
        draftOnlyClientJson?.data?.generationError === null
    );

    const coachDraftAI = await getClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'GET', defaultCoachToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const coachDraftJson = await coachDraftAI.json();
    check(
      'coach SÍ ve la sesión draft en GET /ai',
      coachDraftAI.status === 200 &&
        coachDraftJson?.data?.hasAIProgress === true &&
        coachDraftJson?.data?.aiProgress?.sessions?.length === 1
    );

    // Agregar sesión aprobada manteniendo currentSessionId apuntando al draft (edge case)
    await db.collection('healthforms').updateOne(
      { _id: new ObjectId(createdHealthFormId) },
      {
        $push: {
          'aiProgress.sessions': makeSession(approvedSessionId, 'approved', 'Plan aprobado para cliente') as never,
        },
      }
    );

    const mixedClientAI = await getClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'GET', clientToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const mixedClientJson = await mixedClientAI.json();
    const visibleSessions = mixedClientJson?.data?.aiProgress?.sessions || [];
    check(
      'cliente ve SOLO la sesión approved y no filtra currentSessionId del draft',
      mixedClientAI.status === 200 &&
        mixedClientJson?.data?.hasAIProgress === true &&
        visibleSessions.length === 1 &&
        visibleSessions[0]?.sessionId === approvedSessionId &&
        mixedClientJson?.data?.aiProgress?.currentSessionId === approvedSessionId &&
        mixedClientJson?.data?.generationError === null
    );

    // Cliente edita su propia información intentando spoofear email y vaciar documents
    const editRes = await updateClientById(
      authedRequest(`${base}/clients/${createdHealthFormId}`, 'PUT', clientToken, {
        personalData: {
          name: 'Nombre Editado Por Cliente',
          email: 'spoof-edit@evil.com',
          phone: '+15559998888',
          age: '36',
          weight: '76',
          height: '176',
          language: 'es',
        },
        medicalData: {
          mainComplaint: 'Sueño ligero actualizado',
          medications: 'Ninguno',
          documents: [], // debe preservar el documento existente en DB
        },
        contractAccepted: true,
      }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('cliente edita su propio perfil con PUT /api/clients/[id] → 200', editRes.status === 200, `status=${editRes.status}`);

    const afterEditRes = await getClientById(
      authedRequest(`${base}/clients/${createdHealthFormId}`, 'GET', clientToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const afterEditJson = await afterEditRes.json();
    const pd = afterEditJson?.data?.personalData;
    const md = afterEditJson?.data?.medicalData;
    check('nombre actualizado correctamente', pd?.name === 'Nombre Editado Por Cliente');
    check('email verificado permanece bloqueado ante PUT de cliente', pd?.email === testEmail);
    check('documentos médicos previos preservados ante PUT de cliente', Array.isArray(md?.documents) && md.documents.length === 1);
  }

  // ═══ 7. LÍMITES DE PLAN EN IA + FLUJO LEAD CONSULTA 1 A 1 ═══
  section('7. Límites por plan en POST /ai y flujo Lead Consulta 1 a 1');
  {
    const overLimitRes = await generateClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'POST', defaultCoachToken, {
        monthNumber: 4, // plan_2_transformacion permite máx. 3 meses
      }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const overLimitJson = await overLimitRes.json();
    check(
      'POST /api/clients/[id]/ai con monthNumber=4 en Plan 2 (max 3) → 403 PLAN_LIMIT_REACHED',
      overLimitRes.status === 403 && overLimitJson?.code === 'PLAN_LIMIT_REACHED',
      `status=${overLimitRes.status} code=${overLimitJson?.code}`
    );

    const invalidMonthRes = await generateClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'POST', defaultCoachToken, {
        monthNumber: 0,
      }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check(
      'POST /api/clients/[id]/ai con monthNumber=0 → 400 VALIDATION',
      invalidMonthRes.status === 400,
      `status=${invalidMonthRes.status}`
    );

    // Validación Zod + cumplimiento Lead de Consulta 1 a 1 sin crear ClientAccount
    const validLeadInput = consultCheckoutSchema.safeParse({
      name: 'Lead Consulta Test',
      email: consultLeadEmail,
      phone: '+15550001122',
      objective: 'Mejorar descanso',
    });
    const invalidLeadInput = consultCheckoutSchema.safeParse({
      name: 'A',
      email: 'no-es-email',
    });
    check('consultCheckoutSchema valida payload correcto y rechaza inválido', validLeadInput.success && !invalidLeadInput.success);

    const leadInsert = await db.collection('leads').insertOne({
      name: 'Lead Consulta Test',
      email: consultLeadEmail,
      phone: '+15550001122',
      objective: 'Mejorar descanso',
      source: 'consult_1on1',
      planId: 'consult_1on1',
      paymentStatus: 'pending',
      amountCents: 6000,
      createdAt: new Date(),
    });
    registerCleanup('leads', leadInsert.insertedId);

    const fakeConsultSessionId = uniqueId('cs_test_consult_1on1');
    await handleCheckoutCompleted({
      id: fakeConsultSessionId,
      amount_total: 6000,
      metadata: {
        type: 'consult_1on1_lead',
        leadId: leadInsert.insertedId.toString(),
        planId: 'consult_1on1',
        clientEmail: consultLeadEmail,
        clientName: 'Lead Consulta Test',
      },
    });

    const updatedLead = await db.collection('leads').findOne({ _id: leadInsert.insertedId });
    const accountForConsultLead = await db.collection('client_accounts').findOne({
      emailHash: { $in: emailHashVariants(consultLeadEmail) },
    });
    check(
      'handleCheckoutCompleted (consult_1on1_lead) marca lead como paid con stripeSessionId',
      updatedLead?.paymentStatus === 'paid' && updatedLead?.stripeSessionId === fakeConsultSessionId
    );
    check(
      'Consulta 1 a 1 NO crea ClientAccount en dashboard',
      accountForConsultLead === null
    );
  }

  // ═══ 8. RENOVACIÓN ACUMULADA, SYNC DE PLAN Y CORREO DE CIERRE IDEMPOTENTE ═══
  section('8. Renovación acumulada, cierre de programa e idempotencia');
  {
    const { calculateTotalAllowedMonths } = await import('../src/app/lib/plans');
    const { checkAndSendProgramCompletionEmail } = await import('../src/app/lib/program-completion');
    const { generateProgramCompletionEmailHTML } = await import('../src/app/lib/program-completion-template');

    check(
      'calculateTotalAllowedMonths suma Plan 1 + renovación Plan 1 = 2 meses',
      calculateTotalAllowedMonths([
        { planId: 'plan_1_reinicio', status: 'paid' },
        { planId: 'plan_1_reinicio', status: 'paid' },
      ]) === 2
    );
    check(
      'calculateTotalAllowedMonths suma Reto + Plan 2 = 4 meses',
      calculateTotalAllowedMonths([
        { planId: 'reto_tres_nel', status: 'paid' },
        { planId: 'plan_2_transformacion', status: 'paid' },
      ]) === 4
    );

    // Renovar/cambiar al cliente de pruebas (actualmente Plan 2 = 3 meses) con Plan 1 (+1 mes = 4 meses acumulados)
    const renewSessionId = uniqueId('cs_test_renew_plan1');
    await recordClientPlanPurchase({
      clientAccountId: createdClientAccountId,
      planId: 'plan_1_reinicio',
      stripeSessionId: renewSessionId,
    });

    const syncedForm = await db.collection('healthforms').findOne({ _id: new ObjectId(createdHealthFormId) });
    check(
      'recordClientPlanPurchase sincroniza healthforms.planId tras renovación/cambio',
      syncedForm?.planId === 'plan_1_reinicio'
    );

    const portalAfterRenew = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalRenewJson = await portalAfterRenew.json();
    check(
      'portal/me refleja 4 meses acumulados tras Plan 2 + Plan 1',
      portalAfterRenew.status === 200 &&
        portalRenewJson?.data?.planLimits?.maxMonths === 4 &&
        portalRenewJson?.data?.purchasedPlansCount === 2 &&
        portalRenewJson?.data?.programCompleted === false
    );

    const coachGetAfterRenew = await getClientById(
      authedRequest(`${base}/clients/${createdHealthFormId}`, 'GET', defaultCoachToken),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    const coachRenewJson = await coachGetAfterRenew.json();
    check(
      'GET /api/clients/[id] refleja planSummary.maxMonths acumulado (4)',
      coachRenewJson?.data?.planSummary?.id === 'plan_1_reinicio' &&
        coachRenewJson?.data?.planSummary?.maxMonths === 4
    );

    // monthNumber=5 debe ser rechazado con 403 PLAN_LIMIT_REACHED
    const overAccumRes = await generateClientAI(
      authedRequest(`${base}/clients/${createdHealthFormId}/ai`, 'POST', defaultCoachToken, {
        monthNumber: 5,
      }),
      { params: Promise.resolve({ id: createdHealthFormId }) }
    );
    check('POST /ai con monthNumber=5 sobre 4 acumulados → 403 PLAN_LIMIT_REACHED', overAccumRes.status === 403);

    // Con solo 1 sesión entregada, NO debe enviar correo de cierre
    const earlyCheck = await checkAndSendProgramCompletionEmail({
      healthFormId: createdHealthFormId,
      trigger: 'evaluation_sent',
    });
    check(
      'checkAndSendProgramCompletionEmail no dispara antes de completar evaluaciones',
      !earlyCheck.sent && earlyCheck.reason === 'evaluations_remaining'
    );

    // Marcar 4 sesiones entregadas (para cubrir los 4 meses acumulados)
    const makeSentSession = (m: number) => ({
      sessionId: `session_tdd_sent_0${m}`,
      monthNumber: m,
      totalWeeks: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'sent',
      summary: encrypt(`Resumen mes ${m}`),
      vision: encrypt('Visión de salud integral'),
      medicalSummary: encrypt(''),
      medicalComparativeAnalysis: m > 1 ? encrypt(`Comparativa biomarcadores mes ${m}`) : encrypt(''),
      weeks: [],
      checklist: [
        { id: `chk_${m}`, description: 'Dormir 8 horas', completed: true, weekNumber: 1, category: 'habit' },
      ],
    });

    await db.collection('healthforms').updateOne(
      { _id: new ObjectId(createdHealthFormId) },
      {
        $set: {
          'aiProgress.sessions': [makeSentSession(1), makeSentSession(2), makeSentSession(3), makeSentSession(4)],
          'aiProgress.currentSessionId': 'session_tdd_sent_04',
        },
      }
    );

    // Aunque ya tenga 4 evaluaciones enviadas, si el tiempo del plan aún no termina, NO debe completarse
    const prematureCheck = await checkAndSendProgramCompletionEmail({
      healthFormId: createdHealthFormId,
      trigger: 'evaluation_sent',
    });
    const portalPrematureRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalPrematureJson = await portalPrematureRes.json();
    check(
      'No marca programCompleted ni envía cierre mientras el tiempo del plan siga vigente',
      prematureCheck.sent === false &&
        prematureCheck.reason === 'program_still_active' &&
        portalPrematureJson?.data?.programCompleted === false
    );

    // Simular que transcurrieron los 4 meses acumulados (125 días) pero aún tiene videollamada futura agendada
    const past125Days = new Date(Date.now() - 125 * 24 * 60 * 60 * 1000);
    const past35Days = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const accForDate = await ClientAccount.findById(createdClientAccountId);
    if (accForDate && Array.isArray(accForDate.purchasedPlans)) {
      if (accForDate.purchasedPlans[0]) accForDate.purchasedPlans[0].purchasedAt = past125Days;
      if (accForDate.purchasedPlans[1]) accForDate.purchasedPlans[1].purchasedAt = past35Days;
      await accForDate.save();
    }

    const futureCallAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await db.collection('healthforms').updateOne(
      { _id: new ObjectId(createdHealthFormId) },
      {
        $set: {
          videoSessions: [
            {
              sessionId: 'vs_pending_closing',
              sessionNumber: 1,
              roomName: 'room_pending',
              scheduledAt: futureCallAt,
              durationMinutes: 45,
              timezone: 'America/New_York',
              status: 'scheduled',
            },
          ],
        },
      }
    );

    const upcomingCallCheck = await checkAndSendProgramCompletionEmail({
      healthFormId: createdHealthFormId,
      trigger: 'time_elapsed',
    });
    const portalPendingCallRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalPendingCallJson = await portalPendingCallRes.json();
    check(
      'No marca programCompleted si queda una videollamada futura agendada',
      upcomingCallCheck.sent === false &&
        upcomingCallCheck.reason === 'upcoming_video_session' &&
        portalPendingCallJson?.data?.programCompleted === false
    );

    // Marcar la videollamada como completada: ahora sí termina el programa
    await db.collection('healthforms').updateOne(
      { _id: new ObjectId(createdHealthFormId) },
      { $set: { 'videoSessions.0.status': 'completed' } }
    );

    const completionFirst = await checkAndSendProgramCompletionEmail({
      healthFormId: createdHealthFormId,
      trigger: 'evaluation_sent',
    });
    const completionSecond = await checkAndSendProgramCompletionEmail({
      healthFormId: createdHealthFormId,
      trigger: 'evaluation_sent',
    });

    check(
      'checkAndSendProgramCompletionEmail envía en la evaluación final y es idempotente',
      completionFirst.sent === true &&
        completionSecond.sent === false &&
        completionSecond.reason === 'already_sent_for_cycle'
    );

    const portalCompletedRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalCompletedJson = await portalCompletedRes.json();
    check(
      'portal/me marca programCompleted=true y evaluationsCompleted=4 tras cierre',
      portalCompletedJson?.data?.programCompleted === true &&
        portalCompletedJson?.data?.evaluationsCompleted === 4
    );

    // Nueva compra reinicia el ciclo y desactiva programCompleted
    await recordClientPlanPurchase({
      clientAccountId: createdClientAccountId,
      planId: 'plan_1_reinicio',
      stripeSessionId: uniqueId('cs_test_renew_cycle2'),
    });
    const portalNewCycleRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalNewCycleJson = await portalNewCycleRes.json();
    check(
      'Nueva compra tras cierre reinicia programCompleted=false y suma maxMonths=5',
      portalNewCycleJson?.data?.programCompleted === false &&
        portalNewCycleJson?.data?.planLimits?.maxMonths === 5
    );

    const escapedHtml = generateProgramCompletionEmailHTML({
      clientName: 'Ana <script>alert(1)</script>',
      planName: 'Plan 1',
      durationLabel: '1 mes',
      evaluationsCount: 1,
      summaryText: '<b>Progreso</b>',
      habitStats: { completed: 1, total: 1, highlights: ['<img src=x onerror=alert(1)>'] },
      coachName: 'Manuel Martínez',
      renewUrl: 'https://app.nelhealthcoach.com/dashboard/plans',
      portalUrl: 'https://app.nelhealthcoach.com/dashboard',
    });
    check(
      'Template de email de cierre escapa HTML peligroso (anti-XSS)',
      !escapedHtml.includes('<script>') &&
        !escapedHtml.includes('<img src=x') &&
        escapedHtml.includes('&lt;script&gt;')
    );
  }


  // ═══ 9. CRONOGRAMA DE VIDEOLLAMADAS, GUARD -15 MIN Y FASES DE RETO 3 SEMANAS ═══
  section('9. Cronograma de videollamadas por plan, bloqueo anticipado y Reto 3 semanas');
  {
    const { buildClientVideoSessionSchedule } = await import('../src/app/lib/plans');
    const { POST: postVideoToken } = await import('../src/app/api/video/token/route');
    const { generateClientSessionToken } = await import('../src/app/lib/auth');
    const { encryptSessionFields } = await import('../src/app/lib/recommendation-translator');

    const fixedNow = Date.UTC(2026, 5, 1, 12, 0, 0);
    const retoSchedule = buildClientVideoSessionSchedule({
      purchasedPlans: [{ planId: 'reto_tres_nel', status: 'paid', purchasedAt: new Date(fixedNow) }],
      rawVideoSessions: [],
      nowMs: fixedNow,
    });
    const diffDaysReto = retoSchedule[0]
      ? Math.round((new Date(retoSchedule[0].scheduledAt).getTime() - fixedNow) / (24 * 60 * 60 * 1000))
      : -1;
    check(
      'reto_tres_nel genera 1 videollamada estimada a +21 días con canJoin=false',
      retoSchedule.length === 1 &&
        retoSchedule[0].isEstimated === true &&
        retoSchedule[0].canJoin === false &&
        retoSchedule[0].status === 'pending_schedule' &&
        diffDaysReto === 21
    );

    const plan1Schedule = buildClientVideoSessionSchedule({
      purchasedPlans: [{ planId: 'plan_1_reinicio', status: 'paid', purchasedAt: new Date(fixedNow) }],
      rawVideoSessions: [],
      nowMs: fixedNow,
    });
    const plan1Offsets = plan1Schedule.map((s) =>
      Math.round((new Date(s.scheduledAt).getTime() - fixedNow) / (24 * 60 * 60 * 1000))
    );
    check(
      'plan_1_reinicio genera 2 slots de videollamada (inicial +1d y cierre +30d)',
      plan1Schedule.length === 2 && plan1Offsets[0] === 1 && plan1Offsets[1] === 30
    );

    const plan2Schedule = buildClientVideoSessionSchedule({
      purchasedPlans: [{ planId: 'plan_2_transformacion', status: 'paid', purchasedAt: new Date(fixedNow) }],
      rawVideoSessions: [],
      nowMs: fixedNow,
    });
    const plan2Offsets = plan2Schedule.map((s) =>
      Math.round((new Date(s.scheduledAt).getTime() - fixedNow) / (24 * 60 * 60 * 1000))
    );
    check(
      'plan_2_transformacion genera 4 slots de videollamada (inicial + 3 mensuales)',
      plan2Schedule.length === 4 &&
        plan2Offsets[0] === 1 &&
        plan2Offsets[1] === 30 &&
        plan2Offsets[2] === 60 &&
        plan2Offsets[3] === 90
    );

    const plan3Schedule = buildClientVideoSessionSchedule({
      purchasedPlans: [{ planId: 'plan_3_maestria', status: 'paid', purchasedAt: new Date(fixedNow) }],
      rawVideoSessions: [],
      nowMs: fixedNow,
    });
    const plan3Offsets = plan3Schedule.map((s) =>
      Math.round((new Date(s.scheduledAt).getTime() - fixedNow) / (24 * 60 * 60 * 1000))
    );
    check(
      'plan_3_maestria genera 7 slots de videollamada (inicial + 6 mensuales)',
      plan3Schedule.length === 7 &&
        plan3Offsets[0] === 1 &&
        plan3Offsets[6] === 180
    );

    const lockedFutureAt = new Date(fixedNow + 2 * 60 * 60 * 1000);
    const lockedSchedule = buildClientVideoSessionSchedule({
      purchasedPlans: [{ planId: 'reto_tres_nel', status: 'paid', purchasedAt: new Date(fixedNow) }],
      rawVideoSessions: [
        {
          sessionId: 'vs_locked_unit',
          sessionNumber: 1,
          roomName: 'room_locked_unit',
          scheduledAt: lockedFutureAt,
          durationMinutes: 45,
          timezone: 'UTC',
          status: 'scheduled',
        },
      ],
      nowMs: fixedNow,
    });
    check(
      'Sesión agendada a +2h queda bloqueada (canJoin=false, unlocksAt informado)',
      lockedSchedule.length === 1 &&
        lockedSchedule[0].isEstimated === false &&
        lockedSchedule[0].canJoin === false &&
        typeof lockedSchedule[0].unlocksAt === 'string'
    );

    const withinWindowAt = new Date(fixedNow + 10 * 60 * 1000);
    const openSchedule = buildClientVideoSessionSchedule({
      purchasedPlans: [{ planId: 'reto_tres_nel', status: 'paid', purchasedAt: new Date(fixedNow) }],
      rawVideoSessions: [
        {
          sessionId: 'vs_open_unit',
          sessionNumber: 1,
          roomName: 'room_open_unit',
          scheduledAt: withinWindowAt,
          durationMinutes: 45,
          timezone: 'UTC',
          status: 'scheduled',
        },
      ],
      nowMs: fixedNow,
    });
    check(
      'Sesión dentro de la ventana de -15 min habilita ingreso (canJoin=true)',
      openSchedule.length === 1 && openSchedule[0].canJoin === true && openSchedule[0].unlocksAt === null
    );

    // Probar bloqueo real en POST /api/video/token + GET /api/client-portal/me
    const futureTokenSessionAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.collection('healthforms').updateOne(
      { _id: new ObjectId(createdHealthFormId) },
      {
        $set: {
          videoSessions: [
            {
              sessionId: 'vs_future_locked',
              sessionNumber: 1,
              roomName: 'room_future_locked',
              scheduledAt: futureTokenSessionAt,
              durationMinutes: 45,
              timezone: 'UTC',
              status: 'scheduled',
            },
          ],
        },
      }
    );

    const earlyVideoJwt = generateClientSessionToken(createdHealthFormId, 'vs_future_locked', testEmail, 3600);
    const earlyJoinRes = await postVideoToken(
      anonRequest(`${base}/video/token`, 'POST', {
        role: 'client',
        roomName: 'room_future_locked',
        sessionToken: earlyVideoJwt,
      }),
      { params: Promise.resolve({}) }
    );
    const earlyJoinJson = await earlyJoinRes.json();
    check(
      'POST /api/video/token rechaza ingreso anticipado con 403 SESSION_NOT_YET_STARTED',
      earlyJoinRes.status === 403 &&
        earlyJoinJson?.code === 'SESSION_NOT_YET_STARTED' &&
        typeof earlyJoinJson?.scheduledAt === 'string' &&
        typeof earlyJoinJson?.unlocksAt === 'string',
      `status=${earlyJoinRes.status} code=${earlyJoinJson?.code}`
    );

    const portalLockedRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalLockedJson = await portalLockedRes.json();
    const portalVideoSlots = (portalLockedJson?.data?.videoSessions || []) as Array<Record<string, unknown>>;
    const lockedSlot = portalVideoSlots.find((s) => s.sessionId === 'vs_future_locked');
    check(
      'GET /api/client-portal/me expone sesión futura con canJoin=false y joinLink=null',
      portalLockedRes.status === 200 &&
        Boolean(lockedSlot) &&
        lockedSlot?.canJoin === false &&
        lockedSlot?.joinLink === null
    );

    // Encriptación de weeklyPhases para Reto 3 semanas vs planes mensuales de 4 semanas
    const encReto = encryptSessionFields({
      summary: 'Resumen reto',
      vision: 'Visión 21 días',
      weeklyPhases: [
        {
          weekNumber: 1,
          title: 'Semana 1: Depuración',
          nutritionFocus: 'Eliminar azúcares',
          exerciseFocus: 'Movilidad diaria',
          habitFocus: 'Luz solar matutina',
        },
        {
          weekNumber: 2,
          title: 'Semana 2: Sincronización',
          nutritionFocus: 'Ventana 12/12',
          exerciseFocus: 'Fuerza moderada',
          habitFocus: 'Sin pantallas nocturnas',
        },
        {
          weekNumber: 3,
          title: 'Semana 3: Energía',
          nutritionFocus: 'Cetosis limpia',
          exerciseFocus: 'Zona 2 + fuerza',
          habitFocus: 'Sueño profundo 8h',
        },
      ],
      weeks: [],
    });
    check(
      'encryptSessionFields cifra y conserva las 3 fases semanales del Reto Tres NEL',
      Array.isArray(encReto.weeklyPhases) &&
        encReto.weeklyPhases.length === 3 &&
        decrypt(encReto.weeklyPhases[0].title) === 'Semana 1: Depuración' &&
        decrypt(encReto.weeklyPhases[2].habitFocus) === 'Sueño profundo 8h'
    );

    const encFourWeeks = encryptSessionFields({
      summary: 'Resumen 4 semanas',
      vision: 'Visión 1 mes',
      weeks: [],
    });
    check(
      'Sesiones de 4 semanas mantienen weeklyPhases sin definir (sin regresión)',
      (encFourWeeks as { weeklyPhases?: unknown }).weeklyPhases === undefined
    );
  }

  // ═══ 10. DUAL-TIMEZONE, BIBLIOTECAS PLAN 2/3 Y ESCÁNER NUTRICIONAL (RBAC/CUOTAS/IDOR) ═══
  section('10. Dual-Timezone, Bibliotecas Plan 2/3 y Escáner Nutricional');
  {
    check(
      'resolveCoachTimezone() usa America/Los_Angeles (California) por defecto',
      resolveCoachTimezone() === 'America/Los_Angeles'
    );
    check(
      'resolveClientTimezone prioriza TZ explícita y usa inferencia por dirección como respaldo',
      resolveClientTimezone({ explicitTimezone: 'Europe/Madrid', address: 'Austin, USA' }) === 'Europe/Madrid' &&
        resolveClientTimezone({ explicitTimezone: 'Invalid/Zone', address: 'Av. Reforma 123, Ciudad de México, México' }) === 'America/Mexico_City'
    );

    const portalRes = await getClientPortalMe(
      authedRequest(`${base}/client-portal/me`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const portalJson = await portalRes.json();
    const limits = portalJson?.data?.planLimits;
    check(
      'GET /api/client-portal/me expone clientTimezone, coachTimezone y entitlements de Plan 2 (15 items + 5 escaneos)',
      portalRes.status === 200 &&
        typeof portalJson?.data?.clientTimezone === 'string' &&
        portalJson?.data?.coachTimezone === 'America/Los_Angeles' &&
        limits?.libraryAccess === 'limited' &&
        limits?.recipesLimit === 15 &&
        limits?.exercisesLimit === 15 &&
        limits?.nutritionScanner?.enabled === true &&
        limits?.nutritionScanner?.monthlyLimit === 5
    );

    // Crear cuenta efímera con Plan 1 (sin acceso a bibliotecas ni escáner)
    const p1Email = `tdd_p1_${Date.now()}_${randomBytes(3).toString('hex')}@test.local`;
    const p1Account = await ClientAccount.create({
      email: encrypt(p1Email),
      emailHash: emailHashVariants(p1Email)[0],
      passwordHash: randomBytes(24).toString('hex'),
      coachId: defaultCoach.coachId,
      emailVerified: true,
      selectedPlanId: 'plan_1_reinicio',
      activePlanId: 'plan_1_reinicio',
      purchasedPlans: [
        {
          planId: 'plan_1_reinicio',
          planName: 'Plan 1: Reinicio Metabólico',
          amountCents: 15000,
          stripeSessionId: uniqueId('cs_p1'),
          status: 'paid',
          purchasedAt: new Date(),
          livekitCreditsTotal: 2,
          livekitCreditsUsed: 0,
        },
      ],
    });
    registerCleanup('client_accounts', p1Account._id);
    const plan1Token = jwt.sign(
      {
        clientAccountId: p1Account._id.toString(),
        clientId: null,
        coachId: defaultCoach.coachId,
        email: p1Email,
        role: 'client',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const p1RecRes = await listRecipes(
      authedRequest(`${base}/recipes`, 'GET', plan1Token),
      { params: Promise.resolve({}) }
    );
    check('Plan 1 GET /api/recipes → 403 FORBIDDEN', p1RecRes.status === 403, `status=${p1RecRes.status}`);

    const p1ExRes = await listExercises(
      authedRequest(`${base}/exercises`, 'GET', plan1Token),
      { params: Promise.resolve({}) }
    );
    check('Plan 1 GET /api/exercises → 403 FORBIDDEN', p1ExRes.status === 403, `status=${p1ExRes.status}`);

    const p1ScanRes = await analyzeRecipeImage(
      authedRequest(`${base}/recipes/analyze-image`, 'POST', plan1Token, {
        imageBase64: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).toString('base64'),
        mimeType: 'image/jpeg',
        servings: 1,
      }),
      { params: Promise.resolve({}) }
    );
    check('Plan 1 POST /api/recipes/analyze-image → 403 FORBIDDEN', p1ScanRes.status === 403, `status=${p1ScanRes.status}`);

    // Crear borrador de receta (isPublished=false) y verificar que Plan 2 no pueda leerlo por ID (IDOR/borrador)
    const adminToken = coachToken(new ObjectId().toString(), 'admin');
    const draftRecRes = await createRecipe(
      authedRequest(`${base}/recipes`, 'POST', adminToken, {
        title: `Receta Borrador ${uniqueId('draft')}`,
        description: 'Solo uso interno',
        category: ['prueba'],
        ingredients: ['1 huevo'],
        instructions: ['Cocinar'],
        nutrition: { protein: 6, carbs: 1, fat: 5, calories: 75 },
        cookTime: 5,
        difficulty: 'easy',
        tags: ['test'],
        isPublished: false,
      }),
      { params: Promise.resolve({}) }
    );
    const draftRecJson = await draftRecRes.json();
    const draftRecId = draftRecJson?.data?.id || draftRecJson?.data?._id;
    check('Receta borrador creada para test IDOR', draftRecRes.status === 201 && Boolean(draftRecId), `status=${draftRecRes.status}`);
    if (draftRecId) {
      registerCleanup('recipes', String(draftRecId));
      const p2DraftRes = await getRecipeById(
        authedRequest(`${base}/recipes/${draftRecId}`, 'GET', clientToken),
        { params: Promise.resolve({ id: String(draftRecId) }) }
      );
      check(
        'Plan 2 GET /api/recipes/[draftId] → bloqueado (403/404)',
        p2DraftRes.status === 403 || p2DraftRes.status === 404,
        `status=${p2DraftRes.status}`
      );
    }

    // Plan 2 GET /api/recipes y /api/exercises: 200, máximo 15 items, meta.accessTier === 'limited'
    const p2RecListRes = await listRecipes(
      authedRequest(`${base}/recipes`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const p2RecListJson = await p2RecListRes.json();
    check(
      'Plan 2 GET /api/recipes → 200 con límite <= 15 y meta.accessTier=limited',
      p2RecListRes.status === 200 &&
        Array.isArray(p2RecListJson?.data) &&
        p2RecListJson.data.length <= 15 &&
        p2RecListJson?.meta?.accessTier === 'limited'
    );

    const p2ExListRes = await listExercises(
      authedRequest(`${base}/exercises`, 'GET', clientToken),
      { params: Promise.resolve({}) }
    );
    const p2ExListJson = await p2ExListRes.json();
    check(
      'Plan 2 GET /api/exercises → 200 con límite <= 15 y meta.accessTier=limited',
      p2ExListRes.status === 200 &&
        Array.isArray(p2ExListJson?.data) &&
        p2ExListJson.data.length <= 15 &&
        p2ExListJson?.meta?.accessTier === 'limited'
    );

    // IDOR bloqueado en scanner (recipeId no permitido para clientes)
    const idorScanRes = await analyzeRecipeImage(
      authedRequest(`${base}/recipes/analyze-image`, 'POST', clientToken, {
        recipeId: new ObjectId().toString(),
        servings: 1,
      }),
      { params: Promise.resolve({}) }
    );
    check('Plan 2 POST /api/recipes/analyze-image con recipeId → 403 IDOR bloqueado', idorScanRes.status === 403, `status=${idorScanRes.status}`);

    // Magic bytes inválidos → 400 (sin consumir cuota mensual)
    const badMagicRes = await analyzeRecipeImage(
      authedRequest(`${base}/recipes/analyze-image`, 'POST', clientToken, {
        imageBase64: Buffer.from('NOT_AN_IMAGE_PAYLOAD_123456').toString('base64'),
        mimeType: 'image/jpeg',
        servings: 1,
      }),
      { params: Promise.resolve({}) }
    );
    check('Plan 2 POST /api/recipes/analyze-image magic bytes inválidos → 400', badMagicRes.status === 400, `status=${badMagicRes.status}`);

    // Cuota agotada (5/5) → 429 QUOTA_EXCEEDED
    const monthKey = new Date().toISOString().slice(0, 7);
    await ClientAccount.findByIdAndUpdate(createdClientAccountId, {
      nutritionScans: { monthKey, count: 5 },
    });
    const exhaustedRes = await analyzeRecipeImage(
      authedRequest(`${base}/recipes/analyze-image`, 'POST', clientToken, {
        imageBase64: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).toString('base64'),
        mimeType: 'image/jpeg',
        servings: 1,
      }),
      { params: Promise.resolve({}) }
    );
    const exhaustedJson = await exhaustedRes.json();
    check(
      'Plan 2 POST /api/recipes/analyze-image con cuota 5/5 agotada → 429 QUOTA_EXCEEDED',
      exhaustedRes.status === 429 && exhaustedJson?.code === 'QUOTA_EXCEEDED',
      `status=${exhaustedRes.status} code=${exhaustedJson?.code}`
    );

    // Asegurar que createExercise siga referenciado sin warning
    check('createExercise importado correctamente', typeof createExercise === 'function');
  }

  await mongo.close();
}

main()
  .catch((e) => {
    console.error('💥 Client plans flow suite falló:', e);
    failures++;
  })
  .finally(async () => {
    await runCleanup();
    try {
      const { db, mongo } = await connectDB();
      const { emailHashVariants } = await import('../src/app/models/Coach');
      if (testEmail) {
        await db.collection('client_accounts').deleteMany({
          emailHash: { $in: emailHashVariants(testEmail) },
        });
      }
      if (consultLeadEmail) {
        await db.collection('client_accounts').deleteMany({
          emailHash: { $in: emailHashVariants(consultLeadEmail) },
        });
      }
      const notifFilters: Record<string, unknown>[] = [];
      if (testEmail) {
        notifFilters.push({ message: { $regex: testEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
      }
      if (consultLeadEmail) {
        notifFilters.push({ message: { $regex: consultLeadEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
      }
      if (createdNotificationIdPattern) {
        notifFilters.push({ link: `/dashboard/clients/${createdNotificationIdPattern}` });
      }
      if (notifFilters.length > 0) {
        const nRes = await db.collection('notifications').deleteMany({ $or: notifFilters });
        if (nRes.deletedCount > 0) {
          console.log(`🧹 Cleanup notifications: ${nRes.deletedCount} borrados`);
        }
      }
      if (planQuotasCaptured) {
        const pqCol = db.collection('plan_quotas');
        await pqCol.deleteMany({});
        if (originalPlanQuotas.length > 0) {
          await pqCol.insertMany(originalPlanQuotas);
        }
      }
      await mongo.close();
    } catch {
      /* noop */
    }
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 CLIENT-PLANS-FLOW: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

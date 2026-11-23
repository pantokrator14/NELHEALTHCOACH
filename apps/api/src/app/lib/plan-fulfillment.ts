// apps/api/src/app/lib/plan-fulfillment.ts
// Registra de forma idempotente la compra de un plan por un cliente y notifica a Manuel Martínez.
import { ObjectId } from 'mongodb';
import ClientAccount from '@/app/models/ClientAccount';
import Coach from '@/app/models/Coach';
import { getPlanById, type PlanId } from '@/app/lib/plans';
import { incrementPlanQuotaUsage } from '@/app/lib/plan-quotas';
import { connectMongoose, getHealthFormsCollection } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import { createNotification } from '@/app/lib/create-notification';
import { EmailService } from '@/app/lib/email-service';
import { generateOnboardingPaymentCoachNotificationHTML } from '@/app/lib/email-templates';

export async function recordClientPlanPurchase(params: {
  clientAccountId: string;
  planId: string;
  stripeSessionId: string;
  amountCents?: number;
}) {
  await connectMongoose();

  const plan = getPlanById(params.planId);
  if (!plan) {
    throw new Error(`Plan inválido: ${params.planId}`);
  }

  const account = await ClientAccount.findById(params.clientAccountId);
  if (!account) {
    throw new Error(`ClientAccount no encontrado: ${params.clientAccountId}`);
  }

  const alreadyRecorded = (account.purchasedPlans || []).some(
    (p: { stripeSessionId: string }) => p.stripeSessionId === params.stripeSessionId
  );

  if (alreadyRecorded) {
    return account;
  }

  account.purchasedPlans.push({
    planId: plan.id as PlanId,
    planName: plan.name,
    amountCents: params.amountCents ?? plan.priceCents,
    stripeSessionId: params.stripeSessionId,
    status: 'paid',
    purchasedAt: new Date(),
    livekitCreditsTotal: plan.livekitSessionsIncluded,
    livekitCreditsUsed: 0,
  });

  account.selectedPlanId = plan.id;
  account.activePlanId = plan.id;
  await account.save();

  // Incrementar cupo usado del plan de forma idempotente (solo en compra nueva)
  try {
    await incrementPlanQuotaUsage(plan.id as PlanId);
  } catch (quotaErr) {
    logger.warn('PAYMENTS', 'No se pudo incrementar cupo usado del plan', quotaErr as Error);
  }

  // Sincronizar planId en HealthForm si el cliente ya completó su historial
  if (account.healthFormId && ObjectId.isValid(account.healthFormId)) {
    try {
      const healthForms = await getHealthFormsCollection();
      await healthForms.updateOne(
        { _id: new ObjectId(account.healthFormId) },
        { $set: { planId: plan.id } }
      );
    } catch (syncErr) {
      logger.warn('PAYMENTS', 'No se pudo sincronizar planId en healthforms', syncErr as Error);
    }
  }

  const clientEmail = decrypt(account.email);

  logger.info('PAYMENTS', 'Plan de cliente registrado exitosamente', {
    clientAccountId: account._id.toString(),
    planId: plan.id,
    coachId: account.coachId,
    stripeSessionId: params.stripeSessionId,
  });

  // Notificación in-app + email a Manuel Martínez (exclusivo)
  try {
    await createNotification({
      coachId: account.coachId,
      type: 'new_client',
      title: `💳 Nuevo plan adquirido — ${plan.name}`,
      message: `${clientEmail} adquirió ${plan.name} ($${plan.launchPriceUsd} USD).`,
      link: account.healthFormId
        ? `/dashboard/clients/${account.healthFormId}`
        : '/dashboard/clients',
    });

    const coach = await Coach.findById(account.coachId).lean() as Record<string, unknown> | null;
    if (coach?.email) {
      const coachEmail = decrypt(String(coach.email));
      const coachName = coach.firstName ? decrypt(String(coach.firstName)) : 'Manuel';
      const dashboardUrl =
        (process.env.DASHBOARD_URL || 'http://localhost:3000') +
        (account.healthFormId ? `/dashboard/clients/${account.healthFormId}` : '/dashboard/clients');

      const emailService = EmailService.getInstance();
      await emailService.sendEmail({
        to: [coachEmail],
        subject: `💳 Nuevo cliente pagó ${plan.name} ($${plan.launchPriceUsd} USD) | NELHealthCoach`,
        htmlBody: generateOnboardingPaymentCoachNotificationHTML({
          coachName,
          clientName: clientEmail,
          clientEmail,
          dashboardUrl,
        }),
      });
    }
  } catch (notifyErr) {
    logger.error('PAYMENTS', 'Error notificando compra de plan al coach', notifyErr as Error);
  }

  return account;
}

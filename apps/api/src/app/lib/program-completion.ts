// apps/api/src/app/lib/program-completion.ts
// Envía un correo idempotente de felicitación + resumen de proceso cuando un cliente completa su plan.
import { ObjectId } from 'mongodb';
import ClientAccount, { type IPurchasedPlan } from '@/app/models/ClientAccount';
import Coach from '@/app/models/Coach';
import { connectMongoose, getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, safeDecrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import {
  calculateTotalAllowedMonths,
  evaluateProgramCompletionState,
  getPlanById,
} from '@/app/lib/plans';
import { EmailService } from '@/app/lib/email-service';
import { createNotification } from '@/app/lib/create-notification';

interface StoredChecklistItem {
  category?: string;
  description?: string;
  completed?: boolean;
}

interface StoredAISession {
  sessionId?: string;
  monthNumber?: number;
  status?: string;
  summary?: string;
  vision?: string;
  medicalComparativeAnalysis?: string;
  checklist?: StoredChecklistItem[];
}

interface StoredHealthForm {
  _id: ObjectId;
  coachId?: string;
  planId?: string;
  personalData?: {
    name?: string;
    email?: string;
  };
  videoSessions?: Array<{
    status?: string;
    scheduledAt?: unknown;
  }>;
  aiProgress?: {
    sessions?: StoredAISession[];
  };
}

interface ClientAccountLean {
  _id: ObjectId;
  email: string;
  coachId: string;
  activePlanId?: string | null;
  purchasedPlans?: IPurchasedPlan[];
  healthFormId?: string | null;
  lastCompletionEmailPlanCount?: number;
}

export async function checkAndSendProgramCompletionEmail(params: {
  clientAccountId?: string;
  healthFormId?: string;
  trigger: 'evaluation_sent' | 'time_elapsed';
}): Promise<{ sent: boolean; reason: string }> {
  try {
    await connectMongoose();

    let account: ClientAccountLean | null = null;
    if (params.clientAccountId && ObjectId.isValid(params.clientAccountId)) {
      account = (await ClientAccount.findById(params.clientAccountId).lean()) as ClientAccountLean | null;
    } else if (params.healthFormId) {
      account = (await ClientAccount.findOne({ healthFormId: params.healthFormId }).lean()) as ClientAccountLean | null;
    }

    if (!account) {
      return { sent: false, reason: 'no_account' };
    }

    const paidPlans = (account.purchasedPlans || []).filter((p) => p.status === 'paid');
    const paidProgramPlans = paidPlans.filter((p) => {
      const plan = getPlanById(p.planId);
      return Boolean(plan && plan.maxMonths > 0);
    });

    if (paidProgramPlans.length === 0) {
      return { sent: false, reason: 'no_program_plan' };
    }

    const latestProgramPurchase = paidProgramPlans[paidProgramPlans.length - 1];
    const resolvedPlan =
      (account.activePlanId ? getPlanById(account.activePlanId) : null) ||
      getPlanById(latestProgramPurchase.planId);

    if (!resolvedPlan || resolvedPlan.maxMonths <= 0) {
      return { sent: false, reason: 'non_program_plan' };
    }

    const prevCount = Number(account.lastCompletionEmailPlanCount || 0);
    if (prevCount >= paidPlans.length) {
      return { sent: false, reason: 'already_sent_for_cycle' };
    }

    const targetHealthFormId = account.healthFormId || params.healthFormId || '';
    if (!targetHealthFormId || !ObjectId.isValid(targetHealthFormId)) {
      return { sent: false, reason: 'no_health_form' };
    }

    const healthForms = await getHealthFormsCollection();
    const healthDoc = (await healthForms.findOne(
      { _id: new ObjectId(targetHealthFormId) },
      { projection: { personalData: 1, aiProgress: 1, videoSessions: 1, coachId: 1, planId: 1 } }
    )) as StoredHealthForm | null;

    if (!healthDoc) {
      return { sent: false, reason: 'health_form_not_found' };
    }

    const allSessions = healthDoc.aiProgress?.sessions || [];
    const deliveredSessions = allSessions
      .filter((s) => s.status === 'approved' || s.status === 'sent' || s.status === 'completed')
      .sort((a, b) => (a.monthNumber || 1) - (b.monthNumber || 1));

    const allowedMaxMonths = calculateTotalAllowedMonths(paidPlans, resolvedPlan.id);
    const completionState = evaluateProgramCompletionState({
      purchasedPlans: paidPlans,
      videoSessions: healthDoc.videoSessions || [],
    });

    if (params.trigger === 'evaluation_sent' && deliveredSessions.length < allowedMaxMonths) {
      return { sent: false, reason: 'evaluations_remaining' };
    }

    if (!completionState.timeCompleted) {
      return { sent: false, reason: 'program_still_active' };
    }

    if (completionState.hasUpcomingVideoSession) {
      return { sent: false, reason: 'upcoming_video_session' };
    }

    // Reserva atómica idempotente para evitar envíos duplicados ante concurrencia
    const claimed = await ClientAccount.findOneAndUpdate(
      {
        _id: account._id,
        $or: [
          { lastCompletionEmailPlanCount: { $lt: paidPlans.length } },
          { lastCompletionEmailPlanCount: { $exists: false } },
        ],
      },
      {
        $set: {
          lastCompletionEmailPlanCount: paidPlans.length,
          lastCompletionEmailSentAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!claimed) {
      return { sent: false, reason: 'already_sent_for_cycle' };
    }

    const clientEmail =
      safeDecrypt(account.email) ||
      safeDecrypt(healthDoc.personalData?.email || '');
    if (!clientEmail || !clientEmail.includes('@')) {
      return { sent: false, reason: 'invalid_client_email' };
    }

    const clientName = healthDoc.personalData?.name
      ? safeDecrypt(healthDoc.personalData.name) || 'Cliente'
      : 'Cliente';

    const latestSession = deliveredSessions[deliveredSessions.length - 1];
    const summaryText = latestSession?.summary ? safeDecrypt(latestSession.summary) : '';
    const visionText = latestSession?.vision ? safeDecrypt(latestSession.vision) : '';

    // Buscar el análisis comparativo más reciente si existe en alguna sesión
    const sessionWithComparison = [...deliveredSessions]
      .reverse()
      .find((s) => s.medicalComparativeAnalysis && safeDecrypt(s.medicalComparativeAnalysis).trim().length > 0);
    const biomarkerComparison = sessionWithComparison?.medicalComparativeAnalysis
      ? safeDecrypt(sessionWithComparison.medicalComparativeAnalysis)
      : '';

    const allChecklist = deliveredSessions.flatMap((s) =>
      Array.isArray(s.checklist) ? s.checklist : []
    );
    const completedItems = allChecklist.filter((item) => Boolean(item.completed));
    const highlightSource = completedItems.length > 0 ? completedItems : allChecklist;
    const seenHighlights = new Set<string>();
    const highlights: string[] = [];

    for (const item of highlightSource) {
      const text = item.description ? safeDecrypt(item.description).trim() : '';
      if (text && !seenHighlights.has(text)) {
        seenHighlights.add(text);
        highlights.push(text);
      }
      if (highlights.length >= 5) break;
    }

    let coachName = 'Manuel Martínez';
    try {
      const coachDoc = (await Coach.findById(account.coachId).lean()) as Record<string, unknown> | null;
      if (coachDoc) {
        const first = coachDoc.firstName ? decrypt(String(coachDoc.firstName)) : '';
        const last = coachDoc.lastName ? decrypt(String(coachDoc.lastName)) : '';
        const combined = `${first} ${last}`.trim();
        if (combined) coachName = combined;
      }
    } catch {
      // fallback seguro al nombre por defecto
    }

    const dashboardBase = (process.env.DASHBOARD_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const emailService = EmailService.getInstance();
    const sent = await emailService.sendProgramCompletionEmail(clientEmail, {
      clientName,
      planName: resolvedPlan.name,
      durationLabel: resolvedPlan.durationLabel,
      evaluationsCount: deliveredSessions.length,
      summaryText,
      visionText: visionText || undefined,
      habitStats: {
        completed: completedItems.length,
        total: allChecklist.length,
        highlights,
      },
      biomarkerComparison: biomarkerComparison || undefined,
      coachName,
      renewUrl: `${dashboardBase}/dashboard/plans`,
      portalUrl: `${dashboardBase}/dashboard`,
    });

    if (!sent) {
      // Liberar el lock para permitir reintento si Resend falló en producción
      await ClientAccount.updateOne(
        { _id: account._id, lastCompletionEmailPlanCount: paidPlans.length },
        { $set: { lastCompletionEmailPlanCount: prevCount } }
      );
      return { sent: false, reason: 'email_send_failed' };
    }

    await createNotification({
      coachId: account.coachId,
      type: 'ai_recommendations_ready',
      title: `🏆 Programa completado — ${clientName}`,
      message: `${clientName} completó ${resolvedPlan.name} y recibió su resumen de cierre con opción de renovación.`,
      link: `/dashboard/clients/${targetHealthFormId}`,
    });

    logger.info('EMAIL', 'Correo de cierre de programa enviado', {
      clientAccountId: account._id.toString(),
      healthFormId: targetHealthFormId,
      planId: resolvedPlan.id,
      trigger: params.trigger,
      evaluationsCount: deliveredSessions.length,
    });

    return { sent: true, reason: 'sent' };
  } catch (err: unknown) {
    logger.error(
      'EMAIL',
      'Error verificando cierre de programa',
      err instanceof Error ? err : new Error(String(err)),
      params
    );
    return { sent: false, reason: 'error' };
  }
}

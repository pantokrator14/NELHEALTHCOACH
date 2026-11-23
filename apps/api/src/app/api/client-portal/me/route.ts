import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireClientAuth } from '@/app/lib/auth';
import { connectMongoose, getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, decryptFileObject } from '@/app/lib/encryption';
import ClientAccount from '@/app/models/ClientAccount';
import Coach from '@/app/models/Coach';
import {
  calculateTotalAllowedMonths,
  evaluateProgramCompletionState,
  getPlanById,
} from '@/app/lib/plans';
import { generateClientSessionLink } from '@/app/lib/video-service';
import { apiHandler } from '@/app/lib/apiHandler';
import { logger } from '@/app/lib/logger';

async function getHandler(request: NextRequest) {
  try {
    const auth = requireClientAuth(request);
    await connectMongoose();

    const account = await ClientAccount.findById(auth.clientAccountId).select(
      '-passwordHash -verificationCodeHash'
    );
    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Cuenta de cliente no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const clientEmail = decrypt(account.email);
    const activePlan = account.activePlanId ? getPlanById(account.activePlanId) : null;
    const selectedPlan = account.selectedPlanId ? getPlanById(account.selectedPlanId) : null;

    const purchasedPlans = (account.purchasedPlans || []).map((p: Record<string, unknown>) => ({
      planId: typeof p.planId === 'string' ? p.planId : '',
      planName: typeof p.planName === 'string' ? p.planName : '',
      amountCents: Number(p.amountCents || 0),
      status: typeof p.status === 'string' ? p.status : '',
      purchasedAt: p.purchasedAt,
      livekitCreditsTotal: Number(p.livekitCreditsTotal || 0),
      livekitCreditsUsed: Number(p.livekitCreditsUsed || 0),
    }));

    const paidPlans = purchasedPlans.filter((p: { status: string }) => p.status === 'paid');

    const livekitCreditsTotal = paidPlans.reduce(
      (sum: number, p: { livekitCreditsTotal: number }) => sum + p.livekitCreditsTotal,
      0
    );
    const livekitCreditsUsed = paidPlans.reduce(
      (sum: number, p: { livekitCreditsUsed: number }) => sum + p.livekitCreditsUsed,
      0
    );

    // Resolver datos públicos de Manuel Martínez (o coach asignado)
    let assignedCoach: Record<string, unknown> | null = null;
    try {
      const coachDoc = await Coach.findById(account.coachId).lean() as Record<string, unknown> | null;
      if (coachDoc) {
        let photoUrl: string | null = null;
        if (coachDoc.profilePhoto) {
          const decryptedPhoto = decryptFileObject(coachDoc.profilePhoto as Record<string, unknown>);
          photoUrl = decryptedPhoto?.url || null;
        }
        assignedCoach = {
          id: account.coachId,
          name: `${decrypt(String(coachDoc.firstName || ''))} ${decrypt(String(coachDoc.lastName || ''))}`.trim(),
          email: coachDoc.email ? decrypt(String(coachDoc.email)) : '',
          phone: coachDoc.phone ? decrypt(String(coachDoc.phone)) : '',
          profilePhotoUrl: photoUrl,
        };
      }
    } catch {
      assignedCoach = null;
    }

    // Sesiones de videollamada y estado de recomendaciones si ya completó el historial
    let videoSessions: Array<Record<string, unknown>> = [];
    let hasApprovedRecommendations = false;
    let evaluationsCompleted = 0;
    let clientName = '';

    if (account.healthFormId && ObjectId.isValid(account.healthFormId)) {
      const healthForms = await getHealthFormsCollection();
      const healthDoc = await healthForms.findOne(
        { _id: new ObjectId(account.healthFormId) },
        { projection: { 'personalData.name': 1, videoSessions: 1, 'aiProgress.sessions': 1 } }
      );
      if (healthDoc) {
        clientName = healthDoc.personalData?.name
          ? decrypt(String(healthDoc.personalData.name))
          : '';
        const rawSessions = (healthDoc.videoSessions as Array<Record<string, unknown>>) || [];
        videoSessions = rawSessions.map((vs) => {
          const status = String(vs.status || 'scheduled');
          let joinLink: string | null = null;
          if (status === 'scheduled' || status === 'active') {
            try {
              joinLink = generateClientSessionLink(
                account.healthFormId!,
                String(vs.sessionId),
                clientEmail
              ).joinLink;
            } catch {
              joinLink = null;
            }
          }
          return {
            sessionId: vs.sessionId,
            sessionNumber: vs.sessionNumber,
            roomName: vs.roomName,
            scheduledAt: vs.scheduledAt,
            durationMinutes: vs.durationMinutes,
            timezone: vs.timezone,
            status,
            joinLink,
          };
        });

        const aiSessions = (healthDoc.aiProgress?.sessions as Array<{ status?: string }>) || [];
        const deliveredSessions = aiSessions.filter(
          (s) => s.status === 'approved' || s.status === 'sent' || s.status === 'completed'
        );
        evaluationsCompleted = deliveredSessions.length;
        hasApprovedRecommendations = evaluationsCompleted > 0;
      }
    }

    const completionState = evaluateProgramCompletionState({
      purchasedPlans,
      videoSessions,
    });
    const hasPaidProgramPlan = completionState.hasPaidProgramPlan;

    const effectiveMaxMonths = activePlan
      ? activePlan.maxMonths === 0 && !hasPaidProgramPlan
        ? 0
        : calculateTotalAllowedMonths(purchasedPlans, activePlan.id)
      : 0;

    const programCompleted = Boolean(
      activePlan && hasPaidProgramPlan && completionState.isCompleted
    );

    return NextResponse.json({
      success: true,
      data: {
        id: account._id.toString(),
        email: clientEmail,
        clientName,
        coachId: account.coachId,
        assignedCoach,
        emailVerified: account.emailVerified,
        selectedPlanId: account.selectedPlanId || null,
        activePlanId: account.activePlanId || null,
        selectedPlan,
        activePlan,
        planLimits: activePlan
          ? {
              totalWeeks: activePlan.totalWeeks,
              maxMonths: effectiveMaxMonths,
              whatsappTier: activePlan.whatsappTier,
              includesVideoCalls: activePlan.livekitSessionsIncluded > 0,
              includesBiomarkerComparison: effectiveMaxMonths > 1,
            }
          : null,
        hasPaidPlan: paidPlans.length > 0,
        purchasedPlansCount: paidPlans.length,
        evaluationsCompleted,
        programCompleted,
        purchasedPlans,
        livekitCreditsRemaining: Math.max(0, livekitCreditsTotal - livekitCreditsUsed),
        livekitCreditsTotal,
        livekitCreditsUsed,
        healthFormId: account.healthFormId || null,
        videoSessions,
        hasApprovedRecommendations,
      },
    });
  } catch (error: unknown) {
    const structured = error as { status?: number; message?: string };
    if (structured?.status === 401 || structured?.status === 403) {
      return NextResponse.json(
        {
          success: false,
          message: structured.message || 'No autorizado',
          code: structured.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
        },
        { status: structured.status }
      );
    }
    logger.error('CLIENT_PORTAL', 'Error obteniendo portal de cliente', error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const GET = apiHandler(getHandler);

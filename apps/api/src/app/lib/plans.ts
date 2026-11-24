// apps/api/src/app/lib/plans.ts
// Catálogo único (source of truth) de los 5 productos/planes comerciales de NELHEALTHCOACH.

export type PlanId =
  | 'consult_1on1'
  | 'reto_tres_nel'
  | 'plan_1_reinicio'
  | 'plan_2_transformacion'
  | 'plan_3_maestria';

export type VideoProviderType = 'calendly_meet' | 'livekit' | 'none';

export type WhatsappSupportTier =
  | 'none'
  | 'reto_3w'
  | 'weekly_async'
  | 'direct'
  | 'priority';

export type LibraryAccessTier = 'none' | 'limited' | 'full';

export const PLAN_2_LIMITED_RECIPES_COUNT = 15;
export const PLAN_2_LIMITED_EXERCISES_COUNT = 15;
export const PLAN_2_MONTHLY_SCANS_LIMIT = 5;
export const PLAN_3_MONTHLY_SCANS_LIMIT = 30;

export interface PlanEntitlements {
  libraryAccess: LibraryAccessTier;
  recipesLimit: number | null;
  exercisesLimit: number | null;
  scannerEnabled: boolean;
  scannerMonthlyLimit: number;
}

export interface CommercialPlan {
  id: PlanId;
  tier: 'top' | 'core';
  order: number;
  badge?: string;
  name: string;
  subtitle: string;
  durationLabel: string;
  totalWeeks: number;
  maxMonths: number;
  regularPriceUsd: number;
  launchPriceUsd: number;
  priceCents: number;
  discountPercent: number;
  savingsUsd: number;
  videoProvider: VideoProviderType;
  livekitSessionsIncluded: number;
  modalitySummary: string;
  whatsappSupport: string;
  whatsappTier: WhatsappSupportTier;
  description: string;
  roadmap?: string[];
  includes: string[];
  ctaLabel: string;
  requiresHealthForm: boolean;
  calendlyUrl?: string;
  stripePriceEnvKey: string;
}

export const DEFAULT_CALENDLY_URL =
  process.env.CALENDLY_CONSULT_URL ||
  'https://calendly.com/manueldejesusmartinez66/30min';

export const COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    id: 'consult_1on1',
    tier: 'top',
    order: 1,
    name: 'Consulta Privada de Diagnóstico 1 a 1',
    subtitle: '45 minutos',
    durationLabel: '45 min',
    totalWeeks: 0,
    maxMonths: 0,
    regularPriceUsd: 80,
    launchPriceUsd: 60,
    priceCents: 6000,
    discountPercent: 25,
    savingsUsd: 20,
    videoProvider: 'calendly_meet',
    livekitSessionsIncluded: 0,
    modalitySummary: 'Videollamada privada 1 a 1',
    whatsappSupport: 'No incluido',
    whatsappTier: 'none',
    description:
      'Sesión diagnóstica directa con Manuel Martínez para identificar causas raíz y diseñar un plan de acción inmediato.',
    includes: [
      'Evaluación directa de hábitos, alimentación y descanso con Manuel Martínez',
      'Diagnóstico de causas raíz y prioridades inmediatas',
      'Plan de acción personalizado al finalizar la sesión',
      'Agendamiento flexible en línea y sesión privada por videollamada',
    ],
    ctaLabel: 'Agendar Consulta — $60',
    requiresHealthForm: false,
    calendlyUrl: DEFAULT_CALENDLY_URL,
    stripePriceEnvKey: 'STRIPE_PRICE_CONSULT_1ON1',
  },
  {
    id: 'reto_tres_nel',
    tier: 'top',
    order: 2,
    name: 'Reto Tres NEL: Reinicio Ancestral y Circadiano',
    subtitle: '3 semanas',
    durationLabel: '3 semanas',
    totalWeeks: 3,
    maxMonths: 1,
    regularPriceUsd: 130,
    launchPriceUsd: 97,
    priceCents: 9700,
    discountPercent: 25.4,
    savingsUsd: 33,
    videoProvider: 'livekit',
    livekitSessionsIncluded: 1,
    modalitySummary: 'Plataforma Web + Guía PDF + WhatsApp + 1 videollamada de cierre',
    whatsappSupport: 'Seguimiento durante el reto vía WhatsApp',
    whatsappTier: 'reto_3w',
    description:
      'Programa guiado de 21 días para desinflamar tu metabolismo, sincronizar tu ritmo circadiano y recuperar tu energía.',
    roadmap: [
      'Semana 1: Limpieza y Desinflamación',
      'Semana 2: Ritmo Circadiano y Ayuno',
      'Semana 3: Energía y Estabilidad',
    ],
    includes: [
      'Acceso a la Plataforma Web y tu perfil de salud personalizado',
      'Guía práctica en PDF + recomendaciones personalizadas',
      'Acompañamiento vía WhatsApp durante las 3 semanas',
      '1 videollamada de cierre 1 a 1 integrada en la plataforma',
    ],
    ctaLabel: 'Unirme al Reto Tres NEL — $97',
    requiresHealthForm: true,
    stripePriceEnvKey: 'STRIPE_PRICE_RETO_TRES_NEL',
  },
  {
    id: 'plan_1_reinicio',
    tier: 'core',
    order: 3,
    name: 'Plan 1: Reinicio Metabólico',
    subtitle: '1 mes',
    durationLabel: '1 mes',
    totalWeeks: 4,
    maxMonths: 1,
    regularPriceUsd: 200,
    launchPriceUsd: 150,
    priceCents: 15000,
    discountPercent: 25,
    savingsUsd: 50,
    videoProvider: 'livekit',
    livekitSessionsIncluded: 2,
    modalitySummary: 'Plataforma Web + Soporte semanal vía WhatsApp + 2 videollamadas 1 a 1 (inicial y cierre)',
    whatsappSupport: 'Soporte semanal asincrónico vía WhatsApp',
    whatsappTier: 'weekly_async',
    description:
      'El punto de partida estructurado para frenar la inflamación crónica y reactivar tu metabolismo desde casa.',
    roadmap: [
      'Paso 1: Freno a la Inflamación',
      'Paso 2: Activación Metabólica',
      'Paso 3: Energía y Estabilidad',
    ],
    includes: [
      'Protocolo base y guía de alimentos limpios en plataforma web',
      'Lista de compras ancestral y recomendaciones personalizadas',
      'Soporte semanal asincrónico vía WhatsApp',
      '2 videollamadas 1 a 1 en plataforma (1 inicial + 1 de cierre)',
    ],
    ctaLabel: 'Elegir Plan 1 — $150',
    requiresHealthForm: true,
    stripePriceEnvKey: 'STRIPE_PRICE_PLAN_1_REINICIO',
  },
  {
    id: 'plan_2_transformacion',
    tier: 'core',
    order: 4,
    badge: 'RECOMENDADO',
    name: 'Plan 2: Transformación Celular',
    subtitle: '3 meses',
    durationLabel: '3 meses',
    totalWeeks: 4,
    maxMonths: 3,
    regularPriceUsd: 450,
    launchPriceUsd: 340,
    priceCents: 34000,
    discountPercent: 24.4,
    savingsUsd: 110,
    videoProvider: 'livekit',
    livekitSessionsIncluded: 4,
    modalitySummary: 'Plataforma Web + WhatsApp directo + 4 sesiones 1 a 1 por videollamada (1 inicial + 1 mensual)',
    whatsappSupport: 'Acompañamiento directo vía WhatsApp',
    whatsappTier: 'direct',
    description:
      'Acompañamiento integral de 90 días para consolidar flexibilidad metabólica real y descanso reparador.',
    roadmap: [
      'Paso 1: Sincronización Circadiana y Descanso',
      'Paso 2: Flexibilidad Metabólica Real',
      'Paso 3: Hábitos Inquebrantables',
    ],
    includes: [
      'Todo lo incluido en el Plan 1: Reinicio Metabólico',
      'Acompañamiento directo vía WhatsApp con Manuel Martínez',
      '4 sesiones 1 a 1 por videollamada en la plataforma (1 inicial + 1 mensual)',
      'Seguimiento evolutivo de análisis clínicos y recomendaciones',
      'Acceso de lectura a selección de recetas ancestrales y ejercicios (15 de cada biblioteca)',
      'Escáner nutricional por foto con IA (hasta 5 análisis por mes)',
    ],
    ctaLabel: 'Elegir Plan 2 — $340',
    requiresHealthForm: true,
    stripePriceEnvKey: 'STRIPE_PRICE_PLAN_2_TRANSFORMACION',
  },
  {
    id: 'plan_3_maestria',
    tier: 'core',
    order: 5,
    name: 'Plan 3: Maestría y Longevidad',
    subtitle: '6 meses',
    durationLabel: '6 meses',
    totalWeeks: 4,
    maxMonths: 6,
    regularPriceUsd: 900,
    launchPriceUsd: 590,
    priceCents: 59000,
    discountPercent: 34.4,
    savingsUsd: 310,
    videoProvider: 'livekit',
    livekitSessionsIncluded: 7,
    modalitySummary: 'Plataforma Web + WhatsApp prioritario + 7 sesiones 1 a 1 por videollamada (1 inicial + 1 mensual)',
    whatsappSupport: 'Canal prioritario en WhatsApp',
    whatsappTier: 'priority',
    description:
      'Programa completo de 6 meses para reducir la carga tóxica, fortalecer tu biología y lograr autonomía de por vida.',
    roadmap: [
      'Paso 1: Reducción de Carga Tóxica',
      'Paso 2: Resiliencia y Fuerza Biológica',
      'Paso 3: Autonomía de por Vida',
    ],
    includes: [
      'Acceso completo a la plataforma web y evolución de biomarcadores',
      'Canal prioritario en WhatsApp durante los 6 meses',
      '7 sesiones 1 a 1 por videollamada en la plataforma (1 inicial + 1 mensual)',
      'Ajustes continuos de nutrición, suplementación y hábitos',
      'Acceso completo de lectura a toda la biblioteca de recetas ancestrales y ejercicios',
      'Escáner nutricional por foto con IA ampliado (hasta 30 análisis por mes)',
    ],
    ctaLabel: 'Elegir Plan 3 — $590',
    requiresHealthForm: true,
    stripePriceEnvKey: 'STRIPE_PRICE_PLAN_3_MAESTRIA',
  },
];

const PLANS_BY_ID: Record<PlanId, CommercialPlan> = COMMERCIAL_PLANS.reduce(
  (acc, plan) => {
    acc[plan.id] = plan;
    return acc;
  },
  {} as Record<PlanId, CommercialPlan>
);

export function isValidPlanId(planId: unknown): planId is PlanId {
  return typeof planId === 'string' && planId in PLANS_BY_ID;
}

export function getPlanById(planId: string): CommercialPlan | null {
  if (!isValidPlanId(planId)) return null;
  return PLANS_BY_ID[planId];
}

export function getPlanEntitlements(planId: string | null | undefined): PlanEntitlements {
  if (planId === 'plan_3_maestria') {
    return {
      libraryAccess: 'full',
      recipesLimit: null,
      exercisesLimit: null,
      scannerEnabled: true,
      scannerMonthlyLimit: PLAN_3_MONTHLY_SCANS_LIMIT,
    };
  }
  if (planId === 'plan_2_transformacion') {
    return {
      libraryAccess: 'limited',
      recipesLimit: PLAN_2_LIMITED_RECIPES_COUNT,
      exercisesLimit: PLAN_2_LIMITED_EXERCISES_COUNT,
      scannerEnabled: true,
      scannerMonthlyLimit: PLAN_2_MONTHLY_SCANS_LIMIT,
    };
  }
  return {
    libraryAccess: 'none',
    recipesLimit: 0,
    exercisesLimit: 0,
    scannerEnabled: false,
    scannerMonthlyLimit: 0,
  };
}

export function resolveEffectiveClientEntitlements(
  purchasedPlans?: Array<{ planId?: unknown; status?: unknown }> | undefined,
  activePlanId?: string | null
): PlanEntitlements {
  const paidPlanIds = (purchasedPlans || [])
    .filter((item) => item?.status === 'paid' && isValidPlanId(item.planId))
    .map((item) => item.planId as PlanId);

  const candidateIds: PlanId[] = [...paidPlanIds];
  if (paidPlanIds.length === 0 && isValidPlanId(activePlanId)) {
    // Fallback solo si no existen registros de purchasedPlans aún (cuentas legacy)
    if (!purchasedPlans || purchasedPlans.length === 0) {
      candidateIds.push(activePlanId);
    }
  } else if (isValidPlanId(activePlanId) && paidPlanIds.length > 0) {
    candidateIds.push(activePlanId);
  }

  let best: PlanEntitlements = getPlanEntitlements(null);
  const tierRank: Record<LibraryAccessTier, number> = { none: 0, limited: 1, full: 2 };

  for (const id of candidateIds) {
    const ent = getPlanEntitlements(id);
    if (tierRank[ent.libraryAccess] > tierRank[best.libraryAccess]) {
      best = {
        ...best,
        libraryAccess: ent.libraryAccess,
        recipesLimit: ent.recipesLimit,
        exercisesLimit: ent.exercisesLimit,
      };
    }
    if (ent.scannerEnabled && ent.scannerMonthlyLimit > best.scannerMonthlyLimit) {
      best = {
        ...best,
        scannerEnabled: true,
        scannerMonthlyLimit: ent.scannerMonthlyLimit,
      };
    }
  }

  return best;
}

export function getPlanStripePriceId(plan: CommercialPlan): string | undefined {
  const val = process.env[plan.stripePriceEnvKey];
  return val && val.trim() ? val.trim() : undefined;
}

export function getPlanDurationDays(plan: CommercialPlan): number {
  if (plan.totalWeeks === 3) return 21;
  return Math.max(1, plan.maxMonths) * 30;
}

export interface ProgramCompletionEvaluation {
  hasPaidProgramPlan: boolean;
  timeCompleted: boolean;
  hasUpcomingVideoSession: boolean;
  cycleEndAt: Date | null;
  isCompleted: boolean;
}

export function evaluateProgramCompletionState(params: {
  purchasedPlans: Array<{ planId?: unknown; status?: unknown; purchasedAt?: unknown }> | undefined;
  videoSessions?: Array<{ status?: unknown; scheduledAt?: unknown }>;
  nowMs?: number;
}): ProgramCompletionEvaluation {
  const nowMs = typeof params.nowMs === 'number' ? params.nowMs : Date.now();
  const paidProgramPlans = (params.purchasedPlans || [])
    .filter((item) => {
      if (item?.status !== 'paid' || typeof item.planId !== 'string') return false;
      const plan = getPlanById(item.planId);
      return Boolean(plan && plan.maxMonths > 0);
    })
    .map((item) => ({
      planId: String(item.planId),
      purchasedAtMs: item.purchasedAt ? new Date(String(item.purchasedAt)).getTime() : NaN,
    }))
    .sort((a, b) => {
      const aTime = Number.isNaN(a.purchasedAtMs) ? nowMs : a.purchasedAtMs;
      const bTime = Number.isNaN(b.purchasedAtMs) ? nowMs : b.purchasedAtMs;
      return aTime - bTime;
    });

  if (paidProgramPlans.length === 0) {
    return {
      hasPaidProgramPlan: false,
      timeCompleted: false,
      hasUpcomingVideoSession: false,
      cycleEndAt: null,
      isCompleted: false,
    };
  }

  let cycleEndMs = 0;
  for (const item of paidProgramPlans) {
    const plan = getPlanById(item.planId);
    if (!plan) continue;
    const startMs = !Number.isNaN(item.purchasedAtMs) ? item.purchasedAtMs : nowMs;
    const durationMs = getPlanDurationDays(plan) * 24 * 60 * 60 * 1000;
    cycleEndMs = Math.max(cycleEndMs, startMs) + durationMs;
  }

  const timeCompleted = cycleEndMs > 0 && nowMs >= cycleEndMs;
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const hasUpcomingVideoSession = (params.videoSessions || []).some((vs) => {
    const status = typeof vs?.status === 'string' ? vs.status : '';
    if (status !== 'scheduled' && status !== 'active') return false;
    if (!vs?.scheduledAt) return true;
    const scheduledMs = new Date(String(vs.scheduledAt)).getTime();
    if (Number.isNaN(scheduledMs)) return true;
    return scheduledMs >= nowMs - twoHoursMs;
  });

  return {
    hasPaidProgramPlan: true,
    timeCompleted,
    hasUpcomingVideoSession,
    cycleEndAt: cycleEndMs > 0 ? new Date(cycleEndMs) : null,
    isCompleted: timeCompleted && !hasUpcomingVideoSession,
  };
}

export const VIDEO_JOIN_EARLY_WINDOW_MS = 15 * 60 * 1000;
export const VIDEO_JOIN_GRACE_AFTER_END_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClientScheduledVideoSlot {
  sessionId: string;
  sessionNumber: number;
  roomName: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  status: 'pending_schedule' | 'scheduled' | 'in_progress' | 'active' | 'completed' | 'cancelled' | string;
  isEstimated: boolean;
  canJoin: boolean;
  unlocksAt: string | null;
  planId: string | null;
  planName: string | null;
}

export function buildClientVideoSessionSchedule(params: {
  purchasedPlans: Array<{ planId?: unknown; status?: unknown; purchasedAt?: unknown }> | undefined;
  rawVideoSessions?: Array<Record<string, unknown>>;
  nowMs?: number;
  defaultTimezone?: string;
}): ClientScheduledVideoSlot[] {
  const nowMs = typeof params.nowMs === 'number' ? params.nowMs : Date.now();
  const fallbackTz = params.defaultTimezone || 'UTC';
  const paidProgramPlans = (params.purchasedPlans || [])
    .filter((item) => {
      if (item?.status !== 'paid' || typeof item.planId !== 'string') return false;
      const plan = getPlanById(item.planId);
      return Boolean(plan && plan.maxMonths > 0);
    })
    .map((item) => ({
      planId: String(item.planId),
      purchasedAtMs: item.purchasedAt ? new Date(String(item.purchasedAt)).getTime() : NaN,
    }))
    .sort((a, b) => {
      const aTime = Number.isNaN(a.purchasedAtMs) ? nowMs : a.purchasedAtMs;
      const bTime = Number.isNaN(b.purchasedAtMs) ? nowMs : b.purchasedAtMs;
      return aTime - bTime;
    });

  // 1. Generar los slots esperados de acuerdo a la fecha de inscripción y los planes contratados
  const expectedSlots: Array<{
    sessionNumber: number;
    projectedAtMs: number;
    planId: string;
    planName: string;
  }> = [];

  let cycleEndMs = 0;
  let globalSessionNum = 1;

  for (const item of paidProgramPlans) {
    const plan = getPlanById(item.planId);
    if (!plan) continue;
    const rawStartMs = !Number.isNaN(item.purchasedAtMs) ? item.purchasedAtMs : nowMs;
    const cycleStartMs = Math.max(cycleEndMs, rawStartMs);
    const durationMs = getPlanDurationDays(plan) * DAY_MS;
    cycleEndMs = cycleStartMs + durationMs;

    const count = plan.livekitSessionsIncluded || 0;
    for (let i = 1; i <= count; i++) {
      let offsetDays: number;
      if (plan.id === 'reto_tres_nel') {
        offsetDays = 21;
      } else if (i === 1) {
        // Sesión inicial de arranque en Plan 1, Plan 2 y Plan 3
        offsetDays = 1;
      } else {
        // Sesiones mensuales de seguimiento y cierre (días 30, 60, 90...)
        offsetDays = (i - 1) * 30;
      }
      expectedSlots.push({
        sessionNumber: globalSessionNum++,
        projectedAtMs: cycleStartMs + offsetDays * DAY_MS,
        planId: plan.id,
        planName: plan.name,
      });
    }
  }

  // 2. Normalizar y ordenar sesiones reales creadas por el coach
  const rawSessions = [...(params.rawVideoSessions || [])].sort(
    (a, b) => Number(a.sessionNumber || 0) - Number(b.sessionNumber || 0)
  );
  const usedRawIndices = new Set<number>();

  const toSlotFromReal = (
    raw: Record<string, unknown>,
    fallbackNumber: number,
    planId: string | null,
    planName: string | null
  ): ClientScheduledVideoSlot => {
    const status = String(raw.status || 'scheduled');
    const durationMinutes = Number(raw.durationMinutes || 45);
    const scheduledMs = raw.scheduledAt ? new Date(String(raw.scheduledAt)).getTime() : NaN;
    const validScheduledMs = !Number.isNaN(scheduledMs);

    let canJoin = false;
    let unlocksAt: string | null = null;

    if (status === 'active' || status === 'in_progress') {
      canJoin = true;
    } else if (status === 'scheduled' && validScheduledMs) {
      const windowStart = scheduledMs - VIDEO_JOIN_EARLY_WINDOW_MS;
      const windowEnd = scheduledMs + durationMinutes * 60 * 1000 + VIDEO_JOIN_GRACE_AFTER_END_MS;
      canJoin = nowMs >= windowStart && nowMs <= windowEnd;
      if (nowMs < windowStart) {
        unlocksAt = new Date(windowStart).toISOString();
      }
    }

    return {
      sessionId: String(raw.sessionId || `vs_${fallbackNumber}`),
      sessionNumber: Number(raw.sessionNumber || fallbackNumber),
      roomName: String(raw.roomName || ''),
      scheduledAt: validScheduledMs ? new Date(scheduledMs).toISOString() : new Date(nowMs).toISOString(),
      durationMinutes,
      timezone: String(raw.timezone || fallbackTz),
      status,
      isEstimated: false,
      canJoin,
      unlocksAt,
      planId,
      planName,
    };
  };

  const result: ClientScheduledVideoSlot[] = [];

  for (const expected of expectedSlots) {
    let matchedIdx = rawSessions.findIndex(
      (rs, idx) => !usedRawIndices.has(idx) && Number(rs.sessionNumber) === expected.sessionNumber
    );
    if (matchedIdx === -1) {
      matchedIdx = rawSessions.findIndex((_, idx) => !usedRawIndices.has(idx));
    }

    if (matchedIdx !== -1) {
      usedRawIndices.add(matchedIdx);
      result.push(
        toSlotFromReal(rawSessions[matchedIdx], expected.sessionNumber, expected.planId, expected.planName)
      );
    } else {
      result.push({
        sessionId: `planned_${expected.planId}_${expected.sessionNumber}`,
        sessionNumber: expected.sessionNumber,
        roomName: '',
        scheduledAt: new Date(expected.projectedAtMs).toISOString(),
        durationMinutes: 45,
        timezone: fallbackTz,
        status: 'pending_schedule',
        isEstimated: true,
        canJoin: false,
        unlocksAt: null,
        planId: expected.planId,
        planName: expected.planName,
      });
    }
  }

  // Incluir cualquier sesión adicional creada por el coach que exceda los slots base
  rawSessions.forEach((rs, idx) => {
    if (!usedRawIndices.has(idx)) {
      result.push(toSlotFromReal(rs, result.length + 1, null, null));
    }
  });

  return result;
}

export function calculateTotalAllowedMonths(
  purchasedPlans: Array<{ planId?: unknown; status?: unknown }> | undefined,
  fallbackPlanId?: string | null
): number {
  const paidSum = (purchasedPlans || []).reduce((sum, item) => {
    if (item?.status !== 'paid' || typeof item.planId !== 'string') return sum;
    const plan = getPlanById(item.planId);
    if (!plan || plan.maxMonths <= 0) return sum;
    return sum + plan.maxMonths;
  }, 0);

  if (paidSum > 0) return paidSum;

  const fallbackPlan = fallbackPlanId ? getPlanById(fallbackPlanId) : null;
  if (fallbackPlan) {
    return fallbackPlan.maxMonths > 0 ? fallbackPlan.maxMonths : 1;
  }
  return 1;
}

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
    videoProvider: 'none',
    livekitSessionsIncluded: 0,
    modalitySummary: 'Plataforma Web + Soporte semanal asincrónico vía WhatsApp',
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
    livekitSessionsIncluded: 3,
    modalitySummary: 'Plataforma Web + WhatsApp directo + 3 sesiones 1 a 1 por videollamada (1 mensual)',
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
      '3 sesiones de seguimiento 1 a 1 por videollamada en la plataforma (1 mensual)',
      'Seguimiento evolutivo de análisis clínicos y recomendaciones',
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
    livekitSessionsIncluded: 6,
    modalitySummary: 'Plataforma Web + WhatsApp prioritario + 6 sesiones 1 a 1 por videollamada (1 mensual)',
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
      '6 sesiones de seguimiento 1 a 1 por videollamada en la plataforma (1 mensual)',
      'Ajustes continuos de nutrición, suplementación y hábitos',
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
  const nowMs = typeof params.nowMs === "number" ? params.nowMs : Date.now();
  const paidProgramPlans = (params.purchasedPlans || [])
    .filter((item) => {
      if (item?.status !== "paid" || typeof item.planId !== "string") return false;
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
    const status = typeof vs?.status === "string" ? vs.status : "";
    if (status !== "scheduled" && status !== "active") return false;
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

import type { TFunction } from 'i18next';
import type { CommercialPlan, CommercialPlanId } from './api';

const DATE_LOCALE_MAP: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-BR',
  de: 'de-DE',
};

export function getDateLocale(lang?: string): string {
  const base = (lang || 'es').split('-')[0].toLowerCase();
  return DATE_LOCALE_MAP[base] || 'es-ES';
}

export interface LocalizedPlanFields {
  name: string;
  badge: string;
  durationLabel: string;
  modalitySummary: string;
  whatsappSupport: string;
  description: string;
  roadmap: string[];
  includes: string[];
  ctaLabel: string;
}

const KNOWN_PLAN_IDS = new Set<string>([
  'consult_1on1',
  'reto_tres_nel',
  'plan_1_reinicio',
  'plan_2_transformacion',
  'plan_3_maestria',
]);

export function getLocalizedPlanFields(
  plan: Partial<CommercialPlan> & { id: CommercialPlanId | string },
  t: TFunction
): LocalizedPlanFields {
  const isKnown = KNOWN_PLAN_IDS.has(plan.id);
  const key = `planCatalog.${plan.id}`;
  const roadmapRaw = isKnown
    ? (t(`${key}.roadmap`, { returnObjects: true }) as unknown)
    : undefined;
  const includesRaw = isKnown
    ? (t(`${key}.includes`, { returnObjects: true }) as unknown)
    : undefined;

  return {
    name: isKnown ? t(`${key}.name`, { defaultValue: plan.name || '' }) : (plan.name || ''),
    badge: isKnown ? t(`${key}.badge`, { defaultValue: plan.badge || '' }) : (plan.badge || ''),
    durationLabel: isKnown
      ? t(`${key}.durationLabel`, { defaultValue: plan.durationLabel || '' })
      : (plan.durationLabel || ''),
    modalitySummary: isKnown
      ? t(`${key}.modalitySummary`, { defaultValue: plan.modalitySummary || '' })
      : (plan.modalitySummary || ''),
    whatsappSupport: isKnown
      ? t(`${key}.whatsappSupport`, { defaultValue: plan.whatsappSupport || '' })
      : (plan.whatsappSupport || ''),
    description: isKnown
      ? t(`${key}.description`, { defaultValue: plan.description || '' })
      : (plan.description || ''),
    roadmap: Array.isArray(roadmapRaw)
      ? (roadmapRaw as string[])
      : Array.isArray(plan.roadmap)
      ? plan.roadmap
      : [],
    includes: Array.isArray(includesRaw)
      ? (includesRaw as string[])
      : Array.isArray(plan.includes)
      ? plan.includes
      : [],
    ctaLabel: isKnown
      ? t(`${key}.ctaLabel`, { defaultValue: plan.ctaLabel || '' })
      : (plan.ctaLabel || ''),
  };
}

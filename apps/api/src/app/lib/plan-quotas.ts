// apps/api/src/app/lib/plan-quotas.ts
// Control de cupos y disponibilidad por plan comercial gestionado por el admin (Manuel Martínez).
//
// Cada plan en COMMERCIAL_PLANS tiene un documento en la colección 'plan_quotas' con _id = plan.id:
//   open  → interruptor manual del coach/admin (abrir/cerrar)
//   limit → cupos máximos permitidos para ese plan
//   used  → cupos consumidos (se incrementa de forma idempotente al confirmarse un pago)
// Disponibilidad = open && used < limit.

import { getPlanQuotasCollection, type PlanQuotaDoc } from './database';
import { COMMERCIAL_PLANS, isValidPlanId, type PlanId } from './plans';

export const DEFAULT_PLAN_QUOTA_LIMIT = 15;

export interface PlanQuotaAvailability {
  open: boolean;
  limit: number;
  used: number;
  remaining: number;
  available: boolean;
}

export interface PlanQuotaDTO extends PlanQuotaAvailability {
  planId: PlanId;
  planName: string;
  durationLabel: string;
  launchPriceUsd: number;
}

export type PlanAvailabilityMap = Record<PlanId, PlanQuotaAvailability>;

export function computePlanQuotaAvailability(quota: {
  open: boolean;
  limit: number;
  used: number;
}): PlanQuotaAvailability {
  const safeLimit = Math.max(0, quota.limit);
  const safeUsed = Math.max(0, quota.used);
  const remaining = Math.max(0, safeLimit - safeUsed);
  return {
    open: quota.open === true,
    limit: safeLimit,
    used: safeUsed,
    remaining,
    available: quota.open === true && remaining > 0,
  };
}

function docToAvailability(doc?: PlanQuotaDoc | null): PlanQuotaAvailability {
  if (!doc) {
    return computePlanQuotaAvailability({
      open: true,
      limit: DEFAULT_PLAN_QUOTA_LIMIT,
      used: 0,
    });
  }
  return computePlanQuotaAvailability({
    open: doc.open === true,
    limit: typeof doc.limit === 'number' ? doc.limit : DEFAULT_PLAN_QUOTA_LIMIT,
    used: typeof doc.used === 'number' ? doc.used : 0,
  });
}

export async function getAllPlanQuotas(): Promise<PlanQuotaDTO[]> {
  const col = await getPlanQuotasCollection();
  const docs = await col.find({ _id: { $in: COMMERCIAL_PLANS.map((p) => p.id) } }).toArray();
  const byId = new Map<string, PlanQuotaDoc>(docs.map((d) => [String(d._id), d]));

  return COMMERCIAL_PLANS.map((plan) => {
    const availability = docToAvailability(byId.get(plan.id));
    return {
      planId: plan.id,
      planName: plan.name,
      durationLabel: plan.durationLabel,
      launchPriceUsd: plan.launchPriceUsd,
      ...availability,
    };
  });
}

export async function getPlanAvailabilityMap(): Promise<PlanAvailabilityMap> {
  const items = await getAllPlanQuotas();
  const map = {} as PlanAvailabilityMap;
  for (const item of items) {
    map[item.planId] = {
      open: item.open,
      limit: item.limit,
      used: item.used,
      remaining: item.remaining,
      available: item.available,
    };
  }
  return map;
}

export async function isPlanAvailable(planId: PlanId): Promise<PlanQuotaAvailability> {
  if (!isValidPlanId(planId)) {
    return { open: false, limit: 0, used: 0, remaining: 0, available: false };
  }
  const col = await getPlanQuotasCollection();
  const doc = await col.findOne({ _id: planId });
  return docToAvailability(doc);
}

export async function updatePlanQuota(input: {
  planId: PlanId;
  open?: boolean;
  limit?: number;
  resetUsed?: boolean;
}): Promise<PlanQuotaDTO[]> {
  const col = await getPlanQuotasCollection();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof input.open === 'boolean') $set.open = input.open;
  if (typeof input.limit === 'number') $set.limit = input.limit;
  if (input.resetUsed) $set.used = 0;

  const $setOnInsert: Record<string, unknown> = {};
  if (!input.resetUsed) $setOnInsert.used = 0;
  if (typeof input.open !== 'boolean') $setOnInsert.open = true;
  if (typeof input.limit !== 'number') $setOnInsert.limit = DEFAULT_PLAN_QUOTA_LIMIT;

  const update: Record<string, unknown> = { $set };
  if (Object.keys($setOnInsert).length > 0) update.$setOnInsert = $setOnInsert;

  await col.updateOne({ _id: input.planId }, update, { upsert: true });
  return getAllPlanQuotas();
}

export async function incrementPlanQuotaUsage(planId: PlanId): Promise<void> {
  if (!isValidPlanId(planId)) return;
  const col = await getPlanQuotasCollection();
  await col.updateOne(
    { _id: planId },
    {
      $inc: { used: 1 },
      $set: { updatedAt: new Date() },
      $setOnInsert: { open: true, limit: DEFAULT_PLAN_QUOTA_LIMIT },
    },
    { upsert: true }
  );
}

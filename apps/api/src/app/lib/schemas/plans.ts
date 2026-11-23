// apps/api/src/app/lib/schemas/plans.ts
import { z } from 'zod';

export const PLAN_IDS = [
  'consult_1on1',
  'reto_tres_nel',
  'plan_1_reinicio',
  'plan_2_transformacion',
  'plan_3_maestria',
] as const;

/** Actualización de disponibilidad y cupo por plan (solo admin). */
export const planQuotaUpdateSchema = z
  .object({
    planId: z.enum(PLAN_IDS, 'Plan inválido'),
    open: z.boolean().optional(),
    limit: z.number().int().min(0).max(10000).optional(),
    resetUsed: z.boolean().optional(),
  })
  .refine((d) => d.open !== undefined || d.limit !== undefined || d.resetUsed === true, {
    message: 'No hay cambios para guardar',
  });

export type PlanQuotaUpdateInput = z.infer<typeof planQuotaUpdateSchema>;

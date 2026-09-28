// apps/api/src/app/lib/free-sessions.ts
// Sesiones gratuitas con cupo limitado y control del coach.
//
// Config singleton en la colección 'free_sessions' ({ _id: 'config' }):
//   open  → interruptor del coach (abrir/cerrar)
//   limit → cupos por tanda
//   used  → cupos consumidos (se incrementa al enviar un lead de sesión gratuita)
// Disponibilidad = open && used < limit (el cierre al llenarse es derivado,
// así el coach puede ampliar el límite o reiniciar el contador y reabrir).

import { getFreeSessionsCollection } from './database';

export interface FreeSessionsConfig {
  open: boolean;
  limit: number;
  used: number;
}

export const DEFAULT_FREE_SESSIONS: FreeSessionsConfig = { open: true, limit: 5, used: 0 };

/** ¿Hay cupos disponibles ahora mismo? */
export function computeFreeSessionsAvailability(config: FreeSessionsConfig): {
  available: boolean;
  remaining: number;
} {
  const remaining = Math.max(0, config.limit - config.used);
  return { available: config.open && remaining > 0, remaining };
}

/** Lee la configuración (con defaults si aún no existe). */
export async function getFreeSessionsConfig(): Promise<FreeSessionsConfig> {
  const col = await getFreeSessionsCollection();
  const doc = await col.findOne({ _id: 'config' });
  if (!doc) return { ...DEFAULT_FREE_SESSIONS };
  return {
    open: doc.open === true,
    limit: typeof doc.limit === 'number' ? doc.limit : DEFAULT_FREE_SESSIONS.limit,
    used: typeof doc.used === 'number' ? doc.used : 0,
  };
}

/** Actualiza la configuración (solo admin). */
export async function updateFreeSessionsConfig(input: {
  open?: boolean;
  limit?: number;
  resetUsed?: boolean;
}): Promise<FreeSessionsConfig> {
  const col = await getFreeSessionsCollection();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof input.open === 'boolean') $set.open = input.open;
  if (typeof input.limit === 'number') $set.limit = input.limit;
  if (input.resetUsed) $set.used = 0;

  // $setOnInsert solo para lo que NO viene en $set (evita conflicto de paths)
  const $setOnInsert: Record<string, unknown> = {};
  if (!input.resetUsed) $setOnInsert.used = 0;
  if (typeof input.open !== 'boolean') $setOnInsert.open = DEFAULT_FREE_SESSIONS.open;
  if (typeof input.limit !== 'number') $setOnInsert.limit = DEFAULT_FREE_SESSIONS.limit;

  const update: Record<string, unknown> = { $set };
  if (Object.keys($setOnInsert).length > 0) update.$setOnInsert = $setOnInsert;

  await col.updateOne({ _id: 'config' }, update, { upsert: true });
  return getFreeSessionsConfig();
}

/** Consume un cupo (se llama al registrar un lead de sesión gratuita). */
export async function incrementFreeSessionUsage(): Promise<void> {
  const col = await getFreeSessionsCollection();
  await col.updateOne(
    { _id: 'config' },
    {
      $inc: { used: 1 },
      $set: { updatedAt: new Date() },
      $setOnInsert: { open: DEFAULT_FREE_SESSIONS.open, limit: DEFAULT_FREE_SESSIONS.limit },
    },
    { upsert: true },
  );
}

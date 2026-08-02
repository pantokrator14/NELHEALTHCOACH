// apps/api/src/app/lib/security/rateLimiter.ts
// Rate Limiter basado en MongoDB con TTL index
// Se usa en los route handlers (Node.js runtime, tiene acceso a MongoDB).
// No compatible con Edge Runtime; usar solo en API routes.

import type { Collection, Document } from 'mongodb';
import { connectToDatabase } from '../database';
import { logger } from '../logger';
import type { SecurityCheckResult, RateLimitConfig } from './types';

// ─── Constantes ───

const COLLECTION_NAME = 'rate_limits';
const DEFAULT_CONFIG: Readonly<RateLimitConfig> = {
  windowSeconds: 10,
  maxRequests: 10,
};

// Rutas críticas con configuraciones específicas
const PATH_CONFIGS: Readonly<Record<string, Readonly<RateLimitConfig>>> = {
  '/api/clients': { windowSeconds: 10, maxRequests: 10 },
  '/api/leads': { windowSeconds: 10, maxRequests: 5 },
  '/api/auth/login': { windowSeconds: 60, maxRequests: 5 },
  '/api/auth/register': { windowSeconds: 60, maxRequests: 3 },
  '/api/health': { windowSeconds: 10, maxRequests: 20 },
  '/api/exercises': { windowSeconds: 10, maxRequests: 10 },
  '/api/recipes': { windowSeconds: 10, maxRequests: 10 },
};

// ─── Rutas con fail-closed (seguridad > disponibilidad) ───
// Si MongoDB falla en estos endpoints, BLOQUEAMOS el request (503) en lugar de
// permitirlo: son rutas de autenticación, el objetivo principal de brute force
// y abuso. Como toda operación de auth necesita la BD de todos modos para
// funcionar, bloquear no degrada nada que ya estaría funcionando.
const FAIL_CLOSED_PATHS: readonly string[] = ['/api/auth/'];

/** Mensaje uniforme de servicio no disponible (SEC-13) — el frontend lo usa
 *  para mostrar el toast de warning. No cambiar sin actualizar el frontend. */
export const SERVICE_UNAVAILABLE_MESSAGE =
  'Servicio temporalmente no disponible. Intenta de nuevo en unos minutos.';

function isFailClosedPath(path: string): boolean {
  return FAIL_CLOSED_PATHS.some((prefix) => path.startsWith(prefix));
}

// ─── Interfaz del documento MongoDB ───

interface RateLimitDocument {
  _id: string;
  count: number;
  expiresAt: Date;
}

// ─── Singleton de colección (cacheada) ───

let rateLimitCollection: Collection<RateLimitDocument> | null = null;

async function getRateLimitCollection(): Promise<Collection<RateLimitDocument>> {
  if (rateLimitCollection) return rateLimitCollection;

  logger.info('RATE_LIMITER', 'Inicializando colección rate_limits en MongoDB');

  const { db } = await connectToDatabase();
  const collection = db.collection<RateLimitDocument>(COLLECTION_NAME);

  // Asegurar que la colección existe insertando un documento dummy y eliminándolo
  // Esto evita el error "ns does not exist" en MongoDB Atlas al crear índices.
  try {
    await collection.insertOne({ _id: '__init__', count: 0, expiresAt: new Date() });
    await collection.deleteOne({ _id: '__init__' });
  } catch {
    // Si ya existe, no hay problema
  }

  // Crear TTL index si no existe (createIndex es idempotente)
  try {
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch {
    // Índice ya existe — ignorar
  }

  // Crear índice único en _id (la key) si no existe
  try {
    await collection.createIndex({ _id: 1 }, { unique: true });
  } catch {
    // Índice ya existe — ignorar
  }

  rateLimitCollection = collection;
  return collection;
}

// ─── Funciones de rate limiting ───

/**
 * Construye una key única combinando IP + visitorId (si existe) + path.
 * La IP SIEMPRE forma parte de la key: el visitorId (header controlado por el
 * cliente) NO puede reemplazarla, de lo contrario un atacante que rote
 * x-visitor-id evadiría el límite de intentos por IP.
 * El visitorId solo agrega granularidad por dispositivo sobre la misma IP.
 */
function buildRateLimitKey(ip: string, path: string, visitorId?: string): string {
  const namespace = process.env.NODE_ENV === 'production' ? 'prd' : 'dev';
  const device = visitorId && visitorId.trim() !== '' ? `:${visitorId}` : '';
  return `rl:${namespace}:${ip}${device}:${path}`;
}

/**
 * Obtiene la configuración de rate limit para una ruta específica.
 */
function getConfigForPath(path: string): RateLimitConfig {
  // Buscar coincidencia exacta primero
  for (const [prefix, config] of Object.entries(PATH_CONFIGS)) {
    if (path.startsWith(prefix)) {
      return config;
    }
  }

  // Config por defecto
  return DEFAULT_CONFIG;
}

/**
 * Verifica si un request excede el rate limit.
 *
 * @param ip - IP del cliente
 * @param path - Ruta solicitada
 * @param visitorId - ID de FingerprintJS (opcional, reemplaza IP si está presente)
 * @returns SecurityCheckResult con passed=true si está OK, o bloqueo si excedió
 */
export async function checkRateLimit(
  ip: string,
  path: string,
  visitorId?: string,
): Promise<SecurityCheckResult> {
  const config = getConfigForPath(path);
  const key = buildRateLimitKey(ip, path, visitorId);
  const expiresAt = new Date(Date.now() + config.windowSeconds * 1000);

  try {
    const collection = await getRateLimitCollection();

    const result = await collection.findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );

    if (!result) {
      // Primera inserción — permitir
      return { passed: true };
    }

    const currentCount = result.count || 1;

    if (currentCount > config.maxRequests) {
      const retryAfterSeconds = config.windowSeconds;
      const identifier = visitorId ? `ip:${ip}:fingerprint:${visitorId.substring(0, 12)}` : `ip:${ip}`;

      logger.warn('RATE_LIMITER', `Rate limit excedido para ${identifier} en ${path}`, {
        count: currentCount,
        maxRequests: config.maxRequests,
        windowSeconds: config.windowSeconds,
        clientId: identifier,
      });

      return {
        passed: false,
        reason: 'RATE_LIMIT',
        statusCode: 429,
        message: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfterSeconds} segundos.`,
        retryAfter: retryAfterSeconds,
      };
    }

    return { passed: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    const isCritical = isFailClosedPath(path);
    const logMetadata = { path, ip };

    if (isCritical) {
      // ── FAIL-CLOSED (solo rutas de autenticación) ──
      // MongoDB no disponible: bloqueamos el request de auth para no dejar
      // el brute force / abuso sin límite. Marcador único RATE_LIMITER_FAIL_CLOSED
      // para distinguir este caso de otros problemas en los logs.
      logger.error(
        'RATE_LIMITER',
        'RATE_LIMITER_FAIL_CLOSED — MongoDB no disponible en ruta crítica de autenticación, request bloqueado (503)',
        error,
        undefined,
        logMetadata,
      );
      console.error(
        `[RATE_LIMITER_FAIL_CLOSED] MongoDB caído en ${path} (ip=${ip}) — bloqueando request de autenticación. Error: ${errorMsg}`,
      );

      return {
        passed: false,
        reason: 'RATE_LIMITER_UNAVAILABLE',
        statusCode: 503,
        message: SERVICE_UNAVAILABLE_MESSAGE,
      };
    }

    // ── FAIL-OPEN (resto de rutas) ──
    // Decisión de disponibilidad: si MongoDB falla en rutas no críticas,
    // permitimos el request para no bloquear a usuarios reales.
    // Marcador único RATE_LIMITER_FAIL_OPEN para distinguirlo en los logs.
    logger.warn(
      'RATE_LIMITER',
      'RATE_LIMITER_FAIL_OPEN — Error en rate limiter, fallback a permitir (fail-open)',
      { mongoError: errorMsg },
      logMetadata,
    );
    console.warn(
      `[RATE_LIMITER_FAIL_OPEN] MongoDB caído en ${path} (ip=${ip}) — permitiendo request (fail-open). Error: ${errorMsg}`,
    );

    return { passed: true };
  }
}

/**
 * Limpia los rate limits para una IP (y visitorId opcional) en un path específico.
 * Útil después de login exitoso.
 */
export async function resetRateLimit(ip: string, path: string, visitorId?: string): Promise<void> {
  const key = buildRateLimitKey(ip, path, visitorId);

  try {
    const collection = await getRateLimitCollection();
    await collection.deleteOne({ _id: key });
  } catch (error) {
    logger.warn(
      'RATE_LIMITER',
      'Error al resetear rate limit (no crítico)',
      error instanceof Error ? error.message : undefined,
    );
  }
}

/**
 * Obtiene estadísticas de rate limiting para monitoreo.
 */
export async function getRateLimitStats(): Promise<{
  readonly activeEntries: number;
  readonly blockedPaths: ReadonlyArray<{ path: string; count: number }>;
}> {
  try {
    const collection = await getRateLimitCollection();
    const activeEntries = await collection.countDocuments();
    const allEntries = await collection.find().sort({ count: -1 }).limit(20).toArray();

    const blockedPaths = allEntries.map((entry) => ({
      path: entry._id.split(':').slice(2).join(':') || 'unknown',
      count: entry.count,
    }));

    return { activeEntries, blockedPaths };
  } catch {
    return { activeEntries: 0, blockedPaths: [] };
  }
}

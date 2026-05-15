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

  // Crear TTL index si no existe
  const indexes = await collection.indexes();
  const hasTTLIndex = indexes.some((idx) => 'expireAfterSeconds' in idx);

  if (!hasTTLIndex) {
    logger.info('RATE_LIMITER', 'Creando TTL index en expiresAt');
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }

  // Crear índice único en _id (la key) si no existe
  const hasKeyIndex = indexes.some(
    (idx) => 'key' in idx && typeof idx.key === 'object' && idx.key !== null && '_id' in idx.key,
  );
  if (!hasKeyIndex) {
    await collection.createIndex({ _id: 1 }, { unique: true });
  }

  rateLimitCollection = collection;
  return collection;
}

// ─── Funciones de rate limiting ───

/**
 * Construye una key única combinando IP (o visitorId) + path.
 * Si se provee visitorId (de FingerprintJS), se usa como key primaria
 * en lugar del IP, permitiendo límites por dispositivo.
 */
function buildRateLimitKey(ip: string, path: string, visitorId?: string): string {
  const namespace = process.env.NODE_ENV === 'production' ? 'prd' : 'dev';
  const primary = visitorId && visitorId.trim() !== '' ? visitorId : ip;
  return `rl:${namespace}:${primary}:${path}`;
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
      const identifier = visitorId ? `fingerprint:${visitorId.substring(0, 12)}` : `ip:${ip}`;

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
    // Fail-open: si MongoDB falla, permitir el request
    logger.error(
      'RATE_LIMITER',
      'Error en rate limiter, fallback a permitir (fail-open)',
      error instanceof Error ? error : undefined,
    );

    return { passed: true };
  }
}

/**
 * Limpia los rate limits para un IP específico (útil después de login exitoso).
 */
export async function resetRateLimit(ip: string, path: string): Promise<void> {
  const key = buildRateLimitKey(ip, path);

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

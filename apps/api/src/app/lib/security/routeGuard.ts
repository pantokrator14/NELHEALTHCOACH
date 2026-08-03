// apps/api/src/app/lib/security/routeGuard.ts
// Helper que combina rate limiting + shield body scan + prompt injection
// para usar en route handlers. Se ejecuta en Node.js runtime (tiene acceso a MongoDB).

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkRateLimit, SERVICE_UNAVAILABLE_MESSAGE } from './rateLimiter';
import { scanRequestBody } from './shield';
import { scanForPromptInjection } from './promptInjection';
import { connectMongoose } from '../database';
import { logger } from '../logger';
import type { SecurityCheckResult } from './types';

/**
 * SEC-13: Verifica que el servicio (MongoDB) esté disponible ANTES de procesar
 * una ruta de autenticación. Si la BD falla, responde 503 con el MISMO mensaje
 * que el fail-closed del rate limiter, para que el frontend lo detecte de forma
 * uniforme (toast de warning) y no reciba un 500 genérico confuso.
 * Uso: const unavailable = await requireServiceAvailable(); if (unavailable) return unavailable;
 */
export async function requireServiceAvailable(): Promise<NextResponse | null> {
  try {
    await connectMongoose();
    return null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

    logger.error(
      'DATABASE',
      'SERVICE_UNAVAILABLE_503 — MongoDB no disponible, respondiendo 503 (SEC-13)',
      error,
      undefined,
      {},
    );
    console.error(
      `[SERVICE_UNAVAILABLE_503] MongoDB no disponible — respondiendo 503 (SEC-13). Error: ${errorMsg}`,
    );

    return NextResponse.json(
      { success: false, message: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }
}

/**
 * Verifica rate limiting contra el request actual.
 * La key combina IP + visitorId (si está presente): el visitorId de FingerprintJS
 * agrega granularidad por dispositivo, pero la IP nunca puede ser reemplazada,
 * evitando evadir el límite rotando el header x-visitor-id.
 */
export async function requireRateLimit(request: NextRequest): Promise<SecurityCheckResult> {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;
  const visitorId = request.headers.get('x-visitor-id');

  return checkRateLimit(ip, path, visitorId ?? undefined);
}

/**
 * Escanea el body de un request en busca de ataques (Shield).
 * Debe llamarse DESPUÉS de parsear el body (request.json()).
 */
export function requireShieldBody(body: unknown): SecurityCheckResult {
  return scanRequestBody(body) ?? { passed: true };
}

/**
 * Escanea el body de un request en busca de prompt injection.
 * Útil para rutas que alimentan LLMs.
 * Debe llamarse DESPUÉS de parsear el body.
 */
export function requirePromptInjectionCheck(body: unknown): SecurityCheckResult {
  return scanForPromptInjection(body) ?? { passed: true };
}

/**
 * Verificación combinada: rate limit + shield body scan.
 * Se ejecuta al inicio de cada route handler que acepta body.
 *
 * @param request - NextRequest
 * @param body - Body ya parseado (request.json())
 * @param checkPromptInjection - Si es true, también escanea prompt injection
 * @returns SecurityCheckResult con passed=true si todo OK
 */
export async function secureRoute(
  request: NextRequest,
  body: unknown,
  checkPromptInjection: boolean = false,
): Promise<SecurityCheckResult> {
  // 1. Rate limiting (primero para no gastar recursos en requests bloqueados)
  const rateLimitResult = await requireRateLimit(request);
  if (!rateLimitResult.passed) {
    return rateLimitResult;
  }

  // 2. Shield body scan
  const shieldResult = requireShieldBody(body);
  if (!shieldResult.passed) {
    return shieldResult;
  }

  // 3. Prompt injection (opcional)
  if (checkPromptInjection) {
    const injectionResult = requirePromptInjectionCheck(body);
    if (!injectionResult.passed) {
      return injectionResult;
    }
  }

  return { passed: true };
}

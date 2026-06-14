// apps/api/src/middleware.ts
// Middleware unificado — Edge Runtime
// Pipeline: Shield → Bot Detection → CORS → Logging
// Rate limiting y prompt injection van en los route handlers (Node.js)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';
import { runShield } from './app/lib/security/shield';
import { runBotDetection } from './app/lib/security/botDetector';
import type { RequestContext } from './app/lib/security/types';

// logSecurityBlock se importa desde auditLogger.edge.ts (sin mongoose — Edge-safe)
// Para persistencia a MongoDB con todos los detalles, usar auditLogger.ts
// desde los route handlers (Node.js runtime).

// ─── Configuración ───

const ALLOWED_ORIGINS = [
  'http://localhost:2000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://www.nelhealthcoach.com',
  'https://app.nelhealthcoach.com',
  'https://form.nelhealthcoach.com',
];

// Rutas que pasan por shield + bot detection
const CRITICAL_PATHS = [
  '/api/clients',
  '/api/leads',
  '/api/health',
  '/api/exercises',
  '/api/recipes',
  '/api/auth',
  '/api/video',
  '/api/inngest',
  '/api/coaches',
  '/api/stats',
  '/api/edit-proposals',
  '/api/extract-text',
];

// Rutas excluidas de verificación
const EXCLUDED_PATHS = [
  '/api/health/ping',
  '/api/hello',
  '/api/video/test-token',
  '/api/auth/verify-email',
];

// ─── Helpers ───

function buildRequestContext(request: NextRequest): RequestContext {
  return {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    path: request.nextUrl.pathname,
    visitorId: request.headers.get('x-visitor-id') || undefined,
  };
}

function isCriticalPath(path: string): boolean {
  return CRITICAL_PATHS.some((prefix) => path.startsWith(prefix));
}

function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATHS.some((prefix) => path.startsWith(prefix));
}

function extractRequestId(request: NextRequest): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-correlation-id') ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
}

function applyCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  const isAllowedOrigin = origin !== null && ALLOWED_ORIGINS.includes(origin);

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Visitor-Id, X-Request-ID');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

function createBlockedResponse(
  statusCode: number,
  reason: string,
  message: string,
  retryAfter?: number,
  origin?: string | null,
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const isAllowedOrigin = origin !== null && ALLOWED_ORIGINS.includes(origin ?? '');
  if (isAllowedOrigin) {
    headers['Access-Control-Allow-Origin'] = origin!;
  }
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Visitor-Id, X-Request-ID';
  headers['Access-Control-Allow-Credentials'] = 'true';

  if (retryAfter !== undefined) {
    headers['Retry-After'] = String(retryAfter);
  }

  return new NextResponse(
    JSON.stringify({
      error: reason === 'RATE_LIMIT' ? 'Rate limit excedido' : 'Solicitud bloqueada',
      message,
      retryAfter,
    }),
    { status: statusCode, headers },
  );
}

// ─── Middleware principal ───

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  const origin = request.headers.get('origin');

  // Excluir paths internos
  if (isExcludedPath(path)) {
    return NextResponse.next();
  }

  // ── 1. OPTIONS preflight ──
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    const requestId = extractRequestId(request);
    response.headers.set('X-Request-ID', requestId);
    return applyCorsHeaders(response, origin);
  }

  // ── 2. Shield + Bot Detection (solo rutas críticas) ──
  if (isCriticalPath(path)) {
    const ctx = buildRequestContext(request);
    const requestId = extractRequestId(request);

    // Shield: escanea URL y query params
    const shieldResult = runShield(ctx, request.nextUrl.searchParams);
    if (shieldResult && !shieldResult.passed) {
      // Audit log del bloqueo (Edge-safe, sin mongoose)
      const { logSecurityBlock } = await import('./app/lib/auditLogger.edge');
      logSecurityBlock('SHIELD_BLOCK', shieldResult.reason ?? 'SHIELD', {
        ip: ctx.ip,
        path,
        userAgent: ctx.userAgent,
        requestId,
        visitorId: ctx.visitorId,
        metadata: { shieldReason: shieldResult.reason, shieldMessage: shieldResult.message },
      });

      return createBlockedResponse(
        shieldResult.statusCode ?? 403,
        shieldResult.reason ?? 'SHIELD',
        shieldResult.message ?? 'Solicitud bloqueada por medidas de seguridad',
        undefined,
        origin,
      );
    }

    // Bot Detection
    const botResult = runBotDetection(ctx, request.headers);
    if (botResult && !botResult.passed) {
      // Audit log del bloqueo (Edge-safe, sin mongoose)
      const { logSecurityBlock } = await import('./app/lib/auditLogger.edge');
      logSecurityBlock('BOT_DETECTED', botResult.reason ?? 'BOT', {
        ip: ctx.ip,
        path,
        userAgent: ctx.userAgent,
        requestId,
        visitorId: ctx.visitorId,
        metadata: { botReason: botResult.reason, botMessage: botResult.message },
      });

      return createBlockedResponse(
        botResult.statusCode ?? 403,
        botResult.reason ?? 'BOT',
        botResult.message ?? 'Acceso bloqueado',
        undefined,
        origin,
      );
    }
  }

  // ── 3. Logging ──
  const loggedResponse = requestLogger(request);

  // ── 4. CORS ──
  applyCorsHeaders(loggedResponse, origin);

  return loggedResponse;
}

export const config = {
  matcher: '/api/:path*',
};

// apps/api/src/app/lib/auditLogger.edge.ts
// Versión Edge-safe del auditLogger — solo loguea a consola.
// ⚠️ NO importa mongoose ni ningún modelo de MongoDB.
//    Esto es deliberado: este archivo se importa desde middleware.ts (Edge Runtime)
//    y cualquier referencia a mongoose rompe la compilación.
//    Para persistencia a MongoDB, usar auditLogger.ts desde route handlers (Node.js).

import { logger } from './logger';
import { sanitizeMessage } from './sanitize';

type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

const auditColors: Record<AuditSeverity, string> = {
  info: '\x1b[36m',
  warning: '\x1b[33m',
  error: '\x1b[31m',
  critical: '\x1b[41;97m',
};

const AUDIT_ICONS: Record<string, string> = {
  SHIELD_BLOCK: '🛡️',
  BOT_DETECTED: '🤖',
  RATE_LIMIT_HIT: '⏱️',
  PROMPT_INJECTION_DETECTED: '🧪',
};

/**
 * Loguea un bloqueo de seguridad a consola (Edge-safe, sin DB).
 * Fire-and-forget: nunca lanza errores.
 */
export function logSecurityBlock(
  eventType: string,
  reason: string,
  ctx: {
    ip?: string;
    path: string;
    userAgent?: string;
    requestId?: string;
    visitorId?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  const severity: AuditSeverity = 'warning';
  const icon = AUDIT_ICONS[eventType] ?? '•';
  const reset = '\x1b[0m';
  const color = auditColors[severity];

  const coloredTag = `${color}[AUDIT:${eventType}]${reset}`;
  const metaParts: string[] = [`reason=${reason}`];
  if (ctx.ip) metaParts.push(`ip=${ctx.ip}`);
  if (ctx.path) metaParts.push(`path=${ctx.path}`);
  if (ctx.requestId) metaParts.push(`req=${ctx.requestId}`);

  const metaStr = metaParts.length > 0 ? ` \x1b[90m[${metaParts.join(', ')}]\x1b[0m` : '';
  console.log(`${icon} ${coloredTag} ${sanitizeMessage(reason)} en ${sanitizeMessage(ctx.path)}${metaStr}`);

  // También pasar por el logger estructurado
  (logger as any).warn(
    'GUARDRAILS',
    `[AUDIT:${eventType}] ${reason} en ${ctx.path}`,
    undefined,
    {
      requestId: ctx.requestId,
      ip: ctx.ip,
      path: ctx.path,
      eventType,
      severity,
      metadata: ctx.metadata,
    },
  );
}

/**
 * Loguea un evento de autenticación a consola (Edge-safe, sin DB).
 */
export function logAuthFailure(
  email: string,
  reason: string,
  request?: { ip?: string; path?: string; userAgent?: string; requestId?: string },
): void {
  const icon = '🔒';
  const reset = '\x1b[0m';
  const color = '\x1b[33m';
  const coloredTag = `${color}[AUDIT:LOGIN_FAILURE]${reset}`;
  const metaParts: string[] = [`email=${email}`];
  if (request?.ip) metaParts.push(`ip=${request.ip}`);
  if (request?.path) metaParts.push(`path=${request.path}`);

  const metaStr = metaParts.length > 0 ? ` \x1b[90m[${metaParts.join(', ')}]\x1b[0m` : '';
  console.log(`${icon} ${coloredTag} ${sanitizeMessage(reason)} para ${sanitizeMessage(email)}${metaStr}`);

  (logger as any).warn(
    'AUTH',
    `[AUDIT:LOGIN_FAILURE] ${reason} para ${email}`,
    undefined,
    {
      requestId: request?.requestId,
      ip: request?.ip,
      path: request?.path ?? '/api/auth/login',
    },
  );
}

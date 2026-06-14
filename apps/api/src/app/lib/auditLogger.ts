// apps/api/src/app/lib/auditLogger.ts
// Servicio de registro de auditoría — persiste eventos de seguridad en MongoDB
// y los loguea en consola con colores para facilitar la revisión.

import mongoose from 'mongoose';
import AuditLog, { type IAuditLog, type AuditEventType } from '@/app/models/AuditLog';
import { logger } from './logger';
import { sanitizeMessage } from './sanitize';

type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

interface AuditEventData {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  message: string;

  // Actor
  coachId?: string;
  actorEmail?: string;
  actorRole?: string;

  // Request context
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  visitorId?: string;

  // Metadata adicional
  metadata?: Record<string, unknown>;
}

/**
 * Colores ANSI para consola — auditoría.
 */
const auditColors: Record<AuditSeverity, string> = {
  info: '\x1b[36m',       // cyan
  warning: '\x1b[33m',    // yellow
  error: '\x1b[31m',      // red
  critical: '\x1b[41;97m', // bg-red + white
};

const AUDIT_ICONS: Record<AuditEventType, string> = {
  // Auth
  LOGIN_SUCCESS: '🔓',
  LOGIN_FAILURE: '🔒',
  REGISTER_SUCCESS: '📝',
  REGISTER_FAILURE: '📛',
  PASSWORD_CHANGE_SUCCESS: '🔑',
  PASSWORD_CHANGE_FAILURE: '❌',
  PASSWORD_RESET_REQUEST: '📬',
  PASSWORD_RESET_SUCCESS: '🔐',
  PASSWORD_RESET_FAILURE: '🔒',
  LOGOUT: '🚪',
  TOKEN_REFRESH: '🔄',
  // Seguridad
  RATE_LIMIT_HIT: '⏱️',
  SHIELD_BLOCK: '🛡️',
  BOT_DETECTED: '🤖',
  PROMPT_INJECTION_DETECTED: '🧪',
  // Cuenta
  ACCOUNT_SUSPEND: '⛔',
  ACCOUNT_REACTIVATE: '✅',
  ACCOUNT_DELETE: '🗑️',
  EMAIL_VERIFIED: '📧',
  EMAIL_CHANGE: '✉️',
  // Datos críticos
  CLIENT_CREATED: '👤',
  CLIENT_UPDATED: '✏️',
  CLIENT_DELETED: '🗑️',
  RECIPE_CREATED: '🍽️',
  RECIPE_UPDATED: '📄',
  RECIPE_DELETED: '🗑️',
  EXERCISE_CREATED: '🏋️',
  EXERCISE_UPDATED: '📄',
  EXERCISE_DELETED: '🗑️',
  // Pagos
  PAYMENT_RECEIVED: '💰',
  PAYMENT_FAILED: '💳',
  SUBSCRIPTION_CHANGED: '🔄',
  // Admin
  ADMIN_ACTION: '⚙️',
};

/**
 * Loguea un evento de auditoría a MongoDB + consola con colores.
 *
 * 📌 Esta función es FIRE-AND-FORGET: nunca lanza errores.
 * Si la DB está caída, se loguea solo a consola.
 */
export async function logAuditEvent(data: AuditEventData): Promise<void> {
  const severity = data.severity ?? 'info';
  const icon = AUDIT_ICONS[data.eventType] ?? '•';
  const reset = '\x1b[0m';
  const color = auditColors[severity];

  // ── 1. Log a consola con colores ──
  const coloredTag = `${color}[AUDIT:${data.eventType}]${reset}`;
  const metaParts: string[] = [];

  if (data.coachId) metaParts.push(`coach=${data.coachId.substring(0, 8)}`);
  if (data.actorEmail) metaParts.push(`email=${data.actorEmail}`);
  if (data.ip) metaParts.push(`ip=${data.ip}`);
  if (data.path) metaParts.push(`path=${data.path}`);
  if (data.statusCode) metaParts.push(`status=${data.statusCode}`);

  const metaStr = metaParts.length > 0 ? ` \x1b[90m[${metaParts.join(', ')}]\x1b[0m` : '';
  console.log(`${icon} ${coloredTag} ${sanitizeMessage(data.message)}${metaStr}`);

  // ── 2. También pasar por el logger estructurado ──
  const logMethod = severity === 'error' || severity === 'critical' ? 'error' : severity === 'warning' ? 'warn' : 'info';
  const logCtx = severity === 'error' || severity === 'critical' ? 'ERROR' : severity === 'warning' ? 'GUARDRAILS' : 'AUDIT';
  // Usamos any para evitar problemas de tipado con el logger
  (logger as any)[logMethod](
    logCtx,
    `[AUDIT:${data.eventType}] ${data.message}`,
    undefined,
    {
      requestId: data.requestId,
      coachId: data.coachId,
      ip: data.ip,
      path: data.path,
      method: data.method,
      statusCode: data.statusCode,
      eventType: data.eventType,
      severity,
      metadata: data.metadata,
    },
  );

  // ── 3. Persistir a MongoDB ──
  try {
    // Verificar conexión activa antes de insertar
    if (mongoose.connection.readyState !== 1) {
      // No hay conexión — solo log en consola
      return;
    }

    const doc = new AuditLog({
      eventType: data.eventType,
      severity,
      coachId: data.coachId ? (data.coachId as any) : undefined,
      actorEmail: data.actorEmail,
      actorRole: data.actorRole,
      ip: data.ip,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      statusCode: data.statusCode,
      requestId: data.requestId,
      visitorId: data.visitorId,
      message: data.message,
      metadata: data.metadata,
    });

    // Fire-and-forget: no await — no queremos bloquear la request
    doc.save().catch((err: Error) => {
      // Si falla la persistencia, solo lo logueamos
      console.warn(`⚠️ [AUDIT] No se pudo persistir evento ${data.eventType}: ${err.message}`);
    });
  } catch (err) {
    console.warn(`⚠️ [AUDIT] Error creando documento auditLog:`, (err as Error).message);
  }
}

/**
 * Helper rápido para loguear un error de autenticación.
 */
export function logAuthFailure(
  email: string,
  reason: string,
  request?: { ip?: string; path?: string; userAgent?: string; requestId?: string },
): void {
  logAuditEvent({
    eventType: 'LOGIN_FAILURE',
    severity: 'warning',
    message: `Intento de login fallido para ${email} — ${reason}`,
    actorEmail: email,
    ip: request?.ip,
    path: request?.path ?? '/api/auth/login',
    userAgent: request?.userAgent,
    requestId: request?.requestId,
  });
}

/**
 * Helper rápido para loguear un bloqueo de seguridad (shield/bot/rate-limit).
 */
export function logSecurityBlock(
  eventType: Extract<AuditEventType, 'SHIELD_BLOCK' | 'BOT_DETECTED' | 'RATE_LIMIT_HIT' | 'PROMPT_INJECTION_DETECTED'>,
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
  const severityMap: Record<string, AuditSeverity> = {
    SHIELD_BLOCK: 'error',
    BOT_DETECTED: 'warning',
    RATE_LIMIT_HIT: 'warning',
    PROMPT_INJECTION_DETECTED: 'warning',
  };

  logAuditEvent({
    eventType,
    severity: severityMap[eventType] ?? 'warning',
    message: `${reason} en ${ctx.path}`,
    ip: ctx.ip,
    path: ctx.path,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    visitorId: ctx.visitorId,
    metadata: ctx.metadata,
  });
}

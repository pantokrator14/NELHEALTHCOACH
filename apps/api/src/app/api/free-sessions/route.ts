// apps/api/src/app/api/free-sessions/route.ts
// Control de sesiones gratuitas (solo admin).
//
// GET (admin): configuración actual + disponibilidad (cupos usados/límite).
// PUT (admin): abrir/cerrar, cambiar límite y/o reiniciar el contador.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { freeSessionsSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import {
  computeFreeSessionsAvailability,
  getFreeSessionsConfig,
  updateFreeSessionsConfig,
} from '@/app/lib/free-sessions';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Admin estricto: solo el coach con rol 'admin' gestiona las sesiones. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede gestionar las sesiones gratuitas' };
  }
  return auth;
}

function toDTO(config: { open: boolean; limit: number; used: number }) {
  const { available, remaining } = computeFreeSessionsAvailability(config);
  return { open: config.open, limit: config.limit, used: config.used, available, remaining };
}

// ── GET: configuración (solo admin) ─────────────────────────────────────────
async function getHandler(request: NextRequest) {
  return logger.time('LEAD', 'Config de sesiones gratuitas', async () => {
    try {
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      requireAdmin(request);
      return NextResponse.json({ success: true, data: toDTO(await getFreeSessionsConfig()) });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('LEAD', 'Error obteniendo sesiones gratuitas', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener las sesiones gratuitas', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

// ── PUT: actualizar (solo admin) ────────────────────────────────────────────
async function putHandler(request: NextRequest) {
  return logger.time('LEAD', 'Actualizar sesiones gratuitas', async () => {
    try {
      const body = await request.json();
      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      const parsed = freeSessionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const auth = requireAdmin(request);
      const updated = await updateFreeSessionsConfig(parsed.data);

      logAuditEvent({
        eventType: 'FREE_SESSIONS_UPDATED',
        severity: 'info',
        message: `Sesiones gratuitas: open=${updated.open}, límite=${updated.limit}, usadas=${updated.used}`,
        coachId: auth.coachId,
        ip: request.headers.get('x-forwarded-for') || undefined,
        path: '/api/free-sessions',
        method: 'PUT',
        statusCode: 200,
      });

      return NextResponse.json({ success: true, message: 'Configuración guardada', data: toDTO(updated) });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('LEAD', 'Error actualizando sesiones gratuitas', error);
      return NextResponse.json(
        { success: false, message: 'Error al guardar las sesiones gratuitas', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const PUT = apiHandler(putHandler);

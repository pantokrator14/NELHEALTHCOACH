// apps/api/src/app/api/plan-quotas/route.ts
// Control de cupos y disponibilidad por plan comercial (solo admin — Manuel Martínez).
//
// GET (admin): listado de los 5 planes con estado open/limit/used/remaining/available.
// PUT (admin): abrir/cerrar plan, cambiar límite y/o reiniciar contador usado.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { planQuotaUpdateSchema } from '@/app/lib/schemas/index';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { getAllPlanQuotas, updatePlanQuota } from '@/app/lib/plan-quotas';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Admin estricto: solo el coach con rol 'admin' gestiona los cupos por plan. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede gestionar los cupos de planes' };
  }
  return auth;
}

// ── GET: listar cupos por plan (solo admin) ──────────────────────────────────
async function getHandler(request: NextRequest) {
  return logger.time('PLANS', 'Listar cupos por plan', async () => {
    try {
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      requireAdmin(request);
      const quotas = await getAllPlanQuotas();
      return NextResponse.json({ success: true, data: quotas });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('PLANS', 'Error obteniendo cupos de planes', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener los cupos de planes', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

// ── PUT: actualizar cupos de un plan (solo admin) ────────────────────────────
async function putHandler(request: NextRequest) {
  return logger.time('PLANS', 'Actualizar cupo de plan', async () => {
    try {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, message: 'JSON inválido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      const parsed = planQuotaUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
            code: 'VALIDATION',
          },
          { status: 400 },
        );
      }

      const auth = requireAdmin(request);
      const quotas = await updatePlanQuota(parsed.data);
      const updated = quotas.find((q) => q.planId === parsed.data.planId);

      logAuditEvent({
        eventType: 'PLAN_QUOTAS_UPDATED',
        severity: 'info',
        message: `Cupos plan ${parsed.data.planId}: open=${updated?.open}, límite=${updated?.limit}, usados=${updated?.used}`,
        coachId: auth.coachId,
        ip: request.headers.get('x-forwarded-for') || undefined,
        path: '/api/plan-quotas',
        method: 'PUT',
        statusCode: 200,
      });

      return NextResponse.json({
        success: true,
        message: 'Disponibilidad del plan actualizada',
        data: quotas,
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('PLANS', 'Error actualizando cupos de plan', error);
      return NextResponse.json(
        { success: false, message: 'Error al guardar la disponibilidad del plan', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const PUT = apiHandler(putHandler);

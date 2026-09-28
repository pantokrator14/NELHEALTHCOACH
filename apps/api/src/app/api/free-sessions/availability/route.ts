// apps/api/src/app/api/free-sessions/availability/route.ts
// GET (público): disponibilidad de sesiones gratuitas para la landing.
// Devuelve si hay cupos y cuántos quedan (sin exponer datos del coach).

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, securityBlockResponse } from '@/app/lib/security/routeGuard';
import {
  computeFreeSessionsAvailability,
  getFreeSessionsConfig,
} from '@/app/lib/free-sessions';

async function getHandler(request: NextRequest) {
  return logger.time('LEAD', 'Disponibilidad de sesiones gratuitas', async () => {
    try {
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const config = await getFreeSessionsConfig();
      const { available, remaining } = computeFreeSessionsAvailability(config);

      return NextResponse.json({
        success: true,
        data: { available, remaining, limit: config.limit, used: config.used },
      });
    } catch (error: unknown) {
      logger.error('LEAD', 'Error consultando disponibilidad de sesiones', error);
      return NextResponse.json(
        { success: false, message: 'Error al consultar disponibilidad', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

// apps/api/src/app/api/plans/availability/route.ts
// GET (público): disponibilidad actual por plan para la landing y el portal del cliente.
// Devuelve un mapa planId -> { open, limit, used, remaining, available } sin datos personales.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { getPlanAvailabilityMap } from '@/app/lib/plan-quotas';

async function getHandler(request: NextRequest) {
  return logger.time('PLANS', 'Consultar disponibilidad de planes', async () => {
    try {
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const availabilityMap = await getPlanAvailabilityMap();
      return NextResponse.json({
        success: true,
        data: availabilityMap,
      });
    } catch (error: unknown) {
      logger.error('PLANS', 'Error consultando disponibilidad de planes', error);
      return NextResponse.json(
        { success: false, message: 'Error al consultar disponibilidad de planes', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

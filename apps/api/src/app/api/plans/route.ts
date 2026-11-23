import { NextRequest, NextResponse } from 'next/server';
import { COMMERCIAL_PLANS } from '@/app/lib/plans';
import { getPlanAvailabilityMap } from '@/app/lib/plan-quotas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logger } from '@/app/lib/logger';

async function getHandler(request: NextRequest) {
  try {
    const rateCheck = await requireRateLimit(request);
    if (!rateCheck.passed) return securityBlockResponse(rateCheck);

    const availabilityMap = await getPlanAvailabilityMap();
    const plans = COMMERCIAL_PLANS.map(({ stripePriceEnvKey: _envKey, ...publicPlan }) => ({
      ...publicPlan,
      availability: availabilityMap[publicPlan.id],
    }));

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: unknown) {
    logger.error('PLANS', 'Error obteniendo catálogo de planes', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener planes', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}

export const GET = apiHandler(getHandler);

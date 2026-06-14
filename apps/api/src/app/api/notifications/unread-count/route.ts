// apps/api/src/app/api/notifications/unread-count/route.ts
// Endpoint para obtener el conteo de notificaciones no leídas

import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/app/lib/database';
import { requireCoachAuth } from '@/app/lib/auth';
import Notification from '@/app/models/Notification';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';

/**
 * GET /api/notifications/unread-count
 *
 * Retorna el número de notificaciones no leídas del coach.
 */
async function getHandler(request: NextRequest) {
  try {
    await connectMongoose();

    const auth = requireCoachAuth(request);

    const count = await Notification.countDocuments({
      coachId: auth.coachId,
      read: false,
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    logger.error('NOTIFICATIONS', 'Error getting unread count', error as Error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener conteo de notificaciones' },
      { status: 500 }
    );
  }
}

export const GET = apiHandler(getHandler);

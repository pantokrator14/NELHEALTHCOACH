// apps/api/src/app/api/video/rooms/route.ts
//
// POST: Crea una nueva sala de videollamada y agenda una sesión.
// Solo accesible por el coach autenticado.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { createVideoSession } from '@/app/lib/video-service';
import { logger } from '@/app/lib/logger';

interface CreateRoomRequestBody {
  clientId: string;
  scheduledAt: string;
  durationMinutes?: number;
  coachNotes?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verificar autenticación del coach
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const body = (await request.json()) as CreateRoomRequestBody;

    if (!body.clientId || !body.scheduledAt) {
      return NextResponse.json(
        { success: false, message: 'clientId y scheduledAt son requeridos' },
        { status: 400 }
      );
    }

    // Validar fecha
    const scheduledDate = new Date(body.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Fecha inválida' },
        { status: 400 }
      );
    }

    if (scheduledDate < new Date()) {
      return NextResponse.json(
        { success: false, message: 'La fecha debe ser futura' },
        { status: 400 }
      );
    }

    const result = await createVideoSession(
      body.clientId,
      body.scheduledAt,
      body.durationMinutes ?? 60,
      body.coachNotes
    );

    logger.info('VIDEO', 'Room created via API', {
      clientId: body.clientId,
      roomName: result.roomName,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          roomName: result.roomName,
          sessionId: result.session.sessionId,
          sessionNumber: result.session.sessionNumber,
          scheduledAt: body.scheduledAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    if (errorMessage.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.error('VIDEO', 'Failed to create video room', error as Error);

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

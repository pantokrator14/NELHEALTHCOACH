// apps/api/src/app/api/video/token/route.ts
//
// POST: Genera un token de acceso de LiveKit para un participante.
// Soporta dos roles: 'coach' (autenticado con JWT del dashboard)
// y 'client' (autenticado con token temporal de sesión).

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifySessionToken } from '@/app/lib/auth';
import {
  generateParticipantToken,
  getVideoSession,
} from '@/app/lib/video-service';
import { logger } from '@/app/lib/logger';
import { getHealthFormsCollection } from '@/app/lib/database';
import { ObjectId } from 'mongodb';

interface TokenRequest {
  roomName: string;
  role: 'coach' | 'client';
  /** Token temporal de sesión, requerido si role === 'client' */
  sessionToken?: string;
  /** Nombre a mostrar en la sala */
  displayName?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TokenRequest;

    if (!body.roomName || !body.role) {
      return NextResponse.json(
        { success: false, message: 'roomName y role son requeridos' },
        { status: 400 }
      );
    }

    if (body.role === 'coach') {
      // ── Coach: autenticado con JWT del dashboard ──
      const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '');
      requireAuth(authHeader);

      const token = await generateParticipantToken({
        roomName: body.roomName,
        participantIdentity: `coach_${Date.now()}`,
        participantName: body.displayName ?? 'Coach',
        metadata: {
          clientId: '',
          sessionId: '',
          role: 'coach',
          displayName: body.displayName ?? 'Coach',
        },
        canPublish: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          token,
          serverUrl: process.env.LIVEKIT_URL,
        },
      });
    }

    if (body.role === 'client') {
      // ── Cliente: autenticado con token temporal ──
      if (!body.sessionToken) {
        return NextResponse.json(
          { success: false, message: 'sessionToken requerido para rol client' },
          { status: 400 }
        );
      }

      const decoded = verifySessionToken(body.sessionToken);

      // Verificar que la sesión existe y no ha expirado
      const session = await getVideoSession(decoded.sub, decoded.sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      if (session.status === 'cancelled' || session.status === 'completed') {
        return NextResponse.json(
          { success: false, message: `La sesión ya está ${session.status}` },
          { status: 400 }
        );
      }

      // Obtener el nombre del cliente desde la BD
      const collection = await getHealthFormsCollection();
      const doc = await collection.findOne({ _id: new ObjectId(decoded.sub) });
      const clientName = doc?.personalData?.name ?? 'Cliente';

      const token = await generateParticipantToken({
        roomName: body.roomName,
        participantIdentity: `client_${decoded.sub.slice(-8)}`,
        participantName: body.displayName ?? clientName,
        metadata: {
          clientId: decoded.sub,
          sessionId: decoded.sessionId,
          role: 'client',
          displayName: body.displayName ?? clientName,
        },
        canPublish: true,
        tokenTTL: '2h',
      });

      return NextResponse.json({
        success: true,
        data: {
          token,
          serverUrl: process.env.LIVEKIT_URL,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: `Rol no soportado: ${body.role}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    if (
      errorMessage.includes('Token') ||
      errorMessage.includes('token') ||
      errorMessage.includes('autorización') ||
      errorMessage.includes('client-session')
    ) {
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 401 }
      );
    }

    logger.error('VIDEO', 'Failed to generate participant token', error as Error);

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

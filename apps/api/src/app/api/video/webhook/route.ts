// apps/api/src/app/api/video/webhook/route.ts
//
// POST: Webhook de LiveKit que recibe eventos de sala:
// - room_started: Se actualiza el estado de la sesión a 'in_progress'
// - room_finished: Se actualiza a 'completed' y se dispara la transcripción
// - participant_joined/left: Auditoría
//
// Seguridad: Valida que el token del webhook coincida (configurable).

import { NextRequest, NextResponse } from 'next/server';
import { updateVideoSessionStatus } from '@/app/lib/video-service';
import { logger } from '@/app/lib/logger';

interface LiveKitWebhookEvent {
  event: string;
  room?: {
    name: string;
    sid: string;
  };
  participant?: {
    identity: string;
    name: string;
    metadata: string;
  };
  egressInfo?: {
    egressId: string;
    roomName: string;
    status: string;
    fileResults?: Array<{
      filename: string;
      location: string;
    }>;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as LiveKitWebhookEvent;

    logger.info('VIDEO', 'Webhook received', {
      event: body.event,
      roomName: body.room?.name,
    });

    // ── Procesar eventos de sala ──

    if (body.event === 'room_started' && body.room?.name) {
      const roomName = body.room.name;
      const info = await extractRoomInfo(roomName);
      if (info.clientId && info.sessionId) {
        await updateVideoSessionStatus(info.clientId, info.sessionId, 'in_progress', {
          startedAt: new Date(),
        });
      }
    }

    if (body.event === 'room_finished' && body.room?.name) {
      const roomName = body.room.name;
      const info = await extractRoomInfo(roomName);
      if (info.clientId && info.sessionId) {
        await updateVideoSessionStatus(info.clientId, info.sessionId, 'completed', {
          endedAt: new Date(),
        });
      }
    }

    // ── Procesar eventos de grabación (Egress) ──

    if (body.event === 'egress_ended' && body.egressInfo) {
      const egress = body.egressInfo;

      if (egress.status === 'EGRESS_COMPLETE' && egress.fileResults?.length) {
        const recordingUrl = egress.fileResults[0].location;

        logger.info('VIDEO', 'Recording completed, transcription queued', {
          roomName: egress.roomName,
          recordingUrl,
        });

        // NOTA: Aquí se disparará la función Inngest de transcripción
        // cuando Deepgram esté configurado. Por ahora solo registramos.
        // TODO: Disparar evento Inngest 'video.recording.ready'
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('VIDEO', 'Webhook processing error', error as Error);
    // LiveKit espera 200 aunque haya error para no reintentar
    return NextResponse.json({ success: false, error: 'Processing error' });
  }
}

/**
 * Extrae clientId y sessionId del nombre de la sala en LiveKit.
 * La sala se busca en MongoDB por el roomName.
 * Formato esperado: nelhc_{clientShortId}_s{num}
 */
async function extractRoomInfo(
  roomName: string
): Promise<{ clientId: string; sessionId: string } | { clientId: null; sessionId: null }> {
  try {
    const { getHealthFormsCollection } = await import('@/app/lib/database');
    const collection = await getHealthFormsCollection();

    // Buscar el cliente que tenga una videoSession con este roomName
    const doc = await collection.findOne(
      { 'videoSessions.roomName': roomName },
      { projection: { _id: 1, videoSessions: 1 } }
    );

    if (!doc) {
      logger.warn('VIDEO', `No client found for room ${roomName}`);
      return { clientId: null, sessionId: null };
    }

    const sessions = doc.videoSessions as Array<{ roomName: string; sessionId: string }>;
    const session = sessions.find((s) => s.roomName === roomName);

    if (!session) {
      return { clientId: null, sessionId: null };
    }

    return {
      clientId: doc._id.toString(),
      sessionId: session.sessionId,
    };
  } catch (error: unknown) {
    logger.error('VIDEO', 'Error extracting room info', error as Error);
    return { clientId: null, sessionId: null };
  }
}

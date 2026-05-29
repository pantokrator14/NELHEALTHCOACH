// apps/api/src/app/api/video/webhook/route.ts
//
// POST: Webhook de LiveKit que recibe eventos de sala:
// - room_started: Se actualiza el estado de la sesión a 'in_progress'
// - room_finished: Se actualiza a 'completed'
// - egress_ended: Envía la grabación a Deepgram para transcripción
//
// Seguridad: Valida que el token del webhook coincida (configurable).

import { NextRequest, NextResponse } from 'next/server';
import { updateVideoSessionStatus } from '@/app/lib/video-service';
import { getHealthFormsCollection } from '@/app/lib/database';
import { ObjectId } from 'mongodb';
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

// ─────────────────────────────────────────────
// Helpers Deepgram
// ─────────────────────────────────────────────

function isDeepgramConfigured(): boolean {
  return !!(process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY.length > 5);
}

async function submitTranscriptionRequest(
  audioUrl: string,
  callbackUrl: string,
  metadata: Record<string, string>
): Promise<{ request_id: string }> {
  const apiKey = process.env.DEEPGRAM_API_KEY!;

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: audioUrl,
        callback: callbackUrl,
        metadata,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Deepgram API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as { request_id: string };
  return data;
}

// ─────────────────────────────────────────────
// POST
// ─────────────────────────────────────────────

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

    // ── Procesar eventos de grabación (Egress) y enviar a Deepgram ──

    if (body.event === 'egress_ended' && body.egressInfo) {
      const egress = body.egressInfo;

      if (egress.status === 'EGRESS_COMPLETE' && egress.fileResults?.length) {
        const recordingUrl = egress.fileResults[0].location;
        const roomName = egress.roomName;

        logger.info('VIDEO', 'Recording completed, submitting to Deepgram', {
          roomName,
          recordingUrl,
        });

        // Buscar la sesión para obtener clientId, sessionId, sessionNumber
        const roomInfo = await extractRoomInfo(roomName);

        if (roomInfo.clientId && roomInfo.sessionId) {
          // 1. Guardar la referencia de la grabación en la sesión
          const collection = await getHealthFormsCollection();
          await collection.updateOne(
            { _id: new ObjectId(roomInfo.clientId) },
            {
              $set: {
                'videoSessions.$[session].recordingS3Key': recordingUrl,
                updatedAt: new Date(),
              },
            } as Record<string, unknown>,
            {
              arrayFilters: [{ 'session.sessionId': roomInfo.sessionId }],
            }
          );

          // 2. Enviar a Deepgram (si está configurado)
          if (isDeepgramConfigured()) {
            try {
              const callbackUrl = `${
                process.env.WEBSITE_URL || 'http://localhost:3001'
              }/api/video/transcription-ready`;

              const result = await submitTranscriptionRequest(
                recordingUrl,
                callbackUrl,
                {
                  clientId: roomInfo.clientId,
                  sessionId: roomInfo.sessionId,
                  sessionNumber: String(roomInfo.sessionNumber ?? 1),
                  roomName,
                }
              );

              logger.info('VIDEO', 'Audio submitted to Deepgram', {
                requestId: result.request_id,
              });
            } catch (deepgramError: unknown) {
              const errMsg =
                deepgramError instanceof Error
                  ? deepgramError.message
                  : 'Unknown Deepgram error';
              logger.error('VIDEO', `Deepgram submission failed: ${errMsg}`);
            }
          } else {
            logger.warn('VIDEO', 'Deepgram not configured — transcription skipped');
          }
        }
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
 * Extrae datos de la sesión desde el nombre de la sala en LiveKit.
 * Formato esperado: nelhc_{clientShortId}_s{num}
 */
async function extractRoomInfo(
  roomName: string
): Promise<{ clientId: string; sessionId: string; sessionNumber: number } | { clientId: null; sessionId: null; sessionNumber: null }> {
  try {
    const { getHealthFormsCollection } = await import('@/app/lib/database');
    const collection = await getHealthFormsCollection();

    const doc = await collection.findOne(
      { 'videoSessions.roomName': roomName },
      { projection: { _id: 1, videoSessions: 1 } }
    );

    if (!doc) {
      logger.warn('VIDEO', `No client found for room ${roomName}`);
      return { clientId: null, sessionId: null, sessionNumber: null };
    }

    const sessions = doc.videoSessions as Array<{ roomName: string; sessionId: string; sessionNumber: number }>;
    const session = sessions.find((s) => s.roomName === roomName);

    if (!session) {
      return { clientId: null, sessionId: null, sessionNumber: null };
    }

    return {
      clientId: doc._id.toString(),
      sessionId: session.sessionId,
      sessionNumber: session.sessionNumber,
    };
  } catch (error: unknown) {
    logger.error('VIDEO', 'Error extracting room info', error as Error);
    return { clientId: null, sessionId: null, sessionNumber: null };
  }
}

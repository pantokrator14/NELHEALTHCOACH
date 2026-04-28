// apps/api/src/app/inngest/functions/transcribe-session.ts
//
// Función Inngest: Transcribe la grabación de una videollamada.
//
// Flujo:
// 1. Recibe evento 'video.recording.ready' con la URL de S3 del audio
// 2. Envía el audio a Deepgram para transcripción (async con callback)
// 3. Deepgram llama a /api/video/transcription-ready con el resultado
//
// Usa la API REST de Deepgram directamente (sin SDK específico de versión).

import { inngest } from '../client';
import { logger } from '@/app/lib/logger';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface RecordingReadyEvent {
  name: 'video.recording.ready';
  data: {
    clientId: string;
    sessionId: string;
    sessionNumber: number;
    roomName: string;
    recordingS3Key: string;
    recordingUrl: string;
    audioDurationSeconds?: number;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isDeepgramConfigured(): boolean {
  return !!(process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY.length > 5);
}

/**
 * Envía la solicitud de transcripción a Deepgram usando la API REST directamente.
 * Deepgram devolverá 200 con un request_id y luego llamará al callback
 * cuando la transcripción esté lista.
 */
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
// Función principal
// ─────────────────────────────────────────────

export const transcribeSessionFn = inngest.createFunction(
  {
    id: 'transcribe-session',
    name: 'Transcribir grabación de videollamada',
    triggers: [{ event: 'video.recording.ready' }],
  },
  async (ctx) => {
    const data = ctx.event.data as RecordingReadyEvent['data'];
    const {
      clientId,
      sessionId,
      sessionNumber,
      roomName,
      recordingS3Key,
      recordingUrl,
    } = data;

    const log = logger.withContext({
      clientId,
      sessionId,
      endpoint: 'inngest:transcribe-session',
    });

    log.info('VIDEO', 'Starting transcription pipeline');

    // ── Step 1: Preparar URL del audio ──

    const audioUrl = await ctx.step.run('prepare-audio-url', async () => {
      try {
        const { S3Service } = await import('@/app/lib/s3');
        return S3Service.getFileURL(recordingS3Key);
      } catch {
        log.warn('VIDEO', 'Could not generate file URL, using direct recording URL');
        return recordingUrl;
      }
    });

    // ── Step 2: Enviar a Deepgram ──

    const transcriptionResult = await ctx.step.run(
      'submit-to-deepgram',
      async () => {
        if (!isDeepgramConfigured()) {
          log.warn(
            'VIDEO',
            'Deepgram not configured (DEEPGRAM_API_KEY missing). '
            + 'Transcription will be skipped. Add API key to enable.'
          );
          return { status: 'skipped', reason: 'deepgram-not-configured' };
        }

        try {
          const callbackUrl = `${
            process.env.WEBSITE_URL || 'http://localhost:3001'
          }/api/video/transcription-ready`;

          const result = await submitTranscriptionRequest(
            audioUrl,
            callbackUrl,
            {
              clientId,
              sessionId,
              sessionNumber: String(sessionNumber),
              roomName,
            }
          );

          log.info('VIDEO', 'Audio submitted to Deepgram for transcription', {
            requestId: result.request_id,
            model: 'nova-3',
          });

          return { status: 'submitted', requestId: result.request_id };
        } catch (deepgramError: unknown) {
          const errMsg =
            deepgramError instanceof Error
              ? deepgramError.message
              : 'Unknown Deepgram error';

          log.error('VIDEO', `Deepgram transcription failed: ${errMsg}`);

          return {
            status: 'failed',
            reason: 'deepgram-error',
            error: errMsg,
          };
        }
      }
    );

    // ── Step 3: Guardar referencia de grabación ──

    await ctx.step.run('update-recording-reference', async () => {
      const { getHealthFormsCollection } = await import('@/app/lib/database');
      const { ObjectId } = await import('mongodb');

      const collection = await getHealthFormsCollection();
      await collection.updateOne(
        { _id: new ObjectId(clientId) },
        {
          $set: {
            'videoSessions.$[session].recordingS3Key': recordingS3Key,
            updatedAt: new Date(),
          },
        } as Record<string, unknown>,
        {
          arrayFilters: [{ 'session.sessionId': sessionId }],
        }
      );
    });

    log.info('VIDEO', 'Transcription pipeline completed');

    return {
      success: true,
      clientId,
      sessionId,
      deepgramConfigured: isDeepgramConfigured(),
      result: transcriptionResult,
    };
  }
);

// apps/api/src/app/api/video/transcription-ready/route.ts
//
// POST: Callback de Deepgram con el resultado de la transcripción
// de una grabación de videollamada.
//
// Este endpoint recibe el transcript completo, lo guarda en S3,
// lo anexa al documento MongoDB del cliente y dispara el pipeline
// de post-procesamiento (Textract + resumen con DeepSeek +
// re-generación de recomendaciones).

import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection } from '@/app/lib/database';
import { encrypt } from '@/app/lib/encryption';
import { uploadTextToS3 } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface DeepgramCallbackPayload {
  request_id?: string;
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{ word: string; start: number; end: number }>;
      }>;
    }>;
    utterances?: Array<{
      speaker: number;
      transcript: string;
      start: number;
      end: number;
    }>;
    duration?: number;
  };
  metadata?: {
    request_id?: string;
    clientId?: string;
    sessionId?: string;
    sessionNumber?: number;
    roomName?: string;
  };
}

// ─────────────────────────────────────────────
// POST
// ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as DeepgramCallbackPayload;

    logger.info('VIDEO', 'Deepgram transcription callback received', {
      requestId: body.request_id,
    });

    // Validar que tenemos la transcripción
    const transcript =
      body.results?.channels?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript || transcript.trim().length === 0) {
      logger.warn('VIDEO', 'Empty or missing transcript in Deepgram callback');
      return NextResponse.json({ success: false, message: 'Transcript vacío' });
    }

    const confidence =
      body.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0;
    const audioDuration = body.results?.duration ?? 0;
    const clientId = body.metadata?.clientId;
    const sessionId = body.metadata?.sessionId;
    const sessionNumber = body.metadata?.sessionNumber ?? 1;

    if (!clientId || !sessionId) {
      logger.warn('VIDEO', 'Missing clientId or sessionId in metadata');
      return NextResponse.json({
        success: false,
        message: 'Metadata incompleta: falta clientId o sessionId',
      });
    }

    // Generar nombre de archivo para la transcripción
    const transcriptionId = `tr_${uuidv4().slice(0, 8)}`;
    const fileName = `transcripcion_sesion_${sessionNumber}_${Date.now()}.txt`;
    const s3Key = `clients/${clientId}/transcriptions/${fileName}`;

    // Subir transcripción a S3
    let s3Url = '';
    try {
      s3Url = await uploadTextToS3(s3Key, transcript, 'text/plain; charset=utf-8');
      logger.info('VIDEO', 'Transcription uploaded to S3', { s3Key });
    } catch (s3Error: unknown) {
      logger.error('VIDEO', 'Failed to upload transcription to S3', s3Error as Error);
      // No fallamos — guardamos en MongoDB de todos modos
    }

    // Guardar en MongoDB
    const collection = await getHealthFormsCollection();

    const transcriptionDoc = {
      transcriptionId,
      sessionId,
      sessionNumber,
      fullText: encrypt(transcript),
      summary: encrypt(''), // Se llenará después con DeepSeek
      agreements: encrypt(''), // Se llenará después con DeepSeek
      createdAt: new Date(),
      txtFileS3Key: encrypt(s3Key),
      confidence,
      audioDurationSeconds: audioDuration,
    };

    await collection.updateOne(
      { _id: new ObjectId(clientId) },
      {
        $push: { transcriptions: transcriptionDoc },
        $set: { updatedAt: new Date() },
      } as Record<string, unknown>
    );

    logger.info('VIDEO', 'Transcription saved to MongoDB', {
      clientId,
      sessionId,
      transcriptionId,
    });

    // TODO: Disparar evento Inngest 'transcription.ready' para:
    // 1. Resumir con DeepSeek
    // 2. Ejecutar Textract (si aplica)
    // 3. Regenerar recomendaciones con LangGraph

    return NextResponse.json({
      success: true,
      data: { transcriptionId, s3Key },
    });
  } catch (error: unknown) {
    logger.error('VIDEO', 'Transcription callback error', error as Error);
    return NextResponse.json(
      { success: false, message: 'Error processing transcription' },
      { status: 500 }
    );
  }
}

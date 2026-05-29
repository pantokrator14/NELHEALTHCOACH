// apps/api/src/app/api/video/transcription-ready/route.ts
//
// POST: Callback de Deepgram con el resultado de la transcripción
// de una grabación de videollamada.
//
// Recibe el transcript de Deepgram, lo guarda en S3 y MongoDB,
// y genera un resumen con Gemini (sin usar Inngest).

import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection } from '@/app/lib/database';
import { encrypt } from '@/app/lib/encryption';
import { uploadTextToS3 } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { callGeminiAPI } from '@/app/lib/agents/utils/llm';

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
      summary: encrypt(''), // Se llenará después con Gemini
      agreements: encrypt(''), // Se llenará después con Gemini
      createdAt: new Date(),
      txtFileS3Key: encrypt(s3Key),
      confidence,
      audioDurationSeconds: audioDuration,
    };

    await collection.updateOne(
      { _id: new ObjectId(clientId) },
      {
        $push: {
          transcriptions: transcriptionDoc,
          // También guardar como documento procesado para que la IA lo vea
          'medicalData.processedDocuments': {
            title: encrypt(`Seguimiento #${sessionNumber}`),
            content: encrypt(transcript),
            metadata: {
              documentType: 'transcription',
              extractionStatus: 'completed',
              source: 'deepgram',
            },
            confidence: Math.round(confidence * 100),
            processedAt: new Date(),
            pageCount: 1,
            language: 'es',
          },
        },
        $set: { updatedAt: new Date() },
      } as Record<string, unknown>
    );

    logger.info('VIDEO', 'Transcription saved to MongoDB', {
      clientId,
      sessionId,
      transcriptionId,
    });

    // ── Resumir con Gemini (sin Inngest, llamada directa) ──

    let summaryText = '';
    let agreementsText = '';

    try {
      const prompt = `Eres un asistente especializado en resumir sesiones de coaching de salud. 
Analiza la siguiente transcripción de una videollamada entre un coach de salud y su cliente.

Extrae y devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "summary": "Resumen de 2-3 párrafos de los temas principales tratados en la sesión",
  "agreements": "Acuerdos alcanzados, cambios en objetivos, próximos pasos concretos acordados entre coach y cliente",
  "keyPoints": ["Punto clave 1", "Punto clave 2", ...]
}

TRANSCRIPCIÓN:
${transcript.slice(0, 12000)}

Responde solo con el JSON, sin explicaciones adicionales.`;

      const geminiResult = await callGeminiAPI({
        userPrompt: prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      });

      const jsonMatch = geminiResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          summary: string;
          agreements: string;
        };
        summaryText = parsed.summary || '';
        agreementsText = parsed.agreements || '';
      }

      // Guardar el resumen en MongoDB
      const updateFields: Record<string, unknown> = {
        'transcriptions.$[tr].summary': encrypt(summaryText),
        'transcriptions.$[tr].agreements': encrypt(agreementsText),
        updatedAt: new Date(),
      };

      await collection.updateOne(
        { _id: new ObjectId(clientId) },
        { $set: updateFields },
        { arrayFilters: [{ 'tr.transcriptionId': transcriptionId }] }
      );

      logger.info('VIDEO', 'Transcription summarized with Gemini', {
        clientId,
        transcriptionId,
        summaryLength: summaryText.length,
      });
    } catch (geminiError: unknown) {
      logger.warn('VIDEO', 'Gemini summarization failed (non-critical)', geminiError as Error);
      // No fallamos — la transcripción ya está guardada
    }

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

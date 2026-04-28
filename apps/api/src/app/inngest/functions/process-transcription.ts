// apps/api/src/app/inngest/functions/process-transcription.ts
//
// Función Inngest: Procesa una transcripción completada.
//
// Flujo:
// 1. Recibe evento 'transcription.ready' con los datos de la transcripción
// 2. Envía el transcript a DeepSeek para extraer puntos clave y acuerdos
// 3. Actualiza el documento MongoDB con el resumen
// 4. Dispara la re-generación de recomendaciones vía LangGraph

import { inngest } from '../client';
import { logger } from '@/app/lib/logger';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, encrypt } from '@/app/lib/encryption';
import { ObjectId } from 'mongodb';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface TranscriptionReadyEvent {
  name: 'transcription.ready';
  data: {
    clientId: string;
    sessionId: string;
    transcriptionId: string;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Envía una solicitud de resumen a DeepSeek.
 */
async function summarizeWithDeepSeek(transcript: string): Promise<{
  summary: string;
  agreements: string;
  keyPoints: string[];
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const prompt = `Eres un asistente especializado en resumir sesiones de coaching de salud. 
Analiza la siguiente transcripción de una videollamada entre un coach de salud y su cliente.

Extrae y devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "summary": "Resumen de 2-3 párrafos de los temas principales tratados en la sesión",
  "agreements": "Acuerdos alcanzados, cambios en objetivos, próximos pasos concretos acordados entre coach y cliente",
  "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3", ...]
}

TRANSCRIPCIÓN:
${transcript.slice(0, 12000)}

Responde solo con el JSON, sin explicaciones adicionales.`;

  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in DeepSeek response');
  }

  // Extraer el JSON de la respuesta (puede venir entre ```json ... ```)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from DeepSeek response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary: string;
    agreements: string;
    keyPoints: string[];
  };

  return parsed;
}

/**
 * Dispara el evento Inngest para re-generar recomendaciones.
 */
async function triggerRecommendationRegeneration(
  clientId: string,
  monthNumber: number,
  coachNotes: string
): Promise<void> {
  await inngest.send({
    name: 'ai.recommendations.requested',
    data: {
      clientId,
      monthNumber,
      coachNotes,
      maxRevisions: 2,
    },
  });
}

// ─────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────

export const processTranscriptionFn = inngest.createFunction(
  {
    id: 'process-transcription',
    name: 'Procesar transcripción y generar recomendaciones',
    triggers: [{ event: 'transcription.ready' }],
  },
  async (ctx) => {
    const data = ctx.event.data as TranscriptionReadyEvent['data'];
    const { clientId, transcriptionId } = data;

    const log = logger.withContext({
      clientId,
      transcriptionId,
      endpoint: 'inngest:process-transcription',
    });

    log.info('AI', 'Processing transcription for summary and recommendations');

    // ── Step 1: Obtener la transcripción de MongoDB ──

    const transcriptData = await ctx.step.run('fetch-transcription', async () => {
      const collection = await getHealthFormsCollection();
      const doc = await collection.findOne(
        { _id: new ObjectId(clientId) },
        { projection: { transcriptions: 1 } }
      );

      const transcriptions = doc?.transcriptions as Array<{
        transcriptionId: string;
        fullText: string;
        sessionNumber: number;
      }>;

      const transcription = transcriptions?.find(
        (t) => t.transcriptionId === transcriptionId
      );

      if (!transcription) {
        throw new Error(`Transcription not found: ${transcriptionId}`);
      }

      return {
        fullText: decrypt(transcription.fullText),
        sessionNumber: transcription.sessionNumber,
      };
    });

    if (!transcriptData.fullText || transcriptData.fullText.trim().length === 0) {
      log.warn('AI', 'Empty transcription, skipping summary');
      return { success: false, reason: 'empty-transcript' };
    }

    // ── Step 2: Resumir con DeepSeek ──

    const summary = await ctx.step.run('summarize-with-deepseek', async () => {
      try {
        log.info('AI', 'Sending transcription to DeepSeek for summarization');
        return await summarizeWithDeepSeek(transcriptData.fullText);
      } catch (error: unknown) {
        log.error('AI', 'DeepSeek summarization failed', error as Error);
        // Proporcionar un resumen de respaldo
        return {
          summary: `Transcripción de la sesión ${transcriptData.sessionNumber}. Revisar transcripción completa para detalles.`,
          agreements: 'Ver transcripción completa para acuerdos.',
          keyPoints: ['Revisar transcripción completa'],
        };
      }
    });

    // ── Step 3: Guardar resumen en MongoDB ──

    await ctx.step.run('save-summary', async () => {
      const collection = await getHealthFormsCollection();

      await collection.updateOne(
        { _id: new ObjectId(clientId) },
        {
          $set: {
            'transcriptions.$[tr].summary': encrypt(summary.summary),
            'transcriptions.$[tr].agreements': encrypt(summary.agreements),
            updatedAt: new Date(),
          },
        },
        {
          arrayFilters: [{ 'tr.transcriptionId': transcriptionId }],
        }
      );

      log.info('AI', 'Summary saved to MongoDB');
    });

    // ── Step 4: Disparar re-generación de recomendaciones ──

    await ctx.step.run('trigger-recommendations', async () => {
      const nextMonth = transcriptData.sessionNumber + 1;

      const coachNotes = [
        `RESUMEN DE SESIÓN #${transcriptData.sessionNumber}:`,
        summary.summary,
        '',
        'ACUERDOS:',
        summary.agreements,
        '',
        'PUNTOS CLAVE:',
        ...summary.keyPoints.map((p: string) => `- ${p}`),
      ].join('\n');

      await triggerRecommendationRegeneration(clientId, nextMonth, coachNotes);

      log.info('AI', 'Recommendation regeneration triggered', {
        monthNumber: nextMonth,
      });
    });

    log.info('AI', 'Transcription processing completed');

    return {
      success: true,
      clientId,
      transcriptionId,
      summaryLength: summary.summary.length,
      keyPointsCount: summary.keyPoints.length,
    };
  }
);

// apps/api/src/app/lib/deepgram.ts
//
// Servicio compartido para interacciones con la API de Deepgram.
// Unifica la configuración, envío de transcripciones y lógica de reintentos
// para que webhook, transcription-ready y retry-transcription usen el mismo código.
//
// Deepgram Nova-3: modelo de última generación con soporte multidioma,
// smart_format (puntuación automática, mayúsculas, formato de números),
// diarization (identificación de hablantes) y utterances (segmentación por pausas).

import { logger } from './logger';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

/** Número máximo de reintentos automáticos de transcripción antes de marcar como fallido */
export const MAX_AUTO_RETRIES = 1;

/**
 * Modelos y parámetros de Deepgram.
 * Nova-3: el modelo más preciso de Deepgram para reconocimiento de voz.
 * smart_format: añade puntuación, mayúsculas y formato automático.
 * diarize: identifica quién habla y cuándo (varios hablantes).
 * utterances: segmenta el audio por pausas y cambios de hablante.
 * language: forzamos español explícitamente para mejor precisión.
 */
const DEEPGRAM_BASE_URL = 'https://api.deepgram.com/v1/listen';
const DEEPGRAM_QUERY_PARAMS =
  'model=nova-3&smart_format=true&diarize=true&utterances=true&language=es&punctuate=true';

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface DeepgramMetadata {
  clientId: string;
  sessionId: string;
  sessionNumber: string;
  roomName: string;
  /** Indica si este envío es un reintento automático */
  isRetry?: string; // Deepgram metadata values must be strings
}

export interface DeepgramSubmitResult {
  requestId: string;
}

export interface DeepgramCallbackPayload {
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
    isRetry?: string;
  };
}

// ─────────────────────────────────────────────
// Funciones públicas
// ─────────────────────────────────────────────

/**
 * Verifica que Deepgram esté configurado correctamente.
 * La API key debe tener al menos 6 caracteres para considerarse válida.
 */
export function isDeepgramConfigured(): boolean {
  return !!(process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY.length > 5);
}

/**
 * Envía una solicitud de transcripción a Deepgram.
 *
 * Usa el modelo Nova-3 con las siguientes optimizaciones:
 * - smart_format: puntuación, mayúsculas, formato de números y monedas
 * - diarize: identificación de hablantes (quién dijo qué)
 * - utterances: segmentación por frases/pausas naturales
 * - language=es: español explícito para evitar auto-detección
 * - punctuate: puntuación automática
 *
 * Deepgram descargará el audio desde `audioUrl` y cuando termine,
 * hará un POST al `callbackUrl` con el resultado.
 *
 * @param audioUrl URL pública de la grabación a transcribir
 * @param callbackUrl URL donde Deepgram notificará el resultado
 * @param metadata Metadatos adicionales que Deepgram devolverá en el callback
 * @returns El request_id de Deepgram para tracking
 * @throws Error si la API responde con error
 */
export async function submitTranscriptionRequest(
  audioUrl: string,
  callbackUrl: string,
  metadata: DeepgramMetadata
): Promise<DeepgramSubmitResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY!;

  const url = `${DEEPGRAM_BASE_URL}?${DEEPGRAM_QUERY_PARAMS}`;

  const body = JSON.stringify({
    url: audioUrl,
    callback: callbackUrl,
    metadata,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let enhancedMessage: string;

    switch (response.status) {
      case 400:
        enhancedMessage = `Deepgram rechazó la solicitud (400): el formato de audio no es soportado o la URL es inválida. Verifica que la grabación sea accesible públicamente.`;
        break;
      case 401:
        enhancedMessage = `Deepgram rechazó la autenticación (401): la DEEPGRAM_API_KEY no es válida o expiró.`;
        break;
      case 413:
        enhancedMessage = `Deepgram rechazó la solicitud (413): el audio es demasiado largo. La duración máxima es de ~4 horas.`;
        break;
      case 429:
        enhancedMessage = `Deepgram rechazó la solicitud por límite de tasa (429): demasiadas solicitudes en poco tiempo. Espera unos minutos y reintenta.`;
        break;
      default:
        enhancedMessage = `Deepgram API error ${response.status}: ${errorText}`;
    }

    logger.error('TRANSCRIPTION', 'Deepgram submission failed', undefined, undefined, {
      audioUrl: audioUrl.slice(0, 100),
      httpStatus: response.status,
      errorDetail: errorText,
      metadata,
    });

    throw new Error(enhancedMessage);
  }

  const data = (await response.json()) as { request_id: string };

  logger.info('TRANSCRIPTION', 'Transcription submitted to Deepgram', {
    requestId: data.request_id,
    audioUrl: audioUrl.slice(0, 100),
    metadata,
  });

  return { requestId: data.request_id };
}

/**
 * Construye la URL de callback para Deepgram.
 */
export function buildCallbackUrl(): string {
  return `${
    process.env.WEBSITE_URL || 'http://localhost:3001'
  }/api/video/transcription-ready`;
}

/**
 * Genera un mensaje de error explicativo según la causa del fallo.
 * El objetivo es que el coach entienda QUÉ pasó y QUÉ puede hacer al respecto.
 */
export function explainTranscriptionError(
  transcriptError: string | undefined | null,
  hasRecording: boolean,
  retryCount: number
): string {
  // Errores conocidos de Deepgram
  if (!transcriptError) {
    return 'No se pudo transcribir la grabación.';
  }

  if (transcriptError.includes('vacía') || transcriptError.includes('empty')) {
    if (retryCount > 0) {
      return (
        'La transcripción devolvió texto vacío después de varios intentos. ' +
        'Posibles causas:\n' +
        '• El audio tiene mucho ruido de fondo o varias personas hablando al mismo tiempo\n' +
        '• El volumen de la grabación es muy bajo\n' +
        '• No se detectó voz clara en la grabación\n\n' +
        'Recomendaciones:\n' +
        '• Usa un micrófono externo en la próxima videollamada\n' +
        '• Busca un lugar silencioso sin eco\n' +
        '• Habla claro y evita interrupciones'
      );
    }
    return (
      'La transcripción devolvió texto vacío. Se reintentará automáticamente. ' +
      'Si el problema persiste, revisa la calidad del audio de la grabación.'
    );
  }

  if (transcriptError.includes('401') || transcriptError.includes('autenticación')) {
    return (
      'Error de autenticación con el servicio de transcripción (Deepgram). ' +
      'Esto es un problema de configuración del sistema. ' +
      'Contacta al administrador para verificar la DEEPGRAM_API_KEY.'
    );
  }

  if (transcriptError.includes('413') || transcriptError.includes('larg')) {
    return (
      'El archivo de audio es demasiado largo para ser procesado. ' +
      'La duración máxima es de aproximadamente 4 horas. ' +
      'Si la videollamada fue más larga, considera dividirla en sesiones más cortas.'
    );
  }

  if (transcriptError.includes('429') || transcriptError.includes('límite')) {
    return (
      'Se excedió el límite de solicitudes al servicio de transcripción. ' +
      'Espera unos minutos y usa el botón "Reintentar Transcripción".'
    );
  }

  if (transcriptError.includes('formato') || transcriptError.includes('soportado')) {
    return (
      'El formato del archivo de audio no es soportado por el servicio de transcripción. ' +
      'Verifica la configuración de grabación de LiveKit.'
    );
  }

  // Error genérico: devolvemos el mensaje original con contexto
  return (
    `Error en la transcripción: ${transcriptError}\n\n` +
    'Puedes intentar lo siguiente:\n' +
    '• Usa el botón "Reintentar Transcripción" para intentar de nuevo\n' +
    '• Si el error persiste, verifica que la grabación se haya completado correctamente\n' +
    '• Revisa que la DEEPGRAM_API_KEY esté configurada y sea válida'
  );
}

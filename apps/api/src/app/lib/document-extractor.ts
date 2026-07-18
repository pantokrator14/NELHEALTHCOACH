/**
 * Extractor local de texto desde archivos subidos por el cliente.
 *
 * Propósito: Reemplazar la dependencia de Gemini para la lectura de archivos.
 * Extraemos texto localmente y solo enviamos texto plano a Gemini para análisis.
 *
 * Pipeline por tipo de archivo:
 *   PDF  → pdf-parse v1 (usa pdfjs-dist v2 internamente con disableWorker=true.
 *          No necesita workers — funciona en Vercel/AWS Lambda sin config adicional)
 *   DOCX → mammoth.js
 *   Imagen → tesseract.js OCR + PaddleOCR
 *   TXT   → raw utf-8
 */

import Mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { logger } from './logger';

// ─────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────

export type ExtractionMethod =
  | 'pdf-parse'
  | 'mammoth'
  | 'tesseract-ocr'
  | 'paddle-ocr'
  | 'gemini-multimodal'
  | 'raw';

export interface ExtractionResult {
  /** Texto plano extraído del documento (incluye tablas formateadas como markdown si se detectaron) */
  text: string;
  /** Método que se usó para extraer el texto */
  method: ExtractionMethod;
  /** Número de páginas (solo PDF) */
  pages?: number;
  /** Confianza del OCR (0-100, solo tesseract) */
  ocrConfidence?: number;
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif',
]);

/** Mínimo de caracteres para considerar que la extracción fue exitosa */
const MIN_TEXT_LENGTH = 20;

/** Máximo de páginas que extraemos de un PDF (las primeras N páginas — los resultados de laboratorio siempre están al inicio) */
const MAX_PDF_PAGES = 15;

/** Máximo de caracteres que retornamos (Gemini tiene límite de contexto) */
const MAX_TEXT_LENGTH = 50_000;

// ─────────────────────────────────────────────
// Punto de entrada único
// ─────────────────────────────────────────────

/**
 * Extrae texto de cualquier tipo de archivo soportado.
 * La detección se hace por extensión del nombre y/o MIME type.
 *
 * @param buffer - Contenido binario del archivo
 * @param fileName - Nombre del archivo (para detectar extensión)
 * @param mimeType - MIME type del archivo (opcional, para detección adicional)
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<ExtractionResult> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType ?? '';
  const logCtx = logger.withContext({ tool: 'document-extractor', fileName, ext });

  // ── PDF ──
  if (ext === 'pdf' || mime === 'application/pdf') {
    return extractFromPDF(buffer, logCtx);
  }

  // ── DOCX ──
  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    return extractFromDocx(buffer, logCtx);
  }

  // ── Imágenes ──
  if (IMAGE_EXTENSIONS.has(ext)) {
    return extractFromImage(buffer, logCtx);
  }

  // ── Texto plano o desconocido ──
  const rawText = buffer.toString('utf-8');
  if (rawText.trim().length > 0) {
    logCtx.info('AI', 'Texto extraído como raw', {
      chars: rawText.length,
    });
    return { text: truncate(rawText), method: 'raw' };
  }

  // Último recurso: intentar OCR
  logCtx.warn('AI', 'Extensión desconocida, intentando OCR como último recurso');
  return extractFromImage(buffer, logCtx);
}

// ─────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────

/**
 * PDF: extracción con pdf-parse v1.
 *
 * Usa pdfjs-dist v2 internamente con disableWorker=true.
 * No necesita workers — funciona en Vercel/AWS Lambda
 * sin configuración adicional.
 */
async function extractFromPDF(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  try {
    return await extractWithPdfParseV1(buffer, logCtx);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    logCtx.warn('AI', 'pdf-parse v1 falló', { error: message.substring(0, 200) });
  }

  logCtx.warn('AI', 'No se pudo extraer texto del PDF');
  return { text: '', method: 'pdf-parse', pages: 0 };
}

/**
 * Extrae texto plano de un PDF usando pdf-parse v1.
 * Internamente usa pdfjs-dist v2 con disableWorker=true.
 * Sin workers, sin configuración adicional.
 */
async function extractWithPdfParseV1(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  const { default: pdfParse } = await import('pdf-parse');
  const data = await pdfParse(buffer, { max: MAX_PDF_PAGES });
  const text = (data.text ?? '').trim();
  const pages = data.numpages ?? 0;

  if (text.length >= MIN_TEXT_LENGTH) {
    logCtx.info('AI', 'PDF extraído con pdf-parse v1', {
      pages,
      chars: text.length,
    });
    return { text: truncate(text), method: 'pdf-parse', pages };
  }

  logCtx.warn('AI', 'pdf-parse v1 devolvió muy poco texto', { chars: text.length });
  throw new Error(`pdf-parse v1 returned insufficient content: ${text.length} chars`);
}

// ─────────────────────────────────────────────
// DOCX
// ─────────────────────────────────────────────

/**
 * DOCX: extracción con mammoth.js
 */
async function extractFromDocx(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  try {
    const result = await Mammoth.extractRawText({ buffer });
    const text = (result.value ?? '').trim();

    logCtx.info('AI', 'DOCX extraído con mammoth', {
      chars: text.length,
      warnings: result.messages.length,
    });

    return { text: truncate(text), method: 'mammoth' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    logCtx.error('AI', 'mammoth falló al extraer DOCX', err instanceof Error ? err : undefined, {
      error: message.substring(0, 200),
    });
    throw err;
  }
}

// ─────────────────────────────────────────────
// Imágenes / OCR
// ─────────────────────────────────────────────

/**
 * Imagen (o PDF como imagen): OCR con tesseract.js
 */
async function extractFromImage(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  try {
    const worker = await createWorker('spa+eng');

    try {
      const { data } = await worker.recognize(buffer);
      const text = (data.text ?? '').trim();
      const confidence = data.confidence ?? 0;

      logCtx.info('AI', 'OCR completado con tesseract.js', {
        chars: text.length,
        confidence,
      });

      return {
        text: truncate(text),
        method: 'tesseract-ocr',
        ocrConfidence: confidence,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      logCtx.error('AI', 'OCR falló', err instanceof Error ? err : undefined, {
        error: message.substring(0, 200),
      });
      throw err;
    } finally {
      await worker.terminate();
    }
  } catch (workerError: unknown) {
    // Si createWorker falla (ej: tesseract.js no disponible en serverless),
    // no crasheamos — retornamos texto vacío y la función continúa
    const message = workerError instanceof Error ? workerError.message : 'Error desconocido';
    logCtx.warn('AI', 'No se pudo inicializar OCR con tesseract.js, continuando sin texto extraído', {
      error: message.substring(0, 200),
    });
    return { text: '', method: 'tesseract-ocr' };
  }
}

// ─────────────────────────────────────────────
// PaddleOCR (local, sin worker_threads)
// ─────────────────────────────────────────────

/**
 * Singleton del servicio PaddleOCR.
 * Se reusa entre invocaciones calientes (module cache de Vercel).
 * Los modelos ONNX se descargan una sola vez y se cachean en /tmp.
 */
let _paddleOcrService: any | null = null;
let _paddleOcrInitializing: Promise<void> | null = null;

async function getPaddleOcrService(): Promise<any> {
  if (_paddleOcrService?.isInitialized?.()) {
    return _paddleOcrService;
  }

  if (!_paddleOcrInitializing) {
    _paddleOcrInitializing = (async () => {
      const { PaddleOcrService } = await import('ppu-paddle-ocr');
      const service = new PaddleOcrService({
        session: {
          executionProviders: ['cpu'],
          graphOptimizationLevel: 'all',
        },
      });
      await service.initialize();
      _paddleOcrService = service;
    })();
  }

  await _paddleOcrInitializing;
  return _paddleOcrService!;
}

/**
 * Extrae texto de una imagen usando PaddleOCR (PP-OCRv6).
 * No requiere worker_threads — corre sobre ONNX Runtime directamente.
 *
 * @returns El texto extraído y la confianza promedio (0-100).
 */
export async function extractTextFromImageViaPaddleOCR(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): Promise<{ text: string; confidence: number }> {
  const logCtx = logger.withContext({ tool: 'paddle-ocr', fileName });

  try {
    const service = await getPaddleOcrService();
    const result = await service.recognize(buffer.buffer);

    const text = (result?.text ?? '').trim();
    const confidence = typeof result?.confidence === 'number' ? Math.round(result.confidence * 100) : 0;

    logCtx.info('AI', 'OCR completado con PaddleOCR', {
      chars: text.length,
      confidence,
    });

    return { text, confidence };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logCtx.warn('AI', 'PaddleOCR falló — se usará fallback', {
      error: message.substring(0, 200),
    });
    throw error; // El caller decide si hacer fallback
  }
}

/**
 * Trunca el texto si excede el límite para Gemini.
 */
function truncate(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return (
    text.substring(0, MAX_TEXT_LENGTH) +
    `\n\n[... Texto truncado. Longitud original: ${text.length} caracteres]`
  );
}

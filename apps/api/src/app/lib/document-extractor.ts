/**
 * Extractor local de texto desde archivos subidos por el cliente.
 *
 * Propósito: Reemplazar la dependencia de Gemini para la lectura de archivos.
 * Extraemos texto localmente y solo enviamos texto plano a Gemini para análisis.
 *
 * Pipeline por tipo de archivo:
 *   PDF  → 1. pdf-parse (50ms, PDF textual)
 *          2. pdfjs-dist  (200ms, fallback: PDFs complejos o con capa oculta)
 *          3. Se marca como "no extraíble" si ambos fallan
 *   DOCX → mammoth.js
 *   Imagen → tesseract.js OCR
 *   TXT   → raw utf-8
 */

import pdfParse from 'pdf-parse';
import Mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { logger } from './logger';

// ─────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────

export type ExtractionMethod =
  | 'pdf-parse'
  | 'pdfjs-dist'
  | 'mammoth'
  | 'tesseract-ocr'
  | 'raw';

export interface ExtractionResult {
  /** Texto plano extraído del documento */
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
// Estrategias de extracción
// ─────────────────────────────────────────────

/**
 * PDF: dos intentos en capas.
 *
 * 1. pdf-parse: rápido, funciona con PDFs textuales (la mayoría de laboratorios).
 * 2. pdfjs-dist: fallback más robusto, extrae incluso de PDFs con capa de texto
 *    oculta (escaneados profesionalmente con OCR embebido).
 */
async function extractFromPDF(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  // ── Intento 1: pdf-parse ──
  try {
    const data = await pdfParse(buffer);
    const text = (data.text ?? '').trim();

    if (text.length >= MIN_TEXT_LENGTH) {
      logCtx.info('AI', 'PDF extraído con pdf-parse', {
        pages: data.numpages,
        chars: text.length,
      });
      return { text: truncate(text), method: 'pdf-parse', pages: data.numpages };
    }

    logCtx.warn('AI', 'pdf-parse devolvió muy poco texto, probando pdfjs-dist', {
      chars: text.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    logCtx.warn('AI', 'pdf-parse falló, probando pdfjs-dist', { error: message.substring(0, 200) });
  }

  // ── Intento 2: pdfjs-dist (Mozilla PDF.js - más robusto) ──
  try {
    const result = await extractTextWithPdfjs(buffer);
    if (result.text.length >= MIN_TEXT_LENGTH) {
      logCtx.info('AI', 'PDF extraído con pdfjs-dist (fallback)', {
        chars: result.text.length,
      });
      return result;
    }

    logCtx.warn('AI', 'pdfjs-dist tampoco extrajo texto', {
      chars: result.text.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    logCtx.warn('AI', 'pdfjs-dist falló', { error: message.substring(0, 200) });
  }

  // ── No se pudo extraer texto ──
  logCtx.warn('AI', 'No se pudo extraer texto del PDF (posiblemente escaneado sin capa de texto)');
  return {
    text: '',
    method: 'pdf-parse',
    pages: 0,
  };
}

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

/**
 * Imagen (o PDF como imagen): OCR con tesseract.js
 */
async function extractFromImage(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
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
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Extrae texto de un PDF usando pdfjs-dist (Mozilla PDF.js en modo legacy).
 * Se importa dinámicamente porque es un módulo ESM.
 */
async function extractTextWithPdfjs(buffer: Buffer): Promise<ExtractionResult> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // pdfjs-dist requiere Uint8Array, no Buffer
  const typedArray = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
  const numPages = doc.numPages as number;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        if ('str' in item) return item.str;
        return '';
      })
      .join(' ');
    pageTexts.push(pageText);
  }

  const text = pageTexts
    .join('\n\n')
    .replace(/\s+/g, ' ')
    .trim();

  return { text: truncate(text), method: 'pdfjs-dist', pages: numPages };
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

/**
 * Extractor local de texto desde archivos subidos por el cliente.
 *
 * Propósito: Reemplazar la dependencia de Gemini para la lectura de archivos.
 * Extraemos texto localmente y solo enviamos texto plano a Gemini para análisis.
 *
 * Pipeline por tipo de archivo:
 *   PDF  → 1. pdf-parse v2 (getText + getTable para tablas estructuradas)
 *          2. pdfjs-dist (fallback: PDFs complejos o con capa oculta)
 *          3. Se marca como "no extraíble" si ambos fallan
 *   DOCX → mammoth.js
 *   Imagen → tesseract.js OCR
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
  | 'pdfjs-dist'
  | 'mammoth'
  | 'tesseract-ocr'
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
  /** Número de tablas detectadas en el PDF (solo pdf-parse v2) */
  tableCount?: number;
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

/**
 * Prefijo delimitador para las tablas en el output de texto,
 * para que Gemini pueda identificar fácilmente dónde empiezan/terminan.
 */
const TABLES_HEADER = '=== TABLAS DETECTADAS EN EL DOCUMENTO ===';
const TABLES_FOOTER = '=== FIN DE TABLAS ===';

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
 * 1. pdf-parse v2: extrae texto + tablas estructuradas (getTable).
 *    Las tablas se convierten a formato markdown para que Gemini
 *    pueda interpretar correctamente la estructura fila/columna.
 * 2. pdfjs-dist: fallback más robusto, solo texto (sin detección de tablas).
 */
async function extractFromPDF(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  // ── Intento 1: pdf-parse v2 ──
  try {
    return await extractWithPdfParseV2(buffer, logCtx);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    logCtx.warn('AI', 'pdf-parse v2 falló, probando pdfjs-dist', { error: message.substring(0, 200) });
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

// ─────────────────────────────────────────────
// pdf-parse v2: texto + tablas estructuradas
// ─────────────────────────────────────────────

/**
 * Extrae texto y tablas usando pdf-parse v2.
 * Las tablas se convierten a formato markdown para preservar
 * la estructura fila/columna que Gemini pueda entender.
 */
async function extractWithPdfParseV2(
  buffer: Buffer,
  logCtx: ReturnType<typeof logger.withContext>,
): Promise<ExtractionResult> {
  // Import dinámico porque pdf-parse v2 es ESM y causa problemas con RSC
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  try {
    // 1. Extraer texto (pages es un array de PageTextResult[], usamos su length)
    const textResult = await parser.getText();
    const text = (textResult?.text ?? '').trim();
    const pages = Array.isArray(textResult?.pages) ? textResult.pages.length : 0;

    // 2. Extraer tablas estructuradas
    let markdownTables = '';
    let tableCount = 0;

    try {
      const tableResult = await parser.getTable();

      if (tableResult?.pages && tableResult.pages.length > 0) {
        const tableParts: string[] = [];

        for (const page of tableResult.pages) {
          if (!page.tables || page.tables.length === 0) continue;

          for (const table of page.tables) {
            if (!table || table.length === 0) continue;

            tableCount++;

            // Convertir tabla 2D a markdown
            const mdTable = tableToMarkdown(table);
            tableParts.push(mdTable);
          }
        }

        if (tableParts.length > 0) {
          markdownTables = `\n${TABLES_HEADER}\n${tableParts.join('\n\n')}\n${TABLES_FOOTER}\n`;
          logCtx.info('AI', `Tablas detectadas y formateadas`, {
            tableCount,
            tablesCharLength: markdownTables.length,
          });
        }
      }
    } catch (tableErr: unknown) {
      // getTable() puede fallar en PDFs sin tablas — no es crítico
      const tblMsg = tableErr instanceof Error ? tableErr.message : '';
      logCtx.debug('AI', 'getTable() no produjo resultados (puede ser normal)', {
        error: tblMsg.substring(0, 100),
      });
    }

    // 3. Combinar: tablas markdown + texto plano
    const combined = markdownTables
      ? `${markdownTables}\n--- TEXTO COMPLETO DEL DOCUMENTO ---\n\n${text}`
      : text;

    if (combined.length >= MIN_TEXT_LENGTH || tableCount > 0) {
      logCtx.info('AI', 'PDF extraído con pdf-parse v2', {
        pages,
        chars: text.length,
        tableCount,
        combinedChars: combined.length,
      });
      return {
        text: truncate(combined),
        method: 'pdf-parse',
        pages,
        tableCount,
      };
    }

    logCtx.warn('AI', 'pdf-parse v2 devolvió muy poco texto', {
      chars: text.length,
      tableCount,
    });

    // Si no hay suficiente texto ni tablas, lanzamos para que el fallback intente
    throw new Error(`pdf-parse v2 returned insufficient content: ${text.length} chars, ${tableCount} tables`);
  } finally {
    await parser.destroy();
  }
}

/**
 * Convierte una tabla 2D (string[][]) a formato markdown.
 * La primera fila se trata como encabezado si tiene contenido.
 *
 * Ejemplo:
 *   | Biomarcador | Valor | Rango | Estado |
 *   |-------------|-------|-------|--------|
 *   | Glucosa     | 95    | 70-100| Normal |
 */
function tableToMarkdown(table: string[][]): string {
  if (!table || table.length === 0) return '';

  const result: string[] = [];
  const columnCount = Math.max(...table.map(row => row.length), 0);

  if (columnCount === 0) return '';

  // Sanitizar celdas: eliminar saltos de línea internos y recortar
  const sanitized = table.map(row =>
    row.map(cell => (cell ?? '').replace(/\s+/g, ' ').trim()),
  );

  // Encabezado (primera fila)
  const header = sanitized[0];
  result.push(`| ${header.join(' | ')} |`);

  // Separador
  const separator = header.map(() => '---');
  result.push(`| ${separator.join(' | ')} |`);

  // Filas de datos (resto)
  for (let i = 1; i < sanitized.length; i++) {
    const row = sanitized[i];
    // Rellenar con celdas vacías si faltan columnas
    while (row.length < columnCount) row.push('');
    result.push(`| ${row.join(' | ')} |`);
  }

  return result.join('\n');
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
// Helpers
// ─────────────────────────────────────────────

/**
 * Extrae texto de un PDF usando pdfjs-dist (Mozilla PDF.js en modo legacy).
 * Se importa dinámicamente porque es un módulo ESM.
 * Esta función solo extrae texto — no detecta tablas.
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

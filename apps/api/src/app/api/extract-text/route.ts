// apps/api/src/app/api/extract-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

import pdfParse from 'pdf-parse';

// Tipos de archivo permitidos
const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/pdf',
  'application/msword' // .doc (limitado)
];

// Tamaño máximo de archivo (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Obtener el FormData de la solicitud
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: `El archivo es demasiado grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `Tipo de archivo no soportado: ${file.type}. Formatos permitidos: .txt, .json, .docx, .pdf` },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // Extraer texto según el tipo de archivo
    switch (file.type) {
      case 'text/plain':
        // Texto plano
        extractedText = buffer.toString('utf8');
        break;

      case 'application/json':
        // JSON - devolver el texto como está (podría parsearse luego)
        extractedText = buffer.toString('utf8');
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // DOCX usando mammoth
        try {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } catch (error: unknown) {
          console.error('Error extrayendo texto de DOCX:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Error procesando archivo DOCX: ${errorMessage}`);
        }
        break;

      case 'application/pdf':
        // PDF usando pdf-parse
        try {
          const data = await pdfParse(buffer);
          extractedText = data.text;
        } catch (error: unknown) {
          console.error('Error extrayendo texto de PDF:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Error procesando archivo PDF: ${errorMessage}`);
        }
        break;

      case 'application/msword':
        // .doc (formato antiguo) - mammoth también soporta .doc parcialmente
        try {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } catch (error: unknown) {
          console.error('Error extrayendo texto de DOC:', error);
          // Intentar como texto plano si falla
          extractedText = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
        }
        break;

      default:
        throw new Error(`Tipo de archivo no implementado: ${file.type}`);
    }

    // Limitar longitud del texto extraído (para prevenir sobrecarga)
    const MAX_TEXT_LENGTH = 100000; // 100k caracteres
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '\n\n...[texto truncado]';
    }

    // Si no se extrajo texto, devolver mensaje
    if (!extractedText.trim()) {
      extractedText = 'No se pudo extraer texto del archivo. Asegúrate de que el archivo contenga texto y no esté dañado.';
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedText,
        extractedLength: extractedText.length
      }
    });

  } catch (error: unknown) {
    console.error('Error en extract-text endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Error extrayendo texto: ${errorMessage || 'Error interno del servidor'}` 
      },
      { status: 500 }
    );
  }
}

// Método OPTIONS para CORS (si es necesario)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
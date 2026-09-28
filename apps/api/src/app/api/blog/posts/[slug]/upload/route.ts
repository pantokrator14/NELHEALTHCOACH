// apps/api/src/app/api/blog/posts/[slug]/upload/route.ts
// POST (solo admin): URL prefirmada de S3 para la imagen destacada de una
// entrada del blog (mismo patrón que recipes/[id]/upload).

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { S3Service } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Solo el admin sube imágenes del blog. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede gestionar el blog' };
  }
  return auth;
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return logger.time('BLOG', 'Generar URL de upload de imagen', async () => {
    try {
      const { slug } = await params;

      requireAdmin(request);

      if (!slug || !ObjectId.isValid(slug)) {
        return NextResponse.json(
          { success: false, message: 'ID de entrada no válido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const body = await request.json();
      // Rate limiting + Shield (escaneo del body) antes de validar (A06/A05)
      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      const { fileName, fileType, fileSize } = body as {
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      };

      if (!fileName || !fileType || typeof fileSize !== 'number') {
        return NextResponse.json(
          { success: false, message: 'Faltan campos requeridos: fileName, fileType, fileSize', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido (solo imágenes)', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      if (fileSize > MAX_SIZE) {
        return NextResponse.json(
          { success: false, message: 'La imagen es demasiado grande (máximo 10MB)', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const { uploadURL, fileKey } = await S3Service.generateUploadURL(
        fileName,
        fileType,
        fileSize,
        'blog',
      );
      const fileURL = await S3Service.getFileURL(fileKey);

      return NextResponse.json({
        success: true,
        data: { uploadURL, fileKey, fileURL },
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error generando URL de upload', error);
      return NextResponse.json(
        { success: false, message: 'Error generando la URL de upload', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const POST = apiHandler(postHandler);


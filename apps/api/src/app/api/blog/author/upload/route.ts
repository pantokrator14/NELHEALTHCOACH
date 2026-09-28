// apps/api/src/app/api/blog/author/upload/route.ts
// POST (solo admin): URL prefirmada de S3 para la foto del autor.

import { NextRequest, NextResponse } from 'next/server';
import { S3Service } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import type { CoachJwtPayload } from '@/app/lib/auth';

function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede gestionar el blog' };
  }
  return auth;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function postHandler(request: NextRequest) {
  return logger.time('BLOG', 'Generar URL de upload de foto del autor', async () => {
    try {
      requireAdmin(request);

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

      // Carpeta 'profile' de S3 (misma que las fotos de perfil de coaches)
      const { uploadURL, fileKey } = await S3Service.generateUploadURL(
        fileName,
        fileType,
        fileSize,
        'profile',
      );
      const fileURL = await S3Service.getFileURL(fileKey);

      return NextResponse.json({ success: true, data: { uploadURL, fileKey, fileURL } });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error generando URL de upload de foto del autor', error);
      return NextResponse.json(
        { success: false, message: 'Error generando la URL de upload', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const POST = apiHandler(postHandler);


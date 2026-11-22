import { NextRequest, NextResponse } from 'next/server';
import { requireCoachAuth } from '@/app/lib/auth';
import { NutritionService } from '@/app/lib/nutrition-service';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { connectMongoose } from '@/app/lib/database';
import Recipe from '@/app/models/Recipe';
import { getPresignedUrlForAnalysis } from '@/app/lib/s3';
import { analyzeRecipeImageSchema } from '@/app/lib/schemas/recipes';
import { requireRateLimit, requireShieldBody } from '@/app/lib/security/index';
import { securityBlockResponse } from '@/app/lib/security/routeGuard';

type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const ALLOWED_IMAGE_MIMES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function normalizeImageMime(mime?: string): AllowedImageMime {
  const lower = (mime || '').toLowerCase();
  if (lower === 'image/png' || lower === 'image/webp' || lower === 'image/gif') {
    return lower;
  }
  return 'image/jpeg';
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

async function postHandler(request: NextRequest) {
  return logger.time('NUTRITION_ANALYSIS', 'Analizando nutrición desde foto de receta', async () => {
    try {
      // 1. Autenticación requerida (solo coaches/admin)
      requireCoachAuth(request);

      // 2. Rate limiting por IP + visitorId
      const rateResult = await requireRateLimit(request);
      if (!rateResult.passed) {
        return securityBlockResponse(rateResult);
      }

      const rawBody = await request.json();

      // 3. Shield body scan sobre metadatos (sin escanear la cadena base64 binaria)
      const shieldResult = requireShieldBody({
        recipeId: rawBody?.recipeId,
        servings: rawBody?.servings,
        title: rawBody?.title,
        description: rawBody?.description,
        ingredients: rawBody?.ingredients,
      });
      if (!shieldResult.passed) {
        return securityBlockResponse(shieldResult);
      }

      // 4. Validación Zod
      const parsed = analyzeRecipeImageSchema.safeParse(rawBody);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
          {
            success: false,
            message: firstError?.message ?? 'Datos inválidos para análisis de imagen',
            code: 'VALIDATION',
          },
          { status: 400 }
        );
      }

      const { imageBase64, mimeType, recipeId, servings, title, description, ingredients } =
        parsed.data;

      let resolvedBase64 = '';
      let resolvedMimeType: AllowedImageMime = normalizeImageMime(mimeType);

      if (imageBase64 && mimeType) {
        // Limpiar posible prefijo data:image/...;base64,
        resolvedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
        const buffer = Buffer.from(resolvedBase64, 'base64');

        if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              message: 'La imagen debe ser válida y pesar como máximo 10 MB',
              code: 'VALIDATION',
            },
            { status: 400 }
          );
        }
      } else if (recipeId) {
        // Descargar la imagen guardada de la receta desde S3 de forma segura (sin SSRF)
        await connectMongoose();
        const recipe = await Recipe.findById(recipeId).lean<{
          image?: { key?: string; type?: string };
        } | null>();

        if (!recipe) {
          return NextResponse.json(
            { success: false, message: 'Receta no encontrada', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        const s3Key = recipe.image?.key;
        if (!s3Key) {
          return NextResponse.json(
            {
              success: false,
              message: 'La receta no tiene una imagen guardada para analizar',
              code: 'VALIDATION',
            },
            { status: 400 }
          );
        }

        const presignedUrl = await getPresignedUrlForAnalysis(s3Key);
        const s3Res = await fetch(presignedUrl);
        if (!s3Res.ok) {
          throw new Error(`No se pudo descargar la imagen de S3 (${s3Res.status})`);
        }

        const arrayBuf = await s3Res.arrayBuffer();
        if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              message: 'La imagen guardada excede el límite permitido (10 MB)',
              code: 'VALIDATION',
            },
            { status: 400 }
          );
        }

        resolvedBase64 = Buffer.from(arrayBuf).toString('base64');
        const dbMime = recipe.image?.type?.toLowerCase() || '';
        resolvedMimeType = ALLOWED_IMAGE_MIMES.has(dbMime)
          ? normalizeImageMime(dbMime)
          : 'image/jpeg';
      }

      logger.info('NUTRITION_ANALYSIS', 'Analizando imagen de receta con Gemini Vision', {
        recipeId: recipeId || 'new',
        mimeType: resolvedMimeType,
        servings,
        hasTitle: Boolean(title),
        ingredientCount: ingredients?.length ?? 0,
      });

      const nutritionData = await NutritionService.analyzeRecipeImageWithAI({
        imageBase64: resolvedBase64,
        mimeType: resolvedMimeType,
        servings,
        title,
        description,
        ingredients,
        recipeId,
      });

      return NextResponse.json({
        success: true,
        data: nutritionData,
        source: 'ai',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const authErr = error as { status?: number; message?: string };
        return NextResponse.json(
          {
            success: false,
            message: 'No autorizado',
            code: 'UNAUTHORIZED',
            ...(process.env.NODE_ENV === 'development' && authErr.message && {
              detail: authErr.message,
            }),
          },
          { status: authErr.status || 401 }
        );
      }

      logger.error('NUTRITION_ANALYSIS', 'Error analizando imagen de receta', error);

      return NextResponse.json(
        {
          success: false,
          message: 'No se pudo analizar la imagen con IA. Puedes ingresar los valores manualmente o calcular por ingredientes.',
          code: 'INTERNAL',
          ...(process.env.NODE_ENV === 'development' &&
            error instanceof Error && { detail: error.message }),
        },
        { status: 500 }
      );
    }
  });
}

export const POST = apiHandler(postHandler);

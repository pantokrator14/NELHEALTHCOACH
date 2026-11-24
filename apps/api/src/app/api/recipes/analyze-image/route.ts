import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/app/lib/auth';
import { NutritionService } from '@/app/lib/nutrition-service';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { connectMongoose } from '@/app/lib/database';
import Recipe from '@/app/models/Recipe';
import ClientAccount from '@/app/models/ClientAccount';
import { resolveEffectiveClientEntitlements } from '@/app/lib/plans';
import { getPresignedUrlForAnalysis } from '@/app/lib/s3';
import { analyzeRecipeImageSchema } from '@/app/lib/schemas/recipes';
import {
  requireRateLimit,
  requireShieldBody,
  requirePromptInjectionCheck,
} from '@/app/lib/security/index';
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

function hasValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.byteLength < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  // GIF: GIF87a / GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return true;
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }
  return false;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

async function postHandler(request: NextRequest) {
  return logger.time('NUTRITION_ANALYSIS', 'Analizando nutrición desde foto', async () => {
    let reservedClientId: string | null = null;
    let reservedMonthKey = '';

    try {
      // 1. Autenticación requerida (coach/admin o cliente Plan 2/3)
      const auth = requireAnyAuth(request);

      // 2. Rate limiting por IP + visitorId
      const rateResult = await requireRateLimit(request);
      if (!rateResult.passed) {
        return securityBlockResponse(rateResult);
      }

      const rawBody = await request.json();

      // 3. Shield body scan + Prompt Injection check sobre metadatos (no sobre cadena base64)
      const metadataPayload = {
        recipeId: rawBody?.recipeId,
        servings: rawBody?.servings,
        title: rawBody?.title,
        description: rawBody?.description,
        ingredients: rawBody?.ingredients,
      };
      const shieldResult = requireShieldBody(metadataPayload);
      if (!shieldResult.passed) {
        return securityBlockResponse(shieldResult);
      }
      const injectionResult = requirePromptInjectionCheck(metadataPayload);
      if (!injectionResult.passed) {
        return securityBlockResponse(injectionResult);
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

      // 5. Verificación de acceso y cuotas para clientes (Plan 2: 5/mes, Plan 3: 30/mes)
      let clientQuotaInfo: {
        used: number;
        limit: number;
        remaining: number;
        monthKey: string;
      } | null = null;

      if (auth.role === 'client') {
        if (recipeId) {
          return NextResponse.json(
            {
              success: false,
              message: 'Operación no permitida para cuentas de cliente.',
              code: 'FORBIDDEN',
            },
            { status: 403 }
          );
        }

        if (!imageBase64 || !mimeType) {
          return NextResponse.json(
            {
              success: false,
              message: 'Debes subir una fotografía válida de tu comida.',
              code: 'VALIDATION',
            },
            { status: 400 }
          );
        }

        await connectMongoose();
        const account = await ClientAccount.findById(auth.clientAccountId)
          .select('purchasedPlans activePlanId nutritionScans')
          .lean() as {
            _id: unknown;
            purchasedPlans?: Array<{ planId?: unknown; status?: unknown }>;
            activePlanId?: string | null;
          } | null;

        if (!account) {
          return NextResponse.json(
            { success: false, message: 'Cuenta de cliente no encontrada', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        const entitlements = resolveEffectiveClientEntitlements(
          account.purchasedPlans,
          account.activePlanId || null
        );

        if (!entitlements.scannerEnabled || entitlements.scannerMonthlyLimit <= 0) {
          return NextResponse.json(
            {
              success: false,
              message: 'Tu plan actual no incluye el escáner nutricional por foto. Disponible en Plan 2 y Plan 3.',
              code: 'FORBIDDEN',
            },
            { status: 403 }
          );
        }

        reservedMonthKey = new Date().toISOString().slice(0, 7);
        const monthlyLimit = entitlements.scannerMonthlyLimit;

        // Validar bytes mágicos antes de consumir cuota mensual
        const preClean = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
        const preBuf = Buffer.from(preClean, 'base64');
        if (preBuf.byteLength === 0 || preBuf.byteLength > MAX_IMAGE_BYTES || !hasValidImageMagicBytes(preBuf)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Formato de imagen inválido o mayor a 10 MB (usa JPG, PNG, WEBP o GIF).',
              code: 'VALIDATION',
            },
            { status: 400 }
          );
        }

        // Reserva atómica de cuota mensual (reset si cambió el mes, o incremento si < límite)
        let updatedAccount = await ClientAccount.findOneAndUpdate(
          {
            _id: auth.clientAccountId,
            $or: [
              { 'nutritionScans.monthKey': { $ne: reservedMonthKey } },
              { nutritionScans: { $exists: false } },
            ],
          },
          {
            $set: {
              nutritionScans: {
                monthKey: reservedMonthKey,
                count: 1,
                lastScanAt: new Date(),
              },
            },
          },
          { returnDocument: 'after' }
        ).select('nutritionScans').lean() as { nutritionScans?: { count?: number; monthKey?: string } } | null;

        if (!updatedAccount) {
          updatedAccount = await ClientAccount.findOneAndUpdate(
            {
              _id: auth.clientAccountId,
              'nutritionScans.monthKey': reservedMonthKey,
              'nutritionScans.count': { $lt: monthlyLimit },
            },
            {
              $inc: { 'nutritionScans.count': 1 },
              $set: { 'nutritionScans.lastScanAt': new Date() },
            },
            { returnDocument: 'after' }
          ).select('nutritionScans').lean() as { nutritionScans?: { count?: number; monthKey?: string } } | null;
        }

        if (!updatedAccount) {
          return NextResponse.json(
            {
              success: false,
              message: `Has alcanzado tu límite de ${monthlyLimit} análisis nutricionales este mes.`,
              code: 'QUOTA_EXCEEDED',
              quota: {
                used: monthlyLimit,
                limit: monthlyLimit,
                remaining: 0,
                monthKey: reservedMonthKey,
              },
            },
            { status: 429 }
          );
        }

        reservedClientId = auth.clientAccountId;
        const used = Number(updatedAccount.nutritionScans?.count || 1);
        clientQuotaInfo = {
          used,
          limit: monthlyLimit,
          remaining: Math.max(0, monthlyLimit - used),
          monthKey: reservedMonthKey,
        };
      }

      let resolvedBase64 = '';
      let resolvedMimeType: AllowedImageMime = normalizeImageMime(mimeType);

      if (imageBase64 && mimeType) {
        resolvedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
        const buffer = Buffer.from(resolvedBase64, 'base64');

        if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES || !hasValidImageMagicBytes(buffer)) {
          return NextResponse.json(
            {
              success: false,
              message: 'La imagen debe ser válida (JPG, PNG, WEBP o GIF) y pesar como máximo 10 MB',
              code: 'VALIDATION',
            },
            { status: 400 }
          );
        }
      } else if (recipeId) {
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

      logger.info('NUTRITION_ANALYSIS', 'Analizando imagen de receta/plato con Gemini Vision', {
        recipeId: recipeId || 'new',
        role: auth.role,
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
        ...(clientQuotaInfo && { quota: clientQuotaInfo }),
        source: 'ai',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      // Revertir cuota reservada si el análisis falló
      if (reservedClientId && reservedMonthKey) {
        try {
          await ClientAccount.updateOne(
            {
              _id: reservedClientId,
              'nutritionScans.monthKey': reservedMonthKey,
              'nutritionScans.count': { $gt: 0 },
            },
            { $inc: { 'nutritionScans.count': -1 } }
          );
        } catch {
          // Silencioso en rollback
        }
      }

      if (typeof error === 'object' && error !== null && 'status' in error) {
        const authErr = error as { status?: number; message?: string };
        return NextResponse.json(
          {
            success: false,
            message: authErr.message || 'No autorizado',
            code: authErr.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
          },
          { status: authErr.status || 401 }
        );
      }

      logger.error('NUTRITION_ANALYSIS', 'Error analizando imagen', error);

      return NextResponse.json(
        {
          success: false,
          message: 'No se pudo analizar la imagen con IA. Intenta con otra fotografía más clara.',
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

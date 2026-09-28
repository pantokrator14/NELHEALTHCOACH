// apps/api/src/app/api/blog/author/route.ts
// Perfil del autor del blog (singleton).
//
// GET  (público): devuelve el perfil (nombre, rol, bio, foto) localizado.
//                  Si no existe, devuelve los valores por defecto.
// PUT  (solo admin): guarda el perfil (campos cifrados como las recetas).

import { NextRequest, NextResponse } from 'next/server';
import { getBlogAuthorCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { authorProfileSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { detectLanguage } from '@/app/lib/recommendation-translator';
import { localizeAuthorProfile } from '@/app/lib/blog-translation';
import {
  BLOG_AUTHOR,
  encryptAuthorProfile,
  decryptAuthorProfile,
  encryptAuthorTranslations,
  decryptAuthorTranslations,
  toAuthorDTO,
} from '@/app/lib/blog';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Admin estricto: solo el coach con rol 'admin' gestiona el blog. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede gestionar el blog' };
  }
  return auth;
}

// ── GET: perfil público ──────────────────────────────────────────────────────
async function getHandler(request: NextRequest) {
  return logger.time('BLOG', 'Obtener perfil del autor', async () => {
    try {
      // Rate limiting por IP + ruta (A06/LLM10: evita abuso de descifrado y traducción LLM)
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const lang = request.nextUrl.searchParams.get('lang') || undefined;
      const collection = await getBlogAuthorCollection();
      const doc = await collection.findOne({});

      if (!doc) {
        // Sin perfil configurado → valores por defecto (el frontend traduce el rol)
        return NextResponse.json({
          success: true,
          data: {
            name: BLOG_AUTHOR,
            role: '',
            bio: '',
            specialties: [],
            yearsOfExperience: 0,
            photo: null,
            lang: 'es',
          },
        });
      }

      const plain = decryptAuthorProfile(doc as unknown as Record<string, unknown>);
      const localized = await localizeAuthorProfile(
        {
          role: plain.role,
          bio: plain.bio,
          specialties: plain.specialties,
          sourceLang: doc.sourceLang as string | undefined,
          updatedAt: doc.updatedAt as Date,
          translations: decryptAuthorTranslations(
            doc.translations as Record<string, unknown> | undefined,
          ),
        },
        lang,
      );

      if (localized.needsPersist) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { translations: encryptAuthorTranslations(localized.author.translations) } },
        );
      }

      return NextResponse.json({
        success: true,
        data: toAuthorDTO(doc, {
          role: localized.author.role,
          bio: localized.author.bio,
          specialties: localized.author.specialties,
          lang: localized.author.lang,
        }),
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error obteniendo perfil del autor', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener el perfil del autor', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

// ── PUT: guardar perfil (solo admin) ────────────────────────────────────────
async function putHandler(request: NextRequest) {
  return logger.time('BLOG', 'Guardar perfil del autor', async () => {
    try {
      const data = await request.json();
      // Rate limiting + Shield (escaneo del body) antes de validar (A06/A05)
      const security = await secureRoute(request, data);
      if (!security.passed) return securityBlockResponse(security);


      const parsed = authorProfileSchema.safeParse(data);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
          {
            success: false,
            message: firstError?.message ?? 'Datos del perfil inválidos',
            errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
            code: 'VALIDATION',
          },
          { status: 400 },
        );
      }

      const auth = requireAdmin(request);
      const reqCtx = {
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get('x-request-id') || undefined,
      };

      const plainFields = {
        name: parsed.data.name,
        role: parsed.data.role,
        bio: parsed.data.bio,
        specialties: parsed.data.specialties,
        yearsOfExperience: parsed.data.yearsOfExperience,
        photo: parsed.data.photo,
      };

      // Idioma de origen detectado ANTES de cifrar (texto plano)
      const sourceLang = detectLanguage([
        plainFields.role,
        plainFields.bio,
        plainFields.specialties.join(' '),
      ]);

      const collection = await getBlogAuthorCollection();
      const now = new Date();
      const encrypted = encryptAuthorProfile(plainFields);

      await collection.updateOne(
        {},
        {
          $set: {
            ...encrypted,
            sourceLang,
            translations: {}, // cualquier cambio invalida la caché de traducción
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      logAuditEvent({
        eventType: 'BLOG_AUTHOR_UPDATED',
        severity: 'info',
        message: `Perfil del autor actualizado: ${plainFields.name}`,
        coachId: auth.coachId,
        ...reqCtx,
        path: '/api/blog/author',
        method: 'PUT',
        statusCode: 200,
      });

      const updated = await collection.findOne({});
      return NextResponse.json({
        success: true,
        message: 'Perfil guardado',
        data: toAuthorDTO(updated, {
          role: plainFields.role,
          bio: plainFields.bio,
          specialties: plainFields.specialties,
          lang: sourceLang,
        }),
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error guardando perfil del autor', error);
      return NextResponse.json(
        { success: false, message: 'Error al guardar el perfil', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const PUT = apiHandler(putHandler);


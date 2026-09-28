// apps/api/src/app/api/blog/posts/route.ts
// Entradas del blog.
//
// GET  (público): lista entradas publicadas (?category=, ?lang=). El admin
//                  autenticado ve también los borradores.
// POST (solo admin): crea una entrada (borrador por defecto).

import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { blogPostSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { detectLanguage } from '@/app/lib/recommendation-translator';
import { localizeBlogPost } from '@/app/lib/blog-translation';
import {
  ensureUniqueSlug,
  slugify,
  toBlogPostDTO,
  encryptBlogContent,
  decryptBlogContent,
  encryptTranslations,
  decryptTranslations,
  BLOG_AUTHOR,
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

// ── GET: lista pública (el admin ve también borradores) ─────────────────────
async function getHandler(request: NextRequest) {
  return logger.time('BLOG', 'Listar entradas del blog', async () => {
    try {
      // Rate limiting por IP + ruta (A06/LLM10: evita abuso de descifrado y traducción LLM)
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const searchParams = request.nextUrl.searchParams;
      const lang = searchParams.get('lang') || undefined;
      const category = searchParams.get('category') || undefined;
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 100) : 100;

      // El admin autenticado ve borradores; el resto solo publicadas.
      let isAdmin = false;
      try {
        const auth = requireCoachAuth(request);
        isAdmin = auth.role === 'admin';
      } catch {
        // No autenticado: solo contenido publicado.
      }

      const collection = await getBlogPostsCollection();

      const filter: Record<string, unknown> = {};
      if (!isAdmin) {
        filter.isPublished = true;
      }
      // NOTA: la categoría NO se filtra en Mongo (va CIFRADA); se filtra
      // en memoria tras descifrar, igual que hace la búsqueda de recetas.

      const docs = await collection
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .toArray();

      const data: Record<string, unknown>[] = [];
      for (const doc of docs) {
        // Descifrar la entrada antes de localizar (la traducción trabaja
        // siempre sobre texto plano).
        const plain = decryptBlogContent(doc as unknown as Record<string, unknown>);
        const localized = await localizeBlogPost(
          {
            title: plain.title,
            excerpt: plain.excerpt,
            content: plain.content,
            sourceLang: doc.sourceLang as string | undefined,
            updatedAt: doc.updatedAt as Date,
            translations: decryptTranslations(
              doc.translations as Record<string, unknown> | undefined,
            ),
          },
          lang,
        );

        // Persistir la traducción recién generada (solo publicadas:
        // los borradores no se leen públicamente y no merecen caché).
        if (localized.needsPersist && doc.isPublished) {
          await collection.updateOne(
            { _id: doc._id },
            { $set: { translations: encryptTranslations(localized.post.translations) } },
          );
        }

        data.push({
          ...toBlogPostDTO(doc),
          title: localized.post.title,
          excerpt: localized.post.excerpt,
          content: localized.post.content,
          lang: localized.post.lang,
        });
      }

      // Filtro de categoría en memoria (el campo va cifrado en la DB)
      let results = data;
      if (category) {
        results = data.filter((post) => post.category === category);
      }
      results = results.slice(0, limit);

      return NextResponse.json({ success: true, data: results });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error listando entradas', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener las entradas', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

// ── POST: crear entrada (solo admin) ────────────────────────────────────────
async function postHandler(request: NextRequest) {
  return logger.time('BLOG', 'Crear entrada del blog', async () => {
    try {
      const data = await request.json();
      // Rate limiting + Shield (escaneo del body) antes de validar (A06/A05)
      const security = await secureRoute(request, data);
      if (!security.passed) return securityBlockResponse(security);


      const reqCtx = {
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get('x-request-id') || undefined,
      };

      // Validación Zod
      const parsed = blogPostSchema.safeParse(data);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
          {
            success: false,
            message: firstError?.message ?? 'Datos de entrada inválidos',
            errors: parsed.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
            code: 'VALIDATION',
          },
          { status: 400 },
        );
      }

      // Solo admin
      const auth = requireAdmin(request);

      const collection = await getBlogPostsCollection();

      const plainFields = {
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        category: parsed.data.category,
        tags: parsed.data.tags,
        coverImage: parsed.data.coverImage ?? null,
        author: BLOG_AUTHOR,
      };

      // El idioma de origen se detecta ANTES de cifrar (necesita texto plano)
      const sourceLang = detectLanguage([
        plainFields.title,
        plainFields.excerpt,
        plainFields.content,
      ]);

      const baseSlug = parsed.data.slug || slugify(plainFields.title);
      const slug = await ensureUniqueSlug(collection, baseSlug);

      const now = new Date();
      const doc = {
        slug,
        // Campos de texto CIFRADOS (mismo método que las recetas)
        ...encryptBlogContent(plainFields),
        sourceLang,
        isPublished: parsed.data.isPublished,
        publishedAt: parsed.data.isPublished ? now : null,
        translations: {},
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(doc);

      logAuditEvent({
        eventType: 'BLOG_POST_CREATED',
        severity: 'info',
        message: `Entrada de blog creada: ${plainFields.title}`,
        coachId: auth.coachId,
        ...reqCtx,
        path: '/api/blog/posts',
        method: 'POST',
        statusCode: 201,
      });

      const inserted = await collection.findOne({ _id: result.insertedId });
      return NextResponse.json(
        { success: true, message: 'Entrada creada', data: toBlogPostDTO(inserted as never) },
        { status: 201 },
      );
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error creando entrada', error);
      return NextResponse.json(
        { success: false, message: 'Error creando la entrada', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const POST = apiHandler(postHandler);


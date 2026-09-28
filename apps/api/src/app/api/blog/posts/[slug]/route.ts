// apps/api/src/app/api/blog/posts/[slug]/route.ts
// Detalle / edición / borrado de una entrada del blog.
//
// GET    (público): por slug; el admin autenticado ve también borradores.
// PUT    (solo admin): por id — actualiza campos e invalida traducciones.
// DELETE (solo admin): por id.

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getBlogPostsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { blogPostUpdateSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { localizeBlogPost } from '@/app/lib/blog-translation';
import {
  toBlogPostDTO,
  encryptBlogContent,
  decryptBlogContent,
  encryptTranslations,
  decryptTranslations,
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

function isAdmin(request: NextRequest): boolean {
  try {
    const auth = requireCoachAuth(request);
    return auth.role === 'admin';
  } catch {
    return false;
  }
}

/** Valida que el parámetro sea un ObjectId válido (para PUT/DELETE). */
function parseIdParam(param: string): ObjectId | null {
  if (!param || !ObjectId.isValid(param)) return null;
  return new ObjectId(param);
}

// ── GET: detalle por slug ────────────────────────────────────────────────────
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return logger.time('BLOG', 'Obtener entrada por slug', async () => {
    try {
      // Rate limiting por IP + ruta (A06/LLM10: evita abuso de descifrado y traducción LLM)
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const { slug } = await params;
      const lang = request.nextUrl.searchParams.get('lang') || undefined;
      const admin = isAdmin(request);

      const collection = await getBlogPostsCollection();
      const doc = await collection.findOne({ slug });

      if (!doc) {
        return NextResponse.json({ success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' }, { status: 404 });
      }

      // Los borradores no se filtran a lectores anónimos (404: no revelar existencia).
      if (doc.isPublished !== true && !admin) {
        return NextResponse.json({ success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' }, { status: 404 });
      }

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

      if (localized.needsPersist && doc.isPublished) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { translations: encryptTranslations(localized.post.translations) } },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ...toBlogPostDTO(doc),
          title: localized.post.title,
          excerpt: localized.post.excerpt,
          content: localized.post.content,
          lang: localized.post.lang,
        },
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error obteniendo entrada', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener la entrada', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

// ── PUT: actualizar por id (solo admin) ─────────────────────────────────────
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return logger.time('BLOG', 'Actualizar entrada del blog', async () => {
    try {
      const { slug } = await params;
      const objectId = parseIdParam(slug);
      if (!objectId) {
        return NextResponse.json({ success: false, message: 'ID de entrada no válido', code: 'VALIDATION' }, { status: 400 });
      }

      const data = await request.json();
      // Rate limiting + Shield (escaneo del body) antes de validar (A06/A05)
      const security = await secureRoute(request, data);
      if (!security.passed) return securityBlockResponse(security);

      const parsed = blogPostUpdateSchema.safeParse(data);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
          {
            success: false,
            message: firstError?.message ?? 'Datos de actualización inválidos',
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

      const collection = await getBlogPostsCollection();
      const existing = await collection.findOne({ _id: objectId });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' }, { status: 404 });
      }

      const now = new Date();

      // Descifrar el documento actual, mezclar con los cambios recibidos
      // y volver a CIFRAR todo (mismo método que las recetas).
      const existingPlain = decryptBlogContent(existing as unknown as Record<string, unknown>);
      const merged = encryptBlogContent({
        title: parsed.data.title ?? existingPlain.title,
        excerpt: parsed.data.excerpt ?? existingPlain.excerpt,
        content: parsed.data.content ?? existingPlain.content,
        category: parsed.data.category ?? existingPlain.category,
        tags: parsed.data.tags ?? existingPlain.tags,
        coverImage:
          parsed.data.coverImage !== undefined ? parsed.data.coverImage : existingPlain.coverImage,
        author: existingPlain.author || 'Manuel Martínez',
      });

      const $set: Record<string, unknown> = { updatedAt: now, ...merged };

      // Publicación: de borrador → publicada setea publishedAt;
      // despublicar lo deja en null; si ya estaba publicada se conserva.
      if (parsed.data.isPublished !== undefined) {
        $set.isPublished = parsed.data.isPublished;
        if (parsed.data.isPublished) {
          if (existing.isPublished !== true) $set.publishedAt = now;
        } else {
          $set.publishedAt = null;
        }
      }

      // Cualquier cambio invalida las traducciones cacheadas.
      $set.translations = {};

      await collection.updateOne({ _id: objectId }, { $set });

      logAuditEvent({
        eventType: 'BLOG_POST_UPDATED',
        severity: 'info',
        message: `Entrada de blog actualizada: ${objectId.toString()}`,
        coachId: auth.coachId,
        ...reqCtx,
        path: '/api/blog/posts',
        method: 'PUT',
        statusCode: 200,
      });

      const updated = await collection.findOne({ _id: objectId });
      return NextResponse.json({
        success: true,
        message: 'Entrada actualizada',
        data: toBlogPostDTO(updated as never),
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error actualizando entrada', error);
      return NextResponse.json(
        { success: false, message: 'Error actualizando la entrada', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const PUT = apiHandler(putHandler);

// ── DELETE: borrar por id (solo admin) ──────────────────────────────────────
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return logger.time('BLOG', 'Eliminar entrada del blog', async () => {
    try {
      // Rate limiting por IP + ruta (A06/LLM10: evita abuso de descifrado y traducción LLM)
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const { slug } = await params;
      const objectId = parseIdParam(slug);
      if (!objectId) {
        return NextResponse.json({ success: false, message: 'ID de entrada no válido', code: 'VALIDATION' }, { status: 400 });
      }

      const auth = requireAdmin(request);
      const reqCtx = {
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get('x-request-id') || undefined,
      };

      const collection = await getBlogPostsCollection();
      const result = await collection.deleteOne({ _id: objectId });

      if (result.deletedCount === 0) {
        return NextResponse.json({ success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' }, { status: 404 });
      }

      logAuditEvent({
        eventType: 'BLOG_POST_DELETED',
        severity: 'warning',
        message: `Entrada de blog eliminada: ${objectId.toString()}`,
        coachId: auth.coachId,
        ...reqCtx,
        path: '/api/blog/posts',
        method: 'DELETE',
        statusCode: 200,
      });

      return NextResponse.json({ success: true, message: 'Entrada eliminada' });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error eliminando entrada', error);
      return NextResponse.json(
        { success: false, message: 'Error eliminando la entrada', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const DELETE = apiHandler(deleteHandler);


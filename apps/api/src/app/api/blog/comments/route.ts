// apps/api/src/app/api/blog/comments/route.ts
// Comentarios del blog con moderación.
//
// GET  (público): comentarios APROBADOS de una entrada (?post=slug).
// GET  (solo admin): listado de moderación (?scope=pending|all).
// POST (público): crea un comentario con estado PENDIENTE. Protecciones:
//   - rate limit por IP + ruta (config estricta '/api/blog/comments')
//   - Shield (escaneo del body contra patrones de ataque)
//   - HONEYPOT anti-spam: el campo `website` está oculto; si llega lleno,
//     se responde 201 pero NO se guarda nada (los bots creen que funcionó).

import { NextRequest, NextResponse } from 'next/server';
import { getBlogCommentsCollection, getBlogPostsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { blogCommentSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { encryptComment, toCommentDTO } from '@/app/lib/blog-comments';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Admin estricto para la moderación. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede moderar comentarios' };
  }
  return auth;
}

/** true si el token actual es de un admin (sin lanzar). */
function isAdmin(request: NextRequest): boolean {
  try {
    const auth = requireCoachAuth(request);
    return auth.role === 'admin';
  } catch {
    return false;
  }
}

// ── POST: crear comentario (público, pendiente) ─────────────────────────────
async function postHandler(request: NextRequest) {
  return logger.time('BLOG', 'Crear comentario', async () => {
    try {
      const body = await request.json();

      // Rate limiting estricto + Shield (escritura pública con contenido libre)
      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      // HONEYPOT: los bots rellenan el campo oculto `website` → descartar
      // silenciosamente (201) para no revelar que fue detectado.
      const raw = body as Record<string, unknown>;
      if (typeof raw.website === 'string' && raw.website.trim() !== '') {
        return NextResponse.json(
          { success: true, message: 'Comentario recibido' },
          { status: 201 },
        );
      }

      const parsed = blogCommentSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
          {
            success: false,
            message: firstError?.message ?? 'Datos del comentario inválidos',
            code: 'VALIDATION',
          },
          { status: 400 },
        );
      }

      // Solo se admiten comentarios en entradas existentes y PUBLICADAS
      const posts = await getBlogPostsCollection();
      const post = await posts.findOne({ slug: parsed.data.postSlug });
      if (!post || post.isPublished !== true) {
        return NextResponse.json(
          { success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }

      const now = new Date();
      const comments = await getBlogCommentsCollection();
      const doc = {
        postSlug: parsed.data.postSlug,
        status: 'pending',
        ...encryptComment({
          authorName: parsed.data.authorName,
          authorEmail: parsed.data.authorEmail,
          content: parsed.data.content,
        }),
        createdAt: now,
        updatedAt: now,
      };
      await comments.insertOne(doc);

      logAuditEvent({
        eventType: 'BLOG_COMMENT_CREATED',
        severity: 'info',
        message: `Comentario pendiente en ${parsed.data.postSlug}: ${parsed.data.authorName}`,
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        path: '/api/blog/comments',
        method: 'POST',
        statusCode: 201,
      });

      return NextResponse.json(
        { success: true, message: 'Comentario recibido (pendiente de moderación)' },
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
      logger.error('BLOG', 'Error creando comentario', error);
      return NextResponse.json(
        { success: false, message: 'Error al enviar el comentario', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const POST = apiHandler(postHandler);

// ── GET: aprobados de una entrada (público) o moderación (admin) ────────────
async function getHandler(request: NextRequest) {
  return logger.time('BLOG', 'Listar comentarios', async () => {
    try {
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const searchParams = request.nextUrl.searchParams;
      const scope = searchParams.get('scope');

      const comments = await getBlogCommentsCollection();

      // Modo moderación: solo admin
      if (scope === 'pending' || scope === 'all') {
        requireAdmin(request);
        const filter = scope === 'pending' ? { status: 'pending' } : {};
        const docs = await comments.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
        return NextResponse.json({ success: true, data: docs.map(toCommentDTO) });
      }

      // Modo público: aprobados de una entrada concreta
      const postSlug = searchParams.get('post');
      if (!postSlug) {
        return NextResponse.json(
          { success: false, message: 'Falta el parámetro post', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const docs = await comments
        .find({ postSlug, status: 'approved' })
        .sort({ createdAt: 1 })
        .toArray();
      return NextResponse.json({ success: true, data: docs.map(toCommentDTO) });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error listando comentarios', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener los comentarios', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

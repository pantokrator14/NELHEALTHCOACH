// apps/api/src/app/api/blog/comments/[id]/route.ts
// Moderación de un comentario (solo admin).
//
// PUT    (solo admin): aprobar/rechazar { status: 'approved' | 'rejected' }.
// DELETE (solo admin): eliminar el comentario.

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getBlogCommentsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { blogCommentModerationSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { toCommentDTO } from '@/app/lib/blog-comments';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Admin estricto para la moderación. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede moderar comentarios' };
  }
  return auth;
}

function parseId(param: string): ObjectId | null {
  if (!param || !ObjectId.isValid(param)) return null;
  return new ObjectId(param);
}

// ── PUT: aprobar o rechazar (solo admin) ────────────────────────────────────
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return logger.time('BLOG', 'Moderar comentario', async () => {
    try {
      const { id } = await params;
      const objectId = parseId(id);
      if (!objectId) {
        return NextResponse.json(
          { success: false, message: 'ID de comentario no válido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      const parsed = blogCommentModerationSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, message: 'Estado de moderación inválido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const auth = requireAdmin(request);
      const comments = await getBlogCommentsCollection();
      const existing = await comments.findOne({ _id: objectId });
      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Comentario no encontrado', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }

      await comments.updateOne(
        { _id: objectId },
        { $set: { status: parsed.data.status, updatedAt: new Date() } },
      );

      logAuditEvent({
        eventType: 'BLOG_COMMENT_MODERATED',
        severity: 'info',
        message: `Comentario ${id} → ${parsed.data.status}`,
        coachId: auth.coachId,
        ip: request.headers.get('x-forwarded-for') || undefined,
        path: '/api/blog/comments',
        method: 'PUT',
        statusCode: 200,
      });

      const updated = await comments.findOne({ _id: objectId });
      return NextResponse.json({
        success: true,
        message: 'Comentario moderado',
        data: toCommentDTO(updated as never),
      });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error moderando comentario', error);
      return NextResponse.json(
        { success: false, message: 'Error al moderar el comentario', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const PUT = apiHandler(putHandler);

// ── DELETE: eliminar (solo admin) ───────────────────────────────────────────
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return logger.time('BLOG', 'Eliminar comentario', async () => {
    try {
      const { id } = await params;
      const objectId = parseId(id);
      if (!objectId) {
        return NextResponse.json(
          { success: false, message: 'ID de comentario no válido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const auth = requireAdmin(request);
      const comments = await getBlogCommentsCollection();
      const result = await comments.deleteOne({ _id: objectId });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Comentario no encontrado', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }

      logAuditEvent({
        eventType: 'BLOG_COMMENT_DELETED',
        severity: 'warning',
        message: `Comentario eliminado: ${id}`,
        coachId: auth.coachId,
        ip: request.headers.get('x-forwarded-for') || undefined,
        path: '/api/blog/comments',
        method: 'DELETE',
        statusCode: 200,
      });

      return NextResponse.json({ success: true, message: 'Comentario eliminado' });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error eliminando comentario', error);
      return NextResponse.json(
        { success: false, message: 'Error al eliminar el comentario', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const DELETE = apiHandler(deleteHandler);

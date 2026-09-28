// apps/api/src/app/api/blog/views/route.ts
// Contador de visitas del blog (analytics privacy-friendly):
//  - POST (público): registra una visita de una entrada publicada. NO guarda
//    IPs, cookies ni user-agents: solo { slug, day, count } agregado por día.
//  - GET (solo admin): totales por entrada para el panel.

import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostsCollection, getBlogViewsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import { blogViewSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import type { CoachJwtPayload } from '@/app/lib/auth';

/** Admin estricto: solo el coach con rol 'admin' ve las estadísticas. */
function requireAdmin(request: NextRequest): CoachJwtPayload {
  const auth = requireCoachAuth(request);
  if (auth.role !== 'admin') {
    throw { status: 403, message: 'Solo el administrador puede ver las visitas' };
  }
  return auth;
}

/** Día UTC en formato YYYY-MM-DD (agrupación diaria, sin zona horaria del usuario). */
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── POST: registrar visita (público) ────────────────────────────────────────
async function postHandler(request: NextRequest) {
  return logger.time('BLOG', 'Registrar visita', async () => {
    try {
      const body = await request.json();

      // Rate limiting + shield (escritura pública: validación estricta)
      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      const parsed = blogViewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, message: 'Slug inválido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const { slug } = parsed.data;

      // Solo se cuentan entradas existentes y PUBLICADAS (evita basura/spam de slugs)
      const posts = await getBlogPostsCollection();
      const post = await posts.findOne({ slug });
      if (!post || post.isPublished !== true) {
        return NextResponse.json(
          { success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }

      const views = await getBlogViewsCollection();
      const day = utcDay(new Date());
      await views.updateOne(
        { slug, day },
        { $inc: { count: 1 }, $setOnInsert: { slug, day } },
        { upsert: true },
      );

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error registrando visita', error);
      return NextResponse.json(
        { success: false, message: 'Error registrando la visita', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const POST = apiHandler(postHandler);

// ── GET: totales por entrada (solo admin) ───────────────────────────────────
async function getHandler(request: NextRequest) {
  return logger.time('BLOG', 'Listar visitas del blog', async () => {
    try {
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      requireAdmin(request);

      const views = await getBlogViewsCollection();
      const rows = await views
        .aggregate<{ _id: string; total: number }>([
          { $group: { _id: '$slug', total: { $sum: '$count' } } },
        ])
        .toArray();

      const data = rows
        .map((row) => ({ slug: row._id, total: row.total }))
        .sort((a, b) => b.total - a.total);

      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error listando visitas', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener las visitas', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

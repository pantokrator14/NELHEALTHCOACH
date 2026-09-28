// apps/api/src/app/api/blog/posts/[slug]/related/route.ts
// GET (público): entradas relacionadas de una entrada publicada.
// Ranking: misma categoría > etiquetas compartidas > más recientes.
// Solo usa traducciones CACHEADAS (no dispara llamadas al LLM en listados).

import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { decryptBlogContent, decryptTranslations, toBlogPostDTO } from '@/app/lib/blog';
import { getCachedBlogTranslation } from '@/app/lib/blog-translation';
import { rankRelatedPosts, type RelatedCandidate } from '@/app/lib/blog-related';
import type { Document } from 'mongodb';

const RELATED_LIMIT = 3;

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return logger.time('BLOG', 'Entradas relacionadas', async () => {
    try {
      // Rate limiting (A06): ruta pública que descifra documentos
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const { slug } = await params;
      const lang = request.nextUrl.searchParams.get('lang') || undefined;

      const collection = await getBlogPostsCollection();
      const currentDoc = await collection.findOne({ slug });

      // Borradores y entradas inexistentes: 404 (no revelar existencia)
      if (!currentDoc || currentDoc.isPublished !== true) {
        return NextResponse.json(
          { success: false, message: 'Entrada no encontrada', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }

      const currentPlain = decryptBlogContent(currentDoc as unknown as Record<string, unknown>);

      const docs = await collection.find({ isPublished: true, slug: { $ne: slug } }).toArray();

      const candidates: RelatedCandidate[] = docs.map((doc) => {
        const plain = decryptBlogContent(doc as unknown as Record<string, unknown>);
        return {
          slug: doc.slug as string,
          category: plain.category,
          tags: plain.tags,
          isPublished: doc.isPublished === true,
          publishedAt: doc.publishedAt as Date | null,
          createdAt: doc.createdAt as Date | null,
        };
      });

      const related = rankRelatedPosts(
        { slug, category: currentPlain.category, tags: currentPlain.tags },
        candidates,
        RELATED_LIMIT,
      );

      const bySlug = new Map(docs.map((doc) => [doc.slug as string, doc]));
      const data = related.map((candidate) => {
        const doc = bySlug.get(candidate.slug) as Document;
        const plain = decryptBlogContent(doc as unknown as Record<string, unknown>);
        const cached = getCachedBlogTranslation(
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
        return {
          ...toBlogPostDTO(doc),
          title: cached?.title ?? plain.title,
          excerpt: cached?.excerpt ?? plain.excerpt,
          content: cached?.content ?? plain.content,
          lang: cached?.lang ?? (doc.sourceLang ?? 'es'),
        };
      });

      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { success: false, message: apiError.message || 'Error' },
          { status: apiError.status },
        );
      }
      logger.error('BLOG', 'Error obteniendo entradas relacionadas', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener las entradas relacionadas', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

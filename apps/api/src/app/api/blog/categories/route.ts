// apps/api/src/app/api/blog/categories/route.ts
// GET (público): categorías derivadas de las entradas PUBLICADAS,
// ordenadas por número de entradas (desc) y localizadas según ?lang=.

import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { decryptBlogContent, decryptTranslations } from '@/app/lib/blog';
import {
  localizeBlogCategories,
  type CategoryForLocalization,
} from '@/app/lib/blog-translation';
import {
  normalizeClientLang,
  SUPPORTED_LANGS,
  type SupportedLang,
} from '@/app/lib/recommendation-translator';

async function getHandler(request: NextRequest) {
  return logger.time('BLOG', 'Listar categorías del blog', async () => {
    try {
      // Rate limiting por IP + ruta (A06/LLM10: evita abuso de descifrado y traducción LLM)
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const rawLang = request.nextUrl.searchParams.get('lang') || undefined;
      const targetLang =
        rawLang && (SUPPORTED_LANGS as readonly string[]).includes(rawLang)
          ? (rawLang as SupportedLang)
          : undefined;

      const collection = await getBlogPostsCollection();

      // La categoría va CIFRADA en la DB → se descifra y se agrupa en memoria
      // (mismo enfoque que la búsqueda de recetas).
      const docs = await collection.find({ isPublished: true }).toArray();

      const counts = new Map<string, number>();
      const metaByKey = new Map<string, CategoryForLocalization>();

      for (const doc of docs) {
        const plain = decryptBlogContent(doc as unknown as Record<string, unknown>);
        const category = plain.category;
        if (!category) continue;
        counts.set(category, (counts.get(category) ?? 0) + 1);

        const existingMeta = metaByKey.get(category);
        const sourceLang = normalizeClientLang(doc.sourceLang);
        let cachedLabel = existingMeta?.cachedLabel;

        if (!cachedLabel && targetLang && targetLang !== sourceLang) {
          const translations = decryptTranslations(
            doc.translations as Record<string, unknown> | undefined,
          );
          const entry = translations[targetLang];
          const updatedIso = doc.updatedAt instanceof Date
            ? doc.updatedAt.toISOString()
            : typeof doc.updatedAt === 'string'
              ? new Date(doc.updatedAt).toISOString()
              : '';
          if (entry && entry.sourceUpdatedAt === updatedIso && entry.category) {
            cachedLabel = entry.category;
          }
        }

        metaByKey.set(category, {
          key: category,
          sourceLang: existingMeta?.sourceLang ?? sourceLang,
          cachedLabel,
        });
      }

      const localizedLabels = await localizeBlogCategories(
        Array.from(metaByKey.values()),
        targetLang,
      );

      const data = Array.from(counts.entries())
        .map(([key, count]) => ({
          name: localizedLabels.get(key) ?? key,
          key,
          count,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      logger.error('BLOG', 'Error listando categorías', error);
      return NextResponse.json(
        { success: false, message: 'Error al obtener las categorías', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const GET = apiHandler(getHandler);

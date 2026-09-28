// apps/api/src/app/api/blog/categories/route.ts
// GET (público): categorías derivadas de las entradas PUBLICADAS,
// ordenadas por número de entradas (desc).

import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { decryptBlogContent } from '@/app/lib/blog';

async function getHandler(request: NextRequest) {
  return logger.time('BLOG', 'Listar categorías del blog', async () => {
    try {
      // Rate limiting por IP + ruta (A06/LLM10: evita abuso de descifrado y traducción LLM)
      const rateCheck = await requireRateLimit(request);
      if (!rateCheck.passed) return securityBlockResponse(rateCheck);

      const collection = await getBlogPostsCollection();

      // La categoría va CIFRADA en la DB → se descifra y se agrupa en memoria
      // (mismo enfoque que la búsqueda de recetas).
      const docs = await collection.find({ isPublished: true }).toArray();

      const counts = new Map<string, number>();
      for (const doc of docs) {
        const plain = decryptBlogContent(doc as unknown as Record<string, unknown>);
        const category = plain.category;
        if (!category) continue;
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }

      const data = Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
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


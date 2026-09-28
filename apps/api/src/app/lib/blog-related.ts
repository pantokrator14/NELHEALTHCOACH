// apps/api/src/app/lib/blog-related.ts
// Ranking de entradas relacionadas (puro y testable, sin DB):
// misma categoría pesa más que compartir etiquetas; los empates se resuelven
// por fecha (más reciente primero) y, si persisten, por slug (determinista).

export interface RelatedCurrentPost {
  slug: string;
  category: string;
  tags: string[];
}

export interface RelatedCandidate {
  slug: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

const CATEGORY_SCORE = 3;
const TAG_SCORE = 1;

function timeOf(post: RelatedCandidate): number {
  const value = post.publishedAt ?? post.createdAt;
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Devuelve hasta `limit` entradas relacionadas ordenadas por relevancia.
 * - Solo entradas PUBLICADAS y distintas de la actual.
 * - Si la entrada actual no tiene categoría, solo puntúan las etiquetas.
 */
export function rankRelatedPosts(
  current: RelatedCurrentPost,
  candidates: RelatedCandidate[],
  limit = 3,
): RelatedCandidate[] {
  const currentTags = new Set(current.tags ?? []);

  return candidates
    .filter((candidate) => candidate.isPublished && candidate.slug !== current.slug)
    .map((candidate) => {
      const categoryScore =
        current.category !== '' && candidate.category === current.category ? CATEGORY_SCORE : 0;
      const tagScore = (candidate.tags ?? []).filter((tag) => currentTags.has(tag)).length * TAG_SCORE;
      return { candidate, score: categoryScore + tagScore };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeDiff = timeOf(b.candidate) - timeOf(a.candidate);
      if (timeDiff !== 0) return timeDiff;
      return a.candidate.slug.localeCompare(b.candidate.slug);
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

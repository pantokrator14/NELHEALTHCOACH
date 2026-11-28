// apps/api/src/app/lib/blog-translation.ts
//
// Traducción dinámica de las entradas del blog al idioma del lector.
//
// Estrategia (reutiliza recommendation-translator):
//  - Cada entrada se guarda en el idioma en el que la escribe el coach
//    (sourceLang, detectado con la heurística de stopwords sin LLM).
//  - Al leer con ?lang=XX, si XX != sourceLang se busca una traducción
//    cacheada en el propio documento (translations[XX]). La caché se
//    considera válida si sourceUpdatedAt coincide con el updatedAt actual.
//  - Si no hay caché válida, se traduce una sola vez con translateJsonBatch
//    (DeepSeek, reintentos + fallback al original) y se persiste.
//  - Principio de resiliencia: si la traducción falla, se devuelve el
//    contenido ORIGINAL y NO se cachea (se reintentará en la próxima lectura).

import {
  translateJsonBatch,
  normalizeClientLang,
  defaultLLM,
  SUPPORTED_LANGS,
  type SupportedLang,
  type LLMFn,
} from './recommendation-translator';
import { logger } from './logger';

export interface BlogTranslationEntry {
  title: string;
  excerpt: string;
  content: string;
  category?: string;
  tags?: string[];
  /** ISO timestamp de cuándo se tradujo. */
  translatedAt: string;
  /** ISO del updatedAt de origen con el que se generó (para invalidar). */
  sourceUpdatedAt: string;
}

export interface BlogPostForLocalization {
  title: string;
  excerpt?: string;
  content: string;
  category?: string;
  tags?: string[];
  sourceLang?: string;
  updatedAt: Date | string;
  translations?: Record<string, BlogTranslationEntry>;
}

// ── Perfil del autor (misma estrategia de caché que las entradas) ───────────

export interface AuthorTranslationEntry {
  role: string;
  bio: string;
  /** Especialidades traducidas (chips de la ficha del autor). */
  specialties: string[];
  translatedAt: string;
  sourceUpdatedAt: string;
}

export interface BlogAuthorForLocalization {
  role: string;
  bio?: string;
  specialties?: string[];
  sourceLang?: string;
  updatedAt: Date | string;
  translations?: Record<string, AuthorTranslationEntry>;
}

export interface AuthorLocalizationResult<T extends BlogAuthorForLocalization> {
  author: T & {
    lang: SupportedLang;
    translations: Record<string, AuthorTranslationEntry>;
  };
  needsPersist: boolean;
}

export interface LocalizationResult<T extends BlogPostForLocalization> {
  /** Post con title/excerpt/content/category/tags resueltos al idioma objetivo. */
  post: T & {
    category: string;
    tags: string[];
    lang: SupportedLang;
    translations: Record<string, BlogTranslationEntry>;
  };
  /** true si la caché se llenó ahora y el documento debería persistirse. */
  needsPersist: boolean;
}

function toIso(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export interface CachedBlogTranslation {
  title: string;
  excerpt: string;
  content: string;
  category?: string;
  tags?: string[];
  lang: SupportedLang;
}

/**
 * Devuelve la traducción CACHEADA de una entrada si es válida, o null.
 * No llama al LLM: se usa en listados (relacionadas) donde no conviene
 * disparar traducciones por cada entrada mostrada.
 */
export function getCachedBlogTranslation<T extends BlogPostForLocalization>(
  post: T,
  targetLang: SupportedLang | string | undefined,
): CachedBlogTranslation | null {
  const source = normalizeClientLang(post.sourceLang);
  const target =
    targetLang && (SUPPORTED_LANGS as readonly string[]).includes(targetLang)
      ? (targetLang as SupportedLang)
      : undefined;

  if (!target || target === source) return null;

  const entry = (post.translations ?? {})[target];
  if (!entry) return null;
  if (entry.sourceUpdatedAt !== toIso(post.updatedAt)) return null;

  return {
    title: entry.title,
    excerpt: entry.excerpt,
    content: entry.content,
    ...(entry.category !== undefined ? { category: entry.category } : {}),
    ...(Array.isArray(entry.tags) ? { tags: entry.tags } : {}),
    lang: target,
  };
}

/**
 * Devuelve la entrada con los campos de texto en `targetLang`.
 * - targetLang undefined o igual al idioma origen → original (sin LLM).
 * - caché válida → directo (y si una caché antigua no incluía category/tags,
 *   completa solo esos metadatos sin retraducir el artículo).
 * - sin caché → traduce (LLM inyectable para tests) y marca needsPersist.
 */
export async function localizeBlogPost<T extends BlogPostForLocalization>(
  post: T,
  targetLang: SupportedLang | string | undefined,
  llm: LLMFn = defaultLLM,
): Promise<LocalizationResult<T>> {
  const source = normalizeClientLang(post.sourceLang);
  const target = targetLang && (SUPPORTED_LANGS as readonly string[]).includes(targetLang)
    ? (targetLang as SupportedLang)
    : undefined;

  const translations = post.translations ?? {};
  const rawCategory = post.category ?? '';
  const rawTags = Array.isArray(post.tags) ? post.tags : [];

  // Sin idioma pedido, o igual al origen → contenido original.
  if (!target || target === source) {
    return {
      post: { ...post, category: rawCategory, tags: rawTags, translations, lang: source },
      needsPersist: false,
    };
  }

  const updatedAtIso = toIso(post.updatedAt);
  const cached = translations[target];

  if (cached && cached.sourceUpdatedAt === updatedAtIso) {
    const missingCategory = rawCategory !== '' && cached.category === undefined;
    const missingTags = rawTags.length > 0 && cached.tags === undefined;

    if (!missingCategory && !missingTags) {
      return {
        post: {
          ...post,
          title: cached.title,
          excerpt: cached.excerpt,
          content: cached.content,
          category: cached.category ?? rawCategory,
          tags: cached.tags ?? rawTags,
          translations,
          lang: target,
        },
        needsPersist: false,
      };
    }

    // Backfill ligero solo de categoría/etiquetas para cachés previas
    const patchPayload: { category?: string; tags?: string[] } = {};
    if (missingCategory) patchPayload.category = rawCategory;
    if (missingTags) patchPayload.tags = rawTags;

    const patchTranslated = await translateJsonBatch(patchPayload, target, source, llm);
    const llmSucceeded = patchTranslated !== patchPayload;
    const nextCategory = missingCategory
      ? (typeof patchTranslated?.category === 'string' ? patchTranslated.category : rawCategory)
      : (cached.category ?? rawCategory);
    const nextTags = missingTags
      ? (Array.isArray(patchTranslated?.tags) ? patchTranslated.tags : rawTags)
      : (cached.tags ?? rawTags);

    if (!llmSucceeded) {
      return {
        post: {
          ...post,
          title: cached.title,
          excerpt: cached.excerpt,
          content: cached.content,
          category: nextCategory,
          tags: nextTags,
          translations,
          lang: target,
        },
        needsPersist: false,
      };
    }

    const updatedEntry: BlogTranslationEntry = {
      ...cached,
      category: nextCategory,
      tags: nextTags,
    };
    const nextTranslations = { ...translations, [target]: updatedEntry };

    return {
      post: {
        ...post,
        title: updatedEntry.title,
        excerpt: updatedEntry.excerpt,
        content: updatedEntry.content,
        category: nextCategory,
        tags: nextTags,
        translations: nextTranslations,
        lang: target,
      },
      needsPersist: true,
    };
  }

  // Traducción completa (translateJsonBatch ya reintenta y cae al original si falla).
  const translated = await translateJsonBatch(
    {
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: post.content,
      ...(rawCategory !== '' ? { category: rawCategory } : {}),
      ...(rawTags.length > 0 ? { tags: rawTags } : {}),
    },
    target,
    source,
    llm,
  );

  const nextCategory =
    rawCategory !== ''
      ? (typeof translated.category === 'string' ? translated.category : rawCategory)
      : '';
  const nextTags =
    rawTags.length > 0
      ? (Array.isArray(translated.tags) ? translated.tags : rawTags)
      : [];

  // Si el resultado es idéntico al original, el LLM falló (fallback):
  // no cacheamos para que la próxima lectura reintente.
  const sameTags = JSON.stringify(nextTags) === JSON.stringify(rawTags);
  if (
    translated.title === post.title &&
    translated.excerpt === (post.excerpt ?? '') &&
    translated.content === post.content &&
    nextCategory === rawCategory &&
    sameTags
  ) {
    logger.warn('BLOG_TRANSLATE', 'Traducción devolvió el original — no se cachea', { target });
    return {
      post: { ...post, category: rawCategory, tags: rawTags, translations, lang: source },
      needsPersist: false,
    };
  }

  const entry: BlogTranslationEntry = {
    title: translated.title,
    excerpt: translated.excerpt ?? '',
    content: translated.content,
    ...(rawCategory !== '' ? { category: nextCategory } : {}),
    ...(rawTags.length > 0 ? { tags: nextTags } : {}),
    translatedAt: new Date().toISOString(),
    sourceUpdatedAt: updatedAtIso,
  };

  const nextTranslations = { ...translations, [target]: entry };

  return {
    post: {
      ...post,
      title: entry.title,
      excerpt: entry.excerpt,
      content: entry.content,
      category: nextCategory,
      tags: nextTags,
      translations: nextTranslations,
      lang: target,
    },
    needsPersist: true,
  };
}

// ── Traducción de categorías del blog (para filtros y chips) ────────────────

export interface CategoryForLocalization {
  key: string;
  sourceLang: SupportedLang;
  cachedLabel?: string;
}

const CATEGORY_CACHE_TTL_MS = 30 * 60 * 1000;
const CATEGORY_CACHE_MAX = 500;
const categoryMemCache = new Map<string, { label: string; cachedAt: number }>();

/**
 * Traduce un conjunto de categorías únicas al idioma objetivo.
 * Prioriza:
 * 1) `item.sourceLang === target` → devuelve la clave original.
 * 2) `item.cachedLabel` (extraída de `entries.translations[target].category`).
 * 3) Caché en memoria con TTL.
 * 4) Un único batch JSON ligero al LLM para las categorías faltantes.
 */
export async function localizeBlogCategories(
  categories: CategoryForLocalization[],
  targetLang: SupportedLang | string | undefined,
  llm: LLMFn = defaultLLM,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const target =
    targetLang && (SUPPORTED_LANGS as readonly string[]).includes(targetLang)
      ? (targetLang as SupportedLang)
      : undefined;

  if (!target || categories.length === 0) {
    for (const c of categories) result.set(c.key, c.key);
    return result;
  }

  const now = Date.now();
  const missingBatch: Record<string, string> = {};

  for (const item of categories) {
    if (item.sourceLang === target) {
      result.set(item.key, item.key);
      continue;
    }
    if (item.cachedLabel && item.cachedLabel.trim() !== '') {
      result.set(item.key, item.cachedLabel);
      continue;
    }
    const cacheKey = `${target}:${item.sourceLang}:${item.key}`;
    const mem = categoryMemCache.get(cacheKey);
    if (mem && now - mem.cachedAt < CATEGORY_CACHE_TTL_MS) {
      result.set(item.key, mem.label);
      continue;
    }
    missingBatch[item.key] = item.key;
  }

  const missingKeys = Object.keys(missingBatch);
  if (missingKeys.length > 0) {
    const translated = await translateJsonBatch(missingBatch, target, 'el idioma original', llm);
    const llmSucceeded = translated !== missingBatch;
    for (const item of categories) {
      if (!(item.key in missingBatch)) continue;
      const candidate =
        translated && typeof translated[item.key] === 'string' && translated[item.key].trim() !== ''
          ? translated[item.key]
          : item.key;
      result.set(item.key, candidate);
      if (llmSucceeded) {
        if (categoryMemCache.size >= CATEGORY_CACHE_MAX) {
          const oldest = categoryMemCache.keys().next().value;
          if (oldest) categoryMemCache.delete(oldest);
        }
        categoryMemCache.set(`${target}:${item.sourceLang}:${item.key}`, {
          label: candidate,
          cachedAt: now,
        });
      }
    }
  }

  return result;
}

// ── Traducción del perfil del autor (rol y biografía) ───────────────────────

/**
 * Devuelve el perfil del autor con `role` y `bio` en `targetLang`.
 * Misma estrategia que las entradas: caché válida si `sourceUpdatedAt`
 * coincide con el `updatedAt`; fallback al original sin cachear si el LLM falla.
 */
export async function localizeAuthorProfile<T extends BlogAuthorForLocalization>(
  author: T,
  targetLang: SupportedLang | string | undefined,
  llm: LLMFn = defaultLLM,
): Promise<AuthorLocalizationResult<T>> {
  const source = normalizeClientLang(author.sourceLang);
  const target = targetLang && (SUPPORTED_LANGS as readonly string[]).includes(targetLang)
    ? (targetLang as SupportedLang)
    : undefined;

  const translations = author.translations ?? {};

  if (!target || target === source) {
    return {
      author: { ...author, specialties: author.specialties ?? [], translations, lang: source },
      needsPersist: false,
    };
  }

  const updatedAtIso = toIso(author.updatedAt);
  const cached = translations[target];

  if (cached && cached.sourceUpdatedAt === updatedAtIso) {
    return {
      author: {
        ...author,
        role: cached.role,
        bio: cached.bio,
        specialties: cached.specialties ?? author.specialties ?? [],
        translations,
        lang: target,
      },
      needsPersist: false,
    };
  }

  const translated = await translateJsonBatch(
    {
      role: author.role,
      bio: author.bio ?? '',
      specialties: author.specialties ?? [],
    },
    target,
    source,
    llm,
  );

  // Si el resultado es idéntico al original, el LLM falló (fallback):
  // no cacheamos para que la próxima lectura reintente.
  const sameSpecialties =
    JSON.stringify(translated.specialties ?? []) === JSON.stringify(author.specialties ?? []);
  if (translated.role === author.role && translated.bio === (author.bio ?? '') && sameSpecialties) {
    logger.warn('BLOG_TRANSLATE', 'Traducción del autor devolvió el original — no se cachea', { target });
    return {
      author: { ...author, translations, lang: source },
      needsPersist: false,
    };
  }

  const entry: AuthorTranslationEntry = {
    role: translated.role ?? author.role,
    bio: translated.bio ?? author.bio ?? '',
    specialties: translated.specialties ?? author.specialties ?? [],
    translatedAt: new Date().toISOString(),
    sourceUpdatedAt: updatedAtIso,
  };

  return {
    author: {
      ...author,
      role: entry.role,
      bio: entry.bio,
      specialties: entry.specialties,
      translations: { ...translations, [target]: entry },
      lang: target,
    },
    needsPersist: true,
  };
}

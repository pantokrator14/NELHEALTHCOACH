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
  /** ISO timestamp de cuándo se tradujo. */
  translatedAt: string;
  /** ISO del updatedAt de origen con el que se generó (para invalidar). */
  sourceUpdatedAt: string;
}

export interface BlogPostForLocalization {
  title: string;
  excerpt?: string;
  content: string;
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
  /** Post con title/excerpt/content resueltos al idioma objetivo. */
  post: T & {
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
  lang: SupportedLang;
}

/**
 * Devuelve la traducción CACHEADAS de una entrada si es válida, o null.
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

  return { title: entry.title, excerpt: entry.excerpt, content: entry.content, lang: target };
}

/**
 * Devuelve la entrada con los campos de texto en `targetLang`.
 * - targetLang undefined o igual al idioma origen → original (sin LLM).
 * - caché válida → directo.
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

  // Sin idioma pedido, o igual al origen → contenido original.
  if (!target || target === source) {
    return {
      post: { ...post, translations, lang: source },
      needsPersist: false,
    };
  }

  const updatedAtIso = toIso(post.updatedAt);
  const cached = translations[target];

  if (cached && cached.sourceUpdatedAt === updatedAtIso) {
    return {
      post: {
        ...post,
        title: cached.title,
        excerpt: cached.excerpt,
        content: cached.content,
        translations,
        lang: target,
      },
      needsPersist: false,
    };
  }

  // Traducción (translateJsonBatch ya reintenta y cae al original si falla).
  const translated = await translateJsonBatch(
    {
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: post.content,
    },
    target,
    source,
    llm,
  );

  // Si el resultado es idéntico al original, el LLM falló (fallback):
  // no cacheamos para que la próxima lectura reintente.
  if (
    translated.title === post.title &&
    translated.excerpt === (post.excerpt ?? '') &&
    translated.content === post.content
  ) {
    logger.warn('BLOG_TRANSLATE', 'Traducción devolvió el original — no se cachea', { target });
    return {
      post: { ...post, translations, lang: source },
      needsPersist: false,
    };
  }

  const entry: BlogTranslationEntry = {
    title: translated.title,
    excerpt: translated.excerpt ?? '',
    content: translated.content,
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
      translations: nextTranslations,
      lang: target,
    },
    needsPersist: true,
  };
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

// apps/blog/src/lib/seo.ts
// Helpers SEO del blog: URL canónica, Open Graph, hreflang y JSON-LD.
// Funciones puras y testables (sin DOM). El escape del JSON-LD evita que el
// contenido pueda cerrar el <script> al inyectarlo (XSS por contenido).

import { SUPPORTED_LANGS } from './translations';

/** Dominio público del blog (configurable con NEXT_PUBLIC_BLOG_URL). */
export const BLOG_BASE_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL || 'https://blog.nelhealthcoach.com'
).replace(/\/+$/, '');

/** Convierte una ruta interna en URL absoluta para canonical/OG/JSON-LD. */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BLOG_BASE_URL}${normalized}`;
}

const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  pt: 'pt_BR',
  de: 'de_DE',
};

/** Locale de Open Graph (formato idioma_PAÍS) con fallback a es_ES. */
export function ogLocale(lang: string): string {
  return OG_LOCALES[lang] ?? 'es_ES';
}

/** Serializa JSON para <script type="application/ld+json"> sin riesgo de cierre. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Ruta localizada: el idioma por defecto (es) no lleva parámetro; el resto
 * usa ?lang=XX para que Google indexe cada idioma como URL propia.
 * Respeta rutas que ya traen query (p. ej. /?categoria=salud).
 */
export function localizedPath(path: string, lang: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'es') return normalized;
  const [base, query] = normalized.split('?');
  return `${base}?${query ? `${query}&` : ''}lang=${lang}`;
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

/**
 * Alternates hreflang de una ruta: una URL por idioma + x-default (versión
 * por defecto). Se emiten como <link rel="alternate" hreflang="...">.
 */
export function buildAlternates(path: string): HreflangAlternate[] {
  const languages = SUPPORTED_LANGS.map((lang) => ({
    hreflang: lang as string,
    href: absoluteUrl(localizedPath(path, lang)),
  }));
  return [...languages, { hreflang: 'x-default', href: absoluteUrl(localizedPath(path, 'es')) }];
}

export interface PostSeoInput {
  title: string;
  excerpt?: string;
  slug: string;
  lang?: string;
  authorName?: string;
  authorRole?: string;
  category?: string;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

/** JSON-LD de una entrada (schema.org BlogPosting) para rich results. */
export function buildPostJsonLd(post: PostSeoInput): Record<string, unknown> {
  const url = absoluteUrl(`/post/${post.slug}`);

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    url,
    mainEntityOfPage: url,
    inLanguage: post.lang ?? 'es',
    publisher: {
      '@type': 'Organization',
      name: 'NELHEALTHCOACH',
      logo: { '@type': 'ImageObject', url: absoluteUrl('/images/logo.png') },
    },
  };

  if (post.authorName) {
    ld.author = {
      '@type': 'Person',
      name: post.authorName,
      ...(post.authorRole ? { jobTitle: post.authorRole } : {}),
    };
  }
  if (post.coverImageUrl) ld.image = [post.coverImageUrl];
  if (post.publishedAt) ld.datePublished = post.publishedAt;
  if (post.updatedAt) ld.dateModified = post.updatedAt;
  if (post.category) ld.keywords = [post.category];

  return ld;
}

/** JSON-LD del blog (schema.org Blog + autor) para la portada. */
export function buildBlogJsonLd(input: {
  lang?: string;
  authorName?: string;
  authorRole?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog NELHEALTHCOACH',
    url: absoluteUrl('/'),
    inLanguage: input.lang ?? 'es',
    publisher: {
      '@type': 'Organization',
      name: 'NELHEALTHCOACH',
      logo: { '@type': 'ImageObject', url: absoluteUrl('/images/logo.png') },
    },
    ...(input.authorName
      ? {
          author: {
            '@type': 'Person',
            name: input.authorName,
            ...(input.authorRole ? { jobTitle: input.authorRole } : {}),
          },
        }
      : {}),
  };
}

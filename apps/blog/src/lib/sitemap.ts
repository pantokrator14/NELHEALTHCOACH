// apps/blog/src/lib/sitemap.ts
// Sitemap XML con hreflang: cada entrada y la portada se listan en los 6
// idiomas, cada URL con los alternates de todos los idiomas (patrón que
// exige Google para sitios multi-idioma). Puro y testable.

import { SUPPORTED_LANGS } from './translations';
import { absoluteUrl, localizedPath } from './seo';
import { escapeXml } from './xml';

export interface SitemapPost {
  slug: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
}

function buildUrlEntry(
  path: string,
  locLang: string,
  lastmod: string | null,
  changefreq: string,
  priority: string,
): string {
  const loc = escapeXml(absoluteUrl(localizedPath(path, locLang)));
  const alternates = SUPPORTED_LANGS.map(
    (lang) =>
      `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(
        absoluteUrl(localizedPath(path, lang)),
      )}" />`,
  ).join("\n");

  return `  <url>
    <loc>${loc}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
${alternates}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/** Genera el sitemap completo (portada + entradas, ×6 idiomas con hreflang). */
export function buildSitemapXml(posts: SitemapPost[]): string {
  const urls: string[] = [];

  for (const lang of SUPPORTED_LANGS) {
    urls.push(buildUrlEntry('/', lang, null, 'daily', '1.0'));
  }

  for (const post of posts) {
    const rawDate = post.updatedAt || post.publishedAt || post.createdAt;
    let lastmod: string | null = null;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          lastmod = d.toISOString();
        }
      } catch {
        lastmod = null;
      }
    }
    for (const lang of SUPPORTED_LANGS) {
      urls.push(buildUrlEntry(`/post/${post.slug}`, lang, lastmod, 'weekly', '0.8'));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}

// apps/blog/src/lib/feed.ts
// RSS 2.0 del blog (puro y testable): portada + entradas publicadas.
// Sin cookies ni dependencias externas — feed estándar para lectores y agregadores.

import { absoluteUrl, BLOG_BASE_URL } from './seo';
import { escapeXml } from './xml';

export interface FeedPost {
  title: string;
  excerpt?: string;
  slug: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Construye el XML del feed RSS 2.0 a partir de las entradas publicadas.
 * Las fechas se emiten en RFC 822 (toUTCString), como exige RSS.
 */
export function buildRssFeed(posts: FeedPost[]): string {
  const items = posts
    .map((post) => {
      const link = absoluteUrl(`/post/${post.slug}`);
      const pubDate = post.publishedAt ?? post.updatedAt;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(post.excerpt ?? '')}</description>${
        pubDate ? `\n      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>` : ''
      }
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog NELHEALTHCOACH</title>
    <link>${BLOG_BASE_URL}/</link>
    <description>Conocimiento ancestral, abierto a todos.</description>
    <language>es</language>
    <atom:link href="${BLOG_BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

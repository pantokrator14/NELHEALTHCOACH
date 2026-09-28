// apps/blog/src/pages/rss.xml.tsx
// Feed RSS 2.0 del blog: portada + entradas publicadas (en su idioma original).
// El XML se construye con buildRssFeed (lib pura y testada).
import type { GetServerSideProps } from 'next';
import { apiClient, type BlogPost } from '@/lib/api';
import { buildRssFeed } from '@/lib/feed';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = await apiClient.getPosts().catch(() => [] as BlogPost[]);

  const xml = buildRssFeed(
    posts.map((post) => ({
      title: post.title,
      excerpt: post.excerpt,
      slug: post.slug,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
    })),
  );

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

// Página vacía: todo el contenido se envía desde getServerSideProps
export default function RssPage() {
  return null;
}

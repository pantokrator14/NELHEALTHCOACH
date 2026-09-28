// apps/blog/src/pages/sitemap.xml.tsx
// Sitemap dinámico del blog con hreflang: portada + entradas publicadas,
// cada una listada en los 6 idiomas con los alternates correspondientes
// (patrón multi-idioma que exige Google). La generación vive en lib/sitemap.
import type { GetServerSideProps } from 'next';
import { apiClient, type BlogPost } from '@/lib/api';
import { buildSitemapXml } from '@/lib/sitemap';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = await apiClient.getPosts().catch(() => [] as BlogPost[]);

  const xml = buildSitemapXml(
    posts.map((post) => ({ slug: post.slug, updatedAt: post.updatedAt })),
  );

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

// Página vacía: todo el contenido se envía desde getServerSideProps
export default function SitemapPage() {
  return null;
}

// apps/landing/src/pages/sitemap.xml.tsx
// Sitemap dinámico de la landing con todas las páginas públicas indexables.
import type { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nelhealthcoach.com';

const PAGES: Array<{ path: string; changefreq: string; priority: string; lastmod: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0', lastmod: '2026-10-10' },
  { path: '/terminos-condiciones', changefreq: 'monthly', priority: '0.5', lastmod: '2026-10-10' },
  { path: '/politica-privacidad', changefreq: 'monthly', priority: '0.5', lastmod: '2026-10-10' },
  { path: '/cookies', changefreq: 'monthly', priority: '0.5', lastmod: '2026-10-10' },
  { path: '/aviso-legal', changefreq: 'monthly', priority: '0.5', lastmod: '2026-10-10' },
  { path: '/reembolsos', changefreq: 'monthly', priority: '0.5', lastmod: '2026-10-10' },
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const urlBlocks = PAGES.map(
    (p) => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlBlocks}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapPage() {
  return null;
}

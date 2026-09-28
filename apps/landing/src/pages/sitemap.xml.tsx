// apps/landing/src/pages/sitemap.xml.tsx
// Sitemap estático de la landing (páginas fijas).
// El dominio se configura con NEXT_PUBLIC_SITE_URL en producción.
import type { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nelhealthcoach.com';

const PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/politica-privacidad', changefreq: 'yearly', priority: '0.3' },
  { path: '/terminos-condiciones', changefreq: 'yearly', priority: '0.3' },
  { path: '/aviso-legal', changefreq: 'yearly', priority: '0.3' },
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
).join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapPage() {
  return null;
}

// apps/blog/src/pages/robots.txt.tsx
// robots.txt del blog: indexa las páginas públicas, excluye /admin.
import type { GetServerSideProps } from 'next';

const BLOG_BASE_URL = process.env.NEXT_PUBLIC_BLOG_URL || 'https://blog.nelhealthcoach.com';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${BLOG_BASE_URL}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(robots);
  res.end();

  return { props: {} };
};

export default function RobotsPage() {
  return null;
}

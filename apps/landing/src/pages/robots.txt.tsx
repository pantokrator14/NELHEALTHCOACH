// apps/landing/src/pages/robots.txt.tsx
// robots.txt de la landing.
import type { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nelhealthcoach.com';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(robots);
  res.end();

  return { props: {} };
};

export default function RobotsPage() {
  return null;
}

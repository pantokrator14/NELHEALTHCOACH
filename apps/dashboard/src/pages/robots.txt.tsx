// apps/dashboard/src/pages/robots.txt.tsx
// Bloqueo total de indexación para el panel administrativo privado.
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robots = `User-agent: *
Disallow: /
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(robots);
  res.end();

  return { props: {} };
};

export default function RobotsPage() {
  return null;
}

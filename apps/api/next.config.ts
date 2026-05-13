import type { NextConfig } from 'next';

const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // O especifica los dominios
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  // No bundle pdfkit — se carga desde node_modules con sus fuentes .afm
  serverExternalModules: ['pdfkit'],
  // Incluir fuentes .afm en el bundle serverless para Vercel/producción
  outputFileTracingIncludes: {
    'app/api/clients/[id]/ai/[sessionId]/pdf/route': ['./node_modules/pdfkit/js/data/**'],
  },
};

export default nextConfig;
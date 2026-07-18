import type { NextConfig } from 'next';

const nextConfig = {
  async headers() {
    return [
      // ── CORS + Security Headers ──
      {
        source: '/api/:path*',
        headers: [
          // CORS manejado por middleware.ts — no fijar aquí para no anular la lógica de orígenes permitidos
          // { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Visitor-Id, X-Request-ID' },

          // ── Security Headers (Helmet-style, 0 dependencias) ──
          // Previene MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Previene clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Forzar HTTPS (solo en producción)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Deshabilitar XSS auditor (obsoleto, reemplazado por CSP)
          { key: 'X-XSS-Protection', value: '0' },
          // Política de referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Content Security Policy básico para API
          { key: 'Content-Security-Policy', value: "default-src 'self'; frame-ancestors 'none'" },
          // Permissions Policy: limitar APIs del navegador
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          // Descargar tipos MIME correctos
          { key: 'X-Download-Options', value: 'noopen' },
          // Cross-Origin isolation hints
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
  // No bundle pdfkit — se carga desde node_modules con sus fuentes .afm
  serverExternalPackages: [
    'pdfkit', 'pdf-parse',
    // Native addons para OCR local con ppu-paddle-ocr
    'onnxruntime-node', '@napi-rs/canvas', 'ppu-paddle-ocr', 'ppu-ocv',
  ],
  // Incluir fuentes .afm en el bundle serverless para Vercel/producción
  outputFileTracingIncludes: {
    'app/api/clients/[id]/ai/[sessionId]/pdf/route': ['./node_modules/pdfkit/js/data/**'],
    'app/api/admin/finances/reports/pdf/route': ['./node_modules/pdfkit/js/data/**'],
  },
};

export default nextConfig;
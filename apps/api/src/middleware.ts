// apps/api/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';
import arcjet, { shield, detectBot, tokenBucket } from '@arcjet/next';

// Inicializar Arcjet con las reglas de seguridad
const aj = arcjet({
  key: process.env.ARCJET_KEY || 'demo', // Usar 'demo' para desarrollo si no hay key
  rules: [
    // Protección contra ataques comunes (XSS, SQLi, etc.)
    shield({ mode: "LIVE" }),
    // Detección de bots - solo permitir bots conocidos
    detectBot({ mode: "LIVE", allow: [] }), // Removed specific bots due to type issues
    // Rate limiting: 10 solicitudes por 10 segundos
    tokenBucket({ mode: "LIVE", refillRate: 10, interval: 10, capacity: 10 }),
  ],
});

export async function middleware(request: NextRequest) {
  // Aplicar protección Arcjet solo a rutas API
  if (request.nextUrl.pathname.startsWith('/api')) {
    try {
      const decision = await aj.protect(request, {
        // Información adicional para logging
        requested: 1,
      });

      // Manejar decisiones de denegación de Arcjet
      if (decision.isDenied()) {
        const reason = decision.reason;
        
        // Loggear la denegación
        console.warn('🔒 Arcjet denegó solicitud:', {
          path: request.nextUrl.pathname,
          reason,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        });

        // Devolver respuesta apropiada según el motivo
        if (reason === 'RATE_LIMIT' as any) {
          return new NextResponse(
            JSON.stringify({
              error: 'Rate limit excedido',
              message: 'Demasiadas solicitudes. Por favor, espera 10 segundos.',
              retryAfter: 10,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '10',
              },
            }
          );
        } else if (reason === 'BOT' as any) {
          return new NextResponse(
            JSON.stringify({
              error: 'Bot no permitido',
              message: 'Los bots no están permitidos en esta API.',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } else {
          // Para SHIELD u otras razones
          return new NextResponse(
            JSON.stringify({
              error: 'Solicitud bloqueada',
              message: 'La solicitud fue bloqueada por medidas de seguridad.',
              reason,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Si la solicitud es permitida, continuar con el logging
      console.debug('✅ Arcjet permitió solicitud:', {
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      });
    } catch (error) {
      // En caso de error en Arcjet, permitir la solicitud pero loggear
      console.error('⚠️ Error en Arcjet, permitiendo solicitud:', error);
      // Continuar con el procesamiento normal
    }
  }

  // Aplicar logging de solicitud
  const loggedResponse = requestLogger(request);
  
  // Configuración CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://www.nelhealthcoach.com',
    'https://app.nelhealthcoach.com',
    'https://form.nelhealthcoach.com',
  ];

  const origin = request.headers.get('origin');

  // Determinar si el origen está permitido
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Manejar solicitudes OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    // Copiar header X-Request-ID del loggedResponse
    const requestId = loggedResponse.headers.get('X-Request-ID');
    if (requestId) {
      response.headers.set('X-Request-ID', requestId);
    }
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  // Para otros métodos, usar la respuesta con logging y agregar headers CORS
  const response = loggedResponse;
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
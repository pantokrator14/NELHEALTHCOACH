// apps/api/src/middleware.ts
// Middleware simplificado para Vercel (tamaño reducido)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';

// Función para verificar seguridad llamando a la API route
async function checkSecurity(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  // Solo verificar rutas API críticas
  const criticalPaths = [
    '/api/clients',
    '/api/leads',
    '/api/health',
    '/api/exercises',
    '/api/recipes',
  ];

  const path = request.nextUrl.pathname;
  const isCriticalPath = criticalPaths.some(criticalPath => 
    path.startsWith(criticalPath)
  );

  if (!isCriticalPath) {
    return { allowed: true };
  }

  try {
    // En producción, llamar a la API de seguridad
    if (process.env.NODE_ENV === 'production' && process.env.ARCJET_KEY) {
      const securityCheckUrl = new URL('/api/security-check', request.url);
      
      const securityResponse = await fetch(securityCheckUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: request.nextUrl.pathname,
          method: request.method,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        }),
      });

      if (!securityResponse.ok) {
        // Si falla la verificación, permitir por defecto (fail-open)
        console.warn('⚠️ Falló verificación de seguridad, permitiendo solicitud');
        return { allowed: true };
      }

      const result = await securityResponse.json();
      
      if (!result.allowed) {
        console.warn('🔒 Solicitud bloqueada por seguridad:', {
          path,
          reason: result.reason,
          ip: request.headers.get('x-forwarded-for'),
        });

        const status = result.reason === 'RATE_LIMIT' ? 429 : 403;
        const response = new NextResponse(
          JSON.stringify({
            error: result.reason === 'RATE_LIMIT' ? 'Rate limit excedido' : 'Solicitud bloqueada',
            message: result.message,
            retryAfter: result.retryAfter,
          }),
          {
            status,
            headers: {
              'Content-Type': 'application/json',
              ...(result.reason === 'RATE_LIMIT' && { 'Retry-After': '10' }),
            },
          }
        );
        
        return { allowed: false, response };
      }
    }

    return { allowed: true };
  } catch (error) {
    // En caso de error, permitir por defecto (fail-open)
    console.error('⚠️ Error en verificación de seguridad:', error);
    return { allowed: true };
  }
}

export async function middleware(request: NextRequest) {
  // Verificar seguridad para rutas críticas
  const securityCheck = await checkSecurity(request);
  if (!securityCheck.allowed) {
    return securityCheck.response!;
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
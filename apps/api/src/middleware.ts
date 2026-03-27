// apps/api/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';

export function middleware(request: NextRequest) {
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
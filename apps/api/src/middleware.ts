import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';

export function middleware(request: NextRequest) {
  // Aplicar logger a todas las rutas API
  if (request.nextUrl.pathname.startsWith('/api')) {
    return requestLogger(request);
  }

  const response = NextResponse.next();
  
  // 🔥 CORRECIÓN: Permitir el dominio correcto de producción
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://app.nelhealthcoach.com',
  ];
  
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  // Configuración CORS completa
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
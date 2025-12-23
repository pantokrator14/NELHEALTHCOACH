// apps/api/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';

export function middleware(request: NextRequest) {
  // Aplicar logger a todas las rutas API
  if (request.nextUrl.pathname.startsWith('/api')) {
    return requestLogger(request);
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
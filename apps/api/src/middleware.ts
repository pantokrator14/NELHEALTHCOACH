// apps/api/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './app/middleware/requestLogger';

export function middleware(request: NextRequest) {
  // Aplicar logger a todas las rutas API
  if (request.nextUrl.pathname.startsWith('/api')) {
    return requestLogger(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
// apps/api/src/app/middleware/requestLogger.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../lib/logger';

export function requestLogger(request: NextRequest) {
  const start = Date.now();
  const url = request.nextUrl.pathname;
  const method = request.method;

  logger.info('API', `Incoming request: ${method} ${url}`, undefined, {
    endpoint: url,
    method: method,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.ip
  });

  // Continuar con la solicitud
  const response = NextResponse.next();

  // Loggear respuesta
  const duration = Date.now() - start;
  logger.info('API', `Request completed: ${method} ${url}`, undefined, {
    endpoint: url,
    method: method,
    status: response.status,
    duration
  });

  return response;
}
// apps/api/src/app/middleware/requestLogger.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../lib/logger';

export function requestLogger(request: NextRequest) {
  const start = Date.now();
  const url = request.nextUrl.pathname;
  const method = request.method;
  
  // Extraer o generar requestId
  const requestId = request.headers.get('x-request-id') || 
                   request.headers.get('x-correlation-id') || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Crear logger con contexto
  const reqLogger = logger.withContext({
    requestId,
    endpoint: url,
    method,
    clientId: extractClientIdFromPath(url),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.ip
  });

  reqLogger.info('API', `Incoming ${method} request to ${url}`);

  // Continuar con la solicitud
  const response = NextResponse.next();

  // Agregar requestId a los headers de respuesta
  response.headers.set('X-Request-ID', requestId);

  // Loggear respuesta
  const duration = Date.now() - start;
  reqLogger.info('API', `Request completed`, undefined, { duration });

  return response;
}

function extractClientIdFromPath(path: string): string | undefined {
  const match = path.match(/\/clients\/([^\/]+)/);
  return match ? match[1] : undefined;
}
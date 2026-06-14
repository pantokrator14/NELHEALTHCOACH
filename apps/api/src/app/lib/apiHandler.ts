// apps/api/src/app/lib/apiHandler.ts
// Wrapper centralizado para route handlers de Next.js App Router.
//
// ✅ Logea automáticamente cada request con método, path, status code y duración
// ✅ Captura errores no manejados y responde 500 consistente
// ✅ Propaga X-Request-ID
// ✅ Inyecta requestId en cada respuesta para trazabilidad
//
// Uso:
//   export const POST = apiHandler(async (request) => {
//     ... tu lógica ...
//     return NextResponse.json({ success: true });
//   });

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

type RouteHandler<T extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: { params: Promise<T> },
) => Promise<NextResponse>;

interface ApiHandlerOptions {
  /** Nombre del endpoint para logs (default: pathname) */
  name?: string;
}

/**
 * Envuelve un route handler con logging automático + manejo de errores centralizado.
 *
 * 📌 Captura:
 *   - Status code de la respuesta
 *   - Duración del handler
 *   - Errores no capturados (500)
 *   - Request ID
 */
export function apiHandler<T extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<T>,
  options?: ApiHandlerOptions,
): RouteHandler<T> {
  return async (request, context) => {
    const start = Date.now();
    const path = request.nextUrl.pathname;
    const method = request.method;
    const endpointName = options?.name ?? path;

    // Obtener o generar requestId desde el header (lo setea el middleware)
    const requestId =
      request.headers.get('x-request-id') ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Ejecutar el handler
      const response = await handler(request, context);

      // Medir duración
      const duration = Date.now() - start;
      const status = response.status;

      // Construir metadata
      const meta = {
        requestId,
        method,
        endpoint: path,
        duration,
        statusCode: status,
      };

      // Log según status code
      if (status >= 500) {
        logger.error('API', `${method} ${path} → ${status}`, undefined, undefined, meta);
      } else if (status >= 400) {
        logger.warn('API', `${method} ${path} → ${status}`, undefined, meta);
      } else {
        logger.info('API', `${method} ${path} → ${status}`, undefined, meta);
      }

      // Asegurar que la respuesta tenga el requestId
      if (!response.headers.has('X-Request-ID')) {
        response.headers.set('X-Request-ID', requestId);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      const meta = {
        requestId,
        method,
        endpoint: path,
        duration,
        statusCode: 500,
      };

      logger.error('API', `${method} ${path} → ERROR`, error, undefined, meta);

      // Error response consistente
      return NextResponse.json(
        {
          success: false,
          message: process.env.NODE_ENV === 'development'
            ? `Error interno: ${(error as Error).message}`
            : 'Error interno del servidor',
        },
        {
          status: 500,
          headers: { 'X-Request-ID': requestId },
        },
      );
    }
  };
}

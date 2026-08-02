import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { secureRoute } from '@/app/lib/security/routeGuard';

// SEC-09: truncar campos largos para evitar log flooding / almacenamiento abusable
const MAX_FIELD_LENGTH = 1000;

function truncate(value: string | undefined, maxLength: number): string {
  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, maxLength)}…[truncado]` : value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SEC-09: rate limit + shield body scan (evita log flooding y payloads maliciosos)
    const security = await secureRoute(request, body);
    if (!security.passed) {
      return NextResponse.json({ success: false }, { status: security.statusCode || 429 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    logger.warn('AUTH', 'Intento de acceso sin coachId al formulario', {
      ip,
      userAgent: truncate(body.userAgent, MAX_FIELD_LENGTH) || 'unknown',
      path: truncate(body.path, MAX_FIELD_LENGTH) || 'unknown',
      query: truncate(body.query, MAX_FIELD_LENGTH) || 'none',
      timestamp: truncate(body.timestamp, MAX_FIELD_LENGTH) || new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('AUTH', 'Error en log-unauthorized', error as Error);
    return NextResponse.json({ success: true }); // Siempre responder ok para no exponer info
  }
}

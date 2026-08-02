import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { secureRoute } from '@/app/lib/security/routeGuard';

// SEC-09: truncar campos largos para evitar log flooding / almacenamiento abusable
const MAX_STACK_LENGTH = 4000;
const MAX_FIELD_LENGTH = 500;

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

    logger.error('FRONTEND', 'Error capturado por ErrorBoundary en el formulario', {
      ip,
      errorName: truncate(body.errorName, MAX_FIELD_LENGTH) || 'unknown',
      errorMessage: truncate(body.errorMessage, MAX_FIELD_LENGTH) || 'unknown',
      errorStack: truncate(body.errorStack, MAX_STACK_LENGTH),
      componentStack: truncate(body.componentStack, MAX_STACK_LENGTH),
      url: truncate(body.url, MAX_FIELD_LENGTH) || 'unknown',
      userAgent: truncate(body.userAgent, MAX_FIELD_LENGTH) || 'unknown',
      timestamp: truncate(body.timestamp, MAX_FIELD_LENGTH) || new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('FRONTEND', 'Error en log-form-error', error as Error);
    return NextResponse.json({ success: true });
  }
}

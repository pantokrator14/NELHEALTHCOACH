import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    logger.error('FORM', 'Error capturado por ErrorBoundary en el formulario', {
      ip,
      errorName: body.errorName || 'unknown',
      errorMessage: body.errorMessage || 'unknown',
      errorStack: body.errorStack || '',
      componentStack: body.componentStack || '',
      url: body.url || 'unknown',
      userAgent: body.userAgent || 'unknown',
      timestamp: body.timestamp || new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('FORM', 'Error en log-form-error', error as Error);
    return NextResponse.json({ success: true });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    logger.warn('AUTH', 'Intento de acceso sin coachId al formulario', {
      ip,
      userAgent: body.userAgent || 'unknown',
      path: body.path || 'unknown',
      query: body.query || 'none',
      timestamp: body.timestamp || new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('AUTH', 'Error en log-unauthorized', error as Error);
    return NextResponse.json({ success: true }); // Siempre responder ok para no exponer info
  }
}

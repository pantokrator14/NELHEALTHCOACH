import { NextRequest, NextResponse } from 'next/server';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = requireCoachAuth(request);
    const formUrl = process.env.FORM_URL || 'https://form.nelhealthcoach.com';

    const link = `${formUrl}?coach=${auth.coachId}`;

    logger.info('OTHER', 'Enlace de registro generado', {
      coachId: auth.coachId,
    });

    return NextResponse.json({
      success: true,
      data: {
        link,
        coachId: auth.coachId,
      },
    });
    } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    logger.error('OTHER', 'Error generando enlace', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

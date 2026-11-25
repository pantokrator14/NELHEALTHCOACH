import { NextRequest, NextResponse } from 'next/server';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import { connectMongoose } from '@/app/lib/database';
import Coach from '@/app/models/Coach';

async function getHandler(request: NextRequest) {
  try {
    const auth = requireCoachAuth(request);
    const formUrl = process.env.FORM_URL || 'http://localhost:3002';
    const isAdmin = auth.role === 'admin';

    // Admin (Manuel Martínez) solo usa link gratuito; resto de coaches usan su link con pago
    const requestedType = request.nextUrl.searchParams.get('type');
    const type = requestedType || (isAdmin ? 'free' : 'paid');

    if (type !== 'paid' && type !== 'free') {
      return NextResponse.json(
        { success: false, message: 'Tipo de enlace inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    // Solo administradores pueden generar enlaces gratuitos
    if (type === 'free' && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Solo administradores pueden generar enlaces gratuitos', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // El administrador utiliza únicamente enlace gratuito (los clientes pagos del admin entran por el portal de planes)
    if (type === 'paid' && isAdmin) {
      return NextResponse.json(
        { success: false, message: 'El administrador solo utiliza enlaces gratuitos', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    await connectMongoose();
    const coach = await Coach.findById(auth.coachId).select('sessionPrice').lean() as {
      sessionPrice?: number;
    } | null;
    const defaultAmountCents = (Number(process.env.CLIENT_SESSION_AMOUNT) || 150) * 100;
    const sessionPriceCents = isAdmin
      ? 0
      : typeof coach?.sessionPrice === 'number' && coach.sessionPrice >= 5000
      ? coach.sessionPrice
      : defaultAmountCents;

    const link =
      type === 'free'
        ? `${formUrl}?coach=${auth.coachId}&free=1`
        : `${formUrl}?coach=${auth.coachId}`;

    logger.info('OTHER', 'Enlace de registro generado', {
      coachId: auth.coachId,
      type,
    });

    return NextResponse.json({
      success: true,
      data: {
        link,
        coachId: auth.coachId,
        type,
        sessionPriceCents,
        sessionPriceUsd: Math.round(sessionPriceCents / 100),
      },
    });
  } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    logger.error('OTHER', 'Error generando enlace', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const GET = apiHandler(getHandler);

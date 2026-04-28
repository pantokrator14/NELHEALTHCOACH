import { NextRequest, NextResponse } from 'next/server';
import Coach from '@/app/models/Coach';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';

export async function GET(request: NextRequest) {
  try {
    await connectMongoose();
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token de verificación requerido' },
        { status: 400 }
      );
    }

    const coach = await Coach.findOne({ verificationToken: token });

    if (!coach) {
      return NextResponse.json(
        { success: false, message: 'Token inválido o ya utilizado' },
        { status: 400 }
      );
    }

    coach.emailVerified = true;
    coach.verificationToken = null;
    await coach.save();

    logger.info('AUTH', 'Email verificado exitosamente', {
      coachId: coach._id.toString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
    });
    } catch (error: unknown) {
    logger.error('AUTH', 'Error verificando email', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

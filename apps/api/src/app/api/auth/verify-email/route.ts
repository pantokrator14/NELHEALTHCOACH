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
      // Si no encuentra el token, puede ser porque:
      // 1. Ya fue usado (token = null, emailVerified = true)
      // 2. Fue reemplazado por un reenvío (token nuevo, el viejo ya no existe)
      // 3. Token inválido

      // Buscar si el coach ya tiene el email verificado (token null pero emailVerified true)
      const alreadyVerified = await Coach.findOne({
        verificationToken: null,
        emailVerified: true,
      });

      if (alreadyVerified) {
        return NextResponse.json({
          success: true,
          message: 'Tu email ya está verificado. Puedes iniciar sesión.',
          alreadyVerified: true,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message: 'El enlace de verificación es inválido o ha expirado. Solicita un nuevo enlace desde la pantalla de inicio de sesión.',
          needsResend: true,
        },
        { status: 400 }
      );
    }

    // Si el coach ya está verificado (por alguna razón aún tiene token), igual responder éxito
    if (coach.emailVerified) {
      coach.verificationToken = null;
      await coach.save();

      return NextResponse.json({
        success: true,
        message: 'Tu email ya estaba verificado. Puedes iniciar sesión.',
      });
    }

    // Verificar ahora
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

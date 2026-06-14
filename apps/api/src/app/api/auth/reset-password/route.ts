import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Coach from '@/app/models/Coach';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

async function postHandler(request: NextRequest) {
  try {
    await connectMongoose();
    const body = await request.json();
    const { token, password } = body;

    const reqCtx = {
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
    };

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token y nueva contraseña requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar coach con token válido y no expirado
    const coach = await Coach.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!coach) {
      logAuditEvent({
        eventType: 'PASSWORD_RESET_FAILURE',
        severity: 'warning',
        message: `Intento de reset con token inválido/expirado`,
        ...reqCtx,
        path: '/api/auth/reset-password',
        method: 'POST',
        statusCode: 400,
      });
      return NextResponse.json(
        {
          success: false,
          message: 'Token inválido o expirado. Solicita un nuevo enlace.',
        },
        { status: 400 }
      );
    }

    // Actualizar password
    const salt = await bcrypt.genSalt(10);
    coach.passwordHash = await bcrypt.hash(password, salt);
    coach.resetToken = null;
    coach.resetTokenExpiry = null;
    await coach.save();

    logAuditEvent({
      eventType: 'PASSWORD_RESET_SUCCESS',
      severity: 'info',
      message: `Contraseña restablecida exitosamente`,
      coachId: coach._id.toString(),
      ...reqCtx,
      path: '/api/auth/reset-password',
      method: 'POST',
      statusCode: 200,
    });

    logger.info('AUTH', 'Contraseña restablecida exitosamente', {
      coachId: coach._id.toString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.',
    });
    } catch (error: unknown) {
    logger.error('AUTH', 'Error en reset-password', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

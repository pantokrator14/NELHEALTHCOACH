import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Coach, { hashEmail } from '@/app/models/Coach';
import { logger } from '@/app/lib/logger';
import { EmailService } from '@/app/lib/email-service';
import { generatePasswordResetHTML } from '@/app/lib/email-templates';
import { connectMongoose } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

async function postHandler(request: NextRequest) {
  try {
    await connectMongoose();
    const body = await request.json();
    const { email } = body;

    const reqCtx = {
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
    };

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email requerido' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const emailHash = hashEmail(emailLower);

    const coach = await Coach.findOne({ emailHash });

    if (!coach || !coach.isActive) {
      // No revelar si el email existe o no (seguridad por oscuridad)
      logAuditEvent({
        eventType: 'PASSWORD_RESET_REQUEST',
        severity: 'info',
        message: `Solicitud de reset para email no encontrado/inactivo: ${emailLower}`,
        actorEmail: emailLower,
        ...reqCtx,
        path: '/api/auth/forgot-password',
        method: 'POST',
      });
      return NextResponse.json({
        success: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación.',
      });
    }

    // Generar token de reseteo
    const resetToken = crypto.randomBytes(32).toString('hex');
    coach.resetToken = resetToken;
    coach.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora
    await coach.save();

    logAuditEvent({
      eventType: 'PASSWORD_RESET_REQUEST',
      severity: 'info',
      message: `Token de reset generado para coach`,
      coachId: coach._id.toString(),
      actorEmail: emailLower,
      ...reqCtx,
      path: '/api/auth/forgot-password',
      method: 'POST',
      metadata: { tokenExpiry: '1h' },
    });

    // Enviar email
    try {
      const emailService = EmailService.getInstance();
      const appUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

      await emailService.sendEmail({
        to: [decrypt(coach.email)],
        subject: 'Recuperación de contraseña - NELHEALTHCOACH',
        htmlBody: generatePasswordResetHTML({
          coachName: decrypt(coach.firstName),
          resetUrl,
        }),
      });

      logger.info('AUTH', 'Email de recuperación enviado', {
        coachId: coach._id.toString(),
      });
    } catch (emailError) {
      logger.error('AUTH', 'Error enviando email de recuperación', emailError as Error);
    }

    return NextResponse.json({
      success: true,
      message:
        'Si el email está registrado, recibirás un enlace de recuperación.',
    });
    } catch (error: unknown) {
    logger.error('AUTH', 'Error en forgot-password', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

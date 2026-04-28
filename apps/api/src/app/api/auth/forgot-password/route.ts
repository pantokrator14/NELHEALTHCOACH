import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Coach, { hashEmail } from '@/app/models/Coach';
import { logger } from '@/app/lib/logger';
import { EmailService } from '@/app/lib/email-service';
import { generatePasswordResetHTML } from '@/app/lib/email-templates';
import { connectMongoose } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    await connectMongoose();
    const body = await request.json();
    const { email } = body;

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

    // Enviar email
    try {
      const emailService = EmailService.getInstance();
      const appUrl = process.env.APP_URL || 'https://dashboard.nelhealthcoach.com';
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

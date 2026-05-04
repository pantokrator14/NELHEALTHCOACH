import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Coach, { hashEmail } from '@/app/models/Coach';
import { EmailService } from '@/app/lib/email-service';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';

/**
 * POST /api/auth/resend-verification
 *
 * Reenvía el enlace de verificación al email del coach.
 * Solo funciona si el coach existe y aún no ha verificado su email.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose();
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email es requerido' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const emailHashVal = hashEmail(emailLower);
    const coach = await Coach.findOne({ emailHash: emailHashVal });

    // Por seguridad, siempre retornamos éxito aunque el coach no exista
    // o ya esté verificado, para no revelar información.
    if (!coach || coach.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Si el email existe y no está verificado, recibirás un enlace.',
      });
    }

    // Generar nuevo token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    coach.verificationToken = verificationToken;
    await coach.save();

    // Construir URL de verificación
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    // Enviar email al email en texto plano (el que envió el usuario)
    const emailService = EmailService.getInstance();
    await emailService.sendEmail({
      to: [emailLower],
      subject: 'NELHealthCoach - Verifica tu email',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Verifica tu email</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Haz clic en el botón de abajo para verificar tu dirección de email y activar tu cuenta de coach.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #2563eb; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Verificar Email</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">O copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">${verifyUrl}</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      `,
    }).catch((err) => {
      logger.warn('AUTH', 'Error enviando email de verificación', err);
    });

    logger.info('AUTH', 'Enlace de verificación reenviado', {
      email: coach.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Enlace de verificación reenviado.',
    });
  } catch (error: unknown) {
    logger.error('AUTH', 'Error en resend-verification', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

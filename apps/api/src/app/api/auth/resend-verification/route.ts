import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Coach, { hashEmail } from '@/app/models/Coach';
import { EmailService } from '@/app/lib/email-service';
import { logger } from '@/app/lib/logger';
import { decrypt } from '@/app/lib/encryption';
import { connectMongoose } from '@/app/lib/database';
import { apiHandler } from '@/app/lib/apiHandler';
import { generateVerificationEmailHTML } from '@/app/lib/email-templates';

/**
 * POST /api/auth/resend-verification
 *
 * Reenvía el enlace de verificación al email del coach.
 * Si ya existe un token pendiente, lo REUTILIZA (no invalida el anterior).
 */
async function postHandler(request: NextRequest) {
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

    // Reutilizar token existente si ya hay uno pendiente
    // Así el enlace del email anterior SEGUIRÁ FUNCIONANDO
    const verificationToken = coach.verificationToken || crypto.randomBytes(32).toString('hex');
    if (!coach.verificationToken) {
      coach.verificationToken = verificationToken;
      await coach.save();
    }

    // Obtener nombre del coach para personalizar el email
    let coachName = 'Coach';
    try {
      if (coach.firstName) {
        coachName = decrypt(coach.firstName as string);
      }
    } catch {
      coachName = 'Coach';
    }

    // Construir URL de verificación
    const appUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    // Enviar email con la plantilla moderna
    const emailService = EmailService.getInstance();
    await emailService.sendEmail({
      to: [emailLower],
      subject: 'NELHealthCoach - Verifica tu email',
      htmlBody: generateVerificationEmailHTML({
        coachName,
        verifyUrl,
      }),
    }).catch((err) => {
      logger.warn('AUTH', 'Error enviando email de verificación', err);
    });

    logger.info('AUTH', 'Enlace de verificación reenviado', {
      email: coach.email,
      reusedToken: !!coach.verificationToken,
    });

    return NextResponse.json({
      success: true,
      message: 'Enlace de verificación reenviado.',
    });
  } catch (error: unknown) {
    logger.error('AUTH', 'Error en resend-verification', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message })
      },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

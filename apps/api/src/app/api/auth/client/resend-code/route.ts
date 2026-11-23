import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { emailHashVariants } from '@/app/models/Coach';
import ClientAccount, { hashVerificationCode } from '@/app/models/ClientAccount';
import { clientResendCodeSchema } from '@/app/lib/schemas/index';
import { secureRoute, requireServiceAvailable } from '@/app/lib/security/routeGuard';
import { apiHandler } from '@/app/lib/apiHandler';
import { EmailService } from '@/app/lib/email-service';
import {
  generateVerificationCodeEmailHTML,
  generateVerificationCodeEmailText,
} from '@/app/lib/email-templates';
import { logger } from '@/app/lib/logger';

const CODE_EXPIRES_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60 * 1000;

async function resendClientCodeHandler(request: NextRequest) {
  const serviceCheck = await requireServiceAvailable();
  if (serviceCheck) return serviceCheck;

  const body = await request.json();

  const rateResult = await secureRoute(request, body);
  if (!rateResult.passed) {
    return NextResponse.json(
      {
        success: false,
        message: rateResult.message || 'Demasiados intentos. Intenta más tarde.',
        code: rateResult.statusCode === 503 ? 'INTERNAL' : 'RATE_LIMITED',
      },
      { status: rateResult.statusCode || 429 }
    );
  }

  const parsed = clientResendCodeSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        message: firstError?.message ?? 'Email inválido',
        code: 'VALIDATION',
      },
      { status: 400 }
    );
  }

  const emailLower = parsed.data.email.toLowerCase().trim();
  const account = await ClientAccount.findOne({
    emailHash: { $in: emailHashVariants(emailLower) },
  });

  if (!account) {
    return NextResponse.json({
      success: true,
      message: 'Si el correo está pendiente de verificación, enviaremos un nuevo código.',
    });
  }

  if (account.emailVerified) {
    return NextResponse.json(
      {
        success: false,
        message: 'Esta cuenta ya está verificada. Ya puedes iniciar sesión.',
        code: 'ALREADY_VERIFIED',
      },
      { status: 400 }
    );
  }

  if (account.verificationLastSentAt) {
    const elapsed = Date.now() - account.verificationLastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Espera ${waitSeconds} segundos antes de solicitar un nuevo código.`,
          code: 'COOLDOWN',
        },
        { status: 429 }
      );
    }
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  account.verificationCodeHash = hashVerificationCode(emailLower, otpCode);
  account.verificationCodeExpiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);
  account.verificationCodeAttempts = 0;
  account.verificationLastSentAt = new Date();
  await account.save();

  try {
    const emailService = EmailService.getInstance();
    await emailService.sendEmail({
      to: [emailLower],
      subject: '🔐 Nuevo código de verificación — NELHEALTHCOACH',
      htmlBody: generateVerificationCodeEmailHTML({
        code: otpCode,
        expiresMinutes: CODE_EXPIRES_MINUTES,
      }),
      textBody: generateVerificationCodeEmailText({
        code: otpCode,
        expiresMinutes: CODE_EXPIRES_MINUTES,
      }),
    });
  } catch (emailError) {
    logger.error('AUTH', 'Error reenviando código OTP', emailError as Error);
  }

  return NextResponse.json({
    success: true,
    message: 'Hemos enviado un nuevo código de 6 dígitos a tu correo.',
    data: {
      email: emailLower,
      expiresInMinutes: CODE_EXPIRES_MINUTES,
    },
  });
}

export const POST = apiHandler(resendClientCodeHandler);

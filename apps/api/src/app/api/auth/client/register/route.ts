import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Coach, { hashEmail, emailHashVariants } from '@/app/models/Coach';
import ClientAccount, { hashVerificationCode } from '@/app/models/ClientAccount';
import { encrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import { clientRegisterSchema } from '@/app/lib/schemas/index';
import { secureRoute, requireServiceAvailable } from '@/app/lib/security/routeGuard';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';
import { resolveDefaultCoach } from '@/app/lib/default-coach';
import { EmailService } from '@/app/lib/email-service';
import {
  generateVerificationCodeEmailHTML,
  generateVerificationCodeEmailText,
} from '@/app/lib/email-templates';

const CODE_EXPIRES_MINUTES = 15;

function generateSixDigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const emailService = EmailService.getInstance();
  await emailService.sendEmail({
    to: [email],
    subject: '🔐 Código de verificación — NELHEALTHCOACH',
    htmlBody: generateVerificationCodeEmailHTML({
      code,
      expiresMinutes: CODE_EXPIRES_MINUTES,
    }),
    textBody: generateVerificationCodeEmailText({
      code,
      expiresMinutes: CODE_EXPIRES_MINUTES,
    }),
  });
}

async function registerClientHandler(request: NextRequest) {
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

  const parsed = clientRegisterSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        message: firstError?.message ?? 'Datos de registro inválidos',
        code: 'VALIDATION',
      },
      { status: 400 }
    );
  }

  const emailLower = parsed.data.email.toLowerCase().trim();
  const { password, planId } = parsed.data;

  const reqCtx = {
    ip: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
  };

  // Verificar que el email no pertenezca ya a un coach
  const existingCoach = await Coach.findOne({
    emailHash: { $in: emailHashVariants(emailLower) },
  }).lean();
  if (existingCoach) {
    return NextResponse.json(
      {
        success: false,
        message: 'Este correo ya está registrado en la plataforma. Inicia sesión para continuar.',
        code: 'CONFLICT',
      },
      { status: 409 }
    );
  }

  const existingClient = await ClientAccount.findOne({
    emailHash: { $in: emailHashVariants(emailLower) },
  });

  if (existingClient && existingClient.emailVerified) {
    return NextResponse.json(
      {
        success: false,
        message: 'Ya existe una cuenta verificada con este correo. Inicia sesión para continuar.',
        code: 'CONFLICT',
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const otpCode = generateSixDigitCode();
  const codeHash = hashVerificationCode(emailLower, otpCode);
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);
  const now = new Date();

  if (existingClient && !existingClient.emailVerified) {
    existingClient.passwordHash = passwordHash;
    existingClient.verificationCodeHash = codeHash;
    existingClient.verificationCodeExpiresAt = expiresAt;
    existingClient.verificationCodeAttempts = 0;
    existingClient.verificationLastSentAt = now;
    if (planId) {
      existingClient.selectedPlanId = planId;
    }
    await existingClient.save();

    try {
      await sendOtpEmail(emailLower, otpCode);
    } catch (emailError) {
      logger.error('AUTH', 'Error reenviando código OTP al registrar cliente', emailError as Error);
    }

    return NextResponse.json({
      success: true,
      message: 'Hemos enviado un nuevo código de 6 dígitos a tu correo.',
      data: {
        email: emailLower,
        expiresInMinutes: CODE_EXPIRES_MINUTES,
        selectedPlanId: existingClient.selectedPlanId || null,
      },
    });
  }

  const defaultCoach = await resolveDefaultCoach();

  const created = await ClientAccount.create({
    email: encrypt(emailLower),
    emailHash: hashEmail(emailLower),
    passwordHash,
    coachId: defaultCoach.coachId,
    emailVerified: false,
    verificationCodeHash: codeHash,
    verificationCodeExpiresAt: expiresAt,
    verificationCodeAttempts: 0,
    verificationLastSentAt: now,
    selectedPlanId: planId || null,
    activePlanId: null,
    purchasedPlans: [],
    healthFormId: null,
    isActive: true,
  });

  try {
    await sendOtpEmail(emailLower, otpCode);
  } catch (emailError) {
    logger.error('AUTH', 'Error enviando email de verificación OTP', emailError as Error);
  }

  logAuditEvent({
    eventType: 'REGISTER_SUCCESS',
    severity: 'info',
    message: `Cuenta de cliente creada (pendiente OTP): ${emailLower}`,
    actorEmail: emailLower,
    actorRole: 'client',
    coachId: defaultCoach.coachId,
    ...reqCtx,
    path: '/api/auth/client/register',
    method: 'POST',
    statusCode: 201,
    metadata: { clientAccountId: created._id.toString(), planId: planId || null },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Cuenta creada. Ingresa el código de 6 dígitos que enviamos a tu correo.',
      data: {
        email: emailLower,
        expiresInMinutes: CODE_EXPIRES_MINUTES,
        selectedPlanId: planId || null,
      },
    },
    { status: 201 }
  );
}

export const POST = apiHandler(registerClientHandler);

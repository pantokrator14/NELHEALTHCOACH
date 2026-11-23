import { NextRequest, NextResponse } from 'next/server';
import { emailHashVariants } from '@/app/models/Coach';
import ClientAccount, { verifyHashedCode } from '@/app/models/ClientAccount';
import { clientVerifyCodeSchema } from '@/app/lib/schemas/index';
import { secureRoute, requireServiceAvailable } from '@/app/lib/security/routeGuard';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

const MAX_ATTEMPTS = 5;

async function verifyClientCodeHandler(request: NextRequest) {
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

  const parsed = clientVerifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        message: firstError?.message ?? 'Código inválido',
        code: 'VALIDATION',
      },
      { status: 400 }
    );
  }

  const emailLower = parsed.data.email.toLowerCase().trim();
  const { code } = parsed.data;

  const account = await ClientAccount.findOne({
    emailHash: { $in: emailHashVariants(emailLower) },
  });

  if (!account) {
    return NextResponse.json(
      {
        success: false,
        message: 'Código inválido o expirado',
        code: 'VALIDATION',
      },
      { status: 400 }
    );
  }

  if (account.emailVerified) {
    return NextResponse.json({
      success: true,
      message: 'Tu correo ya estaba verificado. Ya puedes iniciar sesión.',
    });
  }

  if ((account.verificationCodeAttempts || 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      {
        success: false,
        message: 'Has superado el máximo de intentos. Solicita un nuevo código.',
        code: 'RATE_LIMITED',
      },
      { status: 429 }
    );
  }

  if (!account.verificationCodeExpiresAt || account.verificationCodeExpiresAt < new Date()) {
    return NextResponse.json(
      {
        success: false,
        message: 'El código ha expirado. Solicita uno nuevo.',
        code: 'CODE_EXPIRED',
      },
      { status: 400 }
    );
  }

  const isValid = verifyHashedCode(emailLower, code, account.verificationCodeHash);
  if (!isValid) {
    account.verificationCodeAttempts = (account.verificationCodeAttempts || 0) + 1;
    await account.save();

    return NextResponse.json(
      {
        success: false,
        message: 'Código de verificación incorrecto.',
        code: 'INVALID_CODE',
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - account.verificationCodeAttempts),
      },
      { status: 400 }
    );
  }

  account.emailVerified = true;
  account.verificationCodeHash = null;
  account.verificationCodeExpiresAt = null;
  account.verificationCodeAttempts = 0;
  await account.save();

  logAuditEvent({
    eventType: 'EMAIL_VERIFIED',
    severity: 'info',
    message: `Email de cliente verificado vía OTP: ${emailLower}`,
    actorEmail: emailLower,
    actorRole: 'client',
    coachId: account.coachId,
    ip: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
    path: '/api/auth/client/verify-code',
    method: 'POST',
    statusCode: 200,
    metadata: { clientAccountId: account._id.toString() },
  });

  return NextResponse.json({
    success: true,
    message: 'Correo verificado exitosamente. Ahora puedes iniciar sesión.',
    data: {
      email: emailLower,
      selectedPlanId: account.selectedPlanId || null,
    },
  });
}

export const POST = apiHandler(verifyClientCodeHandler);

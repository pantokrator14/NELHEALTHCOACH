import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Coach, { emailHashVariants } from '@/app/models/Coach';
import ClientAccount from '@/app/models/ClientAccount';
import { generateToken } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt } from '@/app/lib/encryption';
import { requireServiceAvailable, secureRoute } from '@/app/lib/security/routeGuard';
import { loginSchema } from '@/app/lib/schemas/index';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

// SEC-08: hash bcrypt de un password dummy (cost 10) para igualar timing de
// respuesta cuando el email no existe — previene enumeración de cuentas.
const DUMMY_BCRYPT_HASH = '$2b$10$sc6DZCaZ7kqM6w00pth7luvhAyRpf8aBzPL6DfR6UKJIGcVUyzgy2';

async function loginHandler(request: NextRequest) {
  // SEC-13: si MongoDB no está disponible, responder 503 (servicio caído)
  // con el mensaje uniforme que el frontend detecta para el toast de warning.
  const serviceCheck = await requireServiceAvailable();
  if (serviceCheck) return serviceCheck;

  const body = await request.json();

  // Rate limiting + brute force protection
  const rateResult = await secureRoute(request, body);
  if (!rateResult.passed) {
    logAuditEvent({
      eventType: 'RATE_LIMIT_HIT',
      severity: 'warning',
      message: `Rate limit en login para IP ${request.headers.get('x-forwarded-for') || 'unknown'}`,
      ip: request.headers.get('x-forwarded-for') || undefined,
      path: '/api/auth/login',
      method: 'POST',
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
    });
    return NextResponse.json(
      {
        success: false,
        message: rateResult.message || 'Demasiados intentos. Intenta más tarde.',
        code: rateResult.statusCode === 503 ? 'INTERNAL' : 'RATE_LIMITED',
      },
      { status: rateResult.statusCode || 429 },
    );
  }

  // Zod validation
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        message: firstError?.message ?? 'Email o contraseña inválidos',
        code: 'VALIDATION',
      },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const emailLower = email.toLowerCase().trim();

  const reqCtx = {
    ip: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
  };

  // 1. Buscar Coach por hash (dual: v2 HMAC + legacy sha256)
  const coach = await Coach.findOne({ emailHash: { $in: emailHashVariants(emailLower) } });

  if (coach) {
    const blockers: string[] = [];
    const extra: Record<string, boolean> = {};

    if (!coach.emailVerified) {
      blockers.push('verificar tu email');
      extra.needsEmailVerification = true;
    }

    if (!coach.isActive && coach.trialStatus === 'active') {
      if (coach.trialPaymentIntentId) {
        blockers.push('confirmar el pago de verificación de tarjeta');
        extra.needsCardVerification = true;
      } else {
        blockers.push('completar el registro con verificación de tarjeta');
        extra.needsCardVerification = true;
      }
    }

    if (coach.trialStatus === 'expired' || (coach.trialStatus === 'active' && coach.trialEndDate && new Date() > coach.trialEndDate)) {
      if (coach.trialStatus === 'active') {
        coach.trialStatus = 'expired';
        coach.isActive = false;
        await coach.save();
      }
      blockers.length = 0;
      blockers.push('Tu período de prueba gratuita ha terminado. Paga tu suscripción para continuar.');
      extra.trialExpired = true;
    }

    if (blockers.length > 0) {
      const statusCode = 403;

      logAuditEvent({
        eventType: 'LOGIN_FAILURE',
        severity: 'warning',
        message: `Login bloqueado para ${emailLower} — ${blockers[0]}`,
        actorEmail: emailLower,
        coachId: coach._id.toString(),
        ...reqCtx,
        path: '/api/auth/login',
        method: 'POST',
        statusCode,
        metadata: { blockers, ...extra },
      });

      return NextResponse.json(
        {
          success: false,
          message: extra.trialExpired
            ? blockers[0]
            : `Debes ${blockers.join(' y ')} antes de iniciar sesión.`,
          ...extra,
        },
        { status: statusCode },
      );
    }

    if (!coach.isActive) {
      logAuditEvent({
        eventType: 'LOGIN_FAILURE',
        severity: 'warning',
        message: `Login denegado — cuenta inactiva: ${emailLower}`,
        actorEmail: emailLower,
        coachId: coach._id.toString(),
        ...reqCtx,
        path: '/api/auth/login',
        method: 'POST',
        statusCode: 403,
      });

      return NextResponse.json(
        { success: false, message: 'Cuenta desactivada. Contacta al administrador.', code: 'FORBIDDEN'},
        { status: 403 },
      );
    }

    if (coach.isSuspended) {
      coach.isSuspended = false;
      await coach.save();
      logger.info('AUTH', 'Cuenta suspendida reactivada automáticamente por login', {
        coachId: coach._id.toString(),
      });
      logAuditEvent({
        eventType: 'ACCOUNT_REACTIVATE',
        severity: 'info',
        message: `Cuenta reactivada automáticamente por login: ${emailLower}`,
        coachId: coach._id.toString(),
        actorEmail: emailLower,
        ...reqCtx,
        path: '/api/auth/login',
        method: 'POST',
      });
    }

    const isMatch = await bcrypt.compare(password, coach.passwordHash);
    if (isMatch) {
      const token = generateToken({
        coachId: coach._id.toString(),
        email: emailLower,
        role: coach.role,
      });

      logAuditEvent({
        eventType: 'LOGIN_SUCCESS',
        severity: 'info',
        message: `Login exitoso: ${emailLower}`,
        actorEmail: emailLower,
        coachId: coach._id.toString(),
        actorRole: coach.role,
        ...reqCtx,
        path: '/api/auth/login',
        method: 'POST',
        statusCode: 200,
      });

      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        token,
        coach: {
          id: coach._id.toString(),
          email: decrypt(coach.email),
          firstName: decrypt(coach.firstName),
          lastName: decrypt(coach.lastName),
          role: coach.role,
        },
      });
    }

    logAuditEvent({
      eventType: 'LOGIN_FAILURE',
      severity: 'warning',
      message: `Contraseña incorrecta para ${emailLower}`,
      actorEmail: emailLower,
      coachId: coach._id.toString(),
      ...reqCtx,
      path: '/api/auth/login',
      method: 'POST',
      statusCode: 401,
    });

    return NextResponse.json(
      { success: false, message: 'Credenciales inválidas', code: 'UNAUTHORIZED'},
      { status: 401 },
    );
  }

  // 2. Buscar cuenta de cliente autoregistrado (ClientAccount)
  const clientAccount = await ClientAccount.findOne({
    emailHash: { $in: emailHashVariants(emailLower) },
  });

  if (clientAccount) {
    const isClientMatch = await bcrypt.compare(password, clientAccount.passwordHash);
    if (!isClientMatch) {
      logAuditEvent({
        eventType: 'LOGIN_FAILURE',
        severity: 'warning',
        message: `Contraseña incorrecta para cliente ${emailLower}`,
        actorEmail: emailLower,
        actorRole: 'client',
        coachId: clientAccount.coachId,
        ...reqCtx,
        path: '/api/auth/login',
        method: 'POST',
        statusCode: 401,
      });

      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    if (!clientAccount.emailVerified) {
      logAuditEvent({
        eventType: 'LOGIN_FAILURE',
        severity: 'warning',
        message: `Login de cliente bloqueado — OTP pendiente: ${emailLower}`,
        actorEmail: emailLower,
        actorRole: 'client',
        coachId: clientAccount.coachId,
        ...reqCtx,
        path: '/api/auth/login',
        method: 'POST',
        statusCode: 403,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Debes verificar tu correo con el código de 6 dígitos antes de iniciar sesión.',
          needsEmailVerification: true,
          accountType: 'client',
          email: emailLower,
        },
        { status: 403 },
      );
    }

    if (!clientAccount.isActive) {
      return NextResponse.json(
        { success: false, message: 'Cuenta desactivada. Contacta al administrador.', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const token = generateToken({
      clientAccountId: clientAccount._id.toString(),
      clientId: clientAccount.healthFormId || null,
      coachId: clientAccount.coachId,
      email: emailLower,
      role: 'client',
    });

    logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      severity: 'info',
      message: `Login de cliente exitoso: ${emailLower}`,
      actorEmail: emailLower,
      actorRole: 'client',
      coachId: clientAccount.coachId,
      ...reqCtx,
      path: '/api/auth/login',
      method: 'POST',
      statusCode: 200,
      metadata: {
        clientAccountId: clientAccount._id.toString(),
        healthFormId: clientAccount.healthFormId || null,
      },
    });

    const decryptedEmail = decrypt(clientAccount.email);

    return NextResponse.json({
      success: true,
      message: 'Login exitoso',
      token,
      coach: {
        id: clientAccount._id.toString(),
        clientAccountId: clientAccount._id.toString(),
        clientId: clientAccount.healthFormId || null,
        coachId: clientAccount.coachId,
        email: decryptedEmail,
        firstName: '',
        lastName: '',
        role: 'client',
      },
      clientAccount: {
        id: clientAccount._id.toString(),
        email: decryptedEmail,
        coachId: clientAccount.coachId,
        selectedPlanId: clientAccount.selectedPlanId || null,
        activePlanId: clientAccount.activePlanId || null,
        healthFormId: clientAccount.healthFormId || null,
        purchasedPlans: clientAccount.purchasedPlans || [],
      },
    });
  }

  // 3. Email no encontrado — timing defense (SEC-08)
  await bcrypt.compare(password, DUMMY_BCRYPT_HASH);

  logAuditEvent({
    eventType: 'LOGIN_FAILURE',
    severity: 'warning',
    message: `Intento de login con email no registrado: ${emailLower}`,
    actorEmail: emailLower,
    ...reqCtx,
    path: '/api/auth/login',
    method: 'POST',
    statusCode: 401,
  });

  return NextResponse.json(
    { success: false, message: 'Credenciales inválidas', code: 'UNAUTHORIZED'},
    { status: 401 },
  );
}

export const POST = apiHandler(loginHandler);

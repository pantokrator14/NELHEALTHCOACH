import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Coach, { hashEmail } from '@/app/models/Coach';
import { generateToken } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt } from '@/app/lib/encryption';
import { connectMongoose } from '@/app/lib/database';
import { loginSchema } from '@/app/lib/schemas';
import { secureRoute } from '@/app/lib/security/routeGuard';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

const LEGACY_CREDENTIALS = {
  email: process.env.COACH_EMAIL,
  password: process.env.COACH_PASSWORD,
};

async function loginHandler(request: NextRequest) {
  await connectMongoose();
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
      { success: false, message: rateResult.message || 'Demasiados intentos. Intenta más tarde.' },
      { status: 429 },
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
      },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const emailLower = email.toLowerCase().trim();
  const emailHash = hashEmail(emailLower);

  // Extraer request context para audit logs
  const reqCtx = {
    ip: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
  };

  // 1. Buscar por hash
  const coach = await Coach.findOne({ emailHash });

  if (coach) {
    // Recolectar TODAS las razones por las que no puede iniciar sesión
    const blockers: string[] = [];
    const extra: Record<string, boolean> = {};

    // 1. Verificar email pendiente
    if (!coach.emailVerified) {
      blockers.push('verificar tu email');
      extra.needsEmailVerification = true;
    }

    // 2. Verificar si la tarjeta no ha sido verificada (trial)
    if (!coach.isActive && coach.trialStatus === 'active') {
      if (coach.trialPaymentIntentId) {
        blockers.push('confirmar el pago de verificación de tarjeta');
        extra.needsCardVerification = true;
      } else {
        blockers.push('completar el registro con verificación de tarjeta');
        extra.needsCardVerification = true;
      }
    }

    // 3. Verificar si el trial expiró
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

    // Si hay blockers, devolver el más relevante
    if (blockers.length > 0) {
      const statusCode = extra.trialExpired ? 403 : 403;

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

    // Si no está activo (caso genérico) pero no hay blockers específicos
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
        { success: false, message: 'Cuenta desactivada. Contacta al administrador.' },
        { status: 403 },
      );
    }

    // Auto-reactivar si estaba suspendido
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

    // Contraseña incorrecta
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
      { success: false, message: 'Credenciales inválidas' },
      { status: 401 },
    );
  }

  // 2. Fallback: credenciales de env vars
  if (
    LEGACY_CREDENTIALS.email &&
    LEGACY_CREDENTIALS.password &&
    emailLower === LEGACY_CREDENTIALS.email.toLowerCase().trim() &&
    password === LEGACY_CREDENTIALS.password
  ) {
    const token = generateToken({
      coachId: 'legacy-admin',
      email: LEGACY_CREDENTIALS.email,
      role: 'admin',
    });

    logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      severity: 'info',
      message: `Login exitoso (legacy admin): ${emailLower}`,
      actorEmail: emailLower,
      actorRole: 'admin',
      ...reqCtx,
      path: '/api/auth/login',
      method: 'POST',
      statusCode: 200,
    });

    return NextResponse.json({
      success: true,
      message: 'Login exitoso (modo heredado)',
      token,
      coach: {
        id: 'legacy-admin',
        email: LEGACY_CREDENTIALS.email,
        firstName: 'Admin',
        lastName: '',
        role: 'admin',
      },
    });
  }

  // Email no encontrado
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
    { success: false, message: 'Credenciales inválidas' },
    { status: 401 },
  );
}

export const POST = apiHandler(loginHandler);

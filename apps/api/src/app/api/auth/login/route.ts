import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Coach, { hashEmail } from '@/app/models/Coach';
import { generateToken } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt } from '@/app/lib/encryption';
import { connectMongoose } from '@/app/lib/database';
import { loginSchema } from '@/app/lib/schemas';

const LEGACY_CREDENTIALS = {
  email: process.env.COACH_EMAIL,
  password: process.env.COACH_PASSWORD,
};

export async function POST(request: NextRequest) {
  try {
    await connectMongoose();
    const body = await request.json();

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
          // Tiene payment intent pero la cuenta no se activó (webhook pendiente? monto $0?)
          blockers.push('confirmar el pago de verificación de tarjeta');
          extra.needsCardVerification = true;
        } else {
          // No tiene payment intent, nunca llegó a Stripe
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
        blockers.length = 0; // Limpiar blockers previos, la expiración es lo principal
        blockers.push('Tu período de prueba gratuita ha terminado. Paga tu suscripción para continuar.');
        extra.trialExpired = true;
      }

      // Si hay blockers, devolver el más relevante
      if (blockers.length > 0) {
        const message = blockers.length === 1
          ? blockers[0]
          : `Debes ${blockers.slice(0, -1).join(', ')} y ${blockers[blockers.length - 1]} antes de iniciar sesión.`;

        const statusCode = extra.trialExpired ? 403 : 403;
        return NextResponse.json(
          {
            success: false,
            message: extra.trialExpired
              ? blockers[0]
              : `Debes ${blockers.join(' y ')} antes de iniciar sesión.`,
            ...extra,
          },
          { status: statusCode }
        );
      }

      // Si no está activo (caso genérico) pero no hay blockers específicos
      if (!coach.isActive) {
        return NextResponse.json(
          { success: false, message: 'Cuenta desactivada. Contacta al administrador.' },
          { status: 403 }
        );
      }

      // Auto-reactivar si estaba suspendido
      if (coach.isSuspended) {
        coach.isSuspended = false;
        await coach.save();
        logger.info('AUTH', 'Cuenta suspendida reactivada automáticamente por login', {
          coachId: coach._id.toString(),
        });
      }

      const isMatch = await bcrypt.compare(password, coach.passwordHash);
      if (isMatch) {
        const token = generateToken({
          coachId: coach._id.toString(),
          email: emailLower,
          role: coach.role,
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

      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401 }
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

    return NextResponse.json(
      { success: false, message: 'Credenciales inválidas' },
      { status: 401 }
    );
  } catch (error: unknown) {
    logger.error('AUTH', 'Error en login', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://app.nelhealthcoach.com',
  ];

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':
        origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

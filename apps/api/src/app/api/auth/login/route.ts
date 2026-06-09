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
      if (!coach.isActive) {
        // Si está inactivo por trial no verificado, dar mensaje específico
        if (coach.trialStatus === 'active' && coach.trialPaymentIntentId) {
          return NextResponse.json(
            { success: false, message: 'Debes verificar tu tarjeta para activar tu cuenta. Revisa tu proceso de registro.', needsCardVerification: true },
            { status: 403 }
          );
        }
        // Si el trial expiró
        if (coach.trialStatus === 'expired' || (coach.trialStatus === 'active' && coach.trialEndDate && new Date() > coach.trialEndDate)) {
          // Marcar como expirado si es necesario
          if (coach.trialStatus === 'active') {
            coach.trialStatus = 'expired';
            coach.isActive = false;
            await coach.save();
          }
          return NextResponse.json(
            { success: false, message: 'Tu período de prueba gratuita ha terminado. Paga tu suscripción para continuar o tu cuenta será eliminada.', trialExpired: true },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { success: false, message: 'Cuenta desactivada. Contacta al administrador.' },
          { status: 403 }
        );
      }

      if (!coach.emailVerified) {
        return NextResponse.json(
          { success: false, message: 'Debes verificar tu email antes de iniciar sesión.' },
          { status: 403 }
        );
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

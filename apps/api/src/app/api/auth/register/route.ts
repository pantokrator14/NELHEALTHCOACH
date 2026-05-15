import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Coach, { hashEmail } from '@/app/models/Coach';
import { generateToken } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { EmailService } from '@/app/lib/email-service';
import { encrypt } from '@/app/lib/encryption';
import { connectMongoose } from '@/app/lib/database';
import { registerSchema } from '@/app/lib/schemas';
import {
  generateVerificationEmailHTML,
} from '@/app/lib/email-templates';

function encryptPhoto(photo: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!photo) return null;
  return {
    url: encrypt(String(photo.url || '')),
    key: encrypt(String(photo.key || '')),
    name: encrypt(String(photo.name || '')),
    type: encrypt(String(photo.type || '')),
    size: photo.size as number,
    uploadedAt: String(photo.uploadedAt || ''),
  };
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose();
    const body = await request.json();
    const { firstName, lastName, email, phone, password } = body;

    // Zod validation
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, message: firstError?.message ?? 'Datos de registro inválidos' },
        { status: 400 },
      );
    }

    const {
      firstName: validFirstName,
      lastName: validLastName,
      email: validEmail,
      phone: validPhone,
      password: validPassword,
    } = parsed.data;

    const emailLower = validEmail.toLowerCase().trim();
    const emailHash = hashEmail(emailLower);

    // Verificar si ya existe por hash
    const existingCoach = await Coach.findOne({ emailHash });
    if (existingCoach) {
      return NextResponse.json(
        { success: false, message: 'Ya existe una cuenta con este email' },
        { status: 409 }
      );
    }

    // Protección: solo puede existir un admin (el creado por init-admin)
    // Los nuevos registros siempre son role 'coach'
    const salt = await bcrypt.genSalt(10);

    // Verificar que no se intente suplantar al admin
    const adminEmailHash = process.env.ADMIN_EMAIL
      ? hashEmail(process.env.ADMIN_EMAIL.toLowerCase().trim())
      : null;

    if (adminEmailHash && emailHash === adminEmailHash) {
      return NextResponse.json(
        { success: false, message: 'No puedes registrarte con el email del administrador' },
        { status: 403 }
      );
    }
    const passwordHash = await bcrypt.hash(validPassword, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const coach = await Coach.create({
      email: encrypt(emailLower),
      emailHash,
      passwordHash,
      firstName: encrypt(validFirstName.trim()),
      lastName: encrypt(validLastName.trim()),
      phone: validPhone ? encrypt(validPhone) : '',
      role: 'coach',
      emailVerified: false,
      verificationToken,
      isActive: true,
    });

    logger.info('AUTH', 'Nuevo coach registrado', {
      coachId: coach._id.toString(),
    });

    try {
      const emailService = EmailService.getInstance();
      const appUrl = process.env.APP_URL || 'https://dashboard.nelhealthcoach.com';
      const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

      await emailService.sendEmail({
        to: [emailLower],
        subject: 'Verifica tu cuenta - NELHEALTHCOACH',
        htmlBody: generateVerificationEmailHTML({
          coachName: validFirstName,
          verifyUrl,
        }),
      });
    } catch (emailError) {
      logger.error('AUTH', 'Error enviando email de verificación', emailError as Error);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Cuenta creada exitosamente. Revisa tu email para verificar tu cuenta.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    logger.error('AUTH', 'Error en registro', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

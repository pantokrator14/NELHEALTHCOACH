import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Coach, { hashEmail } from '@/app/models/Coach';
import { generateToken } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { EmailService } from '@/app/lib/email-service';
import { encrypt } from '@/app/lib/encryption';
import { connectMongoose } from '@/app/lib/database';
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

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Nombre, apellido, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
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
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const coach = await Coach.create({
      email: encrypt(emailLower),
      emailHash,
      passwordHash,
      firstName: encrypt(firstName.trim()),
      lastName: encrypt(lastName.trim()),
      phone: phone ? encrypt(phone) : '',
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
          coachName: firstName,
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

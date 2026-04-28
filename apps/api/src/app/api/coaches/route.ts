import { NextRequest, NextResponse } from 'next/server';
import Coach from '@/app/models/Coach';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt } from '@/app/lib/encryption';
import { connectMongoose } from '@/app/lib/database';

function decryptPhoto(photo: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!photo || !photo.url) return null;
  const urlRaw = String(photo.url);
  const keyRaw = String(photo.key || '');
  const nameRaw = String(photo.name || '');
  const typeRaw = String(photo.type || '');
  return {
    url: decrypt(urlRaw),
    key: keyRaw && keyRaw.startsWith('U2FsdGVkX1') ? decrypt(keyRaw) : keyRaw,
    name: nameRaw && nameRaw.startsWith('U2FsdGVkX1') ? decrypt(nameRaw) : nameRaw,
    type: typeRaw && typeRaw.startsWith('U2FsdGVkX1') ? decrypt(typeRaw) : typeRaw,
    size: Number(photo.size) || 0,
    uploadedAt: String(photo.uploadedAt || ''),
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose();
    const auth = requireCoachAuth(request);

    if (auth.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }

    const coaches = await Coach.find({})
      .select('-passwordHash -verificationToken -resetToken -resetTokenExpiry -emailHash')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: coaches.map((c) => ({
        id: (c._id as { toString(): string }).toString(),
        email: decrypt(c.email),
        firstName: decrypt(c.firstName),
        lastName: decrypt(c.lastName),
        phone: c.phone ? decrypt(c.phone) : '',
        profilePhoto: decryptPhoto(c.profilePhoto as unknown as Record<string, unknown> | null),
        role: c.role,
        emailVerified: c.emailVerified,
        isActive: c.isActive,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }
    logger.error('AUTH', 'Error listando coaches', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}

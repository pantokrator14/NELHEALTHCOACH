// apps/api/src/app/lib/default-coach.ts
// Resuelve el coach principal por defecto (Manuel Martínez) para clientes autoregistrados.
import Coach from '@/app/models/Coach';
import { connectMongoose } from '@/app/lib/database';
import { decrypt, decryptFileObject } from '@/app/lib/encryption';

export interface ResolvedCoachInfo {
  coachId: string;
  coachName: string;
  coachEmail: string;
  coachPhone: string;
  coachPhotoUrl: string | null;
}

export async function resolveDefaultCoach(): Promise<ResolvedCoachInfo> {
  await connectMongoose();

  const envCoachId = process.env.DEFAULT_CLIENT_COACH_ID?.trim();
  let coach = envCoachId
    ? await Coach.findById(envCoachId).lean() as Record<string, unknown> | null
    : null;

  if (!coach) {
    coach = await Coach.findOne({ role: 'admin', isActive: true })
      .sort({ createdAt: 1 })
      .lean() as Record<string, unknown> | null;
  }

  if (!coach) {
    coach = await Coach.findOne({ isActive: true })
      .sort({ createdAt: 1 })
      .lean() as Record<string, unknown> | null;
  }

  if (!coach || !coach._id) {
    throw new Error('No hay un coach administrador activo disponible para asignar clientes');
  }

  const firstName = coach.firstName ? decrypt(String(coach.firstName)) : 'Manuel';
  const lastName = coach.lastName ? decrypt(String(coach.lastName)) : 'Martínez';
  const coachEmail = coach.email ? decrypt(String(coach.email)) : 'contact@nelhealthcoach.com';
  const coachPhone = coach.phone ? decrypt(String(coach.phone)) : '';

  let coachPhotoUrl: string | null = null;
  if (coach.profilePhoto) {
    try {
      const decryptedPhoto = decryptFileObject(coach.profilePhoto as Record<string, unknown>);
      coachPhotoUrl = decryptedPhoto?.url || null;
    } catch {
      coachPhotoUrl = null;
    }
  }

  return {
    coachId: coach._id.toString(),
    coachName: `${firstName} ${lastName}`.trim(),
    coachEmail,
    coachPhone,
    coachPhotoUrl,
  };
}

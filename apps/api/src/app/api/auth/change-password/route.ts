import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Coach from '@/app/models/Coach';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';

export async function POST(request: NextRequest) {
  try {
    await connectMongoose();
    const auth = requireCoachAuth(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Contraseña actual y nueva son requeridas' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres',
        },
        { status: 400 }
      );
    }

    const coach = await Coach.findById(auth.coachId);
    if (!coach) {
      return NextResponse.json(
        { success: false, message: 'Coach no encontrado' },
        { status: 404 }
      );
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, coach.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'La contraseña actual es incorrecta' },
        { status: 400 }
      );
    }

    // Actualizar contraseña
    const salt = await bcrypt.genSalt(10);
    coach.passwordHash = await bcrypt.hash(newPassword, salt);
    await coach.save();

    logger.info('AUTH', 'Contraseña actualizada', {
      coachId: coach._id.toString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
    } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    logger.error('AUTH', 'Error cambiando contraseña', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

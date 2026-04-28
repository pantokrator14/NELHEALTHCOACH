import { NextRequest, NextResponse } from 'next/server';
import EditProposal from '@/app/models/EditProposal';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { ObjectId } from 'mongodb';
import { connectMongoose } from '@/app/lib/database';

// GET: Listar propuestas de edición
export async function GET(request: NextRequest) {
  try {
    await connectMongoose();
    const auth = requireCoachAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const targetType = searchParams.get('targetType'); // 'recipe' | 'exercise' (opcional)
    const status = searchParams.get('status'); // 'pending' | 'approved' | 'rejected' (opcional)

    const filter: Record<string, unknown> = {};

    // Admin ve todas, coach ve solo las suyas
    if (auth.role !== 'admin') {
      filter.proposedBy = new ObjectId(auth.coachId);
    }

    if (targetType) {
      filter.targetType = targetType;
    }

    if (status) {
      filter.status = status;
    }

    const proposals = await EditProposal.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: proposals.map((p) => ({
        ...p,
        id: (p as Record<string, unknown>)._id?.toString(),
      })),
    });
    } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    logger.error('OTHER', 'Error listando propuestas', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nueva propuesta de edición
export async function POST(request: NextRequest) {
  try {
    await connectMongoose();
    const auth = requireCoachAuth(request);
    const body = await request.json();
    const { targetType, targetId, proposedChanges } = body;

    if (!targetType || !targetId || !proposedChanges) {
      return NextResponse.json(
        {
          success: false,
          message: 'targetType, targetId y proposedChanges son requeridos',
        },
        { status: 400 }
      );
    }

    if (!['recipe', 'exercise'].includes(targetType)) {
      return NextResponse.json(
        { success: false, message: 'targetType debe ser "recipe" o "exercise"' },
        { status: 400 }
      );
    }

    // El admin puede editar directamente, no necesita propuesta
    // (esto se maneja en las rutas de recipes/exercises, aquí permitimos por si acaso)

    const proposal = await EditProposal.create({
      targetType,
      targetId: new ObjectId(targetId),
      proposedChanges,
      proposedBy: new ObjectId(auth.coachId),
      proposedByName: `${auth.email}`,
      status: 'pending',
    });

    logger.info('OTHER', 'Propuesta creada', {
      proposalId: proposal._id.toString(),
      targetType,
      targetId,
      coachId: auth.coachId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Propuesta de edición enviada para aprobación',
        data: {
          id: proposal._id.toString(),
          targetType: proposal.targetType,
          targetId: proposal.targetId.toString(),
          status: proposal.status,
        },
      },
      { status: 201 }
    );
    } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    logger.error('OTHER', 'Error creando propuesta', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

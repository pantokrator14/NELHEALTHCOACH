import { NextRequest, NextResponse } from 'next/server';
import EditProposal from '@/app/models/EditProposal';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { getRecipesCollection, getExerciseCollection, connectMongoose } from '@/app/lib/database';
import { ObjectId } from 'mongodb';

// PUT: Aprobar o rechazar propuesta (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose();
    const auth = requireCoachAuth(request);

    if (auth.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Solo el administrador puede aprobar o rechazar propuestas' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'action debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    const proposal = await EditProposal.findById(id);

    if (!proposal) {
      return NextResponse.json(
        { success: false, message: 'Propuesta no encontrada' },
        { status: 404 }
      );
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Esta propuesta ya fue procesada' },
        { status: 400 }
      );
    }

    proposal.reviewedBy = new ObjectId(auth.coachId);
    proposal.reviewedByName = auth.email;
    proposal.reviewNotes = reviewNotes || '';

    if (action === 'approve') {
      // Aplicar cambios al target
      if (proposal.targetType === 'recipe') {
        const collection = await getRecipesCollection();
        await collection.updateOne(
          { _id: new ObjectId(proposal.targetId) },
          { $set: proposal.proposedChanges as Record<string, unknown> }
        );
      } else if (proposal.targetType === 'exercise') {
        const collection = await getExerciseCollection();
        await collection.updateOne(
          { _id: new ObjectId(proposal.targetId) },
          { $set: proposal.proposedChanges as Record<string, unknown> }
        );
      }

      proposal.status = 'approved';
      logger.info('OTHER', 'Propuesta aprobada', {
        proposalId: id,
        targetType: proposal.targetType,
        targetId: proposal.targetId.toString(),
      });
    } else {
      proposal.status = 'rejected';
      logger.info('OTHER', 'Propuesta rechazada', {
        proposalId: id,
        targetType: proposal.targetType,
      });
    }

    await proposal.save();

    return NextResponse.json({
      success: true,
      message:
        action === 'approve'
          ? 'Propuesta aprobada y cambios aplicados'
          : 'Propuesta rechazada',
    });
    } catch (error: unknown) {
    if ((error as Error).message?.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    logger.error('OTHER', 'Error procesando propuesta', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import EditProposal from '@/app/models/EditProposal';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { getRecipesCollection, getExerciseCollection, connectMongoose } from '@/app/lib/database';
import { ObjectId } from 'mongodb';
import { S3Service } from '@/app/lib/s3';
import { decrypt } from '@/app/lib/encryption';

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

    if (action === 'approve') {
      proposal.reviewedBy = new ObjectId(auth.coachId);
      proposal.reviewedByName = auth.email;
      proposal.reviewNotes = reviewNotes || '';

      if (proposal.proposalType === 'creation') {
        // Propuesta de creación: solo publicar el item (isPublished → true)
        const update = { $set: { isPublished: true } };
        if (proposal.targetType === 'recipe') {
          const collection = await getRecipesCollection();
          await collection.updateOne(
            { _id: new ObjectId(proposal.targetId) },
            update
          );
        } else if (proposal.targetType === 'exercise') {
          const collection = await getExerciseCollection();
          await collection.updateOne(
            { _id: new ObjectId(proposal.targetId) },
            update
          );
        }
      } else {
        // Propuesta de edición: aplicar cambios (comportamiento actual)
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
      }

      proposal.status = 'approved';
      await proposal.save();

      logger.info('OTHER', 'Propuesta aprobada', {
        proposalId: id,
        targetType: proposal.targetType,
        targetId: proposal.targetId.toString(),
        proposalType: proposal.proposalType,
      });

      return NextResponse.json({
        success: true,
        message:
          proposal.proposalType === 'creation'
            ? 'Creación aprobada y publicada'
            : 'Propuesta aprobada y cambios aplicados',
      });
    }

    // ─── RECHAZAR: eliminar propuesta (y el item si es creación) ───
    if (action === 'reject') {
      // Si es propuesta de creación, eliminar también el item creado
      if (proposal.proposalType === 'creation') {
        try {
          if (proposal.targetType === 'exercise') {
            const collection = await getExerciseCollection();
            const item = await collection.findOne({ _id: new ObjectId(proposal.targetId) });
            if (item) {
              // Limpiar demo de S3 si existe
              if (item.demo?.key) {
                try {
                  let fileKey = item.demo.key;
                  if (typeof fileKey === 'string' && fileKey.startsWith('U2FsdGVkX1')) {
                    fileKey = decrypt(fileKey);
                  }
                  if (fileKey) {
                    await S3Service.deleteFile(fileKey);
                  }
                } catch (s3Error) {
                  logger.warn('PROPOSAL', 'Error eliminando demo de S3 al rechazar creación', s3Error as Error);
                }
              }
              await collection.deleteOne({ _id: new ObjectId(proposal.targetId) });
            }
          } else if (proposal.targetType === 'recipe') {
            const collection = await getRecipesCollection();
            const item = await collection.findOne({ _id: new ObjectId(proposal.targetId) });
            if (item) {
              // Limpiar imagen de S3 si existe
              if (item.image?.key) {
                try {
                  let fileKey = item.image.key;
                  if (typeof fileKey === 'string' && fileKey.startsWith('U2FsdGVkX1')) {
                    fileKey = decrypt(fileKey);
                  }
                  if (fileKey) {
                    await S3Service.deleteFile(fileKey);
                  }
                } catch (s3Error) {
                  logger.warn('PROPOSAL', 'Error eliminando imagen de S3 al rechazar creación', s3Error as Error);
                }
              }
              await collection.deleteOne({ _id: new ObjectId(proposal.targetId) });
            }
          }
        } catch (deleteError) {
          logger.error('PROPOSAL', 'Error eliminando item al rechazar creación', deleteError as Error);
          // Continuamos para al menos eliminar la propuesta
        }
      }

      // Eliminar la propuesta definitivamente
      await EditProposal.findByIdAndDelete(id);

      logger.info('OTHER', 'Propuesta rechazada y eliminada', {
        proposalId: id,
        targetType: proposal.targetType,
        proposalType: proposal.proposalType,
        targetId: proposal.targetId.toString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Propuesta rechazada y eliminada',
      });
    }

    // No debería llegar aquí
    return NextResponse.json(
      { success: false, message: 'Acción no válida' },
      { status: 400 }
    );
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

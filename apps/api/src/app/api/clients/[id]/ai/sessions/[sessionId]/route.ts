import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { encrypt } from '@/app/lib/encryption';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  return logger.time('API_AI', 'Actualizar sesión AI', async () => {
    try {
      const { id, sessionId } = await params;
      const body = await request.json();
      const { field, value } = body; // field: 'summary' | 'vision'

      if (!['summary', 'vision'].includes(field)) {
        return NextResponse.json(
          { success: false, message: 'Campo inválido' },
          { status: 400 }
        );
      }

      const collection = await getHealthFormsCollection();

      // Actualizar el campo específico dentro del array sessions
      const updateField = `aiProgress.sessions.$[session].${field}`;
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { [updateField]: encrypt(value) } },
        {
          arrayFilters: [{ 'session.sessionId': sessionId }],
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Cliente o sesión no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Campo actualizado' });
    } catch (error: any) {
      logger.error('API_AI', 'Error actualizando sesión', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
  });
}
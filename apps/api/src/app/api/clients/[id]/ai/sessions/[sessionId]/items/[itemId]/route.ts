// apps/api/src/app/api/clients/[id]/ai/sessions/[sessionId]/items/[itemId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { encrypt } from '@/app/lib/encryption';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; itemId: string }> }
) {
  return logger.time('API_AI', 'Actualizar ítem', async () => {
    try {
      const { id, sessionId, itemId } = await params;
      const body = await request.json();
      const { description, frequency, details, recipeId } = body;

      const collection = await getHealthFormsCollection();

      // Construir objeto de actualización
      const updateDoc: any = {
        $set: {}
      };

      if (description !== undefined) {
        updateDoc.$set[`aiProgress.sessions.$[session].checklist.$[item].description`] = encrypt(description);
      }
      if (frequency !== undefined) {
        updateDoc.$set[`aiProgress.sessions.$[session].checklist.$[item].frequency`] = frequency;
      }
      if (recipeId !== undefined) {
        updateDoc.$set[`aiProgress.sessions.$[session].checklist.$[item].recipeId`] = recipeId;
      }
      if (details !== undefined) {
        // Encriptar campos de details según corresponda
        const encryptedDetails: any = {};
        if (details.frequency) encryptedDetails.frequency = encrypt(details.frequency);
        if (details.duration) encryptedDetails.duration = encrypt(details.duration);
        if (details.equipment) encryptedDetails.equipment = details.equipment.map((eq: string) => encrypt(eq));
        updateDoc.$set[`aiProgress.sessions.$[session].checklist.$[item].details`] = encryptedDetails;
      }
      updateDoc.$set[`aiProgress.sessions.$[session].checklist.$[item].updatedAt`] = new Date();

      // También actualizar en las semanas (mismo itemId)
      // Para cada semana, actualizamos el ítem con el mismo ID
      // Necesitamos arrayFilters para cada nivel: sesión, luego semanas.
      // Esto es más complejo; podríamos optar por actualizar solo el checklist general y luego, al cargar, el frontend ya mostrará los cambios.
      // Pero si queremos mantener consistencia, debemos actualizar también las semanas.
      // Una alternativa es no duplicar ítems, sino tener referencias. Pero eso requeriría reestructurar.
      // Por ahora, asumimos que solo actualizamos el checklist general y confiamos en que el frontend use esos datos para mostrar.
      // Las semanas se renderizan desde el checklist general filtrado por weekNumber, así que si actualizamos el checklist general, ya se refleja en todas las semanas.
      // ¡Correcto! Porque en el frontend, `activeSession.checklist` es un array plano, y las semanas se construyen filtrando por `weekNumber`.
      // Entonces, no necesitamos actualizar las semanas por separado. Solo el checklist general.
      
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc,
        {
          arrayFilters: [
            { 'session.sessionId': sessionId },
            { 'item.id': itemId }
          ]
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Ítem no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Ítem actualizado' });
    } catch (error: any) {
      logger.error('API_AI', 'Error actualizando ítem', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; itemId: string }> }
) {
  return logger.time('API_AI', 'Eliminar ítem', async () => {
    try {
      const { id, sessionId, itemId } = await params;

      const collection = await getHealthFormsCollection();

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $pull: {
            [`aiProgress.sessions.$[session].checklist`]: { id: itemId } as any, // Aserción temporal
            },
        },
        {
            arrayFilters: [{ 'session.sessionId': sessionId }],
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Ítem no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Ítem eliminado' });
    } catch (error: any) {
      logger.error('API_AI', 'Error eliminando ítem', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { encrypt } from '@/app/lib/encryption';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  return logger.time('API_AI', 'Crear nuevo ítem en checklist', async () => {
    try {
      const { id, sessionId } = await params;
      const body = await request.json();
      const { weekNumber, category, data } = body; // data contiene description, type, frequency, recipeId, etc.

      // Validaciones básicas
      if (!weekNumber || !category || !data || !data.description) {
        return NextResponse.json(
          { success: false, message: 'Faltan datos requeridos' },
          { status: 400 }
        );
      }

      const collection = await getHealthFormsCollection();

      // Obtener la sesión actual para saber el mes y demás
      const client = await collection.findOne(
        { _id: new ObjectId(id) },
        { projection: { 'aiProgress.sessions': 1 } }
      );
      if (!client) {
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      const session = client.aiProgress?.sessions?.find(
        (s: any) => s.sessionId === sessionId
      );
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      const monthNumber = session.monthNumber;
      const now = new Date();
      const newItemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Crear el objeto del nuevo ítem (encriptando campos de texto)
      const newItem: any = {
        id: newItemId,
        description: encrypt(data.description),
        completed: false,
        weekNumber,
        category,
        type: data.type || '',
        frequency: data.frequency || 1,
        recipeId: data.recipeId || null,
        createdAt: now,
        updatedAt: now,
      };

      // Si hay detalles (para ejercicio, etc.), encriptar según corresponda
      if (data.details) {
        const encryptedDetails: any = {};
        if (data.details.frequency) encryptedDetails.frequency = encrypt(data.details.frequency);
        if (data.details.duration) encryptedDetails.duration = encrypt(data.details.duration);
        if (data.details.equipment) encryptedDetails.equipment = data.details.equipment.map((eq: string) => encrypt(eq));
        // Para receta, sería más complejo, pero en este caso si es nuevo desde BD, ya tendrá recipeId y no necesitamos details.recipe
        newItem.details = encryptedDetails;
      }

      // Debemos insertar este ítem en la semana indicada y en todas las semanas superiores (weekNumber+1 a 4)
      // También en el checklist general de la sesión.

      // Construir las actualizaciones
      const weekFields = [];
      for (let w = weekNumber; w <= 4; w++) {
        weekFields.push(`aiProgress.sessions.$[session].weeks.$[week${w}].${category}.checklistItems`);
      }

      // Usamos arrayFilters para identificar la sesión y cada semana
      const updateQuery: any = {
        $push: {}
      };
      // Agregar al checklist general
      updateQuery.$push[`aiProgress.sessions.$[session].checklist`] = newItem;

      // Agregar a cada semana
      weekFields.forEach((field, index) => {
        updateQuery.$push[field] = newItem;
      });

      const arrayFilters = [
        { 'session.sessionId': sessionId },
        ...weekFields.map((_, idx) => ({ [`week${weekNumber + idx}.weekNumber`]: weekNumber + idx }))
      ];

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        updateQuery,
        { arrayFilters }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Error al actualizar' },
          { status: 500 }
        );
      }

      // Devolver el ítem creado (ya desencriptado para el frontend)
      // Por simplicidad, devolvemos el objeto con description sin encriptar
      const responseItem = {
        ...newItem,
        description: data.description,
        details: data.details, // sin encriptar
      };

      return NextResponse.json({ success: true, data: responseItem });
    } catch (error: any) {
      logger.error('API_AI', 'Error creando ítem', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
  });
}
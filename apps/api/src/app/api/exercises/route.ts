import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getExerciseCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { encrypt, decrypt, safeDecrypt } from '@/app/lib/encryption';

// GET: Obtener ejercicios
export async function GET(request: NextRequest) {
  return logger.time('EXERCISES', 'Obtener ejercicios', async () => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const query = searchParams.get('search') || '';
      const mode = searchParams.get('mode') || 'full';

      const collection = await getExerciseCollection();
      const exercises = await collection.find({}).toArray();

      const decryptedExercises = exercises.map((ex) => {
        const demoRaw = ex.demo as Record<string, unknown> | undefined;
        return {
          id: ex._id.toString(),
          name: safeDecrypt(ex.name),
          description: safeDecrypt(ex.description),
          category: ex.category.map((c: string) => safeDecrypt(c)),
          instructions: ex.instructions.map((i: string) => safeDecrypt(i)),
          equipment: ex.equipment.map((e: string) => safeDecrypt(e)),
          difficulty: safeDecrypt(ex.difficulty),
          clientLevel: safeDecrypt(ex.clientLevel),
          muscleGroups: ex.muscleGroups.map((m: string) => safeDecrypt(m)),
          contraindications: (ex.contraindications || []).map((c: string) => safeDecrypt(c)),
          sets: ex.sets,
          repetitions: safeDecrypt(ex.repetitions),
          timeUnderTension: safeDecrypt(ex.timeUnderTension),
          restBetweenSets: safeDecrypt(ex.restBetweenSets),
          progression: safeDecrypt(ex.progression),
          demo: demoRaw ? {
            url: safeDecrypt(demoRaw.url as string),
            key: safeDecrypt(demoRaw.key as string),
            type: safeDecrypt(demoRaw.type as string),
            name: safeDecrypt(demoRaw.name as string),
            size: demoRaw.size as number,
            uploadedAt: safeDecrypt(demoRaw.uploadedAt as string),
            videoSearchUrl: safeDecrypt((demoRaw.videoSearchUrl as string) ?? ''),
          } : null,
          progressionOf: ex.progressionOf ? ex.progressionOf.toString() : null,
          progressesTo: (ex.progressesTo || []).map((id: ObjectId) => id.toString()),
          isPublished: ex.isPublished,
          tags: ex.tags.map((t: string) => safeDecrypt(t)),
          createdAt: ex.createdAt,
          updatedAt: ex.updatedAt,
        };
      });

      let results = decryptedExercises;

      if (query) {
        const searchLower = query.toLowerCase();
        results = decryptedExercises.filter((ex) =>
          ex.name.toLowerCase().includes(searchLower) ||
          ex.description.toLowerCase().includes(searchLower) ||
          ex.category.some((c: string) => c.toLowerCase().includes(searchLower)) ||
          ex.tags.some((t: string) => t.toLowerCase().includes(searchLower)) ||
          ex.muscleGroups.some((m: string) => m.toLowerCase().includes(searchLower))
        );
      }

      if (mode === 'search') {
        const searchResults = results.map((ex) => ({
          id: ex.id,
          name: ex.name,
          description: ex.description,
          demo: ex.demo,
          difficulty: ex.difficulty,
          clientLevel: ex.clientLevel,
        }));
        return NextResponse.json({ success: true, data: searchResults });
      }

      return NextResponse.json({ success: true, data: results });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('EXERCISES', 'Error al obtener ejercicios', error as Error);
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: 500 }
      );
    }
  });
}

// POST: Crear ejercicio
export async function POST(request: NextRequest) {
  return logger.time('EXERCISES', 'Crear ejercicio', async () => {
    try {
      const body = await request.json();
      const collection = await getExerciseCollection();

      const exerciseDoc = {
        name: encrypt(body.name),
        description: encrypt(body.description),
        category: body.category.map((c: string) => encrypt(c)),
        instructions: body.instructions.map((i: string) => encrypt(i)),
        equipment: body.equipment.map((e: string) => encrypt(e)),
        difficulty: encrypt(body.difficulty),
        clientLevel: encrypt(body.clientLevel),
        muscleGroups: body.muscleGroups.map((m: string) => encrypt(m)),
        contraindications: (body.contraindications || []).map((c: string) => encrypt(c)),
        sets: body.sets,
        repetitions: encrypt(body.repetitions),
        timeUnderTension: encrypt(body.timeUnderTension),
        restBetweenSets: encrypt(body.restBetweenSets),
        progression: encrypt(body.progression),
        demo: body.demo ? {
          url: encrypt(body.demo.url),
          key: encrypt(body.demo.key),
          type: encrypt(body.demo.type),
          name: encrypt(body.demo.name),
          size: body.demo.size,
          uploadedAt: encrypt(body.demo.uploadedAt),
          videoSearchUrl: body.demo.videoSearchUrl ? encrypt(body.demo.videoSearchUrl) : '',
        } : null,
        progressionOf: body.progressionOf ? new ObjectId(body.progressionOf) : null,
        progressesTo: (body.progressesTo || []).map((id: string) => new ObjectId(id)),
        isPublished: body.isPublished ?? true,
        tags: body.tags.map((t: string) => encrypt(t)),
      };

      const result = await collection.insertOne(exerciseDoc);

      return NextResponse.json({
        success: true,
        data: { id: result.insertedId.toString() },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('EXERCISES', 'Error al crear ejercicio', error as Error);
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: 500 }
      );
    }
  });
}

// PUT: Actualizar ejercicio
export async function PUT(request: NextRequest) {
  return logger.time('EXERCISES', 'Actualizar ejercicio', async () => {
    try {
      const body = await request.json();
      const { id, ...updateData } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, message: 'ID requerido' },
          { status: 400 }
        );
      }

      const collection = await getExerciseCollection();

      const encryptedUpdate: Record<string, unknown> = {};
      if (updateData.name !== undefined) encryptedUpdate.name = encrypt(updateData.name);
      if (updateData.description !== undefined) encryptedUpdate.description = encrypt(updateData.description);
      if (updateData.category !== undefined) encryptedUpdate.category = updateData.category.map((c: string) => encrypt(c));
      if (updateData.instructions !== undefined) encryptedUpdate.instructions = updateData.instructions.map((i: string) => encrypt(i));
      if (updateData.equipment !== undefined) encryptedUpdate.equipment = updateData.equipment.map((e: string) => encrypt(e));
      if (updateData.difficulty !== undefined) encryptedUpdate.difficulty = encrypt(updateData.difficulty);
      if (updateData.clientLevel !== undefined) encryptedUpdate.clientLevel = encrypt(updateData.clientLevel);
      if (updateData.muscleGroups !== undefined) encryptedUpdate.muscleGroups = updateData.muscleGroups.map((m: string) => encrypt(m));
      if (updateData.contraindications !== undefined) encryptedUpdate.contraindications = updateData.contraindications.map((c: string) => encrypt(c));
      if (updateData.sets !== undefined) encryptedUpdate.sets = updateData.sets;
      if (updateData.repetitions !== undefined) encryptedUpdate.repetitions = encrypt(updateData.repetitions);
      if (updateData.timeUnderTension !== undefined) encryptedUpdate.timeUnderTension = encrypt(updateData.timeUnderTension);
      if (updateData.restBetweenSets !== undefined) encryptedUpdate.restBetweenSets = encrypt(updateData.restBetweenSets);
      if (updateData.progression !== undefined) encryptedUpdate.progression = encrypt(updateData.progression);
      if (updateData.demo !== undefined) {
        encryptedUpdate.demo = updateData.demo ? {
          url: encrypt(updateData.demo.url),
          key: encrypt(updateData.demo.key),
          type: encrypt(updateData.demo.type),
          name: encrypt(updateData.demo.name),
          size: updateData.demo.size,
          uploadedAt: encrypt(updateData.demo.uploadedAt),
          videoSearchUrl: updateData.demo.videoSearchUrl ? encrypt(updateData.demo.videoSearchUrl) : '',
        } : null;
      }
      if (updateData.progressionOf !== undefined) encryptedUpdate.progressionOf = updateData.progressionOf ? new ObjectId(updateData.progressionOf) : null;
      if (updateData.progressesTo !== undefined) encryptedUpdate.progressesTo = updateData.progressesTo.map((id: string) => new ObjectId(id));
      if (updateData.isPublished !== undefined) encryptedUpdate.isPublished = updateData.isPublished;
      if (updateData.tags !== undefined) encryptedUpdate.tags = updateData.tags.map((t: string) => encrypt(t));

      encryptedUpdate.updatedAt = new Date();

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: encryptedUpdate }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Ejercicio no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('EXERCISES', 'Error al actualizar ejercicio', error as Error);
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: 500 }
      );
    }
  });
}

// DELETE: Eliminar ejercicios
export async function DELETE(request: NextRequest) {
  return logger.time('EXERCISES', 'Eliminar ejercicios', async () => {
    try {
      const body = await request.json();
      const { ids } = body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, message: 'IDs requeridos' },
          { status: 400 }
        );
      }

      const collection = await getExerciseCollection();
      const result = await collection.deleteMany({
        _id: { $in: ids.map((id: string) => new ObjectId(id)) },
      });

      return NextResponse.json({
        success: true,
        data: { deletedCount: result.deletedCount },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('EXERCISES', 'Error al eliminar ejercicios', error as Error);
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: 500 }
      );
    }
  });
}

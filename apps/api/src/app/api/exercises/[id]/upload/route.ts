import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getExerciseCollection } from '@/app/lib/database';
import { S3Service } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { encrypt, encryptFileObject } from '@/app/lib/encryption';
import { requireCoachAuth } from '@/app/lib/auth';

/** Verifica que el usuario sea admin o coach autenticado */
function authorizeExerciseUpload(request: NextRequest) {
  let auth;
  try {
    auth = requireCoachAuth(request);
  } catch {
    throw { status: 401, message: 'No autorizado' };
  }
  if (auth.role !== 'admin' && auth.role !== 'coach') {
    throw { status: 403, message: 'No autorizado para modificar ejercicios' };
  }
  return auth;
}

// POST: Obtener URL prefirmada para upload de imagen/video de ejercicio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return logger.time('EXERCISE_UPLOAD', 'Generar URL de upload para ejercicio', async () => {
    try {
      const { id } = await params;

      authorizeExerciseUpload(request);

      if (!id || id === 'undefined' || !ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'Exercise ID no válido' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const { fileName, fileType, fileSize } = body;

      if (!fileName || !fileType || !fileSize) {
        return NextResponse.json(
          { success: false, message: 'Faltan campos requeridos: fileName, fileType, fileSize' },
          { status: 400 },
        );
      }

      // Validar tipos permitidos (imágenes, gifs, videos)
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'video/mp4',
        'video/webm',
        'video/ogg',
      ];

      if (!allowedTypes.includes(fileType)) {
        return NextResponse.json(
          {
            success: false,
            message: `Tipo de archivo no permitido: ${fileType}. Solo se permiten imágenes, GIFs y videos`,
          },
          { status: 400 },
        );
      }

      // Validar tamaño (20MB para ejercicios — pueden ser videos)
      const maxSize = 20 * 1024 * 1024;
      if (fileSize > maxSize) {
        return NextResponse.json(
          { success: false, message: `El archivo es demasiado grande (máximo 20MB)` },
          { status: 400 },
        );
      }

      try {
        const { uploadURL, fileKey } = await S3Service.generateUploadURL(
          fileName,
          fileType,
          fileSize,
          'exercise',
        );

        logger.info('EXERCISE_UPLOAD', 'URL de upload generada', {
          fileName,
          fileType,
          fileSize,
          s3Key: fileKey,
        }, { exerciseId: id });

        let fileURL = '';
        try {
          fileURL = await S3Service.getFileURL(fileKey);
        } catch {
          // No fatal si no se puede generar la URL pública
        }

        return NextResponse.json({
          success: true,
          data: { uploadURL, fileKey, fileURL },
        });
      } catch (s3Error: any) {
        logger.error('EXERCISE_UPLOAD', 'Error generando URL de upload', s3Error, {
          fileName,
          fileType,
          fileSize,
        }, { exerciseId: id });

        return NextResponse.json(
          { success: false, message: `Error generando URL de upload: ${s3Error.message || 'Error de S3'}` },
          { status: 500 },
        );
      }
    } catch (error: any) {
      if (error?.status) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status });
      }
      logger.error('EXERCISE_UPLOAD', 'Error en POST upload', error as Error);
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 },
      );
    }
  }, {
    endpoint: `/api/exercises/${(await params).id}/upload`,
    method: 'POST',
    exerciseId: (await params).id,
  });
}

// PUT: Confirmar upload y guardar referencia en el ejercicio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return logger.time('EXERCISE_UPLOAD', 'Confirmar upload y guardar demo en ejercicio', async () => {
    try {
      const { id } = await params;

      authorizeExerciseUpload(request);

      if (!id || id === 'undefined' || !ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'Exercise ID no válido' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const { fileKey, fileName, fileType, fileSize, fileURL } = body;

      if (!fileKey || !fileName || !fileType || !fileSize) {
        return NextResponse.json(
          { success: false, message: 'Faltan campos requeridos: fileKey, fileName, fileType, fileSize' },
          { status: 400 },
        );
      }

      const collection = await getExerciseCollection();
      const exercise = await collection.findOne({ _id: new ObjectId(id) });

      if (!exercise) {
        return NextResponse.json(
          { success: false, message: 'Ejercicio no encontrado' },
          { status: 404 },
        );
      }

      const uploadedFile = {
        url: fileURL || '',
        key: fileKey,
        name: fileName,
        type: fileType,
        size: fileSize,
        uploadedAt: new Date().toISOString(),
      };

      // Eliminar demo anterior de S3 si existe y es diferente
      if (exercise.demo && exercise.demo.key) {
        try {
          let oldFileKey = exercise.demo.key;

          // Desencriptar si está encriptada
          if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
            try {
              const { decrypt } = await import('@/app/lib/encryption');
              oldFileKey = decrypt(oldFileKey);
            } catch {
              // Usar original si falla desencriptación
            }
          }

          if (oldFileKey && oldFileKey !== fileKey) {
            logger.info('EXERCISE_UPLOAD', 'Eliminando demo anterior de S3', {
              exerciseId: id,
              oldKey: oldFileKey?.substring(0, 30) + '...',
            });

            try {
              await S3Service.deleteFile(oldFileKey);
            } catch (s3Error) {
              logger.error('EXERCISE_UPLOAD', 'Error eliminando demo anterior de S3', s3Error as Error, {
                exerciseId: id,
              });
              // No fallar la operación principal
            }
          }
        } catch (error) {
          logger.error('EXERCISE_UPLOAD', 'Error en proceso de eliminación de demo anterior', error as Error, {
            exerciseId: id,
          });
        }
      }

      // Encriptar y guardar
      const encryptedDemo = encryptFileObject(uploadedFile);

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            demo: encryptedDemo,
            updatedAt: new Date(),
          },
        },
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'No se pudo actualizar el ejercicio' },
          { status: 500 },
        );
      }

      logger.info('EXERCISE_UPLOAD', 'Demo guardado exitosamente en ejercicio', {
        exerciseId: id,
        fileName,
      });

      return NextResponse.json({
        success: true,
        message: 'Demo guardado exitosamente',
        data: uploadedFile,
      });
    } catch (error: any) {
      if (error?.status) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status });
      }
      logger.error('EXERCISE_UPLOAD', 'Error guardando demo en ejercicio', error as Error);
      return NextResponse.json(
        { success: false, message: `Error interno del servidor: ${error.message}` },
        { status: 500 },
      );
    }
  }, {
    endpoint: `/api/exercises/${(await params).id}/upload`,
    method: 'PUT',
    exerciseId: (await params).id,
  });
}

// DELETE: Eliminar demo de ejercicio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return logger.time('EXERCISE_UPLOAD', 'Eliminar demo de ejercicio', async () => {
    try {
      const { id } = await params;

      authorizeExerciseUpload(request);

      if (!id || id === 'undefined' || !ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'Exercise ID no válido' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const { fileKey } = body;

      if (!fileKey) {
        return NextResponse.json(
          { success: false, message: 'fileKey es requerido' },
          { status: 400 },
        );
      }

      const collection = await getExerciseCollection();
      const exercise = await collection.findOne({ _id: new ObjectId(id) });

      if (!exercise) {
        return NextResponse.json(
          { success: false, message: 'Ejercicio no encontrado' },
          { status: 404 },
        );
      }

      // Verificar que la key coincide
      let currentFileKey = exercise.demo?.key || '';
      if (currentFileKey && typeof currentFileKey === 'string' && currentFileKey.startsWith('U2FsdGVkX1')) {
        try {
          const { decrypt } = await import('@/app/lib/encryption');
          currentFileKey = decrypt(currentFileKey);
        } catch {
          // Seguir con la key original
        }
      }

      if (currentFileKey !== fileKey) {
        return NextResponse.json(
          { success: false, message: 'El demo no corresponde a este ejercicio' },
          { status: 400 },
        );
      }

      // Eliminar de S3
      try {
        await S3Service.deleteFile(fileKey);
        logger.info('EXERCISE_UPLOAD', 'Demo eliminado de S3', { exerciseId: id });
      } catch (s3Error) {
        logger.error('EXERCISE_UPLOAD', 'Error eliminando demo de S3', s3Error as Error, {
          exerciseId: id,
        });
        // No fallar, seguir eliminando la referencia
      }

      // Limpiar referencia en MongoDB
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            demo: {
              url: '',
              key: '',
              name: '',
              type: 'placeholder' as const,
              size: 0,
              uploadedAt: '',
            },
            updatedAt: new Date(),
          },
        },
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'No se pudo actualizar el ejercicio' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Demo eliminado exitosamente',
      });
    } catch (error: any) {
      if (error?.status) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status });
      }
      logger.error('EXERCISE_UPLOAD', 'Error eliminando demo de ejercicio', error as Error);
      return NextResponse.json(
        { success: false, message: `Error interno del servidor: ${error.message}` },
        { status: 500 },
      );
    }
  }, {
    endpoint: `/api/exercises/${(await params).id}/upload`,
    method: 'DELETE',
    exerciseId: (await params).id,
  });
}

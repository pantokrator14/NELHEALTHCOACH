import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/database';
import { S3Service } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { encrypt, encryptFileObject, decrypt } from '@/app/lib/encryption';
import Recipe from '@/app/models/Recipe';

// POST: Obtener URLs para upload de imagen de receta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPE_UPLOAD', 'Generar URL de upload para receta', async () => {
    try {
      const { id } = await params;
      
      console.log('🔑 Solicitando URL de upload para receta:', id);
      
      // Validar que el recipeId es válido
      if (!id || id === 'undefined') {
        logger.warn('RECIPE_UPLOAD', 'Recipe ID no válido o undefined', undefined, { recipeId: id });
        return NextResponse.json(
          { success: false, message: 'Recipe ID no válido' },
          { status: 400 }
        );
      }

      const { fileName, fileType, fileSize } = await request.json();

      logger.info('RECIPE_UPLOAD', 'Solicitud de upload de imagen para receta', {
        fileName,
        fileType,
        fileSize
      }, { recipeId: id });

      // Validaciones de tipo de archivo (solo imágenes para recetas)
      const allowedImageTypes = [
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'image/svg+xml'
      ];

      if (!allowedImageTypes.includes(fileType)) {
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido para recetas (solo imágenes)' },
          { status: 400 }
        );
      }

      // Validar tamaño de archivo (máximo 10MB para imágenes de recetas)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return NextResponse.json(
          { success: false, message: 'La imagen es demasiado grande (máximo 10MB)' },
          { status: 400 }
        );
      }

      console.log('🔧 Llamando a S3Service.generateUploadURL...');
      // Usamos 'recipe' como categoría para la carpeta en S3
      const { uploadURL, fileKey } = await S3Service.generateUploadURL(
        fileName,
        fileType,
        fileSize,
        'recipe' // fileCategory
      );

      logger.info('RECIPE_UPLOAD', 'URL de upload generada exitosamente', {
        fileName,
        fileType,
        fileSize,
        s3Key: fileKey
      }, { recipeId: id });

      return NextResponse.json({
        success: true,
        data: {
          uploadURL,
          fileKey,
          fileURL: await S3Service.getFileURL(fileKey)
        }
      });

    } catch (error: any) {
      console.error('❌ Error en POST /recipes/[id]/upload:', error);
      logger.error('RECIPE_UPLOAD', 'Error generando URL de upload para receta', error, undefined, {
        recipeId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/recipes/${(await params).id}/upload`, method: 'POST', recipeId: (await params).id });
}

// PUT: Confirmar upload y guardar referencia de imagen en la receta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPE_UPLOAD', 'Confirmar upload y guardar imagen en receta', async () => {
    try {
      const { id } = await params;
      const { fileKey, fileName, fileType, fileSize, fileURL } = await request.json();

      await connectToDatabase();
      const recipe = await Recipe.findById(id);

      if (!recipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }

      const uploadedFile = {
        url: fileURL,
        key: fileKey,
        name: fileName,
        type: fileType,
        size: fileSize,
        uploadedAt: new Date().toISOString()
      };

      // ✅ ELIMINAR IMAGEN ANTERIOR SI EXISTE
      if (recipe.image && recipe.image.key) {
        try {
          let oldFileKey = recipe.image.key;
          
          // Desencriptar la key si está encriptada
          if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
            oldFileKey = decrypt(oldFileKey);
          }
          
          // Verificar que no sea la misma imagen
          if (oldFileKey && oldFileKey !== fileKey) {
            logger.info('RECIPE_UPLOAD', '🗑️ Eliminando imagen anterior de S3', {
              recipeId: id,
              oldKey: oldFileKey,
              newKey: fileKey
            });
            
            try {
              await S3Service.deleteFile(oldFileKey);
              logger.info('RECIPE_UPLOAD', '✅ Imagen anterior eliminada de S3', {
                recipeId: id,
                oldKey: oldFileKey
              });
            } catch (s3Error) {
              logger.error('RECIPE_UPLOAD', '⚠️ Error eliminando imagen anterior de S3', s3Error as Error, {
                recipeId: id,
                oldKey: oldFileKey
              });
              // No fallar la operación principal
            }
          } else if (oldFileKey === fileKey) {
            logger.debug('RECIPE_UPLOAD', '🖼️ Misma imagen, no es necesario eliminar', {
              recipeId: id,
              fileKey
            });
          }
        } catch (error) {
          logger.error('RECIPE_UPLOAD', '❌ Error en proceso de eliminación de imagen anterior', error as Error, {
            recipeId: id
          });
          // No fallar la operación principal
        }
      }

      // ✅ ENCRIPTAR LA NUEVA IMAGEN
      const encryptedImage = encryptFileObject(uploadedFile);

      // Actualizar la receta con la nueva imagen
      recipe.image = encryptedImage;
      await recipe.save();

      logger.info('RECIPE_UPLOAD', '✅ Imagen guardada exitosamente en receta', {
        recipeId: id,
        fileName
      });

      return NextResponse.json({
        success: true,
        message: 'Imagen guardada exitosamente',
        data: uploadedFile // Devolvemos los datos sin encriptar para el frontend
      });

    } catch (error: any) {
      console.error('❌ Error en PUT /recipes/[id]/upload:', error);
      logger.error('RECIPE_UPLOAD', 'Error guardando imagen en receta', error, {
        fileName: (await request.json()).fileName,
      }, {
        recipeId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/recipes/${(await params).id}/upload`, method: 'PUT', recipeId: (await params).id });
}

// DELETE: Eliminar imagen de receta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPE_UPLOAD', 'Eliminar imagen de receta', async () => {
    try {
      const { id } = await params;
      const { fileKey } = await request.json();

      logger.info('RECIPE_UPLOAD', '🗑️ Iniciando eliminación de imagen de receta', {
        recipeId: id,
        fileKey
      });

      // Validaciones
      if (!id || id === 'undefined') {
        return NextResponse.json(
          { success: false, message: 'Recipe ID no válido' },
          { status: 400 }
        );
      }

      if (!fileKey) {
        return NextResponse.json(
          { success: false, message: 'fileKey es requerido' },
          { status: 400 }
        );
      }

      await connectToDatabase();
      const recipe = await Recipe.findById(id);

      if (!recipe) {
        logger.warn('RECIPE_UPLOAD', 'Receta no encontrada', undefined, { recipeId: id });
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }

      // Verificar que la imagen a eliminar sea la misma que está en la receta
      // Desencriptar la key de la imagen actual para comparar
      let currentFileKey = recipe.image.key;
      if (typeof currentFileKey === 'string' && currentFileKey.startsWith('U2FsdGVkX1')) {
        currentFileKey = decrypt(currentFileKey);
      }

      if (currentFileKey !== fileKey) {
        return NextResponse.json(
          { success: false, message: 'La imagen no corresponde a esta receta' },
          { status: 400 }
        );
      }

      // Eliminar de S3
      try {
        logger.debug('RECIPE_UPLOAD', '☁️ Eliminando de S3...', { recipeId: id, fileKey });
        await S3Service.deleteFile(fileKey);
        logger.info('RECIPE_UPLOAD', '✅ Imagen eliminada de S3', { recipeId: id, fileKey });
      } catch (s3Error) {
        logger.error('RECIPE_UPLOAD', '⚠️ Error eliminando de S3', s3Error as Error, {
          recipeId: id,
          fileKey
        });
        // No fallamos aquí, seguimos para eliminar la referencia en la base de datos
      }

      // Eliminar la referencia en la receta
      recipe.image = {
        url: '',
        key: '',
        name: '',
        type: '',
        size: 0,
        uploadedAt: ''
      };
      await recipe.save();

      logger.info('RECIPE_UPLOAD', '🎉 Imagen eliminada exitosamente de la receta', { recipeId: id, fileKey });

      return NextResponse.json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error en DELETE /recipes/[id]/upload:', error);
      logger.error('RECIPE_UPLOAD', '💥 Error eliminando imagen de receta', error, undefined, {
        recipeId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/recipes/${(await params).id}/upload`, method: 'DELETE', recipeId: (await params).id });
}

// PATCH: Para futuras funcionalidades
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { success: false, message: 'Método no implementado' },
    { status: 405 }
  );
}
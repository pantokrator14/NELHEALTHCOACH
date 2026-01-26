import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getRecipesCollection } from '@/app/lib/database';
import { S3Service } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { encrypt, decrypt, encryptFileObject, decryptFileObject } from '@/app/lib/encryption';

// POST: Obtener URLs para upload de imagen de receta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPE_UPLOAD', 'Generar URL de upload para receta', async () => {
    try {
      const { id } = await params;
      
      console.log('📤 RECIPE_UPLOAD_POST - Iniciando solicitud para receta:', id);
      logger.info('RECIPE_UPLOAD', 'Solicitando URL de upload para receta', { recipeId: id });
      
      // Validar que el recipeId es válido
      if (!id || id === 'undefined' || !ObjectId.isValid(id)) {
        const errorMsg = `Recipe ID no válido: ${id}`;
        console.error('❌', errorMsg);
        logger.warn('RECIPE_UPLOAD', 'Recipe ID no válido', undefined, { recipeId: id });
        return NextResponse.json(
          { success: false, message: 'Recipe ID no válido' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { fileName, fileType, fileSize } = body;

      console.log('📄 Datos recibidos en POST:', {
        fileName,
        fileType,
        fileSize,
        bodyKeys: Object.keys(body)
      });

      if (!fileName || !fileType || !fileSize) {
        const errorMsg = 'Faltan campos requeridos: fileName, fileType, fileSize';
        console.error('❌', errorMsg);
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 400 }
        );
      }

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
        const errorMsg = `Tipo de archivo no permitido: ${fileType}. Solo se permiten imágenes para recetas`;
        console.error('❌', errorMsg);
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido para recetas (solo imágenes)' },
          { status: 400 }
        );
      }

      // Validar tamaño de archivo (máximo 10MB para imágenes de recetas)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        const errorMsg = `La imagen es demasiado grande: ${(fileSize / 1024 / 1024).toFixed(2)}MB (máximo 10MB)`;
        console.error('❌', errorMsg);
        return NextResponse.json(
          { success: false, message: 'La imagen es demasiado grande (máximo 10MB)' },
          { status: 400 }
        );
      }

      console.log('🔧 Llamando a S3Service.generateUploadURL...');
      logger.debug('RECIPE_UPLOAD', 'Llamando a S3Service.generateUploadURL...');
      
      try {
        // Usamos 'recipe' como categoría para la carpeta en S3
        const { uploadURL, fileKey } = await S3Service.generateUploadURL(
          fileName,
          fileType,
          fileSize,
          'recipe' // fileCategory
        );

        console.log('✅ URL de upload generada:', {
          uploadURL: uploadURL?.substring(0, 80) + '...',
          fileKey,
          fileName
        });

        logger.info('RECIPE_UPLOAD', 'URL de upload generada exitosamente', {
          fileName,
          fileType,
          fileSize,
          s3Key: fileKey
        }, { recipeId: id });

        // Obtener URL pública del archivo
        let fileURL = '';
        try {
          fileURL = await S3Service.getFileURL(fileKey);
          console.log('🔗 URL pública generada:', fileURL);
        } catch (urlError) {
          console.error('⚠️ Error generando URL pública, continuando...', urlError);
          // No fallamos si no podemos generar la URL, la subida aún puede funcionar
        }

        return NextResponse.json({
          success: true,
          data: {
            uploadURL,
            fileKey,
            fileURL
          }
        });

      } catch (s3Error: any) {
        console.error('❌ Error en S3Service.generateUploadURL:', s3Error);
        logger.error('RECIPE_UPLOAD', 'Error en S3Service.generateUploadURL', s3Error, {
          fileName,
          fileType,
          fileSize
        }, { recipeId: id });
        
        return NextResponse.json(
          { 
            success: false, 
            message: `Error generando URL de upload: ${s3Error.message || 'Error de S3'}` 
          },
          { status: 500 }
        );
      }

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
  }, { 
    endpoint: `/api/recipes/${(await params).id}/upload`, 
    method: 'POST', 
    recipeId: (await params).id 
  });
}

// PUT: Confirmar upload y guardar referencia de imagen en la receta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPE_UPLOAD', 'Confirmar upload y guardar imagen en receta', async () => {
    try {
      const { id } = await params;
      
      console.log('💾 RECIPE_UPLOAD_PUT - Confirmando upload para receta:', id);
      
      if (!id || id === 'undefined' || !ObjectId.isValid(id)) {
        const errorMsg = `Recipe ID no válido en PUT: ${id}`;
        console.error('❌', errorMsg);
        return NextResponse.json(
          { success: false, message: 'Recipe ID no válido' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { fileKey, fileName, fileType, fileSize, fileURL } = body;

      console.log('📝 Datos recibidos en PUT:', {
        fileKey,
        fileName,
        fileType,
        fileSize,
        fileURL: fileURL?.substring(0, 80) + '...',
        bodyKeys: Object.keys(body)
      });

      if (!fileKey || !fileName || !fileType || !fileSize) {
        const errorMsg = 'Faltan campos requeridos en PUT: fileKey, fileName, fileType, fileSize';
        console.error('❌', errorMsg);
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 400 }
        );
      }

      const recipesCollection = await getRecipesCollection();
      const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });

      if (!recipe) {
        console.error('❌ Receta no encontrada:', id);
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }

      console.log('✅ Receta encontrada:', {
        id: recipe._id,
        title: recipe.title,
        hasExistingImage: !!recipe.image
      });

      const uploadedFile = {
        url: fileURL || '',
        key: fileKey,
        name: fileName,
        type: fileType,
        size: fileSize,
        uploadedAt: new Date().toISOString()
      };

      console.log('📄 Objeto uploadedFile creado:', {
        urlLength: uploadedFile.url?.length,
        key: uploadedFile.key,
        name: uploadedFile.name,
        size: uploadedFile.size
      });

      // ✅ ELIMINAR IMAGEN ANTERIOR SI EXISTE
      if (recipe.image && recipe.image.key) {
        console.log('🗑️ Verificando imagen anterior para eliminar...');
        try {
          let oldFileKey = recipe.image.key;
          
          // Desencriptar la key si está encriptada
          if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
            console.log('🔓 Imagen anterior está encriptada, desencriptando...');
            try {
              oldFileKey = decrypt(oldFileKey);
              console.log('✅ Key desencriptada:', oldFileKey?.substring(0, 30) + '...');
            } catch (decryptError) {
              console.error('❌ Error desencriptando oldFileKey:', decryptError);
              oldFileKey = recipe.image.key; // Usar original si falla
            }
          }
          
          // Verificar que no sea la misma imagen
          if (oldFileKey && oldFileKey !== fileKey) {
            console.log('🗑️ Eliminando imagen anterior de S3:', oldFileKey?.substring(0, 30) + '...');
            logger.info('RECIPE_UPLOAD', 'Eliminando imagen anterior de S3', {
              recipeId: id,
              oldKey: oldFileKey?.substring(0, 30) + '...',
              newKey: fileKey?.substring(0, 30) + '...'
            });
            
            try {
              await S3Service.deleteFile(oldFileKey);
              console.log('✅ Imagen anterior eliminada de S3');
              logger.info('RECIPE_UPLOAD', 'Imagen anterior eliminada de S3', {
                recipeId: id,
                oldKey: oldFileKey?.substring(0, 30) + '...'
              });
            } catch (s3Error) {
              console.error('⚠️ Error eliminando imagen anterior de S3:', s3Error);
              logger.error('RECIPE_UPLOAD', 'Error eliminando imagen anterior de S3', s3Error as Error, {
                recipeId: id,
                oldKey: oldFileKey?.substring(0, 30) + '...'
              });
              // No fallar la operación principal
            }
          } else if (oldFileKey === fileKey) {
            console.log('📸 Misma imagen, no es necesario eliminar');
            logger.debug('RECIPE_UPLOAD', 'Misma imagen, no es necesario eliminar', {
              recipeId: id,
              fileKey: fileKey?.substring(0, 30) + '...'
            });
          } else {
            console.log('ℹ️ No hay imagen anterior que eliminar o key inválida');
          }
        } catch (error) {
          console.error('⚠️ Error en proceso de eliminación de imagen anterior:', error);
          logger.error('RECIPE_UPLOAD', 'Error en proceso de eliminación de imagen anterior', error as Error, {
            recipeId: id
          });
          // No fallar la operación principal
        }
      } else {
        console.log('ℹ️ No hay imagen anterior que eliminar');
      }

      // ✅ ENCRIPTAR LA NUEVA IMAGEN
      console.log('🔐 Encriptando imagen...');
      let encryptedImage;
      try {
        encryptedImage = encryptFileObject(uploadedFile);
        console.log('✅ Imagen encriptada:', {
          urlEncrypted: !!encryptedImage.url,
          keyEncrypted: encryptedImage.key?.startsWith?.('U2FsdGVkX1'),
          nameEncrypted: encryptedImage.name?.startsWith?.('U2FsdGVkX1')
        });
      } catch (encryptError) {
        console.error('❌ Error encriptando imagen:', encryptError);
        // Crear un objeto vacío encriptado si falla
        encryptedImage = {
          url: '',
          key: '',
          name: '',
          type: '',
          size: 0,
          uploadedAt: ''
        };
        console.warn('⚠️ Usando objeto de imagen vacío debido a error de encriptación');
      }

      // Actualizar la receta con la nueva imagen
      console.log('💾 Actualizando receta en MongoDB...');
      const result = await recipesCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            image: encryptedImage,
            updatedAt: new Date()
          } 
        }
      );

      console.log('📊 Resultado de actualización:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged
      });

      if (result.modifiedCount === 0) {
        console.error('❌ No se pudo actualizar la receta');
        return NextResponse.json(
          { success: false, message: 'No se pudo actualizar la receta' },
          { status: 500 }
        );
      }

      console.log('✅ Receta actualizada exitosamente');
      logger.info('RECIPE_UPLOAD', 'Imagen guardada exitosamente en receta', {
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
        fileName: (await request.json())?.fileName,
      }, {
        recipeId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: `Error interno del servidor: ${error.message}` },
        { status: 500 }
      );
    }
  }, { 
    endpoint: `/api/recipes/${(await params).id}/upload`, 
    method: 'PUT', 
    recipeId: (await params).id 
  });
}

// DELETE: Eliminar imagen de receta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPE_UPLOAD', 'Eliminar imagen de receta', async () => {
    try {
      const { id } = await params;

      console.log('🗑️ RECIPE_UPLOAD_DELETE - Iniciando eliminación para receta:', id);

      // Validaciones
      if (!id || id === 'undefined' || !ObjectId.isValid(id)) {
        console.error('❌ Recipe ID no válido:', id);
        return NextResponse.json(
          { success: false, message: 'Recipe ID no válido' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { fileKey } = body;

      console.log('📝 Datos recibidos en DELETE:', {
        fileKey,
        bodyKeys: Object.keys(body)
      });

      if (!fileKey) {
        console.error('❌ fileKey es requerido');
        return NextResponse.json(
          { success: false, message: 'fileKey es requerido' },
          { status: 400 }
        );
      }

      const recipesCollection = await getRecipesCollection();
      const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });

      if (!recipe) {
        console.error('❌ Receta no encontrada:', id);
        logger.warn('RECIPE_UPLOAD', 'Receta no encontrada', undefined, { recipeId: id });
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }

      console.log('✅ Receta encontrada:', {
        id: recipe._id,
        title: recipe.title,
        hasImage: !!recipe.image
      });

      // Verificar que la imagen a eliminar sea la misma que está en la receta
      // Desencriptar la key de la imagen actual para comparar
      let currentFileKey = recipe.image?.key || '';
      console.log('🔍 Current file key (crudo):', currentFileKey?.substring(0, 30) + '...');
      
      if (currentFileKey && typeof currentFileKey === 'string' && currentFileKey.startsWith('U2FsdGVkX1')) {
        try {
          console.log('🔓 Desencriptando currentFileKey...');
          currentFileKey = decrypt(currentFileKey);
          console.log('✅ Key desencriptada:', currentFileKey?.substring(0, 30) + '...');
        } catch (error) {
          console.error('❌ Error desencriptando currentFileKey:', error);
          logger.error('RECIPE_UPLOAD', 'Error desencriptando currentFileKey', error as Error);
        }
      }

      console.log('🔍 Comparando keys:', {
        currentKey: currentFileKey?.substring(0, 30) + '...',
        requestKey: fileKey?.substring(0, 30) + '...',
        match: currentFileKey === fileKey
      });

      if (currentFileKey !== fileKey) {
        console.error('❌ La imagen no corresponde a esta receta');
        return NextResponse.json(
          { success: false, message: 'La imagen no corresponde a esta receta' },
          { status: 400 }
        );
      }

      // Eliminar de S3
      try {
        console.log('☁️ Eliminando de S3...', { fileKey: fileKey?.substring(0, 30) + '...' });
        await S3Service.deleteFile(fileKey);
        console.log('✅ Imagen eliminada de S3');
        logger.info('RECIPE_UPLOAD', 'Imagen eliminada de S3', { recipeId: id, fileKey: fileKey?.substring(0, 30) + '...' });
      } catch (s3Error) {
        console.error('⚠️ Error eliminando de S3:', s3Error);
        logger.error('RECIPE_UPLOAD', 'Error eliminando de S3', s3Error as Error, {
          recipeId: id,
          fileKey: fileKey?.substring(0, 30) + '...'
        });
        // No fallamos aquí, seguimos para eliminar la referencia en la base de datos
      }

      // Eliminar la referencia en la receta
      console.log('🗃️ Eliminando referencia en MongoDB...');
      const result = await recipesCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            image: {
              url: '',
              key: '',
              name: '',
              type: '',
              size: 0,
              uploadedAt: ''
            },
            updatedAt: new Date()
          } 
        }
      );

      console.log('📊 Resultado de eliminación en BD:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged
      });

      if (result.modifiedCount === 0) {
        console.error('❌ No se pudo actualizar la receta');
        return NextResponse.json(
          { success: false, message: 'No se pudo actualizar la receta' },
          { status: 500 }
        );
      }

      console.log('✅ Referencia eliminada de MongoDB');
      logger.info('RECIPE_UPLOAD', 'Imagen eliminada exitosamente de la receta', { 
        recipeId: id, 
        fileKey: fileKey?.substring(0, 30) + '...' 
      });

      return NextResponse.json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error en DELETE /recipes/[id]/upload:', error);
      logger.error('RECIPE_UPLOAD', 'Error eliminando imagen de receta', error, undefined, {
        recipeId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: `Error interno del servidor: ${error.message}` },
        { status: 500 }
      );
    }
  }, { 
    endpoint: `/api/recipes/${(await params).id}/upload`, 
    method: 'DELETE', 
    recipeId: (await params).id 
  });
}

// PATCH: Para futuras funcionalidades (reparación, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();
    
    console.log('🔧 PATCH recibido para receta:', id, 'acción:', action);
    
    if (action === 'repair_image') {
      console.log('🔧 Reparando imagen corrupta para receta:', id);
      
      const recipesCollection = await getRecipesCollection();
      const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!recipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      let repaired = false;
      const image = recipe.image;
      
      if (image && image.key) {
        try {
          // Verificar si la imagen está corrupta (campos vacíos pero tiene key)
          if ((!image.url || image.url === '') && image.key && image.key !== '') {
            console.log('🔧 Imagen corrupta detectada, intentando reparar...');
            
            // Intentar desencriptar la key
            let decryptedKey = image.key;
            if (typeof decryptedKey === 'string' && decryptedKey.startsWith('U2FsdGVkX1')) {
              try {
                decryptedKey = decrypt(decryptedKey);
                console.log('✅ Key desencriptada para reparación:', decryptedKey?.substring(0, 30) + '...');
              } catch (e) {
                console.error('❌ No se pudo desencriptar la key:', e);
              }
            }
            
            // Intentar regenerar la URL
            if (decryptedKey && decryptedKey !== '') {
              try {
                const fileURL = await S3Service.getFileURL(decryptedKey);
                console.log('🔗 URL regenerada:', fileURL?.substring(0, 80) + '...');
                
                // Actualizar la receta con la URL regenerada
                await recipesCollection.updateOne(
                  { _id: new ObjectId(id) },
                  { 
                    $set: { 
                      'image.url': fileURL,
                      updatedAt: new Date()
                    } 
                  }
                );
                
                repaired = true;
                console.log('✅ Imagen reparada exitosamente');
              } catch (urlError) {
                console.error('❌ Error regenerando URL:', urlError);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error en reparación:', error);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: repaired ? 'Imagen reparada exitosamente' : 'No se necesitó reparación',
        repaired
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Acción no válida' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error en PATCH /recipes/[id]/upload:', error);
    logger.error('RECIPE_UPLOAD', 'Error en endpoint PATCH', error as Error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para obtener la URL completa de una imagen
async function getFullImageUrl(fileKey: string): Promise<string> {
  try {
    return await S3Service.getFileURL(fileKey);
  } catch (error) {
    console.error('❌ Error obteniendo URL de imagen:', error);
    logger.error('RECIPE_UPLOAD', 'Error obteniendo URL de imagen', error as Error);
    return '';
  }
}
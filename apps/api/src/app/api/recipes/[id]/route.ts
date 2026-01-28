import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getRecipesCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { encrypt, decrypt, encryptFileObject, decryptFileObject, safeDecrypt } from '@/app/lib/encryption';
import { S3Service } from '@/app/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPES', 'Obtener receta por ID', async () => {
    try {
      const { id } = await params;
      const recipesCollection = await getRecipesCollection();
      
      logger.info('RECIPES', 'Solicitud GET /api/recipes/[id] recibida', { id });
      
      const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!recipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      // ✅ DESENCRIPTAR DIRECTAMENTE
      const decryptedRecipe: any = {
        ...recipe,
        id: recipe._id.toString(),
        title: safeDecrypt(recipe.title),
        description: safeDecrypt(recipe.description),
        category: Array.isArray(recipe.category) 
          ? recipe.category.map((cat: string) => safeDecrypt(cat))
          : [],
        ingredients: Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(recipe.instructions)
          ? recipe.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: recipe.nutrition,
        cookTime: recipe.cookTime,
        difficulty: safeDecrypt(recipe.difficulty),
        author: recipe.author ? safeDecrypt(recipe.author) : 'NelHealthCoach',
        isPublished: recipe.isPublished,
        tags: Array.isArray(recipe.tags)
          ? recipe.tags.map((tag: string) => safeDecrypt(tag))
          : [],
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      };

      // ✅ DESENCRIPTAR IMAGEN
      if (recipe.image) {
        decryptedRecipe.image = decryptFileObject(recipe.image);
      } else {
        decryptedRecipe.image = null;
      }
      
      return NextResponse.json({
        success: true,
        data: decryptedRecipe,
      });
      
    } catch (error: any) {
      logger.error('RECIPES', 'Error obteniendo receta', error);
      return NextResponse.json(
        { success: false, message: 'Error obteniendo receta' },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes/[id]' });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPES', 'Actualizar receta', async () => {
    try {
      const { id } = await params;
      const recipesCollection = await getRecipesCollection();
      const data = await request.json();
      
      logger.info('RECIPES', 'Solicitud PUT /api/recipes/[id] recibida', { id });
      
      // ✅ 1. OBTENER RECETA ACTUAL
      const currentRecipe = await recipesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!currentRecipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      // ✅ 2. MANEJAR IMAGEN - APLICANDO LÓGICA DE CLIENTES
      // Si se envía una imagen nueva o null, eliminar la anterior
      if (data.image !== undefined) {
        // ✅ CASO A: Se envía una nueva imagen (objeto con key)
        if (data.image && typeof data.image === 'object' && data.image.key) {
          // ✅ ELIMINAR IMAGEN ANTERIOR SI EXISTE
          if (currentRecipe.image && currentRecipe.image.key) {
            try {
              let oldFileKey = currentRecipe.image.key;
              
              // Desencriptar la key si está encriptada
              if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
                try {
                  oldFileKey = decrypt(oldFileKey);
                  logger.debug('RECIPES', 'Key de imagen anterior desencriptada', {
                    recipeId: id,
                    encryptedKey: currentRecipe.image.key.substring(0, 30) + '...',
                    decryptedKey: oldFileKey
                  });
                } catch (decryptError) {
                  console.error('❌ Error desencriptando oldFileKey:', decryptError);
                  // Si no se puede desencriptar, intentar usar el valor original
                }
              }
              
              const newFileKey = data.image.key;
              
              // ✅ VERIFICAR QUE NO SEA LA MISMA IMAGEN
              if (oldFileKey && oldFileKey !== newFileKey) {
                logger.info('RECIPES', '🗑️ Eliminando imagen anterior de S3', {
                  recipeId: id,
                  oldKey: oldFileKey,
                  newKey: newFileKey
                });
                
                try {
                  await S3Service.deleteFile(oldFileKey);
                  logger.info('RECIPES', '✅ Imagen anterior eliminada de S3', {
                    recipeId: id,
                    oldKey: oldFileKey
                  });
                } catch (s3Error) {
                  logger.error('RECIPES', '⚠️ Error eliminando imagen anterior de S3', s3Error as Error, {
                    recipeId: id,
                    oldKey: oldFileKey
                  });
                  // No fallar la operación principal
                }
              } else if (oldFileKey === newFileKey) {
                logger.debug('RECIPES', '📸 Misma imagen, no es necesario eliminar', {
                  recipeId: id,
                  fileKey: newFileKey
                });
              }
            } catch (error) {
              logger.error('RECIPES', '❌ Error en proceso de eliminación de imagen anterior', error as Error, {
                recipeId: id
              });
              // No fallar la operación principal
            }
          }
          
          // ✅ ENCRIPTAR LA NUEVA IMAGEN
          data.image = encryptFileObject(data.image);
          
        } 
        // ✅ CASO B: Se elimina la imagen (se envía null, vacío o sin key)
        else if (data.image === null || data.image === '' || !data.image.key) {
          // ✅ ELIMINAR IMAGEN ANTERIOR DE S3
          if (currentRecipe.image && currentRecipe.image.key) {
            try {
              let oldFileKey = currentRecipe.image.key;
              
              if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
                try {
                  oldFileKey = decrypt(oldFileKey);
                } catch (decryptError) {
                  console.error('❌ Error desencriptando oldFileKey para eliminación:', decryptError);
                }
              }
              
              if (oldFileKey && oldFileKey.trim() !== '') {
                await S3Service.deleteFile(oldFileKey);
                logger.info('RECIPES', '🗑️ Imagen eliminada de S3 (se quitó en edición)', {
                  recipeId: id,
                  oldKey: oldFileKey
                });
              }
            } catch (s3Error) {
              logger.error('RECIPES', '⚠️ Error eliminando imagen de S3', s3Error as Error, {
                recipeId: id
              });
            }
          }
          
          // ✅ ESTABLECER IMAGEN VACÍA
          data.image = {
            url: '',
            key: '',
            name: '',
            type: '',
            size: 0,
            uploadedAt: ''
          };
        }
      }
      // Si data.image es undefined (no se envía), no tocamos la imagen
      
      // ✅ 3. PREPARAR DATOS ENCRIPTADOS (excluyendo la imagen ya manejada)
      const updateData: any = { updatedAt: new Date() };
      
      // Copiar todos los campos excepto 'image' que ya manejamos
      const fieldsToEncrypt = ['title', 'description', 'category', 'ingredients', 
                               'instructions', 'difficulty', 'author', 'tags'];
      
      fieldsToEncrypt.forEach(field => {
        if (data[field] !== undefined) {
          if (Array.isArray(data[field])) {
            updateData[field] = data[field].map((item: string) => encrypt(item));
          } else if (typeof data[field] === 'string') {
            updateData[field] = encrypt(data[field]);
          }
        }
      });
      
      // Campos que no necesitan encriptación
      if (data.nutrition !== undefined) updateData.nutrition = data.nutrition;
      if (data.cookTime !== undefined) updateData.cookTime = data.cookTime;
      if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
      
      // ✅ 4. AGREGAR IMAGEN MANEJADA PREVIAMENTE
      if (data.image !== undefined) {
        updateData.image = data.image;
      }
      
      // ✅ 5. ACTUALIZAR EN MONGODB
      const result = await recipesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      // ✅ 6. DESENCRIPTAR PARA RESPONSE
      const decryptedRecipe: any = {
        ...result,
        id: result._id.toString(),
        title: safeDecrypt(result.title),
        description: safeDecrypt(result.description),
        category: Array.isArray(result.category) 
          ? result.category.map((cat: string) => safeDecrypt(cat))
          : [],
        ingredients: Array.isArray(result.ingredients)
          ? result.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(result.instructions)
          ? result.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: result.nutrition,
        cookTime: result.cookTime,
        difficulty: safeDecrypt(result.difficulty),
        author: result.author ? safeDecrypt(result.author) : 'NelHealthCoach',
        isPublished: result.isPublished,
        tags: Array.isArray(result.tags)
          ? result.tags.map((tag: string) => safeDecrypt(tag))
          : [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      if (result.image) {
        decryptedRecipe.image = decryptFileObject(result.image);
      } else {
        decryptedRecipe.image = null;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Receta actualizada exitosamente',
        data: decryptedRecipe,
      });
      
    } catch (error: any) {
      logger.error('RECIPES', 'Error actualizando receta', error);
      return NextResponse.json(
        { success: false, message: 'Error actualizando receta' },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes/[id]', method: 'PUT' });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPES', 'Eliminar receta', async () => {
    try {
      const { id } = await params;
      const recipesCollection = await getRecipesCollection();
      
      logger.info('RECIPES', 'Solicitud DELETE /api/recipes/[id] recibida', { id });
      
      // ✅ OBTENER RECETA PARA ELIMINAR IMAGEN DE S3
      const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!recipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      // ✅ ELIMINAR IMAGEN DE S3 SI EXISTE
      if (recipe.image && recipe.image.key) {
        try {
          let fileKey = recipe.image.key;
          
          if (typeof fileKey === 'string' && fileKey.startsWith('U2FsdGVkX1')) {
            fileKey = decrypt(fileKey);
          }
          
          if (fileKey && fileKey.trim() !== '') {
            await S3Service.deleteFile(fileKey);
            logger.info('RECIPES', 'Imagen eliminada de S3 en DELETE', {
              recipeId: id,
              fileKey: fileKey?.substring(0, 30) + '...'
            });
          }
        } catch (s3Error) {
          logger.error('RECIPES', 'Error eliminando imagen de S3 en DELETE', s3Error as Error, {
            recipeId: id
          });
        }
      }
      
      const result = await recipesCollection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Receta eliminada exitosamente',
      });
      
    } catch (error: any) {
      logger.error('RECIPES', 'Error eliminando receta', error);
      return NextResponse.json(
        { success: false, message: 'Error eliminando receta' },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes/[id]', method: 'DELETE' });
}
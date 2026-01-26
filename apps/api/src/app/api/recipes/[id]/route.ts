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
      
      // ✅ 1. OBTENER RECETA ACTUAL PARA TENER LA IMAGEN ANTERIOR
      const currentRecipe = await recipesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!currentRecipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada' },
          { status: 404 }
        );
      }
      
      // ✅ 2. PREPARAR DATOS ENCRIPTADOS
      const updateData: any = { updatedAt: new Date() };
      
      // Encriptar cada campo si viene en la data
      if (data.title !== undefined) updateData.title = encrypt(data.title);
      if (data.description !== undefined) updateData.description = encrypt(data.description);
      if (data.category !== undefined && Array.isArray(data.category)) {
        updateData.category = data.category.map((cat: string) => encrypt(cat));
      }
      if (data.ingredients !== undefined && Array.isArray(data.ingredients)) {
        updateData.ingredients = data.ingredients.map((ing: string) => encrypt(ing));
      }
      if (data.instructions !== undefined && Array.isArray(data.instructions)) {
        updateData.instructions = data.instructions.map((inst: string) => encrypt(inst));
      }
      if (data.nutrition !== undefined) updateData.nutrition = data.nutrition;
      if (data.cookTime !== undefined) updateData.cookTime = data.cookTime;
      if (data.difficulty !== undefined) updateData.difficulty = encrypt(data.difficulty);
      if (data.author !== undefined) updateData.author = encrypt(data.author);
      if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
      if (data.tags !== undefined && Array.isArray(data.tags)) {
        updateData.tags = data.tags.map((tag: string) => encrypt(tag));
      }
      
      // ✅ 3. MANEJAR IMAGEN - ELIMINAR IMAGEN ANTERIOR DE S3 SI SE CAMBIA
      if (data.image !== undefined) {
        if (data.image && typeof data.image === 'object') {
          // ✅ ENCRIPTAR LA NUEVA IMAGEN
          updateData.image = encryptFileObject(data.image);
          
          // ✅ ELIMINAR IMAGEN ANTERIOR DE S3 SI EXISTE Y ES DIFERENTE
          if (currentRecipe.image && currentRecipe.image.key) {
            try {
              let oldFileKey = currentRecipe.image.key;
              
              // Desencriptar la key si está encriptada
              if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
                oldFileKey = decrypt(oldFileKey);
              }
              
              const newFileKey = data.image.key; // Ya viene desencriptada del frontend
              
              // Solo eliminar si son diferentes keys
              if (oldFileKey && oldFileKey !== newFileKey) {
                logger.info('RECIPES', 'Eliminando imagen anterior de S3 en PUT', {
                  recipeId: id,
                  oldKey: oldFileKey?.substring(0, 30) + '...',
                  newKey: newFileKey?.substring(0, 30) + '...'
                });
                
                await S3Service.deleteFile(oldFileKey);
              }
            } catch (s3Error) {
              logger.error('RECIPES', 'Error eliminando imagen anterior de S3 en PUT', s3Error as Error, {
                recipeId: id
              });
              // No fallar la operación principal
            }
          }
        } else if (data.image === null || data.image === '') {
          // ✅ SI SE ELIMINA LA IMAGEN, BORRAR DE S3
          updateData.image = {
            url: '',
            key: '',
            name: '',
            type: '',
            size: 0,
            uploadedAt: ''
          };
          
          if (currentRecipe.image && currentRecipe.image.key) {
            try {
              let oldFileKey = currentRecipe.image.key;
              
              if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
                oldFileKey = decrypt(oldFileKey);
              }
              
              if (oldFileKey) {
                await S3Service.deleteFile(oldFileKey);
                logger.info('RECIPES', 'Imagen eliminada de S3 porque se quitó en PUT', {
                  recipeId: id,
                  oldKey: oldFileKey?.substring(0, 30) + '...'
                });
              }
            } catch (s3Error) {
              logger.error('RECIPES', 'Error eliminando imagen de S3 en PUT', s3Error as Error, {
                recipeId: id
              });
            }
          }
        }
      }
      
      // ✅ 4. ACTUALIZAR EN MONGODB
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
      
      // ✅ 5. DESENCRIPTAR PARA RESPONSE
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
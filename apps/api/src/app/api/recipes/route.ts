import { NextRequest, NextResponse } from 'next/server';
import { getRecipesCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { MongoClient, ObjectId } from 'mongodb';
import { encrypt, decrypt, encryptFileObject, decryptFileObject, safeDecrypt } from '@/app/lib/encryption';

// GET: Obtener recetas
export async function GET(request: NextRequest) {
  return logger.time('RECIPES', 'Obtener lista de recetas', async () => {
    try {
      logger.info('RECIPES', 'Solicitud GET /api/recipes recibida');
      
      const recipesCollection = await getRecipesCollection();
      
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      
      let query: any = { isPublished: true };
      
      if (category) {
        query.category = { $in: [category] };
      }
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
        ];
      }
      
      const recipes = await recipesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      logger.info('RECIPES', `Recetas obtenidas: ${recipes.length}`);
      
      // ✅ DESENCRIPTAR CADA RECETA (campo por campo, sin funciones wrapper)
      const formattedRecipes = recipes.map(recipe => {
        const decrypted: any = {
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

        // ✅ DESENCRIPTAR IMAGEN SI EXISTE
        if (recipe.image) {
          decrypted.image = decryptFileObject(recipe.image);
        } else {
          decrypted.image = null;
        }

        return decrypted;
      });
      
      return NextResponse.json({
        success: true,
        data: formattedRecipes,
        count: recipes.length,
      });
      
    } catch (error: any) {
      logger.error('RECIPES', 'Error obteniendo recetas', error);
      return NextResponse.json(
        { success: false, message: 'Error obteniendo recetas' },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes' });
}

export async function POST(request: NextRequest) {
  return logger.time('RECIPES', 'Crear nueva receta', async () => {
    try {
      const recipesCollection = await getRecipesCollection();
      const data = await request.json();
      
      if (!data.title || !data.description) {
        return NextResponse.json(
          { success: false, message: 'Faltan campos requeridos' },
          { status: 400 }
        );
      }
      
      // ✅ ENCRIPTAR DIRECTAMENTE CADA CAMPO (sin funciones wrapper)
      const encryptedRecipeData: any = {
        title: encrypt(data.title),
        description: encrypt(data.description),
        category: Array.isArray(data.category)
          ? data.category.map((cat: string) => encrypt(cat))
          : [],
        ingredients: Array.isArray(data.ingredients)
          ? data.ingredients.map((ing: string) => encrypt(ing))
          : [],
        instructions: Array.isArray(data.instructions)
          ? data.instructions.map((inst: string) => encrypt(inst))
          : [],
        nutrition: data.nutrition || { protein: 0, carbs: 0, fat: 0, calories: 0 },
        cookTime: data.cookTime || 0,
        difficulty: encrypt(data.difficulty || 'easy'),
        author: data.author ? encrypt(data.author) : encrypt('NelHealthCoach'),
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
        tags: Array.isArray(data.tags)
          ? data.tags.map((tag: string) => encrypt(tag))
          : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // ✅ ENCRIPTAR IMAGEN SI EXISTE
      if (data.image && typeof data.image === 'object') {
        encryptedRecipeData.image = encryptFileObject(data.image);
      } else {
        encryptedRecipeData.image = {
          url: '',
          key: '',
          name: '',
          type: '',
          size: 0,
          uploadedAt: new Date().toISOString()
        };
      }
      
      const result = await recipesCollection.insertOne(encryptedRecipeData);
      
      logger.info('RECIPES', 'Receta creada exitosamente', {
        insertedId: result.insertedId.toString()
      });
      
      const insertedRecipe = await recipesCollection.findOne({ _id: result.insertedId });
      
      if (!insertedRecipe) {
        throw new Error('No se pudo recuperar la receta recién creada');
      }
      
      // ✅ DESENCRIPTAR PARA RESPONSE
      const decryptedRecipe: any = {
        ...insertedRecipe,
        id: insertedRecipe._id.toString(),
        title: safeDecrypt(insertedRecipe.title),
        description: safeDecrypt(insertedRecipe.description),
        category: Array.isArray(insertedRecipe.category) 
          ? insertedRecipe.category.map((cat: string) => safeDecrypt(cat))
          : [],
        ingredients: Array.isArray(insertedRecipe.ingredients)
          ? insertedRecipe.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(insertedRecipe.instructions)
          ? insertedRecipe.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: insertedRecipe.nutrition,
        cookTime: insertedRecipe.cookTime,
        difficulty: safeDecrypt(insertedRecipe.difficulty),
        author: insertedRecipe.author ? safeDecrypt(insertedRecipe.author) : 'NelHealthCoach',
        isPublished: insertedRecipe.isPublished,
        tags: Array.isArray(insertedRecipe.tags)
          ? insertedRecipe.tags.map((tag: string) => safeDecrypt(tag))
          : [],
        createdAt: insertedRecipe.createdAt,
        updatedAt: insertedRecipe.updatedAt,
      };

      // ✅ DESENCRIPTAR IMAGEN SI EXISTE
      if (insertedRecipe.image) {
        decryptedRecipe.image = decryptFileObject(insertedRecipe.image);
      } else {
        decryptedRecipe.image = null;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Receta creada exitosamente',
        data: decryptedRecipe,
      }, { status: 201 });
      
    } catch (error: any) {
      logger.error('RECIPES', 'Error creando receta', error);
      return NextResponse.json(
        { success: false, message: 'Error creando receta' },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes', method: 'POST' });
}

// OPTIONS: Para CORS
export async function OPTIONS(request: Request) {
  console.log('🔧 [OPTIONS /recipes]');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
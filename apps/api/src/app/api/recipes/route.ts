import { NextRequest, NextResponse } from 'next/server';
import { getRecipesCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { MongoClient, ObjectId } from 'mongodb';

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
      
      // Convertir ObjectId a string para el frontend
      const formattedRecipes = recipes.map(recipe => ({
        ...recipe,
        id: recipe._id.toString()
      }));
      
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
      
      // Validar datos requeridos
      if (!data.title || !data.description) {
        return NextResponse.json(
          { success: false, message: 'Faltan campos requeridos' },
          { status: 400 }
        );
      }
      
      // Añadir timestamps y valores por defecto
      const recipeData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
        // Proporcionar un objeto image vacío si no se proporciona
        image: data.image || {
          url: '',
          key: '',
          name: '',
          type: '',
          size: 0,
          uploadedAt: new Date().toISOString()
        }
      };
      
      const result = await recipesCollection.insertOne(recipeData);
      
      logger.info('RECIPES', 'Receta creada exitosamente', {
        insertedId: result.insertedId.toString()
      });
      
      return NextResponse.json({
        success: true,
        message: 'Receta creada exitosamente',
        data: {
          ...recipeData,
          id: result.insertedId.toString()
        },
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
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getRecipesCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';

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
      
      return NextResponse.json({
        success: true,
        data: {
          ...recipe,
          id: recipe._id.toString()
        },
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
      
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
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
      
      return NextResponse.json({
        success: true,
        message: 'Receta actualizada exitosamente',
        data: {
          ...result,
          id: result._id.toString()
        },
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
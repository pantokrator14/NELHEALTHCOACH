import { NextRequest, NextResponse } from 'next/server';
import { NutritionService } from '@/app/lib/nutrition-service';
import { logger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  return logger.time('NUTRITION_ANALYSIS', 'Analizando nutrición de ingredientes', async () => {
    try {
      const body = await request.json();
      const { ingredients, servings, recipeId } = body;
      
      if (!ingredients || !Array.isArray(ingredients)) {
        return NextResponse.json(
          { success: false, message: 'Se requiere un array de ingredientes' },
          { status: 400 }
        );
      }
      
      logger.info('NUTRITION_ANALYSIS', 'Solicitud de análisis nutricional', {
        ingredientCount: ingredients.length,
        servings: servings || 1,
        recipeId
      });
      
      // Usar IA para análisis
      const nutritionData = await NutritionService.analyzeIngredientsWithAI({
        ingredients,
        servings: servings || 1,
        recipeId
      });
      
      return NextResponse.json({
        success: true,
        data: nutritionData,
        source: 'ai_analysis',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      logger.error('NUTRITION_ANALYSIS', 'Error analizando nutrición', error);
      
      // Intentar cálculo local como fallback
      try {
        const { ingredients, servings = 1 } = await request.json();
        const nutritionData = await NutritionService.calculateNutritionLocally(
          ingredients,
          servings
        );
        
        return NextResponse.json({
          success: true,
          data: nutritionData,
          source: 'local_fallback',
          warning: 'Usando cálculo local (IA no disponible)',
          timestamp: new Date().toISOString()
        });
        
      } catch (fallbackError) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Error analizando nutrición: ${error.message}` 
          },
          { status: 500 }
        );
      }
    }
  });
}
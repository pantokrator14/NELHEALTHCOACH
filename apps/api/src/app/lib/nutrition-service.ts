import { AIService } from './ai-service';
import { logger } from './logger';
import { getNutritionCollection } from '../lib/database';
import { encrypt, safeDecrypt } from './encryption';

export interface IngredientAnalysisInput {
  ingredients: string[];
  servings?: number;
  recipeId?: string;
}

export class NutritionService {
  
  /**
   * Analiza ingredientes y calcula nutrición usando IA
   */
  static async analyzeIngredientsWithAI(
    input: IngredientAnalysisInput
  ): Promise<any> {
    const loggerWithContext = logger.withContext({ 
      recipeId: input.recipeId,
      ingredientCount: input.ingredients.length 
    });
    
    return loggerWithContext.time('NUTRITION_SERVICE', 'Analizando ingredientes con IA', async () => {
      try {
        // Parsear ingredientes para extraer cantidades
        const parsedIngredients = this.parseIngredients(input.ingredients);
        
        // Construir prompt para IA
        const prompt = this.buildNutritionAnalysisPrompt(parsedIngredients, input.servings || 1);
        
        // Llamar a DeepSeek
        const aiResponse = await this.callDeepSeekForNutrition(prompt);
        
        // Parsear respuesta
        const nutritionData = this.parseNutritionResponse(aiResponse);
        
        loggerWithContext.info('NUTRITION_SERVICE', 'Nutrición calculada con IA', {
          ingredientCount: parsedIngredients.length,
          totalCalories: nutritionData.total.calories,
          servings: input.servings || 1
        });
        
        return nutritionData;
        
      } catch (error: any) {
        loggerWithContext.error('NUTRITION_SERVICE', 'Error analizando ingredientes con IA', error);
        // Fallback a cálculo local
        return this.calculateNutritionLocally(input.ingredients, input.servings || 1);
      }
    });
  }
  
  /**
   * Parsear ingredientes para extraer cantidades y nombres
   */
  private static parseIngredients(ingredients: string[]): Array<{
    original: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }> {
    const parsed: any[] = [];
    
    for (const ingredient of ingredients) {
      // Expresión regular mejorada para capturar cantidades y unidades
      const match = ingredient.match(
        /^(\d+(?:\.\d+)?)\s*(g|gr|gramos?|kg|kilos?|ml|mililitros?|l|litros?|taza(?:s)?|cda|cdita|unidad(?:es)?|pizca|pizcas)?\s+(?:de\s+)?(.+)$/i
      );
      
      if (match) {
        const [, quantityStr, unitRaw, name] = match;
        const quantity = parseFloat(quantityStr);
        const unit = this.normalizeUnit(unitRaw?.toLowerCase() || 'g');
        
        parsed.push({
          original: ingredient,
          name: name.trim(),
          quantity,
          unit,
        });
      } else {
        // Si no se puede parsear, asumir 100g
        parsed.push({
          original: ingredient,
          name: ingredient.trim(),
          quantity: 100,
          unit: 'g',
        });
      }
    }
    
    return parsed;
  }
  
  /**
   * Normalizar unidades
   */
  private static normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'g': 'g',
      'gr': 'g',
      'gramo': 'g',
      'gramos': 'g',
      'kg': 'kg',
      'kilo': 'kg',
      'kilos': 'kg',
      'ml': 'ml',
      'mililitro': 'ml',
      'mililitros': 'ml',
      'l': 'l',
      'litro': 'l',
      'litros': 'l',
      'taza': 'taza',
      'tazas': 'taza',
      'cda': 'cda', // cucharada
      'cdita': 'cdita', // cucharadita
      'unidad': 'unidad',
      'unidades': 'unidad',
      'pizca': 'pizca',
      'pizcas': 'pizca',
    };
    
    return unitMap[unit] || 'g';
  }
  
  /**
   * Construir prompt para análisis nutricional
   */
  private static buildNutritionAnalysisPrompt(
    parsedIngredients: any[],
    servings: number
  ): string {
    const ingredientsList = parsedIngredients.map(ing => 
      `- ${ing.quantity}${ing.unit} de ${ing.name}`
    ).join('\n');
    
    return `Eres un nutricionista experto en dieta keto y análisis de alimentos.

INSTRUCCIONES:
1. Analiza CADA ingrediente por separado
2. Calcula valores nutricionales por 100g de cada ingrediente
3. Ajusta por la cantidad especificada
4. Suma todos los ingredientes para obtener totales
5. Divide por ${servings} porciones

DATOS DEL INGREDIENTE:
${ingredientsList}

REGLAS KETO:
- Priorizar grasas saludables sobre carbohidratos
- Considerar que algunos ingredientes pueden tener carbohidratos ocultos
- Carnes: 20-25g proteína/100g, 5-15g grasa/100g
- Verduras: 2-5g carbohidratos/100g (netos)
- Frutas: 10-20g carbohidratos/100g

DEVUELVE SOLO JSON con esta estructura:
{
  "total": {
    "protein": número en gramos,
    "carbs": número en gramos,
    "fat": número en gramos,
    "calories": número en kcal
  },
  "perServing": {
    "protein": número en gramos,
    "carbs": número en gramos,
    "fat": número en gramos,
    "calories": número en kcal
  },
  "ingredients": [
    {
      "ingredient": "nombre",
      "quantity": número,
      "unit": "string",
      "contribution": {
        "protein": número,
        "carbs": número,
        "fat": número,
        "calories": número,
        "percentage": número (porcentaje del total)
      }
    }
  ],
  "servings": ${servings},
  "ketoRatio": {
    "fatPercentage": número,
    "proteinPercentage": número,
    "carbPercentage": número,
    "isKetoFriendly": booleano
  }
}

CALCULA CON PRECISIÓN Y DEVUELVE SOLO EL JSON.`;
  }
  
  /**
   * Llamar a DeepSeek para análisis nutricional
   */
  private static async callDeepSeekForNutrition(prompt: string): Promise<string> {
    // Reutilizar la configuración de AIService
    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Eres un nutricionista especializado en análisis de alimentos y dieta keto. Devuelve siempre JSON válido con cálculos precisos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Baja temperatura para cálculos precisos
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    };
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content;
  }
  
  /**
   * Parsear respuesta de nutrición
   */
  private static parseNutritionResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      
      // Validar estructura básica
      if (!parsed.total || !parsed.perServing) {
        throw new Error('Estructura de respuesta inválida');
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Error parseando respuesta de nutrición: ${error}`);
    }
  }
  
  /**
   * Calcular nutrición localmente (fallback)
   */
  public static async calculateNutritionLocally(
    ingredients: string[],
    servings: number
  ): Promise<any> {
    const parsedIngredients = this.parseIngredients(ingredients);
    const nutritionDB = await this.getNutritionDatabase();
    
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCalories = 0;
    
    const ingredientDetails = [];
    
    for (const ing of parsedIngredients) {
      // Buscar en base de datos local
      const nutrition = await this.findIngredientNutrition(ing.name, nutritionDB);
      const quantityInGrams = this.convertToGrams(ing.quantity, ing.unit);
      
      const protein = (nutrition.protein * quantityInGrams) / 100;
      const carbs = (nutrition.carbs * quantityInGrams) / 100;
      const fat = (nutrition.fat * quantityInGrams) / 100;
      const calories = (nutrition.calories * quantityInGrams) / 100;
      
      totalProtein += protein;
      totalCarbs += carbs;
      totalFat += fat;
      totalCalories += calories;
      
      ingredientDetails.push({
        ingredient: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        contribution: {
          protein,
          carbs,
          fat,
          calories,
          percentage: 0 // Se calculará después
        }
      });
    }
    
    // Calcular porcentajes
    const totalMass = totalProtein + totalCarbs + totalFat;
    ingredientDetails.forEach(ing => {
      ing.contribution.percentage = totalMass > 0 
        ? ((ing.contribution.protein + ing.contribution.carbs + ing.contribution.fat) / totalMass) * 100
        : 0;
    });
    
    // Calcular ratios keto
    const totalMacros = totalProtein + totalCarbs + totalFat;
    const fatPercentage = totalMacros > 0 ? (totalFat / totalMacros) * 100 : 0;
    const proteinPercentage = totalMacros > 0 ? (totalProtein / totalMacros) * 100 : 0;
    const carbPercentage = totalMacros > 0 ? (totalCarbs / totalMacros) * 100 : 0;
    
    return {
      total: {
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        calories: Math.round(totalCalories)
      },
      perServing: {
        protein: Math.round((totalProtein / servings) * 10) / 10,
        carbs: Math.round((totalCarbs / servings) * 10) / 10,
        fat: Math.round((totalFat / servings) * 10) / 10,
        calories: Math.round(totalCalories / servings)
      },
      ingredients: ingredientDetails,
      servings,
      ketoRatio: {
        fatPercentage: Math.round(fatPercentage),
        proteinPercentage: Math.round(proteinPercentage),
        carbPercentage: Math.round(carbPercentage),
        isKetoFriendly: fatPercentage > 70 && carbPercentage < 10
      }
    };
  }
  
  /**
   * Convertir a gramos
   */
  private static convertToGrams(quantity: number, unit: string): number {
    const conversions: Record<string, number> = {
      'g': 1,
      'kg': 1000,
      'ml': 1, // Asumiendo densidad 1g/ml para líquidos
      'l': 1000,
      'taza': 240, // 240ml por taza
      'cda': 15, // 15ml por cucharada
      'cdita': 5, // 5ml por cucharadita
      'unidad': 100, // Asumiendo 100g por unidad estándar
      'pizca': 1, // Aproximación
    };
    
    return quantity * (conversions[unit] || 1);
  }
  
  /**
   * Obtener base de datos nutricional
   */
  private static async getNutritionDatabase(): Promise<any[]> {
    try {
      const collection = await getNutritionCollection();
      return await collection.find({}).toArray();
    } catch (error) {
      logger.error('NUTRITION_SERVICE', 'Error obteniendo base de datos nutricional', error);
      return [];
    }
  }
  
  /**
   * Buscar nutrición de ingrediente
   */
  private static async findIngredientNutrition(
    ingredientName: string,
    nutritionDB: any[]
  ): Promise<{protein: number; carbs: number; fat: number; calories: number}> {
    // Buscar coincidencia exacta o parcial
    const normalizedName = ingredientName.toLowerCase().trim();
    
    for (const item of nutritionDB) {
      const dbName = safeDecrypt(item.name).toLowerCase();
      if (dbName.includes(normalizedName) || normalizedName.includes(dbName)) {
        return {
          protein: item.nutrition?.protein || 0,
          carbs: item.nutrition?.carbs || 0,
          fat: item.nutrition?.fat || 0,
          calories: item.nutrition?.calories || 0,
        };
      }
    }
    
    // Valores por defecto por categoría
    return this.getDefaultNutritionByCategory(normalizedName);
  }
  
  /**
   * Obtener nutrición por defecto basada en categoría
   */
  private static getDefaultNutritionByCategory(ingredientName: string): {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  } {
    // Clasificar ingrediente por nombre
    const lowerName = ingredientName.toLowerCase();
    
    if (lowerName.includes('pollo') || lowerName.includes('carne') || lowerName.includes('pescado')) {
      return { protein: 20, carbs: 0, fat: 10, calories: 170 }; // Carne promedio
    }
    
    if (lowerName.includes('huevo')) {
      return { protein: 13, carbs: 1, fat: 11, calories: 155 };
    }
    
    if (lowerName.includes('aguacate') || lowerName.includes('palta')) {
      return { protein: 2, carbs: 9, fat: 15, calories: 160 };
    }
    
    if (lowerName.includes('aceite') || lowerName.includes('mantequilla')) {
      return { protein: 0, carbs: 0, fat: 100, calories: 900 };
    }
    
    if (lowerName.includes('brócoli') || lowerName.includes('espinaca')) {
      return { protein: 3, carbs: 6, fat: 0, calories: 35 };
    }
    
    if (lowerName.includes('queso')) {
      return { protein: 25, carbs: 2, fat: 30, calories: 400 };
    }
    
    if (lowerName.includes('tomate')) {
      return { protein: 1, carbs: 4, fat: 0, calories: 20 };
    }
    
    if (lowerName.includes('cebolla')) {
      return { protein: 1, carbs: 9, fat: 0, calories: 40 };
    }
    
    // Default para ingredientes desconocidos
    return { protein: 5, carbs: 10, fat: 5, calories: 100 };
  }
}
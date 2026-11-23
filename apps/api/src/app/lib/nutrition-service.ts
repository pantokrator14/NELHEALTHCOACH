import { logger } from './logger';
import { getNutritionCollection } from '../lib/database';
import { safeDecrypt } from './encryption';
import { callGeminiAPI, callGeminiImageAPI, robustJsonParse } from './agents/utils/llm';

export interface IngredientAnalysisInput {
  ingredients: string[];
  servings?: number;
  recipeId?: string;
}

export interface ImageNutritionAnalysisInput {
  imageBase64: string;
  mimeType: string;
  servings?: number;
  title?: string;
  description?: string;
  ingredients?: string[];
  recipeId?: string;
}

export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface IngredientContribution extends MacroTotals {
  percentage: number;
}

export interface AnalyzedIngredientNutrition {
  ingredient: string;
  quantity: number;
  unit: string;
  contribution: IngredientContribution;
}

export interface ParsedIngredient {
  original: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface NutritionAnalysisResult {
  total: MacroTotals;
  perServing: MacroTotals;
  ingredients: AnalyzedIngredientNutrition[];
  detectedIngredients?: string[];
  servings: number;
  ketoRatio: {
    fatPercentage: number;
    proteinPercentage: number;
    carbPercentage: number;
    isKetoFriendly: boolean;
  };
}

interface NutritionDbEntry {
  name: string;
  nutrition?: {
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
  };
}

export class NutritionService {

  /**
   * Analiza ingredientes y calcula nutrición usando IA
   */
  static async analyzeIngredientsWithAI(
    input: IngredientAnalysisInput
  ): Promise<NutritionAnalysisResult> {
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

        // Llamar a Gemini
        const aiResponse = await this.callGeminiForNutrition(prompt);

        // Parsear respuesta
        const nutritionData = this.parseNutritionResponse(aiResponse);

        loggerWithContext.info('NUTRITION_SERVICE', 'Nutrición calculada con IA', {
          ingredientCount: parsedIngredients.length,
          totalCalories: nutritionData.total.calories,
          servings: input.servings || 1
        });

        return nutritionData;

      } catch (error: unknown) {
        loggerWithContext.error('NUTRITION_SERVICE', 'Error analizando ingredientes con IA', error instanceof Error ? error : new Error(String(error)));
        // Fallback a cálculo local
        return this.calculateNutritionLocally(input.ingredients, input.servings || 1);
      }
    });
  }


  /**
   * Analiza la imagen de una receta usando IA multimodal (Gemini Vision)
   * y estima macronutrientes, calorías e ingredientes visibles.
   */
  static async analyzeRecipeImageWithAI(
    input: ImageNutritionAnalysisInput
  ): Promise<NutritionAnalysisResult & { detectedIngredients: string[] }> {
    const servings = Math.max(1, Math.min(100, Number(input.servings) || 1));
    const loggerWithContext = logger.withContext({
      recipeId: input.recipeId,
      servings,
      mimeType: input.mimeType,
    });

    return loggerWithContext.time("NUTRITION_SERVICE", "Analizando imagen de receta con IA", async () => {
      const contextLines: string[] = [];
      if (input.title?.trim()) contextLines.push(`- Título de la receta: ${input.title.trim()}`);
      if (input.description?.trim()) contextLines.push(`- Descripción: ${input.description.trim()}`);
      if (input.ingredients && input.ingredients.length > 0) {
        contextLines.push(`- Ingredientes indicados por el coach: ${input.ingredients.join(", ")}`);
      }

      const contextSection = contextLines.length > 0
        ? `\nCONTEXTO OPCIONAL PROPORCIONADO POR EL COACH (úsalos como referencia adicional junto con lo que ves en la foto):\n${contextLines.join("\n")}\n`
        : "";

      const userPrompt = `Analiza esta fotografía de un plato o receta y calcula su perfil nutricional estimado.
${contextSection}
INSTRUCCIONES:
1. Identifica visualmente los alimentos, ingredientes principales, método de cocción (ej. aceites/salsas visibles) y tamaño aproximado de la porción mostrada en la imagen.
2. Si el plato completo tiene ${servings} porción(es), estima los valores totales del plato mostrado ("total") y los valores por porción ("perServing" = total / ${servings}). Si no se indica otra cosa y la foto muestra un plato individual, asume que corresponde a ${servings} porción(es) razonable(s).
3. Desglosa cada ingrediente o componente visualmente identificado en "ingredients" con cantidad estimada, unidad ("g", "ml", "unidad", "cda") y su aporte nutricional.
4. Incluye también "detectedIngredients" como lista legible en español (ej. ["180g pechuga de pollo a la plancha", "100g aguacate", "1 cda aceite de oliva"]).
5. Calcula "ketoRatio" con los porcentajes aproximados de grasa, proteína y carbohidratos respecto al total de macronutrientes en gramos.

DEVUELVE ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "total": {
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "calories": 0
  },
  "perServing": {
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "calories": 0
  },
  "ingredients": [
    {
      "ingredient": "nombre del alimento",
      "quantity": 0,
      "unit": "g",
      "contribution": {
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "calories": 0,
        "percentage": 0
      }
    }
  ],
  "detectedIngredients": ["cantidad unidad ingrediente"],
  "servings": ${servings},
  "ketoRatio": {
    "fatPercentage": 0,
    "proteinPercentage": 0,
    "carbPercentage": 0,
    "isKetoFriendly": false
  }
}`;

      const aiResponse = await callGeminiImageAPI({
        systemPrompt:
          "Eres un nutricionista experto en análisis visual de alimentos, nutrición evolutiva/ancestral y cálculo de macronutrientes. Estima porciones y valores nutricionales con criterio realista a partir de imágenes de platos. Responde siempre con JSON válido.",
        userPrompt,
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
        temperature: 0.25,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        thinkingLevel: "low",
      });

      const parsed = robustJsonParse<Record<string, unknown>>(aiResponse.text);
      const normalized = this.normalizeImageNutritionResult(parsed, servings);

      loggerWithContext.info("NUTRITION_SERVICE", "Nutrición desde imagen calculada con IA", {
        perServingCalories: normalized.perServing.calories,
        detectedCount: normalized.detectedIngredients.length,
        servings,
      });

      return normalized;
    });
  }

  /**
   * Valida y normaliza el JSON devuelto por la IA para análisis de imagen
   */
  private static normalizeImageNutritionResult(
    raw: Record<string, unknown>,
    servings: number
  ): NutritionAnalysisResult & { detectedIngredients: string[] } {
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const round1 = (v: unknown) => Math.round(num(v) * 10) / 10;
    const round0 = (v: unknown) => Math.round(num(v));

    const totalRaw = (raw?.total && typeof raw.total === "object" ? raw.total : {}) as Record<string, unknown>;
    const perRaw = (raw?.perServing && typeof raw.perServing === "object" ? raw.perServing : {}) as Record<string, unknown>;

    const total: MacroTotals = {
      protein: round1(totalRaw.protein),
      carbs: round1(totalRaw.carbs),
      fat: round1(totalRaw.fat),
      calories: round0(totalRaw.calories),
    };

    const perServing: MacroTotals = {
      protein: round1(perRaw.protein ?? total.protein / servings),
      carbs: round1(perRaw.carbs ?? total.carbs / servings),
      fat: round1(perRaw.fat ?? total.fat / servings),
      calories: round0(perRaw.calories ?? total.calories / servings),
    };

    // Si la IA devolvió solo perServing y total vino en 0, reconstruir total
    if (total.calories === 0 && perServing.calories > 0) {
      total.protein = round1(perServing.protein * servings);
      total.carbs = round1(perServing.carbs * servings);
      total.fat = round1(perServing.fat * servings);
      total.calories = round0(perServing.calories * servings);
    }

    const ingredients: AnalyzedIngredientNutrition[] = Array.isArray(raw?.ingredients)
      ? raw.ingredients
          .filter((item): item is Record<string, unknown> =>
            Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).ingredient === "string")
          )
          .map((item) => {
            const contrib = (item.contribution && typeof item.contribution === "object"
              ? item.contribution
              : {}) as Record<string, unknown>;
            return {
              ingredient: String(item.ingredient).trim(),
              quantity: round1(item.quantity),
              unit: typeof item.unit === "string" && item.unit.trim() ? item.unit.trim() : "g",
              contribution: {
                protein: round1(contrib.protein),
                carbs: round1(contrib.carbs),
                fat: round1(contrib.fat),
                calories: round0(contrib.calories),
                percentage: round0(contrib.percentage),
              },
            };
          })
      : [];

    const detectedIngredients = Array.isArray(raw?.detectedIngredients)
      ? raw.detectedIngredients
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
      : ingredients.map((i) => `${i.quantity}${i.unit} ${i.ingredient}`);

    const ketoRaw = (raw?.ketoRatio && typeof raw.ketoRatio === "object"
      ? raw.ketoRatio
      : {}) as Record<string, unknown>;

    const totalMacros = total.protein + total.carbs + total.fat;
    const fatPercentage = totalMacros > 0 ? Math.round((total.fat / totalMacros) * 100) : round0(ketoRaw.fatPercentage);
    const proteinPercentage = totalMacros > 0 ? Math.round((total.protein / totalMacros) * 100) : round0(ketoRaw.proteinPercentage);
    const carbPercentage = totalMacros > 0 ? Math.round((total.carbs / totalMacros) * 100) : round0(ketoRaw.carbPercentage);

    return {
      total,
      perServing,
      ingredients,
      detectedIngredients,
      servings,
      ketoRatio: {
        fatPercentage,
        proteinPercentage,
        carbPercentage,
        isKetoFriendly:
          typeof ketoRaw.isKetoFriendly === "boolean"
            ? ketoRaw.isKetoFriendly
            : fatPercentage >= 60 && carbPercentage <= 15,
      },
    };
  }

  /**
   * Parsear ingredientes para extraer cantidades y nombres
   */
  private static parseIngredients(ingredients: string[]): ParsedIngredient[] {
    const parsed: ParsedIngredient[] = [];

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
    parsedIngredients: ParsedIngredient[],
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
    * Llamar a Gemini para análisis nutricional
    */
   private static async callGeminiForNutrition(prompt: string): Promise<string> {
     const result = await callGeminiAPI({
       systemPrompt: 'Eres un nutricionista especializado en análisis de alimentos y dieta keto. Devuelve siempre JSON válido con cálculos precisos.',
       userPrompt: prompt,
       temperature: 0.3,
       maxOutputTokens: 4000,
       responseMimeType: "application/json",
     });
     return result.text;
   }

  /**
   * Parsear respuesta de nutrición
   */
  private static parseNutritionResponse(response: string): NutritionAnalysisResult {
    try {
      const parsed = JSON.parse(response) as NutritionAnalysisResult;

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
  ): Promise<NutritionAnalysisResult> {
    const parsedIngredients = this.parseIngredients(ingredients);
    const nutritionDB = await this.getNutritionDatabase();

    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCalories = 0;

    const ingredientDetails: AnalyzedIngredientNutrition[] = [];

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
  private static async getNutritionDatabase(): Promise<NutritionDbEntry[]> {
    try {
      const collection = await getNutritionCollection();
      return (await collection.find({}).toArray()) as unknown as NutritionDbEntry[];
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
    nutritionDB: NutritionDbEntry[]
  ): Promise<MacroTotals> {
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
  private static getDefaultNutritionByCategory(ingredientName: string): MacroTotals {
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

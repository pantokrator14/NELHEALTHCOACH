// apps/api/src/app/lib/ai-service.ts
import { logger } from './logger';
import { decryptFileObject, encrypt, safeDecrypt } from './encryption';
import { getRecipesCollection } from './database';
import { 
  PersonalData, 
  MedicalData, 
  AIRecommendationSession,
  AIRecommendationWeek,
  ChecklistItem
} from '../../../../../packages/types/src/healthForm';
import { ObjectId } from 'mongodb';

// Interfaces para la respuesta de IA (igual que antes)
interface AIResponseWeek {
  weekNumber: number;
  nutrition: {
    focus: string;
    checklistItems: AIResponseNutritionItem[];
    shoppingList: Array<{item: string; quantity: string; priority: string}>;
  };
  exercise: {
    focus: string;
    checklistItems: Array<{
      description: string;
      type?: string;
      details?: {
        frequency?: string;
        duration?: string;
        equipment?: string[];
      };
    }>;
  };
  habits: {
    checklistItems: Array<{
      description: string;
      type: 'toAdopt' | 'toEliminate';
    }>;
    trackingMethod?: string;
    motivationTip?: string;
  };
}

interface AIResponse {
  summary: string;
  vision: string;
  baselineMetrics: {
    currentLifestyle: string[];
    targetLifestyle: string[];
  };
  weeks: AIResponseWeek[];
}

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  baseURL?: string;
}

export interface AIAnalysisInput {
  personalData: PersonalData;
  medicalData: MedicalData;
  documents?: Array<{
    content?: string;
    name: string;
    title?: string;
    type?: string;
    confidence?: number;
    pageCount?: number;
    language?: string;
  }>;
  previousSessions?: AIRecommendationSession[];
  currentProgress?: {
    overallProgress: number;
    metrics?: {
      nutritionAdherence: number;
      exerciseConsistency: number;
      habitFormation: number;
      weightProgress?: number;
      energyLevel?: number;
      sleepQuality?: number;
    };
  };
  coachNotes?: string;
  documentHistory?: Array<{
    processedAt: string;
    status: string;
    processedBy?: string;
    confidence?: number;
  }>;
}

// Interfaz para receta desencriptada
interface DecryptedRecipe {
  _id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  cookTime: number;
  difficulty: string;
  image: {
    url: string;
    key: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
  } | null;
  category: string[];
  tags: string[];
}

export interface AIResponseNutritionItem {
  description: string;
  type?: string;
  frequency?: number;
  recipeId?: string;
  details?: {
    recipe?: {
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    };
    frequency?: string;
    duration?: string;
    equipment?: string[];
    // Campos adicionales para nutrición cetogénica terapéutica
    macros?: {
      protein?: string;
      fat?: string;
      carbs?: string;
      ratio?: string; // Ej: "75% grasa, 20% proteína, 5% carbos"
    };
    calories?: number;
    metabolicPurpose?: string; // Explicación breve del propósito metabólico
    // Campos adicionales para entrenamiento físico inteligente
    sets?: number;
    repetitions?: string; // Puede ser un rango "8-12"
    timeUnderTension?: string;
    progression?: string; // Progresión de carga o intensidad
  };
}



export class AIService {
  private static config: AIConfig = {
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 30000, // Aumentado significativamente para planes de 12 semanas
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
  };

  // ===== MÉTODO AUXILIAR PARA BUSCAR RECETAS =====
  private static async findBestMatchingRecipe(description: string): Promise<DecryptedRecipe | null> {
    // (Igual que antes, no cambia)
    try {
      const collection = await getRecipesCollection();

      const results = await collection
        .find(
          { $text: { $search: description } },
          { projection: { score: { $meta: "textScore" } } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(1)
        .toArray();

      if (results.length === 0) return null;

      const bestMatch = results[0];
      const score = bestMatch.score;

      if (score < 1.5) return null;

      return {
        _id: bestMatch._id.toString(),
        title: safeDecrypt(bestMatch.title),
        description: safeDecrypt(bestMatch.description),
        ingredients: Array.isArray(bestMatch.ingredients)
          ? bestMatch.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(bestMatch.instructions)
          ? bestMatch.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: bestMatch.nutrition,
        cookTime: bestMatch.cookTime,
        difficulty: safeDecrypt(bestMatch.difficulty),
        image: bestMatch.image ? decryptFileObject(bestMatch.image) : null,
        category: Array.isArray(bestMatch.category)
          ? bestMatch.category.map((cat: string) => safeDecrypt(cat))
          : [],
        tags: Array.isArray(bestMatch.tags)
          ? bestMatch.tags.map((tag: string) => safeDecrypt(tag))
          : [],
      };
    } catch (error) {
      logger.error('AI_SERVICE', 'Error en búsqueda de recetas', error);
      return null;
    }
  }

  /**
   * Busca recetas similares en la base de datos antes de crear una nueva
   * @param description Descripción/título de la receta
   * @param recipeDetails Detalles de la receta (ingredientes, preparación, etc.)
   * @returns ID de receta similar o null si no se encuentra
   */
  private static async findSimilarRecipe(
    description: string,
    recipeDetails: AIResponseNutritionItem['details']
  ): Promise<string | null> {
    try {
      const collection = await getRecipesCollection();
      
      // Validar recipeDetails
      if (!recipeDetails) return null;
      
      // Limpiar título para búsqueda
      let title = description;
      const mealPrefixMatch = description.match(/^(Desayuno|Almuerzo|Cena|Merienda|Snack|Breakfast|Lunch|Dinner|Snack):\s*/i);
      if (mealPrefixMatch) {
        title = description.substring(mealPrefixMatch[0].length).trim();
      }
      
      // Extraer ingredientes de la receta
      const recipe = recipeDetails.recipe;
      if (!recipe || !recipe.ingredients) {
        return null;
      }
      
      const ingredientNames = recipe.ingredients.map((ing: any) => 
        (ing.name || '').toLowerCase().trim()
      ).filter((name: string) => name.length > 0);
      
      // 1. Búsqueda por título usando texto completo
      const titleSearch = await collection
        .find(
          { $text: { $search: title } },
          { projection: { score: { $meta: "textScore" }, _id: 1 } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(5)
        .toArray();
      
      // Si hay coincidencia fuerte en título (score > 2), usarla
      if (titleSearch.length > 0 && titleSearch[0].score > 2) {
        logger.debug('AI_SERVICE', 'Receta similar encontrada por título', {
          title,
          score: titleSearch[0].score,
          recipeId: titleSearch[0]._id.toString()
        });
        return titleSearch[0]._id.toString();
      }
      
      // 2. Búsqueda por ingredientes principales (primeros 3 ingredientes)
      if (ingredientNames.length > 0) {
        const mainIngredients = ingredientNames.slice(0, 3);
        
        // Buscar recetas que contengan estos ingredientes en el campo ingredients
        const ingredientQueries = mainIngredients.map((ingredient: string) => ({
          ingredients: { $regex: ingredient, $options: 'i' }
        }));
        
        const ingredientSearch = await collection
          .find({
            $or: ingredientQueries
          })
          .limit(5)
          .toArray();
        
        // Si encontramos recetas con al menos 2 ingredientes principales en común
        if (ingredientSearch.length > 0) {
          // Calcular similitud más precisa
          for (const recipeDoc of ingredientSearch) {
            const encryptedIngredients = Array.isArray(recipeDoc.ingredients) 
              ? recipeDoc.ingredients 
              : [];
            
            const decryptedIngredients = encryptedIngredients.map((ing: string) => 
              safeDecrypt(ing).toLowerCase()
            );
            
            // Contar ingredientes en común
            const commonIngredients = ingredientNames.filter((ing: string) => 
              decryptedIngredients.some((decrypted: string) => decrypted.includes(ing) || ing.includes(decrypted))
            );
            
            // Si al menos 2 ingredientes principales coinciden
            if (commonIngredients.length >= Math.min(2, ingredientNames.length)) {
              logger.debug('AI_SERVICE', 'Receta similar encontrada por ingredientes', {
                title,
                commonIngredients,
                recipeId: recipeDoc._id.toString()
              });
              return recipeDoc._id.toString();
            }
          }
        }
      }
      
      // 3. Búsqueda por autor "AI-NelHealthCoach" con título similar (sin prefijo)
      const authorEncrypted = encrypt('AI-NelHealthCoach');
      const authorSearch = await collection
        .find({
          author: authorEncrypted,
          $text: { $search: title }
        })
        .limit(3)
        .toArray();
      
      if (authorSearch.length > 0) {
        // Verificar similitud de título después de desencriptar
        for (const recipeDoc of authorSearch) {
          const decryptedTitle = safeDecrypt(recipeDoc.title);
          // Comparación simple de palabras clave
          const titleWords = title.toLowerCase().split(/\s+/);
          const decryptedWords = decryptedTitle.toLowerCase().split(/\s+/);
          
          const commonWords = titleWords.filter(word => 
            decryptedWords.some(dw => dw.includes(word) || word.includes(dw))
          );
          
          // Si al menos 2 palabras clave coinciden
          if (commonWords.length >= Math.min(2, titleWords.length)) {
            logger.debug('AI_SERVICE', 'Receta AI similar encontrada', {
              title,
              decryptedTitle,
              recipeId: recipeDoc._id.toString()
            });
            return recipeDoc._id.toString();
          }
        }
      }
      
      logger.debug('AI_SERVICE', 'No se encontraron recetas similares', { title });
      return null;
      
    } catch (error) {
      logger.error('AI_SERVICE', 'Error buscando recetas similares', error);
      return null;
    }
  }

  /**
   * Analiza los datos del cliente y genera recomendaciones
   */
  static async analyzeClientAndGenerateRecommendations(
    input: AIAnalysisInput,
    monthNumber: number = 1,
    metadata?: { requestId?: string; clientId?: string; isRegeneration?: boolean; previousSessionId?: string; }
  ): Promise<AIRecommendationSession> {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    

    
    return loggerWithContext.time('AI_SERVICE', metadata?.isRegeneration ? '🔄 Regenerando recomendaciones' : '🚀 Generando recomendaciones', async () => {
        let totalWeeksToGenerate = 12; // Todas las nuevas sesiones son de 12 semanas (3 meses)
        
        // Si es regeneración, usar el total de semanas de la sesión anterior
        if (metadata?.isRegeneration && metadata.previousSessionId && input.previousSessions) {
          const previousSession = input.previousSessions.find(s => s.sessionId === metadata.previousSessionId);
          if (previousSession?.totalWeeks) {
            totalWeeksToGenerate = previousSession.totalWeeks;
            console.log('=== DEBUG: Regeneración - usando totalWeeks de sesión anterior:', totalWeeksToGenerate);
          }
        }
        
      try {
        
        console.log('=== DEBUG: ' + (metadata?.isRegeneration ? 'REGENERACIÓN' : 'GENERACIÓN') + ' de recomendaciones ===');
        
        if (metadata?.isRegeneration) {
          console.log('🔄 MODO REGENERACIÓN ACTIVADO');
          console.log('📋 Previous Session ID:', metadata.previousSessionId);
          console.log('📝 Coach Notes:', input.coachNotes?.substring(0, 100) || 'No hay');
        }
    
        // Validar configuración
        if (!this.config.apiKey) {
          throw new Error('API key no configurada. Configure DEEPSEEK_API_KEY en las variables de entorno.');
        }

        loggerWithContext.info('AI_SERVICE', 'Iniciando generación de recomendaciones', {
          monthNumber,
          hasDocuments: input.documents?.length || 0,
          hasPreviousSessions: input.previousSessions?.length || 0
        });

        // Preparar prompt optimizado
        const prompt = this.buildAnalysisPrompt(input, monthNumber, totalWeeksToGenerate);
        
        loggerWithContext.debug('AI_SERVICE', 'Prompt construido para IA', {
          model: this.config.model,
          tokenCount: Math.ceil(prompt.length / 4),
          temperature: this.config.temperature,
          monthNumber
        });

        // Llamar a DeepSeek API
        console.log('=== DEBUG: Llamando a DeepSeek API ===');
        let aiResponse: string;
        try {
          aiResponse = await this.callDeepSeekAPI(prompt, metadata);
        } catch (apiError: any) {
           console.log('=== DEBUG: Error en API, usando fallback ===');
           console.log('Error:', apiError.message);
            return this.getFallbackRecommendations(input, monthNumber, metadata, totalWeeksToGenerate);
        }

        // Validar respuesta
        if (!aiResponse || aiResponse.trim() === '') {
          throw new Error('Respuesta vacía de la API de DeepSeek');
        }

        let parsedResponse;
        try {
          parsedResponse = this.parseAIResponse(aiResponse, metadata);
        } catch (parseError: any) {
           console.log('=== DEBUG: Error parseando respuesta, usando fallback ===');
           loggerWithContext.error('AI_SERVICE', 'Error parseando respuesta de IA', parseError);
             return this.getFallbackRecommendations(input, monthNumber, metadata, totalWeeksToGenerate);
        }

        // Validar estructura
        if (!parsedResponse || !parsedResponse.weeks || !Array.isArray(parsedResponse.weeks)) {
          throw new Error('La respuesta de IA no tiene la estructura esperada (weeks)');
        }

        console.log('=== DEBUG: Convirtiendo y encriptando estructura ===');

        // Buscar recetas en BD para cada ítem de nutrición (esto se hará después de construir el checklist)
        // Por ahora solo marcamos recipeId si encontramos coincidencia

        // ===== NUEVA LÓGICA: Construir semanas y checklist plano con groupId global =====
        const groupMapping: Record<string, string> = {}; // clave: "categoria_indice" -> groupId
        const allChecklistItems: ChecklistItem[] = [];
        const weeks: AIRecommendationWeek[] = [];
        const savedRecipeIds = new Map<string, string>(); // description -> recipeId (para recetas generadas por IA)

        // Función auxiliar para obtener o crear groupId
        const getOrCreateGroupId = (category: string, index: number): string => {
          const key = `${category}_${index}`;
          if (!groupMapping[key]) {
            groupMapping[key] = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          return groupMapping[key];
        };

        // Primera pasada: recorrer semanas para construir el checklist y también las semanas (sin items)
        for (let weekIndex = 0; weekIndex < parsedResponse.weeks.length; weekIndex++) {
          const weekResp = parsedResponse.weeks[weekIndex];
           const weekNumber = (weekResp.weekNumber || (weekIndex + 1)) as AIRecommendationWeek['weekNumber'];

          // ---- Nutrición ----
          if (weekResp.nutrition?.checklistItems && Array.isArray(weekResp.nutrition.checklistItems)) {
            // Usar for loop para permitir await y evitar problemas de iteración
            for (let itemIndex = 0; itemIndex < weekResp.nutrition.checklistItems.length; itemIndex++) {
              const item = weekResp.nutrition.checklistItems[itemIndex];
              const groupId = getOrCreateGroupId('nutrition', itemIndex);
              
              // Determinar recipeId: si ya tiene uno, usarlo; si no, guardar receta generada por IA
              let recipeId = item.recipeId;
              
              // Si el item tiene detalles de receta pero no recipeId, guardar en BD
              if (item.details?.recipe && !recipeId) {
                const description = item.description || '';
                // Verificar si ya guardamos una receta con esta descripción (para evitar duplicados en la misma generación)
                if (savedRecipeIds.has(description)) {
                  recipeId = savedRecipeIds.get(description)!;
                } else {
                  // Guardar receta generada por IA
                  const savedRecipeId = await this.saveAIRecipe(item.details, description);
                  if (savedRecipeId) {
                    recipeId = savedRecipeId;
                    savedRecipeIds.set(description, recipeId);
                  }
                }
              }

              allChecklistItems.push({
                id: `nutrition_${weekIndex}_${itemIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                groupId,
                description: encrypt(item.description || ''),
                completed: false,
                weekNumber,
                category: 'nutrition',
                type: item.type || 'meal',
                frequency: item.frequency || 1,
                recipeId,
                details: item.details ? (() => {
                  const { recipe, frequency, duration, equipment, ...additional } = item.details;
                  const detailsObj: any = {};
                  if (recipe) {
                    detailsObj.recipe = {
                      ingredients: (recipe.ingredients || []).map((ing: any) => ({
                        name: encrypt(ing.name || ''),
                        quantity: encrypt(ing.quantity || ''),
                        notes: ing.notes ? encrypt(ing.notes) : undefined
                      })),
                      preparation: encrypt(recipe.preparation || ''),
                      tips: recipe.tips ? encrypt(recipe.tips) : undefined
                    };
                  }
                  if (frequency) detailsObj.frequency = encrypt(frequency);
                  if (duration) detailsObj.duration = encrypt(duration);
                  if (equipment) detailsObj.equipment = equipment.map((eq: string) => encrypt(eq));
                  // Campos adicionales (macros, calories, metabolicPurpose, sets, repetitions, etc.)
                  if (Object.keys(additional).length > 0) {
                    detailsObj.additionalDetails = encrypt(JSON.stringify(additional));
                  }
                  return detailsObj;
                })() : undefined,
                isRecurring: true
              });
            }
          }

          // ---- Ejercicio ----
          if (weekResp.exercise?.checklistItems && Array.isArray(weekResp.exercise.checklistItems)) {
            (weekResp.exercise.checklistItems as any[]).forEach((item: any, itemIndex: number) => {
              const groupId = getOrCreateGroupId('exercise', itemIndex);
              allChecklistItems.push({
                id: `exercise_${weekIndex}_${itemIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                groupId,
                description: encrypt(item.description || ''),
                completed: false,
                weekNumber,
                category: 'exercise',
                type: item.type || 'routine',
                details: item.details ? (() => {
                  const { frequency, duration, equipment, ...additional } = item.details;
                  const detailsObj: any = {};
                  if (frequency) detailsObj.frequency = encrypt(frequency);
                  if (duration) detailsObj.duration = encrypt(duration);
                  if (equipment) detailsObj.equipment = equipment.map((eq: string) => encrypt(eq));
                  // Campos adicionales (sets, repetitions, timeUnderTension, progression, etc.)
                  if (Object.keys(additional).length > 0) {
                    detailsObj.additionalDetails = encrypt(JSON.stringify(additional));
                  }
                  return detailsObj;
                })() : undefined,
                isRecurring: true
              });
            });
          }

          // ---- Hábitos ----
          if (weekResp.habits?.checklistItems && Array.isArray(weekResp.habits.checklistItems)) {
            (weekResp.habits.checklistItems as any[]).forEach((item: any, itemIndex: number) => {
              const groupId = getOrCreateGroupId('habit', itemIndex);
              allChecklistItems.push({
                id: `habit_${weekIndex}_${itemIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                groupId,
                description: encrypt(item.description || ''),
                completed: false,
                weekNumber,
                category: 'habit',
                type: item.type || (itemIndex % 2 === 0 ? 'toAdopt' : 'toEliminate'),
                isRecurring: true
              });
            });
          }

          // ---- Construir la semana SOLO con metadatos (sin checklistItems) ----
          weeks.push({
            weekNumber,
            nutrition: {
              focus: encrypt(weekResp.nutrition?.focus || 'Nutrición keto'),
              shoppingList: (weekResp.nutrition?.shoppingList || []).map((item: any) => ({
                item: encrypt(item.item || item.name || ''),
                quantity: encrypt(item.quantity || item.amount || ''),
                priority: item.priority || 'medium'
              }))
            },
            exercise: {
              focus: encrypt(weekResp.exercise?.focus || 'Ejercicio adaptado'),
              equipment: (weekResp.exercise?.equipment || []).map((eq: string) => encrypt(eq))
            },
            habits: {
              trackingMethod: weekResp.habits?.trackingMethod ? encrypt(weekResp.habits.trackingMethod) : undefined,
              motivationTip: weekResp.habits?.motivationTip ? encrypt(weekResp.habits.motivationTip) : undefined
            }
          });
        }

        console.log('=== DEBUG: Buscando recetas en BD para items de nutrición ===');
        // Opcional: buscar recetas en BD y actualizar los items que tengan recipeId
        // Podríamos recorrer allChecklistItems y para cada uno de nutrición, si no tiene recipeId, buscar.
        // Pero eso ya se hace en el frontend al agregar items manualmente. Lo dejamos como opcional.

        console.log('=== DEBUG: Creando sesión completa ===');
        
        // totalWeeksToGenerate ya definida al inicio de la función (12 semanas para nuevas sesiones)
        
        // Crear sesión
        const sessionId = metadata?.isRegeneration 
          ? `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
        const session: AIRecommendationSession = {
          sessionId,
          monthNumber,
          totalWeeks: totalWeeksToGenerate,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
          summary: encrypt(parsedResponse.summary || 'Resumen no disponible'),
          vision: encrypt(parsedResponse.vision || 'Visión no disponible'),
          baselineMetrics: parsedResponse.baselineMetrics || {
            currentLifestyle: ['Sin datos'],
            targetLifestyle: ['Mejora general']
          },
          weeks,
          checklist: allChecklistItems,
          // Campos de regeneración
          ...(metadata?.isRegeneration && {
            regenerationCount: 1,
            regenerationHistory: [{
              timestamp: new Date(),
              previousSessionId: metadata.previousSessionId || '',
              coachNotes: input.coachNotes || '',
              triggeredBy: 'coach'
            }]
          })
        };

        loggerWithContext.info('AI_SERVICE', 
          metadata?.isRegeneration ? '✅ Recomendaciones regeneradas exitosamente' : '✅ Recomendaciones generadas exitosamente', 
          {
            sessionId: session.sessionId,
            monthNumber,
            weekCount: session.weeks.length,
            checklistItemCount: session.checklist.length,
            model: this.config.model,
            isRegeneration: metadata?.isRegeneration || false
          }
        );

        return session;

      } catch (error: any) {
        console.log('=== DEBUG: Error en analyzeClientAndGenerateRecommendations ===');
        console.log('Error:', error.message);
        
        loggerWithContext.error('AI_SERVICE', 'Error generando recomendaciones', error, {
          monthNumber,
          hasDocuments: input.documents?.length || 0
        });
        
        return this.getFallbackRecommendations(input, monthNumber, metadata, totalWeeksToGenerate);
      }
    });
  }

  /**
   * Construye el prompt optimizado para DeepSeek (experto multidisciplinario en salud integral)
   */
    private static buildAnalysisPrompt(input: AIAnalysisInput, monthNumber: number, totalWeeks: number = 12): string {
     const { personalData, medicalData, documents, previousSessions, currentProgress, coachNotes } = input;
     
     // Extraer información crítica del cliente (optimizado)
     const clientName = this.safeDecryptString(personalData.name) || 'cliente';
     const clientAge = this.safeDecryptString(personalData.age) || 'no especificada';
     const clientWeight = personalData.weight ? parseFloat(this.safeDecryptString(personalData.weight)) : null;
     const clientHeight = personalData.height ? parseFloat(this.safeDecryptString(personalData.height)) : null;
     const bmi = clientWeight && clientHeight ? (clientWeight / ((clientHeight/100) ** 2)).toFixed(1) : null;
     
     // Calcular nivel de experiencia
     const experienceLevel = this.calculateExperienceLevel(previousSessions, currentProgress);
     
      // Determinar si generamos plan completo de 12 semanas (todas las nuevas sesiones son 12 semanas)
      const isFull12WeekPlan = totalWeeks === 12;
      const startWeek = 1; // Siempre comenzar desde semana 1 para la sesión actual
      const endWeek = totalWeeks; // Terminar en el total de semanas
    
    // ===== SISTEMA Y ROL =====
    const systemRole = `Eres experto en nutrición keto terapéutica y ejercicio inteligente. Crea un plan de 12 semanas (3 meses) para ${clientName} (nivel: ${experienceLevel}). Incluye:
1. NUTRICIÓN KETO TERAPÉUTICA: Elimina azúcar, alcohol, gluten, procesados. Prioriza alimentos orgánicos. 3 comidas/día. Incluye macros, calorías y propósito metabólico.
2. EJERCICIO INTELIGENTE: Miércoles, sábado, domingo. Incluye sets, repeticiones, progresión.
3. HÁBITOS: 1-2 hábitos semanales (adoptar/eliminar).

Genera 12 semanas detalladas con progresión clara.`;

    // ===== REGLAS ABSOLUTAS =====
    const absoluteRules = `REGLAS:
1. SOLO JSON: {summary, vision, baselineMetrics, weeks}
2. Español. Descripciones concisas (≤50-100 chars según nivel).
3. Campos obligatorios:
   • Nutrición: macros (protein, fat, carbs, ratio), calories, metabolicPurpose.
   • Ejercicio: sets, repetitions, timeUnderTension, progression.
   • Hábitos: type: 'toAdopt' o 'toEliminate'.
4. Usa nombres de recetas existentes: "Omelette espinacas queso", "Salmón horneado verduras", "Ensalada aguacate pollo".`;

    // ===== ADAPTACIONES POR NIVEL =====
    const levelConfigs = {
      principiante: {
        enfoque: 'Fundamentos keto, hábitos básicos, ejercicio sencillo',
        progresion: '1 nuevo item/semana',
        dieta: 'Keto estándar (75%G/20%P/5%C)',
        descMax: '50 chars',
        recetaMaxIng: '5 ingredientes',
        ejercicio: 'Cuerpo libre, caminatas, movilidad',
        habitos: 'Hidratación, sueño, exposición solar'
      },
      intermedio: {
        enfoque: 'Refinamiento técnico, variedad ejercicios',
        progresion: '2-4 items/semana, variar preparaciones',
        dieta: 'Keto + posible ciclado carbos (1-2 días/semana)',
        descMax: '75 chars',
        recetaMaxIng: '7 ingredientes',
        ejercicio: 'Pesos, intervalos, movilidad avanzada',
        habitos: 'Gestión estrés, planificación comidas'
      },
      avanzado: {
        enfoque: 'Optimización avanzada, periodización',
        progresion: '3-4 items/semana, intensidad máxima',
        dieta: 'Keto dirigida, ayuno intermitente opcional',
        descMax: '100 chars',
        recetaMaxIng: '10 ingredientes',
        ejercicio: 'Fuerza avanzada, HIIT, recuperación',
        habitos: 'Meditación, diario gratitud, gestión tiempo'
      }
    };
    
    const config = levelConfigs[experienceLevel];
    const levelAdaptations = `NIVEL: ${experienceLevel.toUpperCase()}
• Enfoque: ${config.enfoque}
• Progresión: ${config.progresion}
• Dieta: ${config.dieta}
• Descripciones: ≤${config.descMax}, recetas: ≤${config.recetaMaxIng}
• Ejercicio: ${config.ejercicio}
• Hábitos: ${config.habitos}`;

    // ===== INFORMACIÓN CLIENTE =====
    const clientInfo = `${clientName}, ${clientAge}a${clientWeight ? `, ${clientWeight}kg` : ''}${clientHeight ? `, ${clientHeight}cm` : ''}${bmi ? ` (IMC:${bmi})` : ''}
Ocupación: ${this.safeDecryptString(personalData.occupation) || 'N/A'}
Ubicación: ${this.safeDecryptString(personalData.address) || 'N/A'}
Nivel: ${experienceLevel}
Plan: ${isFull12WeekPlan ? '12 semanas (3 meses) completo' : `Mes ${monthNumber} (semanas ${startWeek}-${endWeek})`}`;

    // ===== DATOS MÉDICOS ESENCIALES =====
    const medicalInfo = this.formatMedicalDataConcise(medicalData);
    
    // ===== OBJETIVOS Y ESTILO DE VIDA =====
    const lifestyleAndObjectives = this.formatLifestyleAndObjectives(medicalData, personalData);
    
    // ===== INSIGHTS DE EVALUACIONES DE SALUD =====
    const healthAssessmentInsights = this.formatHealthAssessmentInsights(medicalData);
    
    // ===== INSIGHTS DE SALUD MENTAL =====
    const mentalHealthInsights = this.formatMentalHealthInsights(medicalData);
    
    // ===== DOCUMENTOS MÉDICOS =====
    let docsInfo = '';
    if (documents && documents.length > 0) {
      const relevantDocs = documents.filter(d => 
        d.content && d.content.length > 50 && (d.confidence || 0) > 60
      ).slice(0, 2); // Solo 2 documentos máximo
      
      if (relevantDocs.length > 0) {
        docsInfo = '\n📄 DOCUMENTOS MÉDICOS (análisis e interpretación):';
        relevantDocs.forEach((doc, i) => {
          docsInfo += `\n${i+1}. ${doc.title || 'Documento'}: `;
          // Extraer solo puntos clave (primeros 300 chars)
          const content = doc.content || '';
          const keyPoints = content.split(/[.!?]/).slice(0, 3).join('. ');
          docsInfo += keyPoints.substring(0, 150) + (keyPoints.length > 150 ? '...' : '');
        });
        docsInfo += '\n• Proporciona interpretación clara y recomendaciones específicas basadas en estos documentos.';
      }
    }

    // ===== HISTORIAL ANTERIOR =====
    let historyInfo = '';
    if (previousSessions && previousSessions.length > 0) {
      const lastSession = previousSessions[previousSessions.length - 1];
      historyInfo = `\n📊 SESIÓN ANTERIOR (Mes ${lastSession.monthNumber}):`;
      
      // Progreso general
      if (lastSession.checklist) {
        const completed = lastSession.checklist.filter((item: any) => item.completed).length;
        const total = lastSession.checklist.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        historyInfo += ` ${progress}% completado`;
      }
      
      // Hábitos más difíciles (últimos 3 incompletos)
      const incomplete = lastSession.checklist
        ?.filter((item: any) => !item.completed)
        ?.slice(0, 3)
        ?.map((item: any) => {
          try {
            const desc = this.safeDecryptString(item.description) || '';
            return desc.substring(0, 30) + (desc.length > 30 ? '...' : '');
          } catch {
            return 'Item incompleto';
          }
        }) || [];
      
      if (incomplete.length > 0) {
        historyInfo += `\n⚠️ Dificultades: ${incomplete.join(', ')}`;
      }
    }

    // ===== CONTEXTO ACTUAL =====
    let contextInfo = '';
    if (currentProgress) {
      contextInfo = `\n📈 Progreso actual: ${currentProgress.overallProgress || 0}%`;
      if (currentProgress.metrics) {
        contextInfo += `\n📊 Métricas: Nutrición ${currentProgress.metrics.nutritionAdherence || 0}% ` +
                     `| Ejercicio ${currentProgress.metrics.exerciseConsistency || 0}% ` +
                     `| Hábitos ${currentProgress.metrics.habitFormation || 0}%`;
      }
    }

    // ===== NOTAS DEL COACH =====
    let notesInfo = '';
    if (coachNotes && coachNotes.trim().length > 10) {
      notesInfo = `\n🗒️ Notas del coach: ${coachNotes.substring(0, 150)}${coachNotes.length > 150 ? '...' : ''}`;
    }

    // ===== ESQUEMA JSON =====
    const responseSchema = `\n🎯 JSON (estructura mínima):
{
  "summary": "Resumen estado cliente",
  "vision": "Resultados esperados tras ${isFull12WeekPlan ? '12 semanas' : '4 semanas'}",
  "baselineMetrics": {
    "currentLifestyle": ["hábito1", "hábito2"],
    "targetLifestyle": ["objetivo1", "objetivo2"]
  },
  "weeks": [{
    "weekNumber": ${startWeek}, // Genera ${totalWeeks} semanas
    "nutrition": {
      "focus": "Enfoque nutricional semana",
      "checklistItems": [{
        "description": "Receta o alimento",
        "type": "breakfast/lunch/dinner/snack",
        "frequency": 3,
        "details": {
          "recipe": {
            "ingredients": [{"name": "ingrediente", "quantity": "cantidad"}],
            "preparation": "Instrucciones",
            "tips": "Consejos"
          },
          "macros": {"protein": "XXg", "fat": "XXg", "carbs": "XXg", "ratio": "75%G/20%P/5%C"},
          "calories": 500,
          "metabolicPurpose": "Propósito metabólico"
        }
      }],
      "shoppingList": [{"item": "ingrediente", "quantity": "cantidad", "priority": "high/medium/low"}]
    },
    "exercise": {
      "focus": "Enfoque ejercicio",
      "checklistItems": [{
        "description": "Ejercicio específico",
        "type": "strength/cardio/flexibility",
        "details": {
          "frequency": "veces/semana",
          "duration": "duración",
          "equipment": ["equipo"],
          "sets": 3,
          "repetitions": "8-12",
          "timeUnderTension": "30-40s",
          "progression": "Progresión siguiente semana"
        }
      }]
    },
    "habits": {
      "checklistItems": [
        {"description": "Hábito adoptar", "type": "toAdopt"},
        {"description": "Hábito eliminar", "type": "toEliminate"}
      ],
      "trackingMethod": "Método seguimiento",
      "motivationTip": "Consejo motivación"
    }
  }]
}`;

  // ===== CONSIDERACIONES ESPECÍFICAS =====
  const specificConsiderations = `\n🔍 CONSIDERACIONES ESPECÍFICAS:
${medicalData.allergies ? `• Alergias: ${this.safeDecryptString(medicalData.allergies)}` : '• Sin alergias'}
${medicalData.medications ? `• Medicamentos: ${this.safeDecryptString(medicalData.medications)}` : '• Sin medicamentos'}
${medicalData.mainComplaint ? `• Queja principal: ${this.safeDecryptString(medicalData.mainComplaint)}` : ''}
${medicalData.surgeries ? `• Cirugías: ${this.safeDecryptString(medicalData.surgeries)}` : ''}
${personalData.occupation ? `• Impacto ocupación: ${this.safeDecryptString(personalData.occupation)}` : ''}
• Base de datos de recetas: El sistema tiene una base de datos de recetas cetogénicas. Sugiere nombres de recetas que puedan coincidir (ej: "Omelette de espinacas y queso", "Salmón al horno con verduras", "Ensalada de aguacate y pollo").`;

  // ===== CONSTRUCCIÓN DEL PROMPT FINAL =====
  const prompt = `${systemRole}

${absoluteRules}

${levelAdaptations}

${clientInfo}
${medicalInfo}
${lifestyleAndObjectives}
${healthAssessmentInsights}
${mentalHealthInsights}
${docsInfo}
${historyInfo}
${contextInfo}
${notesInfo}
${specificConsiderations}

${responseSchema}

📋 INSTRUCCIONES FINALES:
• Genera un plan realista, personalizado y progresivo adaptado al nivel ${experienceLevel}${isFull12WeekPlan ? ' para el plan completo de 12 semanas' : ` y mes ${monthNumber}`}.
• Considerar limitaciones físicas, nivel actividad actual, horarios, quién cocina, acceso alimentos.
• Alimentos accesibles en ${this.safeDecryptString(personalData.address) || 'la ubicación del cliente'}.
• Ejercicio: Si cliente ya realiza actividad regularmente, NO repetirla. Recomendar actividades complementarias.
• Hábitos: Priorizar hábitos que aborden evaluaciones de salud positivas e insights de salud mental.
• Cada recomendación debe tener conexión clara con datos del cliente. Evitar genéricos.
• ¡Sorprende con creatividad, detalles y un enfoque integral! Usa colores mentalmente (pero solo JSON).

🚀 DEVUELVE SOLO JSON, SIN TEXTO ADICIONAL.`;

  console.log('📝 Prompt optimizado (experto multidisciplinario) - Longitud:', prompt.length);
  const estimatedTokens = Math.ceil(prompt.length / 4);
  console.log('📝 Tokens estimados:', estimatedTokens);
  console.log('🤖 Modelo configurado:', this.config.model);
  
  // Advertencia si el prompt es muy largo
  if (estimatedTokens > 25000) {
    console.warn('⚠️  Prompt muy largo (>25k tokens estimados). Considerar optimizar.');
  }
  
  return prompt;
  }

  /**
   * Calcula el peso ideal basado en altura y género
   */
  private static calculateIdealWeight(height: number, gender: string): string {
    // (igual que antes)
    let idealWeight: number;
    
    if (gender.toLowerCase().includes('mujer') || gender.toLowerCase().includes('femenino')) {
      idealWeight = 45.5 + 0.91 * (height - 152.4);
    } else {
      idealWeight = 50 + 0.91 * (height - 152.4);
    }
    
    const bmiBasedWeight = 22 * Math.pow(height / 100, 2);
    const finalWeight = Math.round((idealWeight + bmiBasedWeight) / 2);
    
    return `${finalWeight} kg`;
  }

  /**
   * Calcula el porcentaje de grasa corporal ideal
   */
  private static calculateIdealBodyFat(age: string, gender: string): string {
    const ageNum = parseInt(age) || 30;
    
    if (gender.toLowerCase().includes('mujer') || gender.toLowerCase().includes('femenino')) {
      if (ageNum < 30) return '21-24%';
      else if (ageNum < 40) return '22-25%';
      else if (ageNum < 50) return '24-27%';
      else return '25-28%';
    } else {
      if (ageNum < 30) return '14-17%';
      else if (ageNum < 40) return '16-19%';
      else if (ageNum < 50) return '18-21%';
      else return '20-23%';
    }
  }

  /**
   * Calcula el nivel de experiencia del cliente basado en historial y progreso
   */
  private static calculateExperienceLevel(
    previousSessions?: AIRecommendationSession[],
    currentProgress?: { overallProgress: number; metrics?: any }
  ): 'principiante' | 'intermedio' | 'avanzado' {
    if (!previousSessions || previousSessions.length === 0) {
      return 'principiante';
    }
    
    const sessionCount = previousSessions.length;
    const totalMonths = sessionCount; // Asumiendo 1 sesión por mes
    
    // Calcular tasa de éxito promedio
    let avgProgress = 0;
    if (currentProgress?.overallProgress) {
      avgProgress = currentProgress.overallProgress;
    } else if (previousSessions.length > 0) {
      // Estimar progreso basado en checklist completado
      const lastSession = previousSessions[previousSessions.length - 1];
      if (lastSession.checklist && lastSession.checklist.length > 0) {
        const completed = lastSession.checklist.filter(item => item.completed).length;
        avgProgress = (completed / lastSession.checklist.length) * 100;
      }
    }
    
    // Lógica de nivel
    if (totalMonths >= 6 || avgProgress >= 80) {
      return 'avanzado'; // 6+ meses o alta adherencia
    } else if (totalMonths >= 3 || avgProgress >= 50) {
      return 'intermedio'; // 3-5 meses o adherencia moderada
    }
    
    return 'principiante'; // Menos de 3 meses o baja adherencia
  }

  /**
   * Obtiene mejoras objetivo basadas en datos médicos
   */
  private static getTargetImprovements(medicalData: MedicalData): string[] {
    const improvements: string[] = [];
    
    if (medicalData.mainComplaint) {
      const complaint = this.safeDecryptString(medicalData.mainComplaint).toLowerCase();
      if (complaint.includes('fatiga') || complaint.includes('cansancio')) {
        improvements.push('Energía');
      }
      if (complaint.includes('peso') || complaint.includes('obesidad') || complaint.includes('sobrepeso')) {
        improvements.push('Composición corporal');
      }
      if (complaint.includes('sueño') || complaint.includes('insomnio')) {
        improvements.push('Calidad del sueño');
      }
      if (complaint.includes('estrés') || complaint.includes('ansiedad')) {
        improvements.push('Manejo del estrés');
      }
      if (complaint.includes('digestión') || complaint.includes('intestino')) {
        improvements.push('Salud digestiva');
      }
    }
    
    if (this.getBooleanValue(medicalData.carbohydrateAddiction)) {
      improvements.push('Control de carbohidratos');
    }
    
    if (this.getBooleanValue(medicalData.leptinResistance)) {
      improvements.push('Sensibilidad hormonal');
    }
    
    if (improvements.length === 0) {
      improvements.push('Energía', 'Composición corporal', 'Salud general');
    }
    
    return improvements;
  }

  /**
   * Helper para obtener valor booleano de campos que pueden ser boolean o string
   */
  private static getBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const decrypted = this.safeDecryptString(value);
        return decrypted.toLowerCase() === 'true';
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Llama a la API de DeepSeek
   */
  private static async callDeepSeekAPI(
    prompt: string, 
    metadata?: { requestId?: string; clientId?: string },
    retryCount = 0
  ): Promise<string> {
    // (Igual que antes, no cambia)
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    const MAX_RETRIES = 1; // Número máximo de reintentos
    
    try {
      console.log('🔍 DEBUG: Llamando a DeepSeek API...');
      console.log('🔑 API Key presente:', !!this.config.apiKey);
      console.log('🤖 Modelo:', this.config.model);
      console.log('📝 Prompt length:', prompt.length);
      console.log('📝 Tokens estimados:', Math.ceil(prompt.length / 4));
      
      if (!this.config.apiKey) {
        throw new Error('DeepSeek API key no configurada');
      }

      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente médico especializado en nutrición keto, ejercicio y formación de hábitos. Devuelve siempre JSON válido con la estructura específica solicitada.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      };

      console.log('🌐 URL:', `${this.config.baseURL}/chat/completions`);
      console.log('📤 Request body size:', JSON.stringify(requestBody).length);
      
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200000); // 20 minutos para deepseek-reasoner
      
        try {
          const response = await fetch(`${this.config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

        clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        
        console.log('📡 Status:', response.status);
        console.log('📡 Status Text:', response.statusText);
        console.log('⏱️ Duración:', duration, 'ms');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error respuesta:', errorText.substring(0, 500));
          throw new Error(`DeepSeek API Error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const responseText = await response.text();
        console.log('📦 Raw response length:', responseText.length);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('❌ Error parseando respuesta JSON:', jsonError);
          console.error('📦 Texto que falló:', responseText.substring(0, 500));
          throw new Error('La respuesta de DeepSeek no es JSON válido');
        }
        
        console.log('📊 Token usage:', data.usage);
        console.log('📊 Finish reason:', data.choices?.[0]?.finish_reason);
        
        const finishReason = data.choices?.[0]?.finish_reason;
        let content = data.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('La respuesta de DeepSeek no contiene contenido');
        }

        if (finishReason === 'length') {
          console.warn('⚠️ Respuesta truncada por límite de tokens. Intentando reparar JSON...');
          const fixedJson = this.fixTruncatedJSON(content);
          try {
            const parsed = JSON.parse(fixedJson);
            console.log('✅ JSON reparado exitosamente');
            return JSON.stringify(parsed);
          } catch (e) {
            console.error('❌ No se pudo reparar el JSON truncado:', e);
            throw new Error('Respuesta truncada y no reparable');
          }
        }
        
        try {
          JSON.parse(content);
          console.log('✅ Contenido es JSON válido');
          return content;
        } catch (e) {
          console.error('❌ Contenido no es JSON válido:', content.substring(0, 300));
          throw new Error('El contenido de la respuesta no es JSON válido');
        }
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if ((fetchError.name === 'AbortError' || fetchError.message === 'terminated') && retryCount < MAX_RETRIES) {
          console.log(`⏰ Timeout o conexión terminada. Reintentando (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.callDeepSeekAPI(prompt, metadata, retryCount + 1);
        }
        
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error('💥 Error completo en callDeepSeekAPI:', error.message);
      console.error('💥 Error type:', error.constructor.name);
      console.error('💥 Stack:', error.stack);
      loggerWithContext.error('AI_SERVICE', 'Error en llamada a DeepSeek API', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Usando mock response para desarrollo');
        return this.getMockAIResponse();
      }
      
      throw error;
    }
  }

  /**
   * Método alternativo con timeout más corto para reintentar
   */
  private static async callDeepSeekWithShorterTimeout(
    prompt: string, 
    metadata?: { requestId?: string; clientId?: string }
  ): Promise<string> {
    // (Igual que antes)
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    try {
      console.log('🔁 REINTENTO: Llamando a DeepSeek API con timeout corto...');
      
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente médico especializado en nutrición keto. Devuelve SOLO JSON válido con estructura: summary, vision, baselineMetrics, weeks.'
          },
          {
            role: 'user',
            content: prompt.substring(0, 3000)
          }
        ],
        temperature: this.config.temperature,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 1.5 minutos para reintentos
      
      try {
        const response = await fetch(`${this.config.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('Sin contenido');
        }
        
        console.log('✅ Reintento exitoso');
        return content;
        
      } catch (retryError: any) {
        clearTimeout(timeoutId);
        throw retryError;
      }
      
    } catch (error: any) {
      console.error('❌ Reintento fallido:', error.message);
      
      console.log('🔄 Usando mock response después de reintento fallido');
      return this.getMockAIResponse();
    }
  }

  /**
   * Parsear respuesta JSON de la IA
   */
  private static parseAIResponse(response: string, metadata?: { requestId?: string; clientId?: string }): any {
    // (Igual que antes)
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    try {
      console.log('🔍 DEBUG parseAIResponse: Iniciando parseo');
      console.log('📝 Response length:', response.length);
      
      try {
        return JSON.parse(response);
      } catch (firstError) {
        console.log('⚠️ Primer intento falló, intentando limpiar JSON...');
        
        let jsonString = response;
        
        jsonString = jsonString.replace(/```json\s*/g, '');
        jsonString = jsonString.replace(/```\s*/g, '');
        
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        jsonString = this.fixTruncatedJSON(jsonString);
        
        console.log('📝 JSON limpiado (first 300 chars):', jsonString.substring(0, 300));
        
        return JSON.parse(jsonString);
      }
      
    } catch (error: any) {
      console.error('❌ ERROR en parseAIResponse:', error.message);
      
      const fallback = this.extractPartialResponse(response);
      if (fallback) {
        console.log('🔄 Usando respuesta parcial extraída');
        return fallback;
      }
      
      throw error;
    }
  }

  /**
   * Extraer todos los items del checklist (ahora simplemente devuelve el array, pero se mantiene por compatibilidad)
   */
  private static extractChecklistItems(weeks: AIRecommendationWeek[]): ChecklistItem[] {
    // Esta función ya no se usa porque el checklist se construye aparte, pero la dejamos por si acaso
    return [];
  }

  /**
   * Recomendaciones de fallback
   */
  private static getFallbackRecommendations(
    input: AIAnalysisInput, 
    monthNumber: number,
    metadata?: { requestId?: string; clientId?: string },
    totalWeeks: number = 4
  ): AIRecommendationSession {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    loggerWithContext.warn('AI_SERVICE', 'Usando recomendaciones de fallback');
    
    const sessionId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extraer datos básicos del cliente
    const decryptedPersonal = this.decryptPersonalData(input.personalData);
    const clientName = decryptedPersonal.name || 'el cliente';
    const clientAge = decryptedPersonal.age ? parseInt(decryptedPersonal.age) : 30;
    const clientWeight = decryptedPersonal.weight ? parseFloat(decryptedPersonal.weight) : 70;
    const clientHeight = decryptedPersonal.height ? parseFloat(decryptedPersonal.height) : 170;
    
    // Calcular nivel de experiencia
    const experienceLevel = this.calculateExperienceLevel(input.previousSessions, input.currentProgress);
    
    // Calcular visión a 1 año
    const idealWeight = this.calculateIdealWeight(clientHeight, decryptedPersonal.gender || '');
    const idealBodyFat = this.calculateIdealBodyFat(clientAge.toString(), decryptedPersonal.gender || '');
    
    // Crear semanas de fallback (sin checklistItems en las semanas)
    const weeks = this.createFallbackWeeks(totalWeeks);
    
    // Crear checklist plano de fallback (con groupIds)
    const allChecklistItems: ChecklistItem[] = [];
    const groupMapping: Record<string, string> = {};

    const getOrCreateGroupId = (category: string, index: number): string => {
      const key = `${category}_${index}`;
      if (!groupMapping[key]) {
        groupMapping[key] = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      return groupMapping[key];
    };

    // Simulamos semanas con items adaptados al nivel
    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      const w = weekNumber as AIRecommendationWeek['weekNumber'];
      let itemCount = weekNumber; // Base
      if (experienceLevel === 'intermedio') {
        itemCount = Math.min(4, weekNumber + 1); // 2,3,4,4
      } else if (experienceLevel === 'avanzado') {
        itemCount = Math.min(4, weekNumber + 2); // 3,4,4,4
      }
      // Asegurar mínimo 1
      if (itemCount < 1) itemCount = 1;

      // Nutrición
      for (let i = 0; i < itemCount; i++) {
        const groupId = getOrCreateGroupId('nutrition', i);
        let mealDesc = '';
        switch(i) {
          case 0: mealDesc = 'Desayuno: Huevos revueltos con espinacas'; break;
          case 1: mealDesc = 'Almuerzo: Ensalada de pollo con aguacate'; break;
          case 2: mealDesc = 'Cena: Salmón al horno con brócoli'; break;
          case 3: mealDesc = 'Merienda: Nueces y queso'; break;
        }
        allChecklistItems.push({
          id: `fallback_nutrition_${w}_${i}_${Date.now()}`,
          groupId,
          description: encrypt(mealDesc),
          completed: false,
          weekNumber: w,
          category: 'nutrition',
          type: i === 0 ? 'breakfast' : i === 1 ? 'lunch' : i === 2 ? 'dinner' : 'snack',
          frequency: 1,
          details: {
            recipe: {
              ingredients: [
                { name: encrypt('Huevos'), quantity: encrypt('2-3 unidades'), notes: encrypt('orgánicos') },
                { name: encrypt('Espinacas'), quantity: encrypt('1 taza'), notes: encrypt('frescas') }
              ],
              preparation: encrypt('Cocinar los huevos en mantequilla, agregar espinacas al final.'),
              tips: encrypt('Añadir sal y pimienta al gusto.')
            }
          },
          isRecurring: true
        });
      }

      // Ejercicio
      for (let i = 0; i < itemCount; i++) {
        const groupId = getOrCreateGroupId('exercise', i);
        let exerciseDesc = '';
        switch(i) {
          case 0: exerciseDesc = 'Caminata rápida 20 minutos'; break;
          case 1: exerciseDesc = 'Flexiones - 10 repeticiones'; break;
          case 2: exerciseDesc = 'Estiramientos 10 minutos'; break;
          case 3: exerciseDesc = 'Sentadillas - 15 repeticiones'; break;
        }
        allChecklistItems.push({
          id: `fallback_exercise_${w}_${i}_${Date.now()}`,
          groupId,
          description: encrypt(exerciseDesc),
          completed: false,
          weekNumber: w,
          category: 'exercise',
          type: i === 0 ? 'cardio' : i === 1 ? 'strength' : i === 2 ? 'flexibility' : 'strength',
          details: {
            frequency: encrypt('3 días por semana'),
            duration: encrypt(i === 0 ? '20 minutos' : '15 minutos'),
            equipment: [encrypt('Ninguno')]
          },
          isRecurring: true
        });
      }

      // Hábitos (adoptar y eliminar)
      for (let i = 0; i < itemCount; i++) {
        const groupIdAdopt = getOrCreateGroupId('habit_adopt', i);
        const groupIdEliminate = getOrCreateGroupId('habit_eliminate', i);
        
        let adoptHabit = '';
        switch(i) {
          case 0: adoptHabit = 'Beber 2 litros de agua al día'; break;
          case 1: adoptHabit = 'Dormir 7-8 horas por noche'; break;
          case 2: adoptHabit = 'Meditar 5 minutos al día'; break;
          case 3: adoptHabit = 'Registrar alimentos en diario'; break;
        }
        allChecklistItems.push({
          id: `fallback_habit_adopt_${w}_${i}_${Date.now()}`,
          groupId: groupIdAdopt,
          description: encrypt(adoptHabit),
          completed: false,
          weekNumber: w,
          category: 'habit',
          type: 'toAdopt',
          isRecurring: true
        });

        let eliminateHabit = '';
        switch(i) {
          case 0: eliminateHabit = 'Eliminar refrescos azucarados'; break;
          case 1: eliminateHabit = 'Reducir tiempo en pantallas antes de dormir'; break;
          case 2: eliminateHabit = 'Evitar snacks nocturnos'; break;
          case 3: eliminateHabit = 'Reducir consumo de alimentos procesados'; break;
        }
        allChecklistItems.push({
          id: `fallback_habit_eliminate_${w}_${i}_${Date.now()}`,
          groupId: groupIdEliminate,
          description: encrypt(eliminateHabit),
          completed: false,
          weekNumber: w,
          category: 'habit',
          type: 'toEliminate',
          isRecurring: true
        });
      }
    }

    // Resumen y visión mejorados
    const summary = `Análisis inicial para ${clientName}, ${clientAge} años (Nivel: ${experienceLevel}). Se recomienda enfoque keto progresivo adaptado al nivel de experiencia. El plan incluye alimentación basada en grasas saludables, ejercicio gradual y formación de hábitos sostenibles.`;

    const vision = `VISIÓN A 1 AÑO PARA ${clientName.toUpperCase()}:
    
Si sigue consistentemente las recomendaciones durante 12 meses, podrá alcanzar:

• PESO SALUDABLE: De ${clientWeight}kg actuales a ${idealWeight} (peso ideal para su estatura)
• COMPOSICIÓN CORPORAL: Reducción de grasa corporal hasta ${idealBodyFat}
• ENERGÍA: Niveles sostenidos durante todo el día sin caídas de energía
• SUEÑO: 7-8 horas de sueño reparador cada noche
• SALUD METABÓLICA: Mejora en marcadores de glucosa, colesterol y presión arterial
• HÁBITOS ESTABLECIDOS: Relación saludable con la comida y ejercicio integrado en rutina
• BIENESTAR GENERAL: Mejora en calidad de vida, relaciones sociales y manejo del estrés

El camino requiere consistencia, pero los beneficios en salud y bienestar serán transformadores.`;

    // Crear sesión
    const session: AIRecommendationSession = {
      sessionId,
      monthNumber,
      totalWeeks,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      summary: encrypt(summary),
      vision: encrypt(vision),
      baselineMetrics: {
        currentLifestyle: ['Dieta variable', 'Actividad física irregular', 'Hábitos inconsistentes'],
        targetLifestyle: ['Dieta keto adaptada', 'Ejercicio regular', 'Hábitos saludables establecidos']
      },
      weeks,
      checklist: allChecklistItems
    };
    
    loggerWithContext.info('AI_SERVICE', 'Fallback generado exitosamente', {
      sessionId,
      weekCount: weeks.length,
      checklistItemCount: allChecklistItems.length
    });
    
    return session;
  }

  /**
   * Crear semanas de fallback (solo metadatos)
   */
  private static createFallbackWeeks(totalWeeks: number = 4): AIRecommendationWeek[] {
    const weeks: AIRecommendationWeek[] = [];
    
    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      const weekNumber = (weekIndex + 1) as AIRecommendationWeek['weekNumber'];
      
      weeks.push({
        weekNumber,
        nutrition: {
          focus: encrypt(`Adaptación keto semana ${weekNumber}`),
          shoppingList: [
            { item: encrypt('Huevos'), quantity: encrypt('12 unidades'), priority: 'high' },
            { item: encrypt('Aguacates'), quantity: encrypt('3 unidades'), priority: 'high' }
          ]
        },
        exercise: {
          focus: encrypt(`Rutina progresiva semana ${weekNumber}`),
          equipment: [encrypt('Zapatos cómodos'), encrypt('Ropa deportiva')]
        },
        habits: {
          trackingMethod: encrypt('Registro en aplicación móvil o cuaderno'),
          motivationTip: encrypt('Cada pequeño cambio cuenta. Celebra tus logros diarios.')
        }
      });
    }

    return weeks;
  }

  // ===== MÉTODOS AUXILIARES =====

   private static safeDecryptString(value: any): string {
     if (!value || typeof value !== 'string') return '';
     try {
       return safeDecrypt(value);
     } catch {
       return value;
     }
   }

   private static safeDecryptAndParseArray(value: any): string[] {
     if (!value) return [];
     // If already an array (should not happen as stored encrypted, but just in case)
     if (Array.isArray(value)) {
       return value.map(item => typeof item === 'string' ? this.safeDecryptString(item) : String(item));
     }
     if (typeof value === 'string') {
       try {
         const decrypted = safeDecrypt(value);
         // Try to parse JSON array
         const parsed = JSON.parse(decrypted);
         if (Array.isArray(parsed)) {
           return parsed.map(item => typeof item === 'string' ? item : String(item));
         }
         // If not an array, treat as single string
         return [parsed];
       } catch {
         // If decryption or parsing fails, return empty array
         return [];
       }
     }
     return [];
   }

  private static decryptPersonalData(data: PersonalData): any {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        try {
          decrypted[key] = safeDecrypt(value);
        } catch {
          decrypted[key] = value;
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  private static formatMedicalDataConcise(data: any): string {
    if (!data) return '\nSin datos médicos';
    
    const criticalInfo = [];
    
    if (data.allergies) {
      const allergies = this.safeDecryptString(data.allergies);
      if (allergies.toLowerCase() !== 'ninguna' && allergies.toLowerCase() !== 'no') {
        criticalInfo.push(`Alergias: ${allergies}`);
      }
    }
    
    if (data.medications) {
      const meds = this.safeDecryptString(data.medications);
      if (meds.toLowerCase() !== 'ninguno' && meds.toLowerCase() !== 'no') {
        criticalInfo.push(`Medicamentos: ${meds}`);
      }
    }
    
    if (data.supplements) {
      const supplements = this.safeDecryptString(data.supplements);
      if (supplements.toLowerCase() !== 'ninguno' && supplements.toLowerCase() !== 'no') {
        criticalInfo.push(`Suplementos: ${supplements}`);
      }
    }
    
    if (data.mainComplaint) {
      criticalInfo.push(`Queja principal: ${this.safeDecryptString(data.mainComplaint)}`);
    }
    
    if (data.currentPastConditions) {
      const conditions = this.safeDecryptString(data.currentPastConditions);
      if (conditions.toLowerCase() !== 'ninguna' && conditions.toLowerCase() !== 'no' && conditions.trim().length > 5) {
        criticalInfo.push(`Condiciones actuales/pasadas: ${conditions.substring(0, 100)}${conditions.length > 100 ? '...' : ''}`);
      }
    }
    
    if (data.surgeries) {
      const surgeries = this.safeDecryptString(data.surgeries);
      if (surgeries.toLowerCase() !== 'ninguna') {
        criticalInfo.push(`Cirugías: ${surgeries}`);
      }
    }
    
    // Evaluaciones de salud (booleanas)
    const healthAssessments = [];
    if (this.getBooleanValue(data.carbohydrateAddiction)) {
      healthAssessments.push('Adicción a carbohidratos');
    }
    if (this.getBooleanValue(data.leptinResistance)) {
      healthAssessments.push('Resistencia a leptina');
    }
    if (this.getBooleanValue(data.circadianRhythms)) {
      healthAssessments.push('Alteración ritmos circadianos');
    }
    if (this.getBooleanValue(data.sleepHygiene)) {
      healthAssessments.push('Alteración higiene del sueño');
    }
    if (this.getBooleanValue(data.electrosmogExposure)) {
      healthAssessments.push('Exposición al electrosmog');
    }
    if (this.getBooleanValue(data.generalToxicity)) {
      healthAssessments.push('Toxicidad general');
    }
    if (this.getBooleanValue(data.microbiotaHealth)) {
      healthAssessments.push('Salud microbiota comprometida');
    }
    
    if (healthAssessments.length > 0) {
      criticalInfo.push(`Evaluaciones positivas: ${healthAssessments.join(', ')}`);
    }
    
    return criticalInfo.length > 0 
      ? '\nDatos médicos críticos:\n' + criticalInfo.join('\n')
      : '\nSin condiciones médicas críticas reportadas';
  }

  /**
   * Extrae información de estilo de vida y objetivos del cliente
   */
  private static formatLifestyleAndObjectives(medicalData: any, personalData: any): string {
    if (!medicalData && !personalData) return '';
    
    const sections = [];
    
    // ---- OBJETIVOS ----
    const objectives = [];
    
    // Motivación (puede ser un array de strings)
    if (medicalData.motivation) {
      const motivationArray = this.safeDecryptAndParseArray(medicalData.motivation);
      if (motivationArray.length > 0) {
        // Map values to human-readable labels using valueLabels from formConstants
        // Since we don't have direct access to valueLabels, we can use the values as is
        const readableMotivation = motivationArray.map(val => {
          // Convert kebab-case to readable text
          return val.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }).join(', ');
        objectives.push(`🎯 Motivación: ${readableMotivation}`);
      } else {
        // Fallback to string decryption for backward compatibility
        const motivation = this.safeDecryptString(medicalData.motivation);
        if (motivation && motivation.toLowerCase() !== 'ninguna' && motivation.trim().length > 3) {
          objectives.push(`🎯 Motivación: ${motivation}`);
        }
      }
    }
    
    // Nivel de compromiso (puede ser número o string)
    if (medicalData.commitmentLevel) {
      const commitment = this.safeDecryptString(medicalData.commitmentLevel);
      if (commitment && commitment.trim().length > 0) {
        objectives.push(`📊 Nivel compromiso: ${commitment}/10`);
      }
    }
    
    // Experiencia previa con coach (booleano o string)
    if (medicalData.previousCoachExperience) {
      const experience = this.safeDecryptString(medicalData.previousCoachExperience);
      if (experience && experience.toLowerCase() !== 'no' && experience.toLowerCase() !== 'false') {
        objectives.push(`👥 Experiencia previa con coach: ${experience}`);
      }
    }
    
    // Fecha límite / evento importante
    if (medicalData.targetDate) {
      const target = this.safeDecryptString(medicalData.targetDate);
      if (target && target.toLowerCase() !== 'ninguna' && target.trim().length > 3) {
        objectives.push(`📅 Fecha límite/evento: ${target}`);
      }
    }
    
    // ---- ESTILO DE VIDA ----
    const lifestyle = [];
    
    // Día típico entre semana
    if (medicalData.typicalWeekday) {
      const weekday = this.safeDecryptString(medicalData.typicalWeekday);
      if (weekday && weekday.trim().length > 10) {
        lifestyle.push(`📅 Día entre semana: ${weekday.substring(0, 120)}${weekday.length > 120 ? '...' : ''}`);
      }
    }
    
    // Día típico fin de semana
    if (medicalData.typicalWeekend) {
      const weekend = this.safeDecryptString(medicalData.typicalWeekend);
      if (weekend && weekend.trim().length > 10) {
        lifestyle.push(`🎉 Día fin de semana: ${weekend.substring(0, 100)}${weekend.length > 100 ? '...' : ''}`);
      }
    }
    
    // Quién cocina y frecuencia comer fuera
    if (medicalData.whoCooks) {
      const whoCooks = this.safeDecryptString(medicalData.whoCooks);
      if (whoCooks && whoCooks.trim().length > 5) {
        lifestyle.push(`🍳 Cocina/comer fuera: ${whoCooks.substring(0, 80)}${whoCooks.length > 80 ? '...' : ''}`);
      }
    }
    
    // Nivel actividad física
    if (medicalData.currentActivityLevel) {
      const activity = this.safeDecryptString(medicalData.currentActivityLevel);
      if (activity && activity.trim().length > 5) {
        lifestyle.push(`🏃 Actividad física: ${activity.substring(0, 100)}${activity.length > 100 ? '...' : ''}`);
      }
    }
    
    // Limitaciones físicas
    if (medicalData.physicalLimitations) {
      const limitations = this.safeDecryptString(medicalData.physicalLimitations);
      if (limitations && limitations.toLowerCase() !== 'ninguna' && limitations.trim().length > 5) {
        lifestyle.push(`⚠️ Limitaciones físicas: ${limitations.substring(0, 80)}${limitations.length > 80 ? '...' : ''}`);
      }
    }
    
    // Hobbies (está en medicalData)
    if (medicalData.hobbies) {
      const hobbies = this.safeDecryptString(medicalData.hobbies);
      if (hobbies && hobbies.toLowerCase() !== 'ninguno' && hobbies.trim().length > 5) {
        lifestyle.push(`🎭 Hobbies: ${hobbies.substring(0, 80)}${hobbies.length > 80 ? '...' : ''}`);
      }
    }
    
    // ---- INFORMACIÓN PERSONAL ADICIONAL ----
    const personal = [];
    
    if (personalData.maritalStatus) {
      const marital = this.safeDecryptString(personalData.maritalStatus);
      if (marital && marital.trim().length > 0) {
        personal.push(`💍 Estado civil: ${marital}`);
      }
    }
    
    if (personalData.education) {
      const education = this.safeDecryptString(personalData.education);
      if (education && education.trim().length > 0) {
        personal.push(`🎓 Educación: ${education}`);
      }
    }
    
    // ---- CONSTRUCCIÓN FINAL ----
    let result = '';
    
    if (objectives.length > 0) {
      result += '\n🎯 OBJETIVOS DEL CLIENTE:\n' + objectives.join('\n');
    }
    
    if (lifestyle.length > 0) {
      result += '\n🏡 ESTILO DE VIDA:\n' + lifestyle.join('\n');
    }
    
    if (personal.length > 0) {
      result += '\n👤 INFORMACIÓN PERSONAL:\n' + personal.join('\n');
    }
    
    // Salud mental resumida
    const mentalHealthFields = [
      'mentalHealthEmotionIdentification', 'mentalHealthEmotionIntensity', 'mentalHealthUncomfortableEmotion',
      'mentalHealthInternalDialogue', 'mentalHealthStressStrategies', 'mentalHealthSayingNo',
      'mentalHealthRelationships', 'mentalHealthExpressThoughts', 'mentalHealthEmotionalDependence',
      'mentalHealthPurpose', 'mentalHealthFailureReaction', 'mentalHealthSelfConnection',
      'mentalHealthSupportNetwork', 'mentalHealthDailyStress'
    ];
    
    const mentalHealthIssues = [];
    for (const field of mentalHealthFields) {
      if (medicalData[field]) {
        const value = this.safeDecryptString(medicalData[field]);
        if (value && value.toLowerCase() !== 'ninguno' && value.trim().length > 0) {
          // Simplificar: solo mencionar si hay problemas significativos
          if (value.includes('a)') || value.includes('rara vez') || value.includes('dificultad')) {
            mentalHealthIssues.push(field.replace('mentalHealth', '').replace(/([A-Z])/g, ' $1').trim());
          }
        }
      }
    }
    
    if (mentalHealthIssues.length > 0) {
      result += `\n🧠 ÁREAS DE SALUD MENTAL A CONSIDERAR: ${mentalHealthIssues.slice(0, 3).join(', ')}`;
    }
    
    return result || '\n📝 Sin información adicional de objetivos/estilo de vida';
  }

  /**
   * Genera insights y recomendaciones basadas en las evaluaciones de salud
   */
  private static formatHealthAssessmentInsights(medicalData: any): string {
    if (!medicalData) return '';
    
    const insights = [];
    
    // Mapeo de evaluación a recomendaciones de hábitos
    if (this.getBooleanValue(medicalData.carbohydrateAddiction)) {
      insights.push('Adicción a carbohidratos: Considerar hábitos para reducir consumo de azúcar, como evitar snacks dulces, reemplazar por grasas saludables, y comer comidas balanceadas con proteína y grasa.');
    }
    
    if (this.getBooleanValue(medicalData.leptinResistance)) {
      insights.push('Resistencia a leptina: Enfoque en hábitos que mejoren sensibilidad hormonal: horarios regulares de comidas, evitar snacks nocturnos, priorizar sueño de calidad, y exposición a luz solar matutina.');
    }
    
    if (this.getBooleanValue(medicalData.circadianRhythms)) {
      insights.push('Alteración ritmos circadianos: Hábitos para sincronizar reloj interno: exposición a luz solar al despertar, reducir luz artificial por la noche, horarios consistentes de sueño y comidas.');
    }
    
    if (this.getBooleanValue(medicalData.sleepHygiene)) {
      insights.push('Alteración higiene del sueño: Mejorar hábitos de sueño: apagar dispositivos 1 hora antes de dormir, mantener habitación oscura y fresca, evitar cenas pesadas, establecer rutina relajante.');
    }
    
    if (this.getBooleanValue(medicalData.electrosmogExposure)) {
      insights.push('Exposición al electrosmog: Reducir exposición a campos electromagnéticos: no llevar celular en bolsillo, usar modo avión al dormir, distancia de dispositivos electrónicos, tiempo en naturaleza.');
    }
    
    if (this.getBooleanValue(medicalData.generalToxicity)) {
      insights.push('Toxicidad general: Hábitos de detoxificación: hidratación adecuada, consumo de alimentos detox (brócoli, ajo, cúrcuma), sudar regularmente (ejercicio, sauna), reducir exposición a químicos.');
    }
    
    if (this.getBooleanValue(medicalData.microbiotaHealth)) {
      insights.push('Salud microbiota comprometida: Hábitos para mejorar salud intestinal: consumir alimentos fermentados, aumentar fibra soluble, masticar bien, gestionar estrés, considerar probióticos naturales.');
    }
    
    if (insights.length === 0) {
      return '';
    }
    
    return '\nInsights evaluaciones de salud (priorizar hábitos relacionados):\n' + insights.join('\n');
  }

  /**
   * Analiza respuestas de salud mental y genera insights para hábitos
   */
  private static formatMentalHealthInsights(medicalData: any): string {
    if (!medicalData) return '';
    
    const insights = [];
    
    // Función helper para extraer valor y categorizar
    const getValue = (field: string): string => {
      if (!medicalData[field]) return '';
      return this.safeDecryptString(medicalData[field]).toLowerCase().trim();
    };
    
    // Análisis de cada campo
    const emotionId = getValue('mentalHealthEmotionIdentification');
    if (emotionId.includes('c)') || emotionId === 'c' || emotionId.includes('rara vez')) {
      insights.push('Dificultad identificando emociones: Considerar hábitos de mindfulness, journaling emocional, pausas para check-in emocional durante el día.');
    }
    
    const emotionIntensity = getValue('mentalHealthEmotionIntensity');
    if (emotionIntensity.includes('a)') || emotionIntensity.includes('desbordan')) {
      insights.push('Emociones intensas que desbordan: Hábitos de regulación emocional: respiración profunda, pausas activas, técnicas de grounding, expresión creativa.');
    }
    
    const stressStrategies = getValue('mentalHealthStressStrategies');
    if (stressStrategies.includes('a)') || stressStrategies.includes('comer') || stressStrategies.includes('fumar') || stressStrategies.includes('pantallas')) {
      insights.push('Estrategias de estrés poco saludables: Reemplazar con alternativas saludables: caminata breve, llamar a un amigo, respiración, actividad creativa.');
    }
    
    const sayingNo = getValue('mentalHealthSayingNo');
    if (sayingNo.includes('a)') || sayingNo.includes('casi siempre')) {
      insights.push('Dificultad para decir "no": Practicar asertividad, establecer límites saludables, priorizar necesidades propias, comunicar límites con claridad.');
    }
    
    const stressLevel = getValue('mentalHealthDailyStress');
    if (stressLevel.includes('alto') || stressLevel.includes('muy-alto')) {
      insights.push('Nivel de estrés alto: Incorporar hábitos de gestión de estrés: meditación breve, pausas de 5 minutos, tiempo en naturaleza, desconexión digital.');
    }
    
    const supportNetwork = getValue('mentalHealthSupportNetwork');
    if (supportNetwork.includes('no') || supportNetwork.includes('solo/a')) {
      insights.push('Red de apoyo limitada: Fomentar conexión social: unirse a grupos de interés, programar contactos regulares, terapia o coaching, voluntariado.');
    }
    
    const selfConnection = getValue('mentalHealthSelfConnection');
    if (selfConnection.includes('c)') || selfConnection.includes('no')) {
      insights.push('Poca conexión consigo mismo/a: Establecer rutinas de autocuidado: meditación, tiempo a solas, journaling, actividades que generen flow.');
    }
    
    if (insights.length === 0) {
      return '';
    }
    
    return '\nInsights salud mental (priorizar hábitos relacionados):\n' + insights.join('\n');
  }

  private static getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Peso normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  private static fixTruncatedJSON(jsonString: string): string {
    jsonString = jsonString.trim();
    
    const openBraces = (jsonString.match(/{/g) || []).length;
    const closeBraces = (jsonString.match(/}/g) || []).length;
    const openBrackets = (jsonString.match(/\[/g) || []).length;
    const closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    let fixed = jsonString;
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      fixed += ']'.repeat(openBrackets - closeBrackets);
    }
    
    const quoteMatches = fixed.match(/"/g);
    const quoteCount = quoteMatches ? quoteMatches.length : 0;
    if (quoteCount % 2 !== 0) {
      fixed += '"';
    }
    
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {
      console.warn('No se pudo reparar el JSON, usando fallback');
      return JSON.stringify({
        summary: "Error al generar recomendaciones",
        vision: "Intenta de nuevo",
        baselineMetrics: { currentLifestyle: [], targetLifestyle: [] },
        weeks: []
      });
    }
  }

  private static extractPartialResponse(response: string): any {
    try {
      const summaryMatch = response.match(/"summary"\s*:\s*"([^"]*)"/);
      const visionMatch = response.match(/"vision"\s*:\s*"([^"]*)"/);
      
      if (summaryMatch || visionMatch) {
        console.log('🔍 Respuesta parcial encontrada');
        
        return {
          summary: summaryMatch ? summaryMatch[1].substring(0, 500) : 'Resumen no disponible',
          vision: visionMatch ? visionMatch[1].substring(0, 500) : 'Visión no disponible',
          baselineMetrics: {
            currentLifestyle: ['Información limitada'],
            targetLifestyle: ['Mejora general']
          },
          weeks: []
        };
      }
    } catch (error) {
      console.log('⚠️ No se pudo extraer respuesta parcial');
    }
    
    return null;
  }

  private static getMockAIResponse(): string {
    return JSON.stringify({
      summary: "Cliente con interés en mejorar su salud mediante dieta keto y hábitos saludables. Presenta fatiga y necesidad de control de peso.",
      vision: "VISIÓN A 1 AÑO: Al seguir consistentemente el plan, el cliente alcanzará su peso ideal, mejorará su energía, tendrá un sueño reparador y establecerá hábitos saludables sostenibles que transformarán su calidad de vida.",
      baselineMetrics: {
        currentLifestyle: ["Dieta alta en carbohidratos", "Sedentarismo", "Sueño irregular"],
        targetLifestyle: ["Dieta keto adaptada", "Actividad física regular", "Rutina de sueño consistente"]
      },
      weeks: [
        {
          weekNumber: 1,
          nutrition: {
            focus: "Eliminar azúcares y carbohidratos refinados",
            checklistItems: [
              {
                description: "Desayuno: Café negro o té + 2 huevos",
                type: "breakfast",
                details: {
                  recipe: {
                    ingredients: [
                      { name: "Huevos", quantity: "2 unidades", notes: "orgánicos" },
                      { name: "Mantequilla", quantity: "1 cucharada", notes: "para cocinar" }
                    ],
                    preparation: "Cocinar los huevos en mantequilla a fuego medio.",
                    tips: "Añadir sal marina al gusto"
                  }
                }
              }
            ],
            shoppingList: [
              { item: "Huevos", quantity: "12 unidades", priority: "high" },
              { item: "Mantequilla", quantity: "200g", priority: "high" }
            ]
          },
          exercise: {
            focus: "Movilidad básica y caminata",
            checklistItems: [
              {
                description: "Caminata rápida 20 minutos",
                type: "cardio",
                details: {
                  frequency: "3 días por semana",
                  duration: "20 minutos",
                  equipment: ["zapatos cómodos"]
                }
              }
            ]
          },
          habits: {
            checklistItems: [
              { description: "Beber 2 litros de agua al día", type: "toAdopt" },
              { description: "Eliminar refrescos azucarados", type: "toEliminate" }
            ]
          }
        }
      ]
    }, null, 2);
  }

  /**
   * Calcular progreso basado en checklist
   */
  static calculateProgress(checklist: any[] = []): number {
    if (!checklist.length) return 0;
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  }

  /**
   * Probar conexión con DeepSeek
   */
  static async testDeepSeekConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      console.log('🧪 Probando conexión con DeepSeek API...');
      
      if (!this.config.apiKey) {
        console.error('❌ ERROR: No hay API key configurada');
        clearTimeout(timeoutId);
        return false;
      }

      const response = await fetch(`${this.config.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📡 Status de prueba:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conexión exitosa. Modelos disponibles:', data.data?.length || 0);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Error en conexión:', errorText);
        return false;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('💥 Error de conexión:', error.message);
      return false;
    }
  }

  /**
   * Genera una lista de compras consolidada para una semana, usando IA para redondear a cantidades comerciales.
   */
  static async generateShoppingList(
    recipesWithFrequency: Array<{ recipeId: string; frequency: number }>
  ): Promise<Array<{ item: string; quantity: string; priority: string }>> {
    const loggerWithContext = logger.withContext({ method: 'generateShoppingList' });
    
    try {
      // 1. Obtener todas las recetas de la BD (desencriptadas)
      const recipes: Array<{ title: string; ingredients: string[]; frequency: number }> = [];
      for (const { recipeId, frequency } of recipesWithFrequency) {
        const recipe = await this.getRecipeById(recipeId);
        if (recipe) {
          recipes.push({
            title: recipe.title,
            ingredients: recipe.ingredients,
            frequency
          });
        } else {
          loggerWithContext.warn('generateShoppingList', `Receta no encontrada: ${recipeId}`);
        }
      }

      if (recipes.length === 0) {
        return [];
      }

      // 2. Construir el prompt para la IA
      const prompt = this.buildShoppingListPrompt(recipes);

      // 3. Llamar a DeepSeek
      const aiResponse = await this.callDeepSeekAPI(prompt);

      // 4. Parsear la respuesta JSON
      const parsed = this.parseShoppingListResponse(aiResponse);
      console.log('Lista generada por IA:', JSON.stringify(parsed, null, 2));
      return parsed;

    } catch (error: any) {
      loggerWithContext.error('generateShoppingList', 'Error generando lista de compras con IA', error);
      // Fallback: usar cálculo simple si la IA falla
      return this.generateShoppingListFallback(recipesWithFrequency);
    }
  }

  // Funciones auxiliares privadas

  private static async getRecipeById(recipeId: string): Promise<DecryptedRecipe | null> {
    try {
      const collection = await getRecipesCollection();
      const recipe = await collection.findOne({ _id: new ObjectId(recipeId) });
      if (!recipe) return null;

      return {
        _id: recipe._id.toString(),
        title: safeDecrypt(recipe.title),
        description: safeDecrypt(recipe.description),
        ingredients: Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(recipe.instructions)
          ? recipe.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: recipe.nutrition,
        cookTime: recipe.cookTime,
        difficulty: safeDecrypt(recipe.difficulty),
        image: recipe.image ? decryptFileObject(recipe.image) : null,
        category: Array.isArray(recipe.category)
          ? recipe.category.map((cat: string) => safeDecrypt(cat))
          : [],
        tags: Array.isArray(recipe.tags)
          ? recipe.tags.map((tag: string) => safeDecrypt(tag))
          : [],
      };
    } catch (error) {
      logger.error('getRecipeById', 'Error obteniendo receta', error);
      return null;
    }
  }

  private static buildShoppingListPrompt(recipes: Array<{ title: string; ingredients: string[]; frequency: number }>): string {
    let recipesText = '';
    recipes.forEach((r, idx) => {
      recipesText += `\nReceta ${idx + 1}: "${r.title}" (se prepara ${r.frequency} veces en la semana)\nIngredientes:\n`;
      r.ingredients.forEach(ing => {
        recipesText += `- ${ing}\n`;
      });
    });

    const prompt = `Eres un asistente que ayuda a crear listas de compras prácticas para el supermercado.
  A continuación se listan las recetas que se cocinarán durante la semana, con la frecuencia de cada una.
  Debes generar una lista de compras ÚNICA que consolide todos los ingredientes necesarios, teniendo en cuenta:

  - Suma las cantidades de cada ingrediente multiplicando por la frecuencia.
  - Redondea las cantidades a unidades de compra típicas (por ejemplo, si necesitas 350g de harina, escribe "1 kg"; si necesitas 3 cucharadas de mantequilla, escribe "1 barra (200-250g)"; si necesitas 6 huevos, escribe "6 unidades" o "media docena" según el contexto).
  - Si un ingrediente no tiene cantidad (ej. "sal al gusto"), simplemente inclúyelo sin cantidad (ej. "Sal").
  - Prioriza los productos en alta/media/baja según su importancia para las recetas (los básicos son alta prioridad, los complementarios media, los opcionales baja).

  Devuelve SOLO un array JSON con la siguiente estructura:
  [
    { "item": "nombre del producto", "quantity": "cantidad con unidad (ej. 1 kg, 2 unidades, 1 barra)", "priority": "high/medium/low" },
    ...
  ]

  No incluyas texto adicional, solo el JSON.`;

    return prompt + recipesText;
  }

  private static parseShoppingListResponse(response: string): Array<{ item: string; quantity: string; priority: string }> {
    try {
      // Limpiar la respuesta (posibles markdown)
      let jsonString = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return parsed.map(p => ({
          item: p.item || '',
          quantity: p.quantity || '',
          priority: p.priority || 'medium'
        }));
      }
      throw new Error('Respuesta no es un array');
    } catch (error) {
      logger.error('parseShoppingListResponse', 'Error parseando respuesta de IA', error);
      return [];
    }
  }

  private static async generateShoppingListFallback(
    recipesWithFrequency: Array<{ recipeId: string; frequency: number }>
  ): Promise<Array<{ item: string; quantity: string; priority: string }>> {
    // Implementación simple: suma ingredientes y redondea a entero (sin IA)
    const shoppingMap = new Map<string, { total: number; unit: string }>();

    for (const { recipeId, frequency } of recipesWithFrequency) {
      const recipe = await this.getRecipeById(recipeId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const { name, quantity, unit } = this.parseIngredientSimple(ing);
        if (quantity === 0) continue;
        const key = `${name}|${unit}`;
        const current = shoppingMap.get(key) || { total: 0, unit };
        shoppingMap.set(key, { total: current.total + quantity * frequency, unit });
      }
    }

    const result = [];
    for (const [key, value] of Array.from(shoppingMap.entries())) {
      const [name] = key.split('|');
      let total = value.total;
      const unit = value.unit;

      // Redondeo simple
      if (unit === 'g' || unit === 'ml') {
        total = Math.ceil(total / 100) * 100;
      } else if (unit === 'kg') {
        total = Math.ceil(total * 10) / 10;
      } else {
        total = Math.ceil(total);
      }

      result.push({
        item: name,
        quantity: `${total} ${unit}`.trim(),
        priority: 'medium'
      });
    }

    return result.sort((a, b) => a.item.localeCompare(b.item));
  }

  private static parseIngredientSimple(ingredientStr: string): { name: string; quantity: number; unit: string } {
    const str = ingredientStr.trim().toLowerCase();
    const match = str.match(/^(\d+(?:\.\d+)?|\d+\/\d+)?\s*([a-záéíóúñ]+)?\s*(?:de\s+)?(.*)$/i);
    if (!match) return { name: ingredientStr, quantity: 0, unit: '' };
    let quantity = 0;
    if (match[1]) {
      if (match[1].includes('/')) {
        const [num, den] = match[1].split('/').map(Number);
        quantity = num / den;
      } else {
        quantity = parseFloat(match[1]);
      }
    }
    const unit = match[2] || '';
    let name = match[3] || ingredientStr;
    name = name.replace(/^de\s+/, '').trim();
    return { name, quantity, unit };
  }

  static async generateShoppingListFromItems(
    nutritionItems: any[] // Items ya desencriptados
  ): Promise<Array<{ item: string; quantity: string; priority: string }>> {
    const loggerWithContext = logger.withContext({ method: 'generateShoppingListFromItems' });
    
    try {
      const recipes: Array<{ title: string; ingredients: string[]; frequency: number }> = [];

      for (const item of nutritionItems) {
        const frequency = item.frequency || 1;

        // Caso 1: Receta de base de datos (tiene recipeId)
        if (item.recipeId) {
          const recipe = await this.getRecipeById(item.recipeId);
          if (recipe) {
            recipes.push({
              title: recipe.title,
              ingredients: recipe.ingredients,
              frequency
            });
          } else {
            loggerWithContext.warn('generateShoppingList', `Receta no encontrada: ${item.recipeId}`);
          }
        }
        // Caso 2: Receta generada por IA (incrustada en details.recipe)
        else if (item.details?.recipe) {
          const recipeDetails = item.details.recipe;
          // Construir lista de ingredientes en formato legible
          const ingredients = recipeDetails.ingredients.map((ing: any) => {
            // ing.name y ing.quantity ya vienen desencriptados
            return `${ing.name}: ${ing.quantity}`;
          });
          
          recipes.push({
            title: item.description || 'Receta personalizada',
            ingredients,
            frequency
          });
        }
      }
      console.log('Recipes para IA:', JSON.stringify(recipes, null, 2));
      if (recipes.length === 0) {
        return [];
      }

      // Construir prompt y llamar a IA
      const prompt = this.buildShoppingListPrompt(recipes);
      const aiResponse = await this.callDeepSeekAPI(prompt);
      return this.parseShoppingListResponse(aiResponse);

    } catch (error: any) {
      loggerWithContext.error('generateShoppingListFromItems', 'Error generando lista de compras con IA', error);
      // Fallback: usar cálculo simple si la IA falla
      return this.generateShoppingListFallbackFromItems(nutritionItems);
    }
  }

  private static async generateShoppingListFallbackFromItems(
    nutritionItems: any[]
  ): Promise<Array<{ item: string; quantity: string; priority: string }>> {
    const shoppingMap = new Map<string, { total: number; unit: string }>();

    for (const item of nutritionItems) {
      const frequency = item.frequency || 1;
      let ingredientsList: string[] = [];

      if (item.recipeId) {
        const recipe = await this.getRecipeById(item.recipeId);
        if (recipe) {
          ingredientsList = recipe.ingredients;
        }
      } else if (item.details?.recipe) {
        // Convertir ingredientes de la receta IA a strings
        ingredientsList = item.details.recipe.ingredients.map((ing: any) => 
          `${ing.name}: ${ing.quantity}`
        );
      }

      for (const ingStr of ingredientsList) {
        const { name, quantity, unit } = this.parseIngredientSimple(ingStr);
        if (quantity === 0) continue;
        const key = `${name}|${unit}`;
        const current = shoppingMap.get(key) || { total: 0, unit };
        shoppingMap.set(key, { total: current.total + quantity * frequency, unit });
      }
    }

    const result = [];
    for (const [key, value] of Array.from(shoppingMap.entries())) {
      const [name] = key.split('|');
      let total = value.total;
      const unit = value.unit;

      if (unit === 'g' || unit === 'ml') {
        total = Math.ceil(total / 100) * 100;
      } else if (unit === 'kg') {
        total = Math.ceil(total * 10) / 10;
      } else {
        total = Math.ceil(total);
      }

      result.push({
        item: name,
        quantity: `${total} ${unit}`.trim(),
        priority: 'medium'
      });
    }

    return result.sort((a, b) => a.item.localeCompare(b.item));
  }

  /**
   * Guarda una receta generada por IA en la base de datos
   * @param recipeDetails Detalles de la receta desde AIResponseNutritionItem.details
   * @param description Descripción del item (puede usarse como título)
   * @returns ID de la receta guardada o null si falla
   */
  private static async saveAIRecipe(
    recipeDetails: AIResponseNutritionItem['details'],
    description: string
  ): Promise<string | null> {
    try {
      const collection = await getRecipesCollection();
      
      // 1. Buscar receta similar antes de crear nueva
      const similarRecipeId = await this.findSimilarRecipe(description, recipeDetails);
      if (similarRecipeId) {
        logger.info('AI_SERVICE', 'Receta similar encontrada, usando existente', {
          recipeId: similarRecipeId,
          description
        });
        return similarRecipeId;
      }
      
      // Extraer información de la receta
      if (!recipeDetails) {
        logger.warn('AI_SERVICE', 'recipeDetails es undefined, no se guarda receta', { description });
        return null;
      }
      const recipe = recipeDetails.recipe;
      if (!recipe || !recipe.ingredients || !recipe.preparation) {
        logger.warn('AI_SERVICE', 'Receta incompleta, no se guarda', { description });
        return null;
      }

      // Título: usar description o generar uno
      let title = description;
      // Limpiar título (quitar prefijo como "Desayuno:", "Almuerzo:", etc.)
      const mealPrefixMatch = description.match(/^(Desayuno|Almuerzo|Cena|Merienda|Snack|Breakfast|Lunch|Dinner|Snack):\s*/i);
      if (mealPrefixMatch) {
        title = description.substring(mealPrefixMatch[0].length).trim();
      }
      if (title.length > 100) title = title.substring(0, 100);

      // Ingredientes: convertir array de objetos a strings
      const ingredients = recipe.ingredients.map((ing: any) => {
        let str = `${ing.name || 'Ingrediente'}: ${ing.quantity || 'al gusto'}`;
        if (ing.notes && ing.notes.trim()) {
          str += ` (${ing.notes})`;
        }
        return str;
      });

      // Instrucciones: separar por puntos o saltos de línea
      const preparation = recipe.preparation || '';
      const instructions = preparation
        .split(/[.!?]+/)
        .filter((s: string) => s.trim().length > 5)
        .map((s: string) => s.trim() + '.');
      if (instructions.length === 0) {
        instructions.push(preparation.trim());
      }

      // Nutrición: extraer macros y calorías
      const macros = recipeDetails.macros || {};
      const calories = recipeDetails.calories || 0;
      
      // Parsear valores numéricos de macros (ej. "20g" -> 20)
      const parseMacro = (macroStr: string | undefined): number => {
        if (!macroStr || typeof macroStr !== 'string') return 0;
        const match = macroStr.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      };

      const nutrition = {
        protein: parseMacro(macros.protein),
        carbs: parseMacro(macros.carbs),
        fat: parseMacro(macros.fat),
        calories: typeof calories === 'number' ? calories : parseFloat(calories) || 0
      };

      // Calcular tiempo de cocina aproximado basado en preparación (default 30 min)
      let cookTime = 30;
      const prepLower = preparation.toLowerCase();
      if (prepLower.includes('rápido') || prepLower.includes('quick') || prepLower.includes('5 min') || prepLower.includes('10 min')) {
        cookTime = 15;
      } else if (prepLower.includes('horno') || prepLower.includes('slow') || prepLower.includes('lento') || prepLower.includes('60 min')) {
        cookTime = 60;
      }

      // Dificultad estimada
      let difficulty = 'medium';
      if (ingredients.length <= 3 && preparation.length < 100) {
        difficulty = 'easy';
      } else if (ingredients.length > 6 || prepLower.includes('complej') || prepLower.includes('advanced')) {
        difficulty = 'hard';
      }

      // Categorías y tags
      const category = ['keto', 'AI-generated'];
      const tags = ['ai-generated', 'keto', 'health'];
      // Añadir etiquetas basadas en descripción
      if (description.toLowerCase().includes('desayuno') || description.toLowerCase().includes('breakfast')) {
        tags.push('breakfast');
      } else if (description.toLowerCase().includes('almuerzo') || description.toLowerCase().includes('lunch')) {
        tags.push('lunch');
      } else if (description.toLowerCase().includes('cena') || description.toLowerCase().includes('dinner')) {
        tags.push('dinner');
      } else if (description.toLowerCase().includes('snack') || description.toLowerCase().includes('merienda')) {
        tags.push('snack');
      }

      // Construir objeto de receta encriptado
      const encryptedRecipeData: any = {
        title: encrypt(title),
        description: encrypt(recipe.tips ? `${preparation}\n\nConsejo: ${recipe.tips}` : preparation),
        category: category.map((cat: string) => encrypt(cat)),
        ingredients: ingredients.map((ing: string) => encrypt(ing)),
        instructions: instructions.map((inst: string) => encrypt(inst)),
        nutrition,
        cookTime,
        difficulty: encrypt(difficulty),
        author: encrypt('AI-NelHealthCoach'),
        isPublished: true,
        tags: tags.map((tag: string) => encrypt(tag)),
        createdAt: new Date(),
        updatedAt: new Date(),
        image: {
          url: '',
          key: '',
          name: '',
          type: '',
          size: 0,
          uploadedAt: new Date().toISOString()
        }
      };

      // Insertar en BD
      const result = await collection.insertOne(encryptedRecipeData);
      const recipeId = result.insertedId.toString();

      logger.info('AI_SERVICE', 'Receta generada por IA guardada exitosamente', {
        recipeId,
        title,
        ingredientsCount: ingredients.length
      });

      return recipeId;

    } catch (error: any) {
      logger.error('AI_SERVICE', 'Error guardando receta generada por IA', error);
      return null;
    }
  }
}
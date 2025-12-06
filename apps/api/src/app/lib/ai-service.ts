// apps/api/src/app/lib/ai-service.ts
import { logger } from './logger';
import { decrypt, encrypt, safeDecrypt } from './encryption';
import { 
  PersonalData, 
  MedicalData, 
  UploadedFile,
  TextractAnalysis,
  AIRecommendationSession,
  ClientAIProgress,
  AIRecommendationWeek,
  ChecklistItem
} from '../../../../../packages/types/src/healthForm';

// Nuevas interfaces para la respuesta de IA
interface AIWeekResponse {
  weekNumber: number;
  nutrition: {
    focus: string;
    checklistItems: Array<{
      description: string;
      type?: string;
      details?: {
        recipe?: {
          ingredients: Array<{name: string; quantity: string; notes?: string}>;
          preparation: string;
          tips?: string;
        };
        frequency?: string;
        duration?: string;
      };
    }>;
    shoppingList: Array<{item: string; quantity: string; priority: 'high' | 'medium' | 'low'}>;
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
    name: string;
    textractAnalysis?: TextractAnalysis;
  }>;
  previousSessions?: AIRecommendationSession[];
  currentProgress?: ClientAIProgress;
  coachNotes?: string;
}

export class AIService {
  private static config: AIConfig = {
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4000,
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
  };

  /**
  * Analiza los datos del cliente y genera recomendaciones
  */
  static async analyzeClientAndGenerateRecommendations(
    input: AIAnalysisInput,
    monthNumber: number = 1,
    metadata?: {
      requestId?: string;
      clientId?: string;
    }
  ): Promise<AIRecommendationSession> {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    return loggerWithContext.time('AI_SERVICE', 'Generar recomendaciones', async () => {
      try {
        console.log('=== DEBUG: Iniciando generación de recomendaciones ===');
        
        // ===== 1. VALIDAR CONFIGURACIÓN =====
        if (!this.config.apiKey) {
          throw new Error('API key no configurada. Configure DEEPSEEK_API_KEY en las variables de entorno.');
        }

        loggerWithContext.info('AI_SERVICE', 'Iniciando generación de recomendaciones', {
          monthNumber,
          hasDocuments: input.documents?.length || 0,
          hasPreviousSessions: input.previousSessions?.length || 0
        });

        // ===== 2. PREPARAR PROMPT =====
        const prompt = this.buildAnalysisPrompt(input, monthNumber);
        
        loggerWithContext.debug('AI_SERVICE', 'Prompt construido para IA', {
          model: this.config.model,
          tokenCount: Math.ceil(prompt.length / 4),
          temperature: this.config.temperature,
          monthNumber
        });

        // ===== 3. LLAMAR A DEEPSEEK API =====
        console.log('=== DEBUG: Llamando a DeepSeek API ===');
        let aiResponse: string;
        try {
          aiResponse = await this.callDeepSeekAPI(prompt, metadata);
        } catch (apiError: any) {
          console.log('=== DEBUG: Error en API, usando fallback ===');
          console.log('Error:', apiError.message);
          // Si falla la API, usar respuestas de fallback
          return this.getFallbackRecommendations(input, monthNumber, metadata);
        }

        // ===== 4. VALIDAR Y PARSEAR RESPUESTA =====
        if (!aiResponse || aiResponse.trim() === '') {
          throw new Error('Respuesta vacía de la API de DeepSeek');
        }

        let parsedResponse;
        try {
          parsedResponse = this.parseAIResponse(aiResponse, metadata);
        } catch (parseError: any) {
          console.log('=== DEBUG: Error parseando respuesta, usando fallback ===');
          loggerWithContext.error('AI_SERVICE', 'Error parseando respuesta de IA', parseError);
          return this.getFallbackRecommendations(input, monthNumber, metadata);
        }

        // ===== 5. VALIDAR ESTRUCTURA =====
        if (!parsedResponse || !parsedResponse.weeks || !Array.isArray(parsedResponse.weeks)) {
          throw new Error('La respuesta de IA no tiene la estructura esperada (weeks)');
        }

        console.log('=== DEBUG: Convirtiendo y encriptando estructura ===');
        const weeks: AIRecommendationWeek[] = [];
        
        for (let weekIndex = 0; weekIndex < parsedResponse.weeks.length; weekIndex++) {
          const weekResp = parsedResponse.weeks[weekIndex];
          
          // Asegurar que existan las propiedades
          const nutrition = weekResp.nutrition || { 
            focus: 'Nutrición keto', 
            checklistItems: [], 
            shoppingList: [] 
          };
          
          const exercise = weekResp.exercise || { 
            focus: 'Ejercicio adaptado', 
            checklistItems: [] 
          };
          
          const habits = weekResp.habits || { 
            checklistItems: [] 
          };

          // ===== NUTRICIÓN - CREAR CHECKLIST ITEMS ENCRIPTADOS =====
          const nutritionChecklistItems: ChecklistItem[] = [];
          if (nutrition.checklistItems && Array.isArray(nutrition.checklistItems)) {
            nutrition.checklistItems.forEach((item: any, itemIndex: number) => {
              nutritionChecklistItems.push({
                id: `nutrition_${weekIndex}_${itemIndex}_${Date.now()}`,
                description: encrypt(item.description || ''),
                completed: false,
                weekNumber: weekResp.weekNumber || (weekIndex + 1),
                category: 'nutrition' as const,
                type: item.type || 'meal',
                details: item.details ? {
                  recipe: item.details.recipe ? {
                    ingredients: (item.details.recipe.ingredients || []).map((ing: any) => ({
                      name: encrypt(ing.name || ''),
                      quantity: encrypt(ing.quantity || ''),
                      notes: ing.notes ? encrypt(ing.notes) : undefined
                    })),
                    preparation: encrypt(item.details.recipe.preparation || ''),
                    tips: item.details.recipe.tips ? encrypt(item.details.recipe.tips) : undefined
                  } : undefined
                } : undefined
              });
            });
          }

          // ===== EJERCICIO - CREAR CHECKLIST ITEMS ENCRIPTADOS =====
          const exerciseChecklistItems: ChecklistItem[] = [];
          if (exercise.checklistItems && Array.isArray(exercise.checklistItems)) {
            exercise.checklistItems.forEach((item: any, itemIndex: number) => {
              exerciseChecklistItems.push({
                id: `exercise_${weekIndex}_${itemIndex}_${Date.now()}`,
                description: encrypt(item.description || ''),
                completed: false,
                weekNumber: weekResp.weekNumber || (weekIndex + 1),
                category: 'exercise' as const,
                type: item.type || 'routine',
                details: item.details ? {
                  frequency: item.details.frequency ? encrypt(item.details.frequency) : undefined,
                  duration: item.details.duration ? encrypt(item.details.duration) : undefined,
                  equipment: item.details.equipment?.map((eq: string) => encrypt(eq))
                } : undefined
              });
            });
          }

          // ===== HÁBITOS - CREAR CHECKLIST ITEMS ENCRIPTADOS =====
          const habitsChecklistItems: ChecklistItem[] = [];
          if (habits.checklistItems && Array.isArray(habits.checklistItems)) {
            habits.checklistItems.forEach((item: any, itemIndex: number) => {
              habitsChecklistItems.push({
                id: `habit_${weekIndex}_${itemIndex}_${Date.now()}`,
                description: encrypt(item.description || ''),
                completed: false,
                weekNumber: weekResp.weekNumber || (weekIndex + 1),
                category: 'habit' as const,
                type: item.type || 'toAdopt'
              });
            });
          }

          // ===== CREAR SEMANA COMPLETA CON TODO ENCRIPTADO =====
          const week: AIRecommendationWeek = {
            weekNumber: (weekResp.weekNumber || (weekIndex + 1)) as 1 | 2 | 3 | 4,
            nutrition: {
              focus: encrypt(nutrition.focus || 'Nutrición keto'),
              checklistItems: nutritionChecklistItems,
              shoppingList: (nutrition.shoppingList || []).map((item: any) => ({
                item: encrypt(item.item || item.name || ''),
                quantity: encrypt(item.quantity || item.amount || ''),
                priority: item.priority || 'medium'
              }))
            },
            exercise: {
              focus: encrypt(exercise.focus || 'Ejercicio adaptado'),
              checklistItems: exerciseChecklistItems,
              equipment: (exercise.equipment || []).map((eq: string) => encrypt(eq))
            },
            habits: {
              checklistItems: habitsChecklistItems,
              trackingMethod: habits.trackingMethod ? encrypt(habits.trackingMethod) : undefined,
              motivationTip: habits.motivationTip ? encrypt(habits.motivationTip) : undefined
            }
          };

          weeks.push(week);
        }

        // ===== 6. CREAR CHECKLIST COMPLETO ENCRIPTADO =====
        const allChecklistItems: ChecklistItem[] = weeks.flatMap(week => [
          ...week.nutrition.checklistItems,
          ...week.exercise.checklistItems,
          ...week.habits.checklistItems
        ]);

        console.log('=== DEBUG: Creando sesión completa ===');
        
        // ===== 7. CREAR SESIÓN CON TODO ENCRIPTADO =====
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session: AIRecommendationSession = {
          sessionId,
          monthNumber,
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
          checklist: allChecklistItems
        };

        console.log('=== DEBUG: Sesión creada exitosamente ===');
        console.log('Session ID:', sessionId);
        console.log('Cantidad de semanas:', weeks.length);
        console.log('Total items en checklist:', allChecklistItems.length);
        
        loggerWithContext.info('AI_SERVICE', 'Recomendaciones generadas exitosamente', {
          sessionId,
          monthNumber,
          weekCount: session.weeks.length,
          checklistItemCount: session.checklist.length,
          model: this.config.model
        }, metadata);

        return session;

      } catch (error: any) {
        console.log('=== DEBUG: Error en analyzeClientAndGenerateRecommendations ===');
        console.log('Error:', error.message);
        
        loggerWithContext.error('AI_SERVICE', 'Error generando recomendaciones', error, {
          monthNumber,
          hasDocuments: input.documents?.length || 0,
          aiInfo: { model: this.config.model, monthNumber }
        }, metadata);
        
        // ===== 8. FALLBACK SEGURO ENCRIPTADO =====
        console.log('=== DEBUG: Usando fallback seguro ===');
        try {
          const fallback = this.getFallbackRecommendations(input, monthNumber, metadata);
          console.log('Fallback generado exitosamente');
          return fallback;
        } catch (fallbackError: any) {
          console.log('=== DEBUG: Error en fallback ===');
          console.log('Error:', fallbackError.message);
          
          // Fallback extremo - estructura mínima ENCRIPTADA
          const emergencyFallback: AIRecommendationSession = {
            sessionId: `emergency_${Date.now()}`,
            monthNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft',
            summary: encrypt('Error en generación de recomendaciones. Por favor contacte al administrador.'),
            vision: encrypt('Visión no disponible debido a error técnico.'),
            baselineMetrics: {
              currentLifestyle: ['Error técnico'],
              targetLifestyle: ['Por definir']
            },
            weeks: [{
              weekNumber: 1,
              nutrition: {
                focus: encrypt('Nutrición básica'),
                checklistItems: [{
                  id: 'emergency_nutrition_1',
                  description: encrypt('Consulte con su coach para recomendaciones personalizadas'),
                  completed: false,
                  weekNumber: 1,
                  category: 'nutrition',
                  type: 'emergency'
                }],
                shoppingList: []
              },
              exercise: {
                focus: encrypt('Ejercicio básico'),
                checklistItems: [{
                  id: 'emergency_exercise_1',
                  description: encrypt('Consulte con su coach para rutina personalizada'),
                  completed: false,
                  weekNumber: 1,
                  category: 'exercise',
                  type: 'emergency'
                }],
                equipment: []
              },
              habits: {
                checklistItems: [{
                  id: 'emergency_habit_1',
                  description: encrypt('Mantener comunicación con su coach'),
                  completed: false,
                  weekNumber: 1,
                  category: 'habit',
                  type: 'emergency'
                }]
              }
            }],
            checklist: [{
              id: 'emergency_checklist_1',
              description: encrypt('Contacte a su coach para asistencia'),
              completed: false,
              weekNumber: 1,
              category: 'nutrition',
              type: 'emergency'
            }]
          };
          
          loggerWithContext.error('AI_SERVICE', 'Usando fallback de emergencia', fallbackError, metadata);
          return emergencyFallback;
        }
      }
    }, metadata);
  }

  /**
   * Construye el prompt para DeepSeek con estructura específica
   */
  private static buildAnalysisPrompt(input: AIAnalysisInput, monthNumber: number): string {
    const { personalData, medicalData, documents, previousSessions, currentProgress, coachNotes } = input;
    
    // Desencriptar datos necesarios para el prompt
    const decryptedPersonal = this.decryptPersonalData(personalData);
    const decryptedMedical = this.decryptMedicalData(medicalData);
    const decryptedDocs = this.decryptDocuments(documents || []);
    
    // Información de sesiones anteriores
    let previousSessionsText = '';
    if (previousSessions && previousSessions.length > 0) {
      previousSessionsText = `\n# HISTORIAL DE SESIONES ANTERIORES (${previousSessions.length} meses):\n`;
      previousSessions.forEach((session, index) => {
        if (index < 3) { // Mostrar solo las últimas 3 sesiones para no hacer el prompt muy largo
          previousSessionsText += `\nMES ${session.monthNumber}:\n`;
          previousSessionsText += `- Resumen: ${session.summary?.substring(0, 100)}...\n`;
          
          // Items completados del checklist
          if (session.checklist && Array.isArray(session.checklist)) {
            const completed = session.checklist.filter(item => item.completed).length;
            const total = session.checklist.length;
            previousSessionsText += `- Progreso: ${completed}/${total} items completados\n`;
          }
        }
      });
    }
    
    // Preparar historial de checklist completado para análisis
    let previousChecklistInfo = '';
    if (previousSessions && previousSessions.length > 0) {
      const lastSession = previousSessions[previousSessions.length - 1];
      if (lastSession.checklist && Array.isArray(lastSession.checklist)) {
        const completedItems = lastSession.checklist
          .filter(item => item.completed)
          .map(item => item.description?.substring(0, 50) || '')
          .filter(desc => desc.trim() !== '');
        
        const incompleteItems = lastSession.checklist
          .filter(item => !item.completed)
          .map(item => item.description?.substring(0, 50) || '')
          .filter(desc => desc.trim() !== '');
        
        if (completedItems.length > 0) {
          previousChecklistInfo += `\n# ITEMS COMPLETADOS EN SESIÓN ANTERIOR:\n${completedItems.map(item => `- ${item}`).join('\n')}`;
        }
        
        if (incompleteItems.length > 0) {
          previousChecklistInfo += `\n\n# ITEMS PENDIENTES EN SESIÓN ANTERIOR:\n${incompleteItems.map(item => `- ${item}`).join('\n')}`;
        }
      }
    }
    
    const prompt = `Eres un coach de salud especializado en dieta keto (75% grasa animal, 20% proteína, 5% carbohidratos) y hábitos saludables.

    # INSTRUCCIONES CRÍTICAS PARA LA RESPUESTA:

    ## 1. ESTRUCTURA OBLIGATORIA DE LA RESPUESTA:
    - Debes devolver SOLO un objeto JSON válido
    - El JSON debe tener EXACTAMENTE esta estructura:
    {
      "summary": "texto aquí",
      "vision": "texto aquí",
      "baselineMetrics": { "currentLifestyle": [], "targetLifestyle": [] },
      "weeks": [ ... ]
    }

    ## 2. FORMATO DE LAS SEMANAS:
    - Cada semana debe tener: weekNumber (1-4), nutrition, exercise, habits
    - Dentro de cada categoría debe haber: focus y checklistItems[]
    - Cada checklistItem debe tener: description y type (opcional)

    ## 3. PROGRESIÓN ACUMULATIVA REAL:
    - SEMANA 1: 1 alimento + 1 ejercicio + 1 hábito adoptar + 1 hábito eliminar
    - SEMANA 2: 2 alimentos (1 nuevo + 1 anterior) + 2 ejercicios (1 nuevo + 1 anterior) + 2 hábitos adoptar (1 nuevo + 1 anterior) + 2 hábitos eliminar
    - SEMANA 3: 3 alimentos (1 nuevo + 2 anteriores) + 3 ejercicios (1 nuevo + 2 anteriores) + 3 hábitos adoptar (1 nuevo + 2 anteriores) + 3 hábitos eliminar
    - SEMANA 4: 4 alimentos (1 nuevo + 3 anteriores) + 4 ejercicios (1 nuevo + 3 anteriores) + 4 hábitos adoptar (1 nuevo + 3 anteriores) + 4 hábitos eliminar

    ## 4. CONTENIDO ESPECÍFICO:
    - ALIMENTOS: Basados en keto 75/20/5, alimentos económicos, de temporada
    - EJERCICIOS: Adaptados al estado físico del cliente, progresivos
    - HÁBITOS: Concretos, medibles, alcanzables

    # DATOS DEL CLIENTE:
    ${this.formatPersonalData(decryptedPersonal)}

    # EVALUACIONES MÉDICAS:
    ${this.formatMedicalData(decryptedMedical)}

    # DOCUMENTOS MÉDICOS ANALIZADOS:
    ${decryptedDocs}

    ${previousSessionsText}
    ${previousChecklistInfo}
    ${coachNotes ? `\n# NOTAS DEL COACH:\n${coachNotes}\n` : ''}

    # CONTEXTO ACTUAL:
    - Mes de tratamiento: ${monthNumber}
    - ${currentProgress ? `Progreso acumulado: ${currentProgress.overallProgress}%` : 'Primera evaluación'}
    - ${currentProgress?.metrics ? `Métricas: Nutrición ${currentProgress.metrics.nutritionAdherence}%, Ejercicio ${currentProgress.metrics.exerciseConsistency}%, Hábitos ${currentProgress.metrics.habitFormation}%` : ''}

    # EJEMPLO DE ESTRUCTURA REQUERIDA PARA SEMANA 1:
    {
      "weekNumber": 1,
      "nutrition": {
        "focus": "Eliminar azúcares y alimentos procesados",
        "checklistItems": [
          {
            "description": "Desayuno: Huevos con aguacate",
            "type": "breakfast",
            "details": {
              "recipe": {
                "ingredients": [
                  {"name": "Huevos", "quantity": "2-3 unidades", "notes": "preferiblemente orgánicos"},
                  {"name": "Aguacate", "quantity": "1/2 unidad", "notes": "maduro"}
                ],
                "preparation": "Batir los huevos, cocinar en mantequilla a fuego medio, servir con aguacate en cubos.",
                "tips": "Añadir sal marina al gusto"
              }
            }
          }
        ],
        "shoppingList": [
          {"item": "Huevos", "quantity": "12 unidades", "priority": "high"},
          {"item": "Aguacates", "quantity": "3-4 unidades", "priority": "high"}
        ]
      },
      "exercise": {
        "focus": "Movilidad básica y caminata",
        "checklistItems": [
          {
            "description": "Caminata rápida 20 minutos",
            "type": "cardio",
            "details": {
              "frequency": "3 días por semana",
              "duration": "20 minutos",
              "equipment": ["zapatos cómodos"]
            }
          }
        ]
      },
      "habits": {
        "checklistItems": [
          {
            "description": "Beber 2 litros de agua al día",
            "type": "toAdopt"
          },
          {
            "description": "Eliminar refrescos azucarados",
            "type": "toEliminate"
          }
        ],
        "trackingMethod": "Botella de 2L marcada con horarios",
        "motivationTip": "Cada vaso de agua es un paso hacia tu salud"
      }
    }

    IMPORTANTE: 
    1. Devuelve SOLO el JSON, sin texto adicional
    2. Sigue EXACTAMENTE la estructura especificada
    3. La progresión debe ser acumulativa (semana 2 incluye items de semana 1)
    4. Los alimentos deben variar semanalmente
    5. Adapta las recomendaciones al historial médico del cliente
    6. Considera alergias y limitaciones mencionadas`;

    return prompt;
  }
  /**
   * Llama a la API de DeepSeek con manejo mejorado de errores
   */
  private static async callDeepSeekAPI(
    prompt: string, 
    metadata?: { requestId?: string; clientId?: string }
  ): Promise<string> {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    try {
      console.log('🔍 DEBUG: Llamando a DeepSeek API...');
      console.log('🔑 API Key presente:', !!this.config.apiKey);
      console.log('📝 Prompt length:', prompt.length);
      
      if (!this.config.apiKey) {
        throw new Error('DeepSeek API key no configurada');
      }

      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente médico especializado en nutrición keto, ejercicio y formación de hábitos. Devuelve siempre JSON válido.'
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
      
      const startTime = Date.now();
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000) // 120 segundos timeout
      });

      const duration = Date.now() - startTime;
      
      console.log('📡 Status:', response.status);
      console.log('⏱️ Duración:', duration, 'ms');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error respuesta:', errorText);
        throw new Error(`DeepSeek API Error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta recibida');
      console.log('📊 Token usage:', data.usage);
      
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error('❌ No content en respuesta:', data);
        throw new Error('La respuesta de DeepSeek no contiene contenido');
      }

      // Verificar que sea JSON válido
      try {
        JSON.parse(content);
        console.log('✅ JSON válido recibido');
      } catch (e) {
        console.error('❌ JSON inválido:', content.substring(0, 500));
      }
      
      return content;
      
    } catch (error: any) {
      console.error('💥 Error completo en callDeepSeekAPI:', error);
      loggerWithContext.error('AI_SERVICE', 'Error en llamada a DeepSeek API', error);
      
      // Para debugging, muestra el mock en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Usando mock response para desarrollo');
        return this.getMockAIResponse();
      }
      
      throw error;
    }
  }

  /**
   * Parsear respuesta JSON de la IA con validación mejorada
   */
  private static parseAIResponse(response: string, metadata?: { requestId?: string; clientId?: string }): any {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      
      const parsed = JSON.parse(jsonString) as {
        summary: string;
        vision: string;
        baselineMetrics: any;
        weeks: AIWeekResponse[];
      };
      
      // Validar progresión acumulativa
      parsed.weeks.forEach((week, index) => {
        const expectedCount = index + 1; // Semana 1: 1, Semana 2: 2, etc.
        
        // Validar nutrición
        if (week.nutrition.checklistItems.length < expectedCount) {
          throw new Error(`Semana ${week.weekNumber}: Nutrición debe tener al menos ${expectedCount} items, tiene ${week.nutrition.checklistItems.length}`);
        }
        
        // Validar ejercicio
        if (week.exercise.checklistItems.length < expectedCount) {
          throw new Error(`Semana ${week.weekNumber}: Ejercicio debe tener al menos ${expectedCount} items, tiene ${week.exercise.checklistItems.length}`);
        }
        
        // Validar hábitos (toAdopt + toEliminate)
        const habitItems = week.habits.checklistItems;
        const adoptCount = habitItems.filter(h => h.type === 'toAdopt').length;
        const eliminateCount = habitItems.filter(h => h.type === 'toEliminate').length;
        
        if (adoptCount < expectedCount) {
          throw new Error(`Semana ${week.weekNumber}: Hábitos para adoptar debe tener al menos ${expectedCount} items, tiene ${adoptCount}`);
        }
        
        if (eliminateCount < expectedCount) {
          throw new Error(`Semana ${week.weekNumber}: Hábitos para eliminar debe tener al menos ${expectedCount} items, tiene ${eliminateCount}`);
        }
      });
      
      return parsed;
    } catch (error: any) {
      loggerWithContext.error('AI_SERVICE', 'Error parseando respuesta de IA', error, {
        responsePreview: response.substring(0, 500)
      });
      throw error;
    }
  }

  /**
   * Intentar extraer datos útiles de una respuesta rota
   */
  private static extractFallbackFromBrokenResponse(response: string): any | null {
    try {
      // Buscar campos específicos usando regex
      const summaryMatch = response.match(/"summary"\s*:\s*"([^"]+)"/);
      const visionMatch = response.match(/"vision"\s*:\s*"([^"]+)"/);
      
      if (summaryMatch || visionMatch) {
        return {
          summary: summaryMatch ? summaryMatch[1] : 'Resumen no disponible',
          vision: visionMatch ? visionMatch[1] : 'Visión no disponible',
          baselineMetrics: {
            currentLifestyle: ['Información limitada'],
            targetLifestyle: ['Mejora general']
          },
          weeks: this.getFallbackWeeks()
        };
      }
    } catch (e) {
      // Ignorar errores en el fallback
    }
    
    return null;
  }

  /**
   * Desencriptar datos personales para el prompt
   */
  private static decryptPersonalData(data: PersonalData): any {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        try {
          decrypted[key] = safeDecrypt(value);
        } catch (error) {
          decrypted[key] = value; // Si falla la desencriptación, usar original
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  /**
   * Desencriptar datos médicos para el prompt
   */
  private static decryptMedicalData(data: MedicalData): any {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'documents') continue;
      
      if (typeof value === 'string') {
        try {
          decrypted[key] = safeDecrypt(value);
        } catch (error) {
          decrypted[key] = value;
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  /**
   * Desencriptar documentos para el prompt
   */
  private static decryptDocuments(documents: Array<{ name: string; textractAnalysis?: TextractAnalysis }>): string {
    if (!documents.length) return 'No hay documentos médicos disponibles.';
    
    const docTexts = documents.map(doc => {
      if (!doc.textractAnalysis?.extractedText) {
        return `Documento: ${doc.name} (sin texto extraído)`;
      }
      
      try {
        // Solo usar los primeros 500 caracteres para no hacer el prompt muy largo
        const decrypted = safeDecrypt(doc.textractAnalysis.extractedText);
        return `Documento: ${doc.name}\nContenido: ${decrypted.substring(0, 500)}${decrypted.length > 500 ? '...' : ''}`;
      } catch {
        return `Documento: ${doc.name} (error al desencriptar)`;
      }
    });
    
    return docTexts.join('\n\n');
  }

  /**
   * Formatear datos personales para el prompt
   */
  private static formatPersonalData(data: any): string {
    return `
  - Nombre: ${data.name || 'No especificado'}
  - Edad: ${data.age || 'No especificada'}
  - Peso: ${data.weight || 'No especificado'} kg
  - Altura: ${data.height || 'No especificada'} cm
  - Género: ${data.gender || 'No especificado'}
  - Ocupación: ${data.occupation || 'No especificada'}
  - Estado civil: ${data.maritalStatus || 'No especificado'}
  - Email: ${data.email || 'No especificado'}
  - Teléfono: ${data.phone || 'No especificado'}
  `;
  }

  /**
   * Formatear datos médicos para el prompt
   */
  private static formatMedicalData(data: any): string {
    return `
  - Alergias: ${data.allergies || 'No reportadas'}
  - Medicamentos: ${data.medications || 'No reportados'}
  - Suplementos: ${data.supplements || 'No reportados'}
  - Condiciones actuales/pasadas: ${data.currentPastConditions || 'No reportadas'}
  - Cirugías: ${data.surgeries || 'No reportadas'}
  - Queja principal: ${data.mainComplaint || 'No especificada'}
  - Historia médica adicional: ${data.additionalMedicalHistory || 'No reportada'}
  - Evaluación de adicción a carbohidratos: ${data.carbohydrateAddiction ? 'Presente' : 'No evaluada'}
  - Evaluación de resistencia a leptina: ${data.leptinResistance ? 'Presente' : 'No evaluada'}
  `;
  }

  /**
  * Recomendaciones de fallback si la IA falla - ESTRUCTURA COMPLETA
  */
  private static getFallbackRecommendations(
    input: AIAnalysisInput, 
    monthNumber: number,
    metadata?: { requestId?: string; clientId?: string }
  ): AIRecommendationSession {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    loggerWithContext.warn('AI_SERVICE', 'Usando recomendaciones de fallback');
    
    const sessionId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extraer datos básicos del cliente para personalizar el fallback
    const decryptedPersonal = this.decryptPersonalData(input.personalData);
    const clientName = decryptedPersonal.name || 'el cliente';
    const clientAge = decryptedPersonal.age ? parseInt(decryptedPersonal.age) : 30;
    const clientWeight = decryptedPersonal.weight ? parseFloat(decryptedPersonal.weight) : 70;
    
    // Crear semanas con progresión acumulativa
    const weeks: AIRecommendationWeek[] = [];
    
    for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
      const weekNumber = (weekIndex + 1) as 1 | 2 | 3 | 4;
      const itemCount = weekIndex + 1; // Progresión: 1, 2, 3, 4
      
      // ===== NUTRICIÓN =====
      const nutritionChecklistItems: ChecklistItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        let mealType = '';
        let mealDesc = '';
        
        switch(i) {
          case 0:
            mealType = 'breakfast';
            mealDesc = 'Desayuno: Huevos revueltos con espinacas';
            break;
          case 1:
            mealType = 'lunch';
            mealDesc = 'Almuerzo: Ensalada de pollo con aguacate';
            break;
          case 2:
            mealType = 'dinner';
            mealDesc = 'Cena: Salmón al horno con brócoli';
            break;
          case 3:
            mealType = 'snack';
            mealDesc = 'Merienda: Nueces y queso';
            break;
        }
        
        nutritionChecklistItems.push({
          id: `fallback_nutrition_${weekNumber}_${i}_${Date.now()}`,
          description: encrypt(mealDesc),
          completed: false,
          weekNumber,
          category: 'nutrition' as const,
          type: mealType,
          details: {
            recipe: {
              ingredients: [
                { name: encrypt('Huevos'), quantity: encrypt('2-3 unidades'), notes: encrypt('orgánicos') },
                { name: encrypt('Espinacas'), quantity: encrypt('1 taza'), notes: encrypt('frescas') },
                { name: encrypt('Mantequilla'), quantity: encrypt('1 cucharada'), notes: encrypt('para cocinar') }
              ],
              preparation: encrypt('Cocinar los huevos en mantequilla, agregar espinacas al final.'),
              tips: encrypt('Añadir sal y pimienta al gusto.')
            }
          }
        });
      }
      
      // ===== EJERCICIO =====
      const exerciseChecklistItems: ChecklistItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        let exerciseType = '';
        let exerciseDesc = '';
        
        switch(i) {
          case 0:
            exerciseType = 'cardio';
            exerciseDesc = 'Caminata rápida 20 minutos';
            break;
          case 1:
            exerciseType = 'strength';
            exerciseDesc = 'Flexiones - 10 repeticiones';
            break;
          case 2:
            exerciseType = 'flexibility';
            exerciseDesc = 'Estiramientos 10 minutos';
            break;
          case 3:
            exerciseType = 'strength';
            exerciseDesc = 'Sentadillas - 15 repeticiones';
            break;
        }
        
        exerciseChecklistItems.push({
          id: `fallback_exercise_${weekNumber}_${i}_${Date.now()}`,
          description: encrypt(exerciseDesc),
          completed: false,
          weekNumber,
          category: 'exercise' as const,
          type: exerciseType,
          details: {
            frequency: encrypt('3 días por semana'),
            duration: encrypt(i === 0 ? '20 minutos' : '15 minutos'),
            equipment: [encrypt('Ninguno')]
          }
        });
      }
      
      // ===== HÁBITOS =====
      const habitsChecklistItems: ChecklistItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        // Hábitos para adoptar
        let adoptHabit = '';
        switch(i) {
          case 0:
            adoptHabit = 'Beber 2 litros de agua al día';
            break;
          case 1:
            adoptHabit = 'Dormir 7-8 horas por noche';
            break;
          case 2:
            adoptHabit = 'Meditar 5 minutos al día';
            break;
          case 3:
            adoptHabit = 'Registrar alimentos en diario';
            break;
        }
        
        habitsChecklistItems.push({
          id: `fallback_habit_adopt_${weekNumber}_${i}_${Date.now()}`,
          description: encrypt(adoptHabit),
          completed: false,
          weekNumber,
          category: 'habit' as const,
          type: 'toAdopt'
        });
        
        // Hábitos para eliminar
        let eliminateHabit = '';
        switch(i) {
          case 0:
            eliminateHabit = 'Eliminar refrescos azucarados';
            break;
          case 1:
            eliminateHabit = 'Reducir tiempo en pantallas antes de dormir';
            break;
          case 2:
            eliminateHabit = 'Evitar snacks nocturnos';
            break;
          case 3:
            eliminateHabit = 'Reducir consumo de alimentos procesados';
            break;
        }
        
        habitsChecklistItems.push({
          id: `fallback_habit_eliminate_${weekNumber}_${i}_${Date.now()}`,
          description: encrypt(eliminateHabit),
          completed: false,
          weekNumber,
          category: 'habit' as const,
          type: 'toEliminate'
        });
      }
      
      // ===== CREAR SEMANA COMPLETA =====
      weeks.push({
        weekNumber,
        nutrition: {
          focus: encrypt(`Adaptación keto semana ${weekNumber}`),
          checklistItems: nutritionChecklistItems,
          shoppingList: [
            { item: encrypt('Huevos'), quantity: encrypt('12 unidades'), priority: 'high' },
            { item: encrypt('Aguacates'), quantity: encrypt('3 unidades'), priority: 'high' },
            { item: encrypt('Pechuga de pollo'), quantity: encrypt('500g'), priority: 'high' },
            { item: encrypt('Salmón'), quantity: encrypt('2 filetes'), priority: 'medium' },
            { item: encrypt('Brócoli'), quantity: encrypt('1 cabeza'), priority: 'medium' },
            { item: encrypt('Espinacas'), quantity: encrypt('1 bolsa'), priority: 'medium' },
            { item: encrypt('Nueces'), quantity: encrypt('200g'), priority: 'low' },
            { item: encrypt('Queso'), quantity: encrypt('250g'), priority: 'low' }
          ]
        },
        exercise: {
          focus: encrypt(`Rutina progresiva semana ${weekNumber}`),
          checklistItems: exerciseChecklistItems,
          equipment: [encrypt('Zapatos cómodos'), encrypt('Ropa deportiva')]
        },
        habits: {
          checklistItems: habitsChecklistItems,
          trackingMethod: encrypt('Registro en aplicación móvil o cuaderno'),
          motivationTip: encrypt('Cada pequeño cambio cuenta. Celebra tus logros diarios.')
        }
      });
    }
    
    // ===== CREAR CHECKLIST COMPLETO =====
    const allChecklistItems: ChecklistItem[] = weeks.flatMap(week => [
      ...week.nutrition.checklistItems,
      ...week.exercise.checklistItems,
      ...week.habits.checklistItems
    ]);
    
    // ===== CREAR RESUMEN Y VISIÓN PERSONALIZADOS =====
    const summary = `Análisis inicial para ${clientName}, ${clientAge} años. Basado en los datos proporcionados, se recomienda comenzar con un enfoque keto progresivo adaptado a sus necesidades. El plan incluye alimentación basada en grasas saludables, ejercicio gradual y formación de hábitos sostenibles.

  Consideraciones: Se sugiere monitorear la respuesta del cuerpo durante las primeras semanas y ajustar según sea necesario. Importante mantener hidratación adecuada y descanso suficiente.`;

    const vision = `Si ${clientName} sigue consistentemente las recomendaciones, en 12 meses podrá alcanzar:
  - Peso saludable estable (aproximadamente ${Math.round(clientWeight * 0.9)}kg)
  - Niveles de energía sostenidos durante el día
  - Mejora en marcadores de salud (presión arterial, glucosa, etc.)
  - Hábitos alimenticios conscientes y sostenibles
  - Rutina de ejercicio integrada en su vida diaria
  - Relación saludable con la comida y su cuerpo

  El camino requiere consistencia, pero los beneficios en salud y bienestar serán significativos.`;

    // ===== CREAR SESIÓN =====
    const session: AIRecommendationSession = {
      sessionId,
      monthNumber,
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
   * Obtener semanas de fallback
   */
  private static getFallbackWeeks() {
    return Array.from({ length: 4 }, (_, i) => ({
      weekNumber: (i + 1) as 1 | 2 | 3 | 4,
      nutrition: {
        focus: 'Adaptación keto básica',
        meals: ['Desayuno: Huevos con aguacate', 'Almuerzo: Ensalada con proteína', 'Cena: Pescado o carne con vegetales'],
        recipes: [
          {
            name: 'Huevos revueltos con aguacate',
            ingredients: [
              { name: 'Huevos', quantity: '2-3 unidades', notes: 'Preferiblemente orgánicos' },
              { name: 'Aguacate', quantity: '1/2 unidad', notes: 'Maduro' },
              { name: 'Mantequilla', quantity: '1 cucharada', notes: 'Para cocinar' }
            ],
            preparation: 'Batir los huevos, cocinar en mantequilla a fuego medio, servir con aguacate en cubos.',
            tips: 'Añadir sal marina al gusto.'
          }
        ],
        shoppingList: [
          { item: 'Huevos', quantity: '12 unidades', priority: 'high' },
          { item: 'Aguacates', quantity: '3-4 unidades', priority: 'high' },
          { item: 'Mantequilla', quantity: '200g', priority: 'medium' }
        ]
      },
      exercise: {
        routine: 'Caminata diaria + estiramientos',
        frequency: '5 días a la semana',
        duration: '30 minutos',
        adaptations: ['Empezar con 15 minutos si es necesario'],
        equipment: ['Zapatos cómodos']
      },
      habits: {
        toAdopt: ['Beber 2L de agua al día', 'Dormir 7-8 horas'],
        toEliminate: ['Refrescos azucarados', 'Comer después de las 8 PM'],
        trackingMethod: 'Registro diario en cuaderno',
        motivationTip: 'Pequeños cambios generan grandes resultados'
      }
    }));
  }

  /**
   * Respuesta mock para desarrollo
   */
  private static getMockAIResponse(): string {
    return JSON.stringify({
      summary: "Cliente con interés en mejorar su salud mediante dieta keto y hábitos saludables. Presenta fatiga y necesidad de control de peso.",
      vision: "En 12 meses: peso estable, energía sostenida, relación saludable con la comida y ejercicio integrado en rutina.",
      baselineMetrics: {
        currentLifestyle: ["Dieta alta en carbohidratos", "Sedentarismo", "Sueño irregular"],
        targetLifestyle: ["Dieta keto adaptada", "Actividad física regular", "Rutina de sueño consistente"]
      },
      weeks: [
        {
          weekNumber: 1,
          nutrition: {
            focus: "Eliminar azúcares y carbohidratos refinados",
            meals: [
              "Desayuno: Café negro o té + 2 huevos",
              "Almuerzo: Ensalada verde con pollo",
              "Cena: Salmón al horno con brócoli"
            ],
            recipes: [
              {
                name: "Ensalada verde con pollo",
                ingredients: [
                  { name: "Pechuga de pollo", quantity: "150g", notes: "Cocinar a la plancha" },
                  { name: "Lechuga", quantity: "2 tazas", notes: "Mezcla de hojas verdes" },
                  { name: "Aceite de oliva", quantity: "1 cucharada", notes: "Para aderezar" },
                  { name: "Limón", quantity: "1/2 unidad", notes: "Jugo fresco" }
                ],
                preparation: "Cocinar el pollo, cortar en tiras. Mezclar con lechuga. Aderezar con aceite y limón.",
                tips: "Añadir aguacate para más grasas saludables."
              }
            ],
            shoppingList: [
              { item: "Huevos", quantity: "12 unidades", priority: "high" },
              { item: "Pechugas de pollo", quantity: "4 unidades", priority: "high" },
              { item: "Salmón", quantity: "2 filetes", priority: "high" },
              { item: "Brócoli", quantity: "1 cabeza", priority: "medium" },
              { item: "Lechuga", quantity: "1 bolsa", priority: "medium" }
            ]
          },
          exercise: {
            routine: "Caminata rápida 20 minutos",
            frequency: "3 días (lunes, miércoles, viernes)",
            duration: "20 minutos",
            adaptations: ["Si hay dolor articular, caminar en terreno plano"],
            equipment: []
          },
          habits: {
            toAdopt: ["Tomar 1 vaso de agua al despertar"],
            toEliminate: ["Refrescos"],
            trackingMethod: "Marcar en calendario",
            motivationTip: "El primer paso es el más importante"
          }
        },
        {
          weekNumber: 2,
          nutrition: {
            focus: "Aumentar grasas saludables",
            meals: [
              "Desayuno: Batido de aguacate y espinacas",
              "Almuerzo: Pollo al curry con coliflor",
              "Cena: Filete de res con espárragos"
            ],
            recipes: [
              {
                name: "Batido de aguacate y espinacas",
                ingredients: [
                  { name: "Aguacate", quantity: "1/2 unidad", notes: "Maduro" },
                  { name: "Espinacas", quantity: "1 taza", notes: "Frescas" },
                  { name: "Leche de almendras", quantity: "1 taza", notes: "Sin azúcar" },
                  { name: "Proteína en polvo", quantity: "1 scoop", notes: "Opcional" }
                ],
                preparation: "Mezclar todos los ingredientes en licuadora hasta obtener consistencia suave.",
                tips: "Añadir hielo para un batido refrescante."
              }
            ],
            shoppingList: [
              { item: "Aguacates", quantity: "3 unidades", priority: "high" },
              { item: "Espinacas", quantity: "1 bolsa", priority: "high" },
              { item: "Pechugas de pollo", quantity: "4 unidades", priority: "high" },
              { item: "Filetes de res", quantity: "2 unidades", priority: "medium" },
              { item: "Espárragos", quantity: "1 manojo", priority: "medium" }
            ]
          },
          exercise: {
            routine: "Caminata 25 minutos + ejercicios de fuerza básicos",
            frequency: "4 días a la semana",
            duration: "35 minutos",
            adaptations: ["Usar bandas de resistencia si no hay pesas"],
            equipment: ["Bandas de resistencia"]
          },
          habits: {
            toAdopt: ["Meditar 5 minutos al día"],
            toEliminate: ["Snacks nocturnos"],
            trackingMethod: "App de meditación",
            motivationTip: "La consistencia es clave"
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
    const percentage = Math.round((completed / checklist.length) * 100);
    
    return percentage;
  }

  static async testDeepSeekConnection(): Promise<boolean> {
    try {
      console.log('🧪 Probando conexión con DeepSeek API...');
      console.log('🔑 API Key (primeros 10 chars):', this.config.apiKey?.substring(0, 10) + '...');
      
      if (!this.config.apiKey) {
        console.error('❌ ERROR: No hay API key configurada');
        return false;
      }

      // Test simple
      const response = await fetch(`${this.config.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

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
      console.error('💥 Error de conexión:', error.message);
      return false;
    }
  }
}


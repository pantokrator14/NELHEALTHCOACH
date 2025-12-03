// apps/api/src/app/lib/ai-service.ts
import { logger } from './logger';
import { decrypt, encrypt, safeDecrypt } from './encryption';
import { 
  PersonalData, 
  MedicalData, 
  UploadedFile,
  TextractAnalysis,
  AIRecommendationSession,
  ClientAIProgress
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
        // Validar configuración
        if (!this.config.apiKey) {
          loggerWithContext.error('AI_SERVICE', 'DeepSeek API key no configurada', undefined, {
            aiInfo: { model: this.config.model }
          });
          throw new Error('API key no configurada. Configure DEEPSEEK_API_KEY en las variables de entorno.');
        }

        loggerWithContext.info('AI_SERVICE', 'Iniciando generación de recomendaciones', {
          monthNumber,
          hasDocuments: input.documents?.length || 0,
          hasPreviousSessions: input.previousSessions?.length || 0
        });

        // Preparar prompt con todos los datos
        const prompt = this.buildAnalysisPrompt(input, monthNumber);
        
        // Loggear detalles del prompt
        const promptPreview = process.env.NODE_ENV === 'development' 
          ? prompt.substring(0, 1000)
          : prompt.substring(0, 200);
        
        loggerWithContext.ai('AI_SERVICE', 'Prompt construido para IA', {
          model: this.config.model,
          tokenCount: Math.ceil(prompt.length / 4),
          temperature: this.config.temperature,
          monthNumber,
          promptPreview: `${promptPreview}...`
        });

        // Llamar a la API de DeepSeek
        loggerWithContext.info('AI_SERVICE', 'Llamando a DeepSeek API');
        const aiResponse = await this.callDeepSeekAPI(prompt, metadata);
        const parsedResponse = this.parseAIResponse(aiResponse, metadata);
        
        if (!aiResponse || aiResponse.trim() === '') {
          throw new Error('Respuesta vacía de la API de DeepSeek');
        }

        // Loggear respuesta recibida
        loggerWithContext.debug('AI_SERVICE', 'Respuesta recibida de DeepSeek', {
          responseLength: aiResponse.length,
          responsePreview: aiResponse.substring(0, 200)
        });

        // Convertir la respuesta al formato de ChecklistItem
        const weeks: AIRecommendationWeek[] = parsedResponse.weeks.map((weekResp, weekIndex) => {
          // Nutrición
          const nutritionChecklistItems: ChecklistItem[] = weekResp.nutrition.checklistItems.map((item, itemIndex) => ({
            id: `nutrition_${weekIndex}_${itemIndex}_${Date.now()}`,
            description: item.description,
            completed: false,
            weekNumber: weekResp.weekNumber,
            category: 'nutrition' as const,
            type: item.type,
            details: item.details
          }));
          
          // Ejercicio
          const exerciseChecklistItems: ChecklistItem[] = weekResp.exercise.checklistItems.map((item, itemIndex) => ({
            id: `exercise_${weekIndex}_${itemIndex}_${Date.now()}`,
            description: item.description,
            completed: false,
            weekNumber: weekResp.weekNumber,
            category: 'exercise' as const,
            type: item.type,
            details: item.details
          }));
          
          // Hábitos
          const habitsChecklistItems: ChecklistItem[] = weekResp.habits.checklistItems.map((item, itemIndex) => ({
            id: `habit_${weekIndex}_${itemIndex}_${Date.now()}`,
            description: item.description,
            completed: false,
            weekNumber: weekResp.weekNumber,
            category: 'habit' as const,
            type: item.type,
            details: { frequency: 'diario' }
          }));
          
          return {
            weekNumber: weekResp.weekNumber as 1 | 2 | 3 | 4,
            nutrition: {
              focus: weekResp.nutrition.focus,
              checklistItems: nutritionChecklistItems,
              shoppingList: weekResp.nutrition.shoppingList
            },
            exercise: {
              focus: weekResp.exercise.focus,
              checklistItems: exerciseChecklistItems,
              equipment: weekResp.exercise.checklistItems.flatMap(item => item.details?.equipment || [])
            },
            habits: {
              checklistItems: habitsChecklistItems,
              trackingMethod: weekResp.habits.trackingMethod,
              motivationTip: weekResp.habits.motivationTip
            }
          };
        });
        
        // Crear checklist completo
        const allChecklistItems: ChecklistItem[] = weeks.flatMap(week => [
          ...week.nutrition.checklistItems,
          ...week.exercise.checklistItems,
          ...week.habits.checklistItems
        ]);
        
        const session: AIRecommendationSession = {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          monthNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
          summary: encrypt(parsedResponse.summary),
          vision: encrypt(parsedResponse.vision),
          baselineMetrics: parsedResponse.baselineMetrics,
          weeks,
          checklist: allChecklistItems
        };
        
        return session;
      } catch (error: any) {
        loggerWithContext.error('AI_SERVICE', 'Error generando recomendaciones', error, {
          monthNumber,
          hasDocuments: input.documents?.length || 0,
          aiInfo: { model: this.config.model, monthNumber }
        });
        
        // Devolver sesión con recomendaciones básicas como fallback
        return this.getFallbackRecommendations(input, monthNumber, metadata);
      }
    });
  }

  /**
   * Construye el prompt para DeepSeek
   */
  private static buildAnalysisPrompt(input: AIAnalysisInput, monthNumber: number): string {
  const { personalData, medicalData, documents, previousSessions, currentProgress, coachNotes } = input;
  
  // Desencriptar datos (código existente)
  const decryptedPersonal = this.decryptPersonalData(personalData);
  const decryptedMedical = this.decryptMedicalData(medicalData);
  const decryptedDocs = this.decryptDocuments(documents || []);
  
  const prompt = `Eres un coach de salud especializado en dieta keto (75% grasa animal, 20% proteína, 5% carbohidratos) y hábitos saludables.

# REGLAS ESTRICTAS:

1. PROGRESIÓN ACUMULATIVA:
   - SEMANA 1: 1 alimento + 1 ejercicio + 1 hábito para adoptar + 1 hábito para eliminar
   - SEMANA 2: 2 alimentos (1 nuevo + 1 anterior) + 2 ejercicios + 2 hábitos adoptar + 2 hábitos eliminar
   - SEMANA 3: 3 alimentos (1 nuevo + 2 anteriores) + 3 ejercicios + 3 hábitos adoptar + 3 hábitos eliminar
   - SEMANA 4: 4 alimentos (1 nuevo + 3 anteriores) + 4 ejercicios + 4 hábitos adoptar + 4 hábitos eliminar

2. ALIMENTACIÓN KETO (75/20/5):
   - 75% grasas animales: carne, pescado, huevos, mantequilla, tocino
   - 20% proteína: moderada en cada comida
   - 5% carbohidratos: solo vegetales verdes (espinaca, brócoli, aguacate)
   - VARIEDAD: No repetir el mismo alimento más de 2 veces por semana
   - ECONÓMICO: Priorizar cortes económicos de carne y vegetales de temporada

3. EJERCICIOS PROGRESIVOS:
   - Semana 1: Movilidad básica y caminata
   - Semana 2: Ejercicios con peso corporal básicos
   - Semana 3: Aumentar intensidad y duración
   - Semana 4: Rutina completa adaptada

4. HÁBITOS CONCRETOS:
   - Específicos: "Beber 2L de agua" no "hidratarse más"
   - Medibles: "Dormir 7 horas" no "dormir mejor"
   - Alcanzables: Comenzar pequeño y construir

# DATOS DEL CLIENTE:
${this.formatPersonalData(decryptedPersonal)}

# EVALUACIONES MÉDICAS:
${this.formatMedicalData(decryptedMedical)}

# DOCUMENTOS:
${decryptedDocs}

# CONTEXTO:
Mes de tratamiento: ${monthNumber}
${coachNotes ? `Notas del coach: ${coachNotes}` : ''}
${previousSessions && previousSessions.length > 0 ? 
  `Historial: ${previousSessions.length} sesiones previas` : 
  'Primera sesión'}

# FORMATO DE RESPUESTA (JSON ESTRICTO):
{
  "summary": "Texto de análisis del estado actual (200 palabras máximo)",
  "vision": "Visión a 1 año con cambios específicos",
  "baselineMetrics": {
    "currentLifestyle": ["hábito1", "hábito2", "hábito3"],
    "targetLifestyle": ["hábito1", "hábito2", "hábito3"]
  },
  "weeks": [
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
                  {"name": "Aguacate", "quantity": "1/2 unidad", "notes": "maduro"},
                  {"name": "Mantequilla", "quantity": "1 cucharada", "notes": "para cocinar"}
                ],
                "preparation": "Batir huevos, cocinar en mantequilla a fuego medio, servir con aguacate en cubos.",
                "tips": "Añadir sal marina y pimienta al gusto"
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
              "frequency": "3 días por semana (lunes, miércoles, viernes)",
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
    // ... semanas 2, 3, 4 con progresión acumulativa
  ]
}`;

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
      if (!this.config.apiKey) {
        throw new Error('DeepSeek API key no configurada');
      }

      loggerWithContext.debug('AI_SERVICE', 'Preparando solicitud a DeepSeek API', {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

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

      const startTime = Date.now();
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000) // Timeout de 60 segundos
      });

      const duration = Date.now() - startTime;
      
      loggerWithContext.debug('AI_SERVICE', 'Respuesta HTTP recibida', {
        status: response.status,
        statusText: response.statusText,
        duration
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (e) {
          errorBody = 'No se pudo leer el cuerpo del error';
        }
        
        loggerWithContext.error('AI_SERVICE', 'Error de API de DeepSeek', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorBody.substring(0, 500)
        });
        
        throw new Error(`DeepSeek API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      loggerWithContext.debug('AI_SERVICE', 'Respuesta JSON parseada', {
        hasChoices: !!data.choices,
        choicesCount: data.choices?.length || 0,
        hasUsage: !!data.usage,
        usageTokens: data.usage?.total_tokens || 0
      });

      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('La respuesta de DeepSeek no contiene contenido');
      }

      return content;
      
    } catch (error: any) {
      loggerWithContext.error('AI_SERVICE', 'Error en llamada a DeepSeek API', error, {
        model: this.config.model,
        temperature: this.config.temperature,
        errorName: error.name,
        errorCode: error.code
      });
      
      // Si es un error de timeout o de red, intentar fallback
      if (error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('network')) {
        loggerWithContext.warn('AI_SERVICE', 'Usando respuesta mock debido a error de red/timeout');
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
   * Métodos auxiliares para desencriptar y formatear datos
   */
  private static decryptPersonalData(data: PersonalData): any {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        decrypted[key] = safeDecrypt(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  private static decryptMedicalData(data: MedicalData): any {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'documents') continue;
      
      if (typeof value === 'string') {
        decrypted[key] = safeDecrypt(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  private static decryptDocuments(documents: Array<{ name: string; textractAnalysis?: TextractAnalysis }>): string {
    if (!documents.length) return 'No hay documentos médicos disponibles.';
    
    const docTexts = documents.map(doc => {
      if (!doc.textractAnalysis?.extractedText) return '';
      
      try {
        const decrypted = safeDecrypt(doc.textractAnalysis.extractedText);
        return `Documento: ${doc.name}\n${decrypted.substring(0, 500)}...`;
      } catch {
        return `Documento: ${doc.name} (no se pudo extraer texto)`;
      }
    });
    
    return docTexts.filter(text => text).join('\n\n');
  }

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

  private static formatMedicalData(data: any): string {
    return `
- Alergias: ${data.allergies || 'No reportadas'}
- Medicamentos: ${data.medications || 'No reportados'}
- Suplementos: ${data.supplements || 'No reportados'}
- Condiciones actuales/pasadas: ${data.currentPastConditions || 'No reportadas'}
- Cirugías: ${data.surgeries || 'No reportadas'}
- Queja principal: ${data.mainComplaint || 'No especificada'}
- Historia médica adicional: ${data.additionalMedicalHistory || 'No reportada'}
`;
  }

  /**
   * Recomendaciones de fallback si la IA falla
   */
  private static getFallbackRecommendations(
    input: AIAnalysisInput, 
    monthNumber: number,
    metadata?: { requestId?: string; clientId?: string }
  ): AIRecommendationSession {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    loggerWithContext.warn('AI_SERVICE', 'Usando recomendaciones de fallback');
    
    const sessionId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      monthNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      summary: encrypt('Análisis inicial basado en información proporcionada. Recomendaciones estándar keto.'),
      vision: encrypt('Mejora significativa en energía, peso saludable y hábitos sostenibles en 12 meses.'),
      baselineMetrics: {
        currentLifestyle: ['Evaluar en sesión'],
        targetLifestyle: ['Alimentación consciente', 'Ejercicio regular', 'Sueño de calidad']
      },
      weeks: Array.from({ length: 4 }, (_, i) => ({
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
      })),
      checklist: []
    };
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
}
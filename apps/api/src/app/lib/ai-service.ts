// apps/api/src/app/lib/ai-service.ts
import { logger } from './logger';
import { encrypt, decrypt, safeDecrypt } from './encryption';
import { 
  PersonalData, 
  MedicalData, 
  UploadedFile,
  TextractAnalysis,
  AIRecommendationSession,
  ClientAIProgress
} from '../../../../../packages/types/src/healthForm';

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
    // La API key se puede configurar por entorno
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
  };

  /**
   * Analiza los datos del cliente y genera recomendaciones
   */
  static async analyzeClientAndGenerateRecommendations(
    input: AIAnalysisInput,
    monthNumber: number = 1
  ): Promise<AIRecommendationSession> {
    return logger.time('AI_SERVICE', 'Generar recomendaciones', async () => {
      try {
        // Preparar prompt con todos los datos
        const prompt = this.buildAnalysisPrompt(input, monthNumber);
        
        logger.debug('AI_SERVICE', 'Prompt construido', {
          promptLength: prompt.length,
          monthNumber,
          hasDocuments: input.documents?.length || 0,
          hasPreviousSessions: input.previousSessions?.length || 0
        });

        // Llamar a la API de DeepSeek
        const aiResponse = await this.callDeepSeekAPI(prompt);
        
        // Parsear respuesta JSON
        const recommendations = this.parseAIResponse(aiResponse);
        
        // Crear sesión de recomendaciones
        const session: AIRecommendationSession = {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          monthNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
          
          summary: recommendations.summary,
          vision: recommendations.vision,
          baselineMetrics: recommendations.baselineMetrics,
          weeks: recommendations.weeks,
          
          checklist: [], // Inicialmente vacío
        };

        logger.info('AI_SERVICE', 'Recomendaciones generadas exitosamente', {
          sessionId: session.sessionId,
          monthNumber,
          weekCount: session.weeks.length
        });

        return session;

      } catch (error) {
        logger.error('AI_SERVICE', 'Error generando recomendaciones', error as Error, {
          monthNumber,
          hasDocuments: input.documents?.length || 0
        });
        
        // Devolver sesión con recomendaciones básicas como fallback
        return this.getFallbackRecommendations(input, monthNumber);
      }
    }, { monthNumber });
  }

  /**
   * Construye el prompt para DeepSeek
   */
  private static buildAnalysisPrompt(input: AIAnalysisInput, monthNumber: number): string {
    const { personalData, medicalData, documents, previousSessions, currentProgress, coachNotes } = input;
    
    // Desencriptar datos necesarios para el prompt
    const decryptedPersonal = this.decryptPersonalData(personalData);
    const decryptedMedical = this.decryptMedicalData(medicalData);
    const decryptedDocs = this.decryptDocuments(documents || []);
    
    let prompt = `Eres un coach de salud especializado en dieta keto y hábitos saludables. Analiza los siguientes datos y genera recomendaciones personalizadas.

# INFORMACIÓN DEL CLIENTE:
${this.formatPersonalData(decryptedPersonal)}

# EVALUACIONES MÉDICAS:
${this.formatMedicalData(decryptedMedical)}

# DOCUMENTOS MÉDICOS:
${decryptedDocs}

# CONTEXTO ADICIONAL:
Mes de tratamiento: ${monthNumber}
${coachNotes ? `Notas del coach: ${coachNotes}` : ''}
${previousSessions && previousSessions.length > 0 ? `Historial previo disponible: ${previousSessions.length} sesiones` : 'Primera sesión'}
${currentProgress ? `Progreso actual: ${currentProgress.overallProgress}%` : ''}

# INSTRUCCIONES ESPECÍFICAS:
1. Genera un RESUMEN GENERAL del estado actual del cliente (máx 200 palabras)
2. Define una VISIÓN A 1 AÑO de cómo estará si sigue las recomendaciones
3. Crea un plan de 4 SEMANAS con progresión gradual
4. Cada semana debe incluir:
   - ALIMENTACIÓN: Menú keto (75% grasa animal, 20% proteína, 5% carbohidratos)
   - EJERCICIO: Rutinas adaptadas a su condición
   - HÁBITOS: Cambios específicos y alcanzables
5. Considera: ${decryptedMedical.allergies ? `Alergias: ${decryptedMedical.allergies}` : 'Sin alergias conocidas'}
6. Prioriza alimentos económicos y de temporada
7. Sugiere ejercicios con peso corporal primero, luego progresar
8. Conecta hábitos con su estado emocional (basado en evaluaciones)

# FORMATO DE RESPUESTA (JSON):
{
  "summary": "string",
  "vision": "string",
  "baselineMetrics": {
    "currentWeight": number?,
    "targetWeight": number?,
    "currentLifestyle": string[],
    "targetLifestyle": string[]
  },
  "weeks": [
    {
      "weekNumber": 1,
      "nutrition": {
        "focus": "string",
        "meals": string[],
        "recipes": [
          {
            "name": "string",
            "ingredients": [{"name": "string", "quantity": "string", "notes": "string?"}],
            "preparation": "string",
            "tips": "string?"
          }
        ],
        "shoppingList": [{"item": "string", "quantity": "string", "priority": "high|medium|low"}]
      },
      "exercise": {
        "routine": "string",
        "frequency": "string",
        "duration": "string",
        "adaptations": string[],
        "equipment": string[]?
      },
      "habits": {
        "toAdopt": string[],
        "toEliminate": string[],
        "trackingMethod": "string",
        "motivationTip": "string?"
      }
    }
  ]
}`;

    return prompt;
  }

  /**
   * Llama a la API de DeepSeek
   */
  private static async callDeepSeekAPI(prompt: string): Promise<string> {
    // Implementación específica de la API de DeepSeek
    // Esto depende de cómo esté configurada tu cuenta
    
    try {
      // Opción 1: Si tienes API key directa
      if (this.config.apiKey) {
        const response = await fetch(`${this.config.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
          }),
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      }
      
      // Opción 2: Si no hay API key, usar fallback
      logger.warn('AI_SERVICE', 'No hay API key configurada, usando modo de desarrollo');
      return this.getMockAIResponse();
      
    } catch (error) {
      logger.error('AI_SERVICE', 'Error llamando a DeepSeek API', error as Error);
      return this.getMockAIResponse();
    }
  }

  /**
   * Parsear respuesta JSON de la IA
   */
  private static parseAIResponse(response: string): any {
    try {
      // Intentar extraer JSON si hay texto alrededor
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      
      const parsed = JSON.parse(jsonString);
      
      // Validar estructura básica
      if (!parsed.summary || !parsed.vision || !parsed.weeks) {
        throw new Error('Estructura de respuesta inválida');
      }
      
      return parsed;
    } catch (error) {
      logger.error('AI_SERVICE', 'Error parseando respuesta de IA', error as Error, {
        responsePreview: response.substring(0, 200)
      });
      throw error;
    }
  }

  /**
   * Métodos auxiliares para desencriptar y formatear datos...
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
      if (key === 'documents') continue; // Los documentos se procesan por separado
      
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
        const decrypted = decrypt(doc.textractAnalysis.extractedText);
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
  private static getFallbackRecommendations(input: AIAnalysisInput, monthNumber: number): AIRecommendationSession {
    return {
      sessionId: `fallback_${Date.now()}`,
      monthNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      
      summary: 'Análisis inicial basado en información proporcionada. Recomendaciones estándar keto.',
      vision: 'Mejora significativa en energía, peso saludable y hábitos sostenibles en 12 meses.',
      
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
      }))
    };
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
        }
        // ... semanas 2, 3, 4 similares
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
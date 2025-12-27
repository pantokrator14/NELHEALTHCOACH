// apps/api/src/app/lib/ai-service.ts
import { logger } from './logger';
import { encrypt, safeDecrypt } from './encryption';
import { 
  PersonalData, 
  MedicalData, 
  AIRecommendationSession,
  AIRecommendationWeek,
  ChecklistItem
} from '../../../../../packages/types/src/healthForm';

// Interfaces para la respuesta de IA
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
        equipment?: string[];
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

export class AIService {
  private static config: AIConfig = {
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 8000, // Aumentado para respuestas completas
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
  };

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
        const prompt = this.buildAnalysisPrompt(input, monthNumber);
        
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
          return this.getFallbackRecommendations(input, monthNumber, metadata);
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
          return this.getFallbackRecommendations(input, monthNumber, metadata);
        }

        // Validar estructura
        if (!parsedResponse || !parsedResponse.weeks || !Array.isArray(parsedResponse.weeks)) {
          throw new Error('La respuesta de IA no tiene la estructura esperada (weeks)');
        }

        console.log('=== DEBUG: Convirtiendo y encriptando estructura ===');
        
        // Convertir respuesta a estructura encriptada
        const weeks: AIRecommendationWeek[] = this.convertAIResponseToWeeks(parsedResponse.weeks);
        const allChecklistItems = this.extractChecklistItems(weeks);

        console.log('=== DEBUG: Creando sesión completa ===');
        
        // Crear sesión
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session: AIRecommendationSession = {
          sessionId: metadata?.isRegeneration 
            ? `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        
        return this.getFallbackRecommendations(input, monthNumber, metadata);
      }
    });
  }

  /**
   * Construye el prompt optimizado para DeepSeek
   */
  private static buildAnalysisPrompt(input: AIAnalysisInput, monthNumber: number): string {
    const { personalData, medicalData, documents, previousSessions, currentProgress, coachNotes } = input;
    
    // Extraer información crítica del cliente (optimizado)
    const clientName = this.safeDecryptString(personalData.name) || 'cliente';
    const clientAge = this.safeDecryptString(personalData.age) || 'no especificada';
    const clientWeight = personalData.weight ? parseFloat(this.safeDecryptString(personalData.weight)) : null;
    const clientHeight = personalData.height ? parseFloat(this.safeDecryptString(personalData.height)) : null;
    const bmi = clientWeight && clientHeight ? (clientWeight / ((clientHeight/100) ** 2)).toFixed(1) : null;
    
    // ===== SISTEMA Y ROL (crítico para el comportamiento de la IA) =====
    const systemRole = `Eres un coach médico especializado en:
  1. Dieta keto (75% grasa animal, 20% proteína, 5% carbohidratos)
  2. Medicina funcional y nutrición clínica
  3. Formación de hábitos saludables sostenibles

  TAREA: Crear un plan de 4 semanas progresivo y acumulativo para ${clientName}.`;

    // ===== REGLAS ABSOLUTAS (estructura JSON obligatoria) =====
    const absoluteRules = `🚨 REGLAS ABSOLUTAS:
  1. Devuelve SOLO JSON válido
  2. Estructura EXACTA:
  {
    "summary": "Análisis general del cliente (máx 300 chars)",
    "vision": "Visión a 4 semanas (máx 300 chars)",
    "baselineMetrics": {
      "currentLifestyle": ["item1", "item2", "item3"],
      "targetLifestyle": ["item1", "item2", "item3"]
    },
    "weeks": [4 objetos semana]
  }

  3. PROGRESIÓN ACUMULATIVA:
  • Semana 1: 1 alimento + 1 ejercicio + 1 hábito adoptar + 1 hábito eliminar
  • Semana 2: 2 alimentos (1 nuevo) + 2 ejercicios (1 nuevo) + 2 hábitos adoptar (1 nuevo) + 2 hábitos eliminar
  • Semana 3: 3 alimentos (1 nuevo) + 3 ejercicios (1 nuevo) + 3 hábitos adoptar (1 nuevo) + 3 hábitos eliminar
  • Semana 4: 4 alimentos (1 nuevo) + 4 ejercicios (1 nuevo) + 4 hábitos adoptar (1 nuevo) + 4 hábitos eliminar`;

    // ===== INFORMACIÓN CRÍTICA DEL CLIENTE (formato conciso) =====
    const clientInfo = `👤 CLIENTE: ${clientName}, ${clientAge} años${
      clientWeight ? `, ${clientWeight}kg` : ''}${
      clientHeight ? `, ${clientHeight}cm` : ''}${
      bmi ? ` (IMC: ${bmi})` : ''}
  📋 OCUPACIÓN: ${this.safeDecryptString(personalData.occupation) || 'No especificada'}
  📍 UBICACIÓN: ${this.safeDecryptString(personalData.address) || 'No especificada'}`;

    // ===== DATOS MÉDICOS ESENCIALES (solo lo crítico) =====
    const medicalInfo = this.formatMedicalDataConcise(medicalData);
    
    // ===== DOCUMENTOS MÉDICOS (extremadamente conciso, solo si existen) =====
    let docsInfo = '';
    if (documents && documents.length > 0) {
      const relevantDocs = documents.filter(d => 
        d.content && d.content.length > 50 && (d.confidence || 0) > 60
      ).slice(0, 2); // Solo 2 documentos máximo
      
      if (relevantDocs.length > 0) {
        docsInfo = '\n📄 DOCUMENTOS MÉDICOS:';
        relevantDocs.forEach((doc, i) => {
          docsInfo += `\n${i+1}. ${doc.title || 'Documento'}: `;
          // Extraer solo puntos clave (primeros 300 chars)
          const content = doc.content || '';
          const keyPoints = content.split(/[.!?]/).slice(0, 3).join('. ');
          docsInfo += keyPoints.substring(0, 150) + (keyPoints.length > 150 ? '...' : '');
        });
      }
    }

    // ===== HISTORIAL ANTERIOR (solo si existe, formato ultra-conciso) =====
    let historyInfo = '';
    if (previousSessions && previousSessions.length > 0) {
      const lastSession = previousSessions[previousSessions.length - 1];
      historyInfo = `\n📈 SESIÓN ANTERIOR (Mes ${lastSession.monthNumber}):`;
      
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
      contextInfo = `\n📊 PROGRESO ACTUAL: ${currentProgress.overallProgress || 0}%`;
      if (currentProgress.metrics) {
        contextInfo += `\n📈 Métricas: N${currentProgress.metrics.nutritionAdherence || 0}% ` +
                    `E${currentProgress.metrics.exerciseConsistency || 0}% ` +
                    `H${currentProgress.metrics.habitFormation || 0}%`;
      }
    }

    // ===== NOTAS DEL COACH (solo si existen) =====
    let notesInfo = '';
    if (coachNotes && coachNotes.trim().length > 10) {
      notesInfo = `\n💬 NOTAS COACH: ${coachNotes.substring(0, 150)}${coachNotes.length > 150 ? '...' : ''}`;
    }

    // ===== ESQUEMA DE RESPUESTA (estructura exacta requerida) =====
    const responseSchema = `\n\n🎯 ESTRUCTURA DE RESPUESTA (JSON EXACTO):
  {
    "summary": "Resumen conciso del estado actual del cliente considerando datos médicos y objetivos.",
    "vision": "Resultados esperados tras 4 semanas siguiendo el plan.",
    "baselineMetrics": {
      "currentLifestyle": ["hábito1", "hábito2", "hábito3"],
      "targetLifestyle": ["objetivo1", "objetivo2", "objetivo3"]
    },
    "weeks": [
      {
        "weekNumber": 1,
        "nutrition": {
          "focus": "Enfoque nutricional semana 1",
          "checklistItems": [
            {
              "description": "Alimento/receta específica",
              "type": "breakfast/lunch/dinner/snack",
              "details": {
                "recipe": {
                  "ingredients": [
                    {"name": "ingrediente", "quantity": "cantidad", "notes": "opcional"}
                  ],
                  "preparation": "Instrucciones de preparación",
                  "tips": "Consejos adicionales"
                }
              }
            }
          ],
          "shoppingList": [
            {"item": "producto", "quantity": "cantidad", "priority": "high/medium/low"}
          ]
        },
        "exercise": {
          "focus": "Enfoque ejercicio semana 1",
          "checklistItems": [
            {
              "description": "Ejercicio específico",
              "type": "cardio/strength/flexibility",
              "details": {
                "frequency": "veces por semana",
                "duration": "duración",
                "equipment": ["equipo necesario"]
              }
            }
          ]
        },
        "habits": {
          "checklistItems": [
            {
              "description": "Hábito a adoptar",
              "type": "toAdopt"
            },
            {
              "description": "Hábito a eliminar",
              "type": "toEliminate"
            }
          ]
        }
      }
    ]
  }`;

  // ===== CONSIDERACIONES ESPECÍFICAS (adaptaciones críticas) =====
  const specificConsiderations = `\n🔍 ADAPTACIONES REQUERIDAS (considerar siempre):
${medicalData.allergies ? `• ALERGIAS: ${this.safeDecryptString(medicalData.allergies)}` : '• Sin alergias reportadas'}
${medicalData.medications ? `• MEDICAMENTOS: ${this.safeDecryptString(medicalData.medications)}` : '• Sin medicamentos reportados'}
${medicalData.mainComplaint ? `• QUEJA PRINCIPAL: ${this.safeDecryptString(medicalData.mainComplaint)}` : ''}
${medicalData.surgeries ? `• CIRUGÍAS: ${this.safeDecryptString(medicalData.surgeries)}` : ''}
${personalData.occupation ? `• IMPACTO OCUPACIÓN: ${this.safeDecryptString(personalData.occupation)} en rutina` : ''}`;

  // ===== CONSTRUCCIÓN DEL PROMPT FINAL (optimizado) =====
  const prompt = `${systemRole}

${absoluteRules}

${clientInfo}
${medicalInfo}
${docsInfo}
${historyInfo}
${contextInfo}
${notesInfo}
${specificConsiderations}

${responseSchema}

📌 INSTRUCCIÓN FINAL: Genera un plan REALISTA, PERSONALIZADO y PROGRESIVO.
   Considera limitaciones físicas, horarios, acceso a alimentos y sostenibilidad.
   Los alimentos deben ser accesibles en ${this.safeDecryptString(personalData.address) || 'la ubicación del cliente'}.
   Priorizar ejercicios que puedan hacerse en casa y sin equipo especializado.

🚨 DEVUELVE SOLO EL OBJETO JSON, SIN TEXTO ADICIONAL.`;

  console.log('📝 Prompt optimizado - Longitud:', prompt.length);
  console.log('📝 Tokens estimados:', Math.ceil(prompt.length / 4));
  
  return prompt;
}

  /**
   * Calcula el peso ideal basado en altura y género
   */
  private static calculateIdealWeight(height: number, gender: string): string {
    // Fórmula de Devine para peso ideal
    let idealWeight: number;
    
    if (gender.toLowerCase().includes('mujer') || gender.toLowerCase().includes('femenino')) {
      // Fórmula para mujeres: 45.5 kg + 0.91 kg por cm sobre 152.4 cm
      idealWeight = 45.5 + 0.91 * (height - 152.4);
    } else {
      // Fórmula para hombres: 50 kg + 0.91 kg por cm sobre 152.4 cm
      idealWeight = 50 + 0.91 * (height - 152.4);
    }
    
    // También fórmula alternativa basada en IMC 22
    const bmiBasedWeight = 22 * Math.pow(height / 100, 2);
    
    // Promedio de ambas fórmulas
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
    
    // ✅ CORRECCIÓN: Usar método helper para evaluar valores booleanos/strings
    if (this.getBooleanValue(medicalData.carbohydrateAddiction)) {
      improvements.push('Control de carbohidratos');
    }
    
    if (this.getBooleanValue(medicalData.leptinResistance)) {
      improvements.push('Sensibilidad hormonal');
    }
    
    // Mejoras por defecto si no hay específicas
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
    metadata?: { requestId?: string; clientId?: string }
  ): Promise<string> {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    try {
      console.log('🔍 DEBUG: Llamando a DeepSeek API...');
      console.log('🔑 API Key presente:', !!this.config.apiKey);
      console.log('📝 Prompt length:', prompt.length);
      console.log('📝 Prompt tokens estimados:', Math.ceil(prompt.length / 4));
      
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
        max_tokens: 8000, // Aumentado para respuestas largas
        response_format: { type: 'json_object' }
      };

      console.log('🌐 URL:', `${this.config.baseURL}/chat/completions`);
      console.log('📤 Request body size:', JSON.stringify(requestBody).length);
      
      const startTime = Date.now();
      
      // ===== SOLUCIÓN: Configurar timeout más flexible =====
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos
      
      try {
        const response = await fetch(`${this.config.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal // Usar controller signal
        });

        clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        
        console.log('📡 Status:', response.status);
        console.log('📡 Status Text:', response.statusText);
        console.log('⏱️ Duración:', duration, 'ms');
        
        // Obtener el texto de respuesta primero
        const responseText = await response.text();
        console.log('📦 Raw response length:', responseText.length);
        
        if (!response.ok) {
          console.error('❌ Error respuesta:', responseText.substring(0, 500));
          throw new Error(`DeepSeek API Error: ${response.status} - ${responseText.substring(0, 200)}`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
          console.log('✅ JSON parseado correctamente');
        } catch (jsonError) {
          console.error('❌ Error parseando respuesta JSON:', jsonError);
          console.error('📦 Texto que falló:', responseText.substring(0, 500));
          throw new Error('La respuesta de DeepSeek no es JSON válido');
        }
        
        console.log('📊 Token usage:', data.usage);
        console.log('📊 Finish reason:', data.choices?.[0]?.finish_reason);
        
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
          console.error('❌ No content en respuesta. Data completa:', JSON.stringify(data, null, 2));
          throw new Error('La respuesta de DeepSeek no contiene contenido');
        }

        console.log('📝 Content length:', content.length);
        console.log('📝 Content (first 500 chars):', content.substring(0, 500));
        
        // Verificar que sea JSON válido
        try {
          const parsedContent = JSON.parse(content);
          console.log('✅ Contenido es JSON válido');
          console.log('📊 Estructura del JSON:', Object.keys(parsedContent));
          
          if (!parsedContent.weeks || !Array.isArray(parsedContent.weeks)) {
            console.error('❌ JSON no tiene estructura weeks array:', parsedContent);
            throw new Error('La respuesta no tiene la estructura esperada (weeks array)');
          }
          
          console.log(`✅ ${parsedContent.weeks.length} semanas recibidas`);
          
        } catch (e) {
          console.error('❌ Contenido no es JSON válido:', content.substring(0, 300));
          console.error('❌ Error de parseo:', e);
          throw new Error('El contenido de la respuesta no es JSON válido');
        }
        
        return content;
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error('💥 Error completo en callDeepSeekAPI:', error.message);
      console.error('💥 Error type:', error.constructor.name);
      console.error('💥 Stack:', error.stack);
      loggerWithContext.error('AI_SERVICE', 'Error en llamada a DeepSeek API', error);
      
      // Si es timeout, intentar una vez más con timeout más corto
      if (error.name === 'AbortError' || error.code === 23) {
        console.log('⏰ Timeout detectado, intentando con timeout más corto...');
        return this.callDeepSeekWithShorterTimeout(prompt, metadata);
      }
      
      // Para debugging, muestra el mock en desarrollo
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
            content: prompt.substring(0, 3000) // Acortar prompt para reintento
          }
        ],
        temperature: this.config.temperature,
        max_tokens: 4000, // Reducir tokens para respuesta más rápida
        response_format: { type: 'json_object' }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minuto
      
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
      
      // Usar mock como último recurso
      console.log('🔄 Usando mock response después de reintento fallido');
      return this.getMockAIResponse();
    }
  }

  /**
   * Parsear respuesta JSON de la IA
   */
  private static parseAIResponse(response: string, metadata?: { requestId?: string; clientId?: string }): any {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;
    
    try {
      console.log('🔍 DEBUG parseAIResponse: Iniciando parseo');
      console.log('📝 Response length:', response.length);
      
      // Intentar parsear directamente
      try {
        return JSON.parse(response);
      } catch (firstError) {
        console.log('⚠️ Primer intento falló, intentando limpiar JSON...');
        
        // Limpiar posibles markdown
        let jsonString = response;
        
        // Remover ```json ... ```
        jsonString = jsonString.replace(/```json\s*/g, '');
        jsonString = jsonString.replace(/```\s*/g, '');
        
        // Buscar JSON entre llaves
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        // Intentar arreglar JSON truncado
        jsonString = this.fixTruncatedJSON(jsonString);
        
        console.log('📝 JSON limpiado (first 300 chars):', jsonString.substring(0, 300));
        
        return JSON.parse(jsonString);
      }
      
    } catch (error: any) {
      console.error('❌ ERROR en parseAIResponse:', error.message);
      
      // Si falla, intentar extraer lo que haya
      const fallback = this.extractPartialResponse(response);
      if (fallback) {
        console.log('🔄 Usando respuesta parcial extraída');
        return fallback;
      }
      
      throw error;
    }
  }

  /**
   * Convertir respuesta de IA a semanas encriptadas
   */
  private static convertAIResponseToWeeks(weeksResponse: any[]): AIRecommendationWeek[] {
    const weeks: AIRecommendationWeek[] = [];
    
    for (let weekIndex = 0; weekIndex < weeksResponse.length; weekIndex++) {
      const weekResp = weeksResponse[weekIndex];
      
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

      // Nutrición - checklist items encriptados
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

      // Ejercicio - checklist items encriptados
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

      // Hábitos - checklist items encriptados
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

      // Crear semana completa encriptada
      weeks.push({
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
      });
    }

    return weeks;
  }

  /**
   * Extraer todos los items del checklist
   */
  private static extractChecklistItems(weeks: AIRecommendationWeek[]): ChecklistItem[] {
    return weeks.flatMap(week => [
      ...week.nutrition.checklistItems,
      ...week.exercise.checklistItems,
      ...week.habits.checklistItems
    ]);
  }

  /**
   * Recomendaciones de fallback
   */
  private static getFallbackRecommendations(
    input: AIAnalysisInput, 
    monthNumber: number,
    metadata?: { requestId?: string; clientId?: string }
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
    
    // Calcular visión a 1 año
    const idealWeight = this.calculateIdealWeight(clientHeight, decryptedPersonal.gender || '');
    const idealBodyFat = this.calculateIdealBodyFat(clientAge.toString(), decryptedPersonal.gender || '');
    
    // Crear semanas
    const weeks = this.createFallbackWeeks();
    const allChecklistItems = this.extractChecklistItems(weeks);

    // Resumen y visión mejorados
    const summary = `Análisis inicial para ${clientName}, ${clientAge} años. Se recomienda enfoque keto progresivo adaptado a necesidades individuales. El plan incluye alimentación basada en grasas saludables, ejercicio gradual y formación de hábitos sostenibles.`;

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
   * Crear semanas de fallback
   */
  private static createFallbackWeeks(): AIRecommendationWeek[] {
    const weeks: AIRecommendationWeek[] = [];
    
    for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
      const weekNumber = (weekIndex + 1) as 1 | 2 | 3 | 4;
      const itemCount = weekIndex + 1;
      
      // Nutrición
      const nutritionChecklistItems: ChecklistItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        let mealType = '';
        let mealDesc = '';
        
        switch(i) {
          case 0: mealType = 'breakfast'; mealDesc = 'Desayuno: Huevos revueltos con espinacas'; break;
          case 1: mealType = 'lunch'; mealDesc = 'Almuerzo: Ensalada de pollo con aguacate'; break;
          case 2: mealType = 'dinner'; mealDesc = 'Cena: Salmón al horno con brócoli'; break;
          case 3: mealType = 'snack'; mealDesc = 'Merienda: Nueces y queso'; break;
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
                { name: encrypt('Espinacas'), quantity: encrypt('1 taza'), notes: encrypt('frescas') }
              ],
              preparation: encrypt('Cocinar los huevos en mantequilla, agregar espinacas al final.'),
              tips: encrypt('Añadir sal y pimienta al gusto.')
            }
          }
        });
      }
      
      // Ejercicio
      const exerciseChecklistItems: ChecklistItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        let exerciseType = '';
        let exerciseDesc = '';
        
        switch(i) {
          case 0: exerciseType = 'cardio'; exerciseDesc = 'Caminata rápida 20 minutos'; break;
          case 1: exerciseType = 'strength'; exerciseDesc = 'Flexiones - 10 repeticiones'; break;
          case 2: exerciseType = 'flexibility'; exerciseDesc = 'Estiramientos 10 minutos'; break;
          case 3: exerciseType = 'strength'; exerciseDesc = 'Sentadillas - 15 repeticiones'; break;
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
      
      // Hábitos
      const habitsChecklistItems: ChecklistItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        // Hábitos para adoptar
        let adoptHabit = '';
        switch(i) {
          case 0: adoptHabit = 'Beber 2 litros de agua al día'; break;
          case 1: adoptHabit = 'Dormir 7-8 horas por noche'; break;
          case 2: adoptHabit = 'Meditar 5 minutos al día'; break;
          case 3: adoptHabit = 'Registrar alimentos en diario'; break;
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
          case 0: eliminateHabit = 'Eliminar refrescos azucarados'; break;
          case 1: eliminateHabit = 'Reducir tiempo en pantallas antes de dormir'; break;
          case 2: eliminateHabit = 'Evitar snacks nocturnos'; break;
          case 3: eliminateHabit = 'Reducir consumo de alimentos procesados'; break;
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
      
      // Crear semana
      weeks.push({
        weekNumber,
        nutrition: {
          focus: encrypt(`Adaptación keto semana ${weekNumber}`),
          checklistItems: nutritionChecklistItems,
          shoppingList: [
            { item: encrypt('Huevos'), quantity: encrypt('12 unidades'), priority: 'high' },
            { item: encrypt('Aguacates'), quantity: encrypt('3 unidades'), priority: 'high' }
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
    if (!data) return '\n🏥 SIN DATOS MÉDICOS';
    
    const criticalInfo = [];
    
    if (data.allergies) {
      const allergies = this.safeDecryptString(data.allergies);
      if (allergies.toLowerCase() !== 'ninguna' && allergies.toLowerCase() !== 'no') {
        criticalInfo.push(`🚫 Alergias: ${allergies}`);
      }
    }
    
    if (data.medications) {
      const meds = this.safeDecryptString(data.medications);
      if (meds.toLowerCase() !== 'ninguno' && meds.toLowerCase() !== 'no') {
        criticalInfo.push(`💊 Medicamentos: ${meds}`);
      }
    }
    
    if (data.mainComplaint) {
      criticalInfo.push(`🤕 Queja principal: ${this.safeDecryptString(data.mainComplaint)}`);
    }
    
    if (data.surgeries) {
      const surgeries = this.safeDecryptString(data.surgeries);
      if (surgeries.toLowerCase() !== 'ninguna') {
        criticalInfo.push(`🩺 Cirugías: ${surgeries}`);
      }
    }
    
    // ✅ CORRECCIÓN: Usar método helper para evaluar valores booleanos/strings
    if (this.getBooleanValue(data.carbohydrateAddiction)) {
      criticalInfo.push('🍩 Adicción a carbohidratos: SÍ');
    }
    
    if (this.getBooleanValue(data.leptinResistance)) {
      criticalInfo.push('⚖️ Resistencia a leptina: SÍ');
    }
    
    return criticalInfo.length > 0 
      ? '\n🏥 DATOS MÉDICOS CRÍTICOS:\n' + criticalInfo.join('\n')
      : '\n🏥 Sin condiciones médicas críticas reportadas';
  }

  private static getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Peso normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  private static fixTruncatedJSON(jsonString: string): string {
    // Contar llaves para ver si está balanceado
    const openBraces = (jsonString.match(/{/g) || []).length;
    const closeBraces = (jsonString.match(/}/g) || []).length;
    
    if (openBraces > closeBraces) {
      console.log(`⚠️ JSON desbalanceado: {=${openBraces}, }=${closeBraces}, agregando llaves de cierre`);
      jsonString = jsonString + '}'.repeat(openBraces - closeBraces);
    }
    
    // Verificar si el último carácter es una coma o comilla sin cerrar
    const trimmed = jsonString.trim();
    if (trimmed.endsWith(',') || trimmed.endsWith('"')) {
      console.log('⚠️ JSON termina con carácter inválido, recortando...');
      jsonString = jsonString.substring(0, jsonString.length - 1);
    }
    
    return jsonString;
  }

  private static extractPartialResponse(response: string): any {
    try {
      // Intentar encontrar secciones clave
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
    // ✅ CORRECCIÓN: Usar AbortController en lugar de AbortSignal.timeout() que no existe en Node.js
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
}
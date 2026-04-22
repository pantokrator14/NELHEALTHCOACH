// apps/api/src/app/lib/agents/guard.ts
// Sistema de Guardrails para validación de seguridad en agentes de IA

// Sistema de Guardrails simplificado para validación de seguridad en agentes de IA
// Implementación propia mientras se resuelve la instalación de @openai/guardrails

// Definiciones de tipos
interface Rule {
  name: string;
  description: string;
  validate: (input: any) => Promise<boolean>;
}

class InputGuard {
  constructor(
    public config: {
      rules: Rule[];
      onFailure: (input: string | object, rule: Rule) => void;
    }
  ) {}

  get rules(): Rule[] {
    return this.config.rules;
  }

  get onFailure(): (input: string | object, rule: Rule) => void {
    return this.config.onFailure;
  }

  async validate(input: any): Promise<any> {
    for (const rule of this.config.rules) {
      const isValid = await rule.validate(input);
      if (!isValid) {
        this.config.onFailure(input, rule);
        throw new Error(`Input validation failed: ${rule.description}`);
      }
    }
    return input;
  }
}

class OutputGuard {
  constructor(
    public config: {
      rules: Rule[];
      onFailure: (output: string, rule: Rule) => string;
    }
  ) {}

  get rules(): Rule[] {
    return this.config.rules;
  }

  get onFailure(): (output: string, rule: Rule) => string {
    return this.config.onFailure;
  }

  async validate(output: string): Promise<string> {
    for (const rule of this.config.rules) {
      const isValid = await rule.validate(output);
      if (!isValid) {
        return this.config.onFailure(output, rule);
      }
    }
    return output;
  }
}

class Guard {
  public name: string;
  public description: string;
  public inputGuard: InputGuard;
  public outputGuard: OutputGuard;

  constructor(config: {
    name: string;
    description: string;
    inputGuard: InputGuard;
    outputGuard: OutputGuard;
  }) {
    this.name = config.name;
    this.description = config.description;
    this.inputGuard = config.inputGuard;
    this.outputGuard = config.outputGuard;
  }
}

import { logger } from '../logger';

/**
 * Configuración de Guardrails para el proyecto NELHEALTHCOACH
 * 
 * Este sistema proporciona validación de seguridad para:
 * 1. Entradas de usuario (prevención de prompt injection)
 * 2. Salidas de IA (validación de contenido médico)
 * 3. Estructura de respuestas (formato JSON válido)
 */

// ===== REGLAS PARA ENTRADAS DE USUARIO =====

/**
 * Regla: Prevención de prompt injection
 * Detecta intentos de manipular el comportamiento del LLM
 */
const promptInjectionRule: Rule = {
  name: 'prevent-prompt-injection',
  description: 'Previene intentos de inyección de prompt en entradas de usuario',
  validate: async (input: string): Promise<boolean> => {
    const blockedPatterns = [
      // Intentos de ignorar instrucciones del sistema
      /ignore.*previous|forget.*instructions|disregard.*system/i,
      // Intentos de obtener información del sistema
      /what.*system.*prompt|show.*instructions|reveal.*prompt/i,
      // Comandos de sistema
      /system:|sudo:|root:|admin:|exec\(|eval\(/i,
      // URLs sospechosas
      /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
      // Patrones de SQL injection básicos
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
      // Patrones de XSS básicos
      /<script.*>|javascript:|onclick=|onload=/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(input)) {
        logger.warn('GUARDRAILS', 'Detectado posible prompt injection', {
          pattern: pattern.source,
          input: input.substring(0, 100),
        });
        return false;
      }
    }

    return true;
  },
};

/**
 * Regla: Validación de datos médicos
 * Asegura que los datos médicos tengan formato apropiado
 */
const medicalDataRule: Rule = {
  name: 'validate-medical-data',
  description: 'Valida que los datos médicos tengan formato apropiado',
  validate: async (input: any): Promise<boolean> => {
    // Si no es un objeto, no es datos médicos estructurados
    if (typeof input !== 'object' || input === null) {
      return true;
    }

    // Validar campos médicos comunes
    const medicalFields = ['allergies', 'medications', 'conditions', 'symptoms'];
    for (const field of medicalFields) {
      if (input[field] && typeof input[field] !== 'string') {
        logger.warn('GUARDRAILS', `Campo médico '${field}' con tipo inválido`, {
          type: typeof input[field],
          value: JSON.stringify(input[field]).substring(0, 100),
        });
        return false;
      }
    }

    return true;
  },
};

// ===== REGLAS PARA SALIDAS DE IA =====

/**
 * Regla: Disclaimer médico obligatorio
 * Asegura que todas las recomendaciones incluyan disclaimer
 */

/**
 * Regla: Validación de seguridad en ejercicios
 * Previene recomendaciones de ejercicios peligrosos
 */
const exerciseSafetyRule: Rule = {
  name: 'exercise-safety-validation',
  description: 'Valida que los ejercicios sean seguros y apropiados',
  validate: async (output: string): Promise<boolean> => {
    const dangerousPatterns = [
      // Ejercicios de alto riesgo sin supervisión
      /\b(deadlift|squat|bench press|overhead press)\b.*\b(without spotter|alone|unsupervised)\b/i,
      // Técnicas peligrosas
      /\b(arch.*back|lock.*joints|bounce|jerking)\b/i,
      // Peso excesivo
      /\b(max.*weight|one.*rep.*max|PR attempt)\b.*\b(without.*experience)\b/i,
      // Ejercicios contraindicados para ciertas condiciones
      /\b(sit.*ups|crunches)\b.*\b(diastasis|hernia|back.*pain)\b/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(output)) {
        logger.warn('GUARDRAILS', 'Ejercicio potencialmente peligroso detectado', {
          pattern: pattern.source,
          context: output.substring(0, 200),
        });
        return false;
      }
    }

    return true;
  },
};

/**
 * Regla: Validación de hábitos saludables
 * Asegura que los hábitos recomendados sean apropiados
 */
const healthyHabitsRule: Rule = {
  name: 'healthy-habits-validation',
  description: 'Valida que los hábitos recomendados sean saludables y apropiados',
  validate: async (output: string): Promise<boolean> => {
    const unhealthyPatterns = [
      // Hábitos extremos o peligrosos
      /\b(extreme.*fasting|water.*fasting.*>3.*days|starvation)\b/i,
      /\b(over.*training|overtraining|no.*rest.*days)\b/i,
      // Hábitos con riesgos psicológicos
      /\b(obsessive.*tracking|compulsive.*weighing)\b/i,
      // Recomendaciones sin base científica
      /\b(detox.*cleanse|colon.*cleanse|liver.*flush)\b/i,
    ];

    for (const pattern of unhealthyPatterns) {
      if (pattern.test(output)) {
        logger.warn('GUARDRAILS', 'Hábito potencialmente no saludable detectado', {
          pattern: pattern.source,
          context: output.substring(0, 200),
        });
        return false;
      }
    }

    return true;
  },
};

/**
 * Regla: Validación de ingredientes seguros
 * Previene recomendaciones de ingredientes peligrosos o alérgenos comunes
 */
const safeIngredientsRule: Rule = {
  name: 'safe-ingredients-validation',
  description: 'Valida que los ingredientes sean seguros y apropiados',
  validate: async (output: string): Promise<boolean> => {
    const dangerousIngredients = [
      // Alérgenos comunes (deben ser claramente etiquetados, no recomendados sin contexto)
      /\b(peanuts|tree.*nuts|shellfish|soy|wheat|gluten)\b.*\b(recommend|suggest|try)\b/i,
      // Ingredientes con riesgos conocidos
      /\b(raw.*eggs|unpasteurized|sprouted.*beans.*raw)\b/i,
      // Suplementos no regulados
      /\b(herbal.*supplement|weight.*loss.*pill|fat.*burner)\b/i,
    ];

    for (const pattern of dangerousIngredients) {
      if (pattern.test(output)) {
        logger.warn('GUARDRAILS', 'Ingrediente potencialmente peligroso detectado', {
          pattern: pattern.source,
          context: output.substring(0, 200),
        });
        return false;
      }
    }

    return true;
  },
};
const medicalDisclaimerRule: Rule = {
  name: 'require-medical-disclaimer',
  description: 'Requiere disclaimer médico en todas las recomendaciones',
  validate: async (output: string): Promise<boolean> => {
    const disclaimerPatterns = [
      /consulte.*médico|consulta.*profesional/i,
      /no.*sustituye.*consejo.*médico/i,
      /información.*educativa/i,
      /si.*tiene.*dudas.*consulte/i,
      /este.*plan.*no.*reemplaza/i,
    ];

    for (const pattern of disclaimerPatterns) {
      if (pattern.test(output)) {
        return true;
      }
    }

    logger.warn('GUARDRAILS', 'Falta disclaimer médico en respuesta de IA');
    return false;
  },
};

/**
 * Regla: Prohibición de recomendaciones de medicamentos
 * Previene que la IA recomiende medicamentos específicos
 */
const noMedicationRecommendationRule: Rule = {
  name: 'no-medication-recommendations',
  description: 'Prohíbe recomendaciones de medicamentos específicos',
  validate: async (output: string): Promise<boolean> => {
    const medicationPatterns = [
      // Nombres de medicamentos comunes
      /\b(ibuprofen|paracetamol|aspirin|metformin|insulin|atorvastatin)\b/i,
      // Términos de prescripción
      /\b(tomar.*mg|dosis.*diaria|prescribir.*médico)\b/i,
      // Instrucciones de medicación específica
      /\b(comprimido.*cada|inyección.*semanal)\b/i,
    ];

    for (const pattern of medicationPatterns) {
      if (pattern.test(output)) {
        logger.warn('GUARDRAILS', 'Detectada posible recomendación de medicamento', {
          pattern: pattern.source,
          context: output.substring(0, 150),
        });
        return false;
      }
    }

    return true;
  },
};

/**
 * Regla: Validación de formato JSON
 * Asegura que las respuestas estructuradas sean JSON válido
 */
const jsonValidationRule: Rule = {
  name: 'validate-json-structure',
  description: 'Valida que las respuestas JSON tengan estructura correcta',
  validate: async (output: string): Promise<boolean> => {
    // Solo validar si parece ser JSON
    const trimmed = output.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      return true; // No es JSON, no aplicar esta regla
    }

    try {
      const parsed = JSON.parse(output);
      
      // Validar estructura básica para planes de nutrición
      if (parsed.weeks && Array.isArray(parsed.weeks)) {
        for (const week of parsed.weeks) {
          if (!week.weekNumber || typeof week.weekNumber !== 'number') {
            logger.warn('GUARDRAILS', 'Estructura JSON inválida: falta weekNumber');
            return false;
          }
          
          if (week.nutrition && week.nutrition.checklistItems) {
            if (!Array.isArray(week.nutrition.checklistItems)) {
              logger.warn('GUARDRAILS', 'Estructura JSON inválida: checklistItems no es array');
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      logger.warn('GUARDRAILS', 'JSON inválido en respuesta de IA', { error });
      return false;
    }
  },
};

// ===== GUARDS ESPECÍFICOS POR AGENTE =====

/**
 * Guard para el planificador nutricional
 */
export const nutritionPlannerGuard = new Guard({
  name: 'nutrition-planner-guard',
  description: 'Guardrails para el planificador nutricional',
  
  // Reglas para entradas
  inputGuard: new InputGuard({
    rules: [promptInjectionRule, medicalDataRule],
    onFailure: (input: string | object, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para nutrición`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Validación de seguridad falló: ${rule.description}`);
    },
  }),

  // Reglas para salidas
  outputGuard: new OutputGuard({
    rules: [medicalDisclaimerRule, noMedicationRecommendationRule, safeIngredientsRule, jsonValidationRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para nutrición`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      
      // Devolver respuesta de respaldo segura
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo generar un plan seguro. Por favor, contacte a un profesional de la salud.',
        disclaimer: 'Esta es una respuesta de respaldo. Consulte siempre con un profesional médico calificado antes de seguir cualquier plan de nutrición.',
        weeks: [],
      });
    },
  }),
});

/**
 * Guard para el analizador de clientes
 */
export const clientAnalyzerGuard = new Guard({
  name: 'client-analyzer-guard',
  description: 'Guardrails para el analizador de clientes',
  
  inputGuard: new InputGuard({
    rules: [promptInjectionRule, medicalDataRule],
    onFailure: (input: string | object, rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para análisis de cliente`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Entrada no segura para análisis de cliente: ${rule.description}`);
    },
  }),

  outputGuard: new OutputGuard({
    rules: [medicalDisclaimerRule, jsonValidationRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para análisis de cliente`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo completar el análisis de forma segura.',
        disclaimer: 'Consulte con un profesional médico para un análisis personalizado.',
        insights: {
          summary: 'Análisis no disponible por razones de seguridad',
          keyRisks: ['Requiere evaluación profesional'],
          opportunities: ['Consulta médica recomendada'],
          experienceLevel: 'principiante',
          idealWeight: 'N/A',
          idealBodyFat: 'N/A',
          targetImprovements: ['Evaluación profesional'],
        },
      });
    },
  }),
});

/**
 * Guard para el planificador de ejercicios
 */
export const exercisePlannerGuard = new Guard({
  name: 'exercise-planner-guard',
  description: 'Guardrails para el planificador de ejercicios',
  
  inputGuard: new InputGuard({
    rules: [promptInjectionRule, medicalDataRule],
    onFailure: (input: string | object, rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para planificación de ejercicios`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Entrada no segura para planificación de ejercicios: ${rule.description}`);
    },
  }),

  outputGuard: new OutputGuard({
    rules: [medicalDisclaimerRule, noMedicationRecommendationRule, exerciseSafetyRule, jsonValidationRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para planificación de ejercicios`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo generar un plan de ejercicios seguro.',
        disclaimer: 'Consulte con un profesional de la salud antes de comenzar cualquier programa de ejercicios.',
        exercises: [],
        safetyWarning: 'Realice ejercicios bajo supervisión profesional si tiene condiciones médicas.',
      });
    },
  }),
});

/**
 * Guard para el diseñador de hábitos
 */
export const habitDesignerGuard = new Guard({
  name: 'habit-designer-guard',
  description: 'Guardrails para el diseñador de hábitos',
  
  inputGuard: new InputGuard({
    rules: [promptInjectionRule],
    onFailure: (input: string | object, rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para diseño de hábitos`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Entrada no segura para diseño de hábitos: ${rule.description}`);
    },
  }),

  outputGuard: new OutputGuard({
    rules: [medicalDisclaimerRule, healthyHabitsRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para diseño de hábitos`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo generar un plan de hábitos seguro.',
        disclaimer: 'Los cambios de hábitos deben realizarse gradualmente y bajo orientación profesional.',
        habits: [],
        recommendation: 'Consulte con un coach de salud para un plan personalizado.',
      });
    },
  }),
});

/**
 * Guard para el validador de calidad
 */
export const qualityValidatorGuard = new Guard({
  name: 'quality-validator-guard',
  description: 'Guardrails para el validador de calidad',
  
  inputGuard: new InputGuard({
    rules: [promptInjectionRule],
    onFailure: (input: string | object, rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para validación de calidad`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Entrada no segura para validación de calidad: ${rule.description}`);
    },
  }),

  outputGuard: new OutputGuard({
    rules: [jsonValidationRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para validación de calidad`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo completar la validación de calidad.',
        validationResult: 'inconclusive',
        recommendation: 'Revisión manual requerida',
      });
    },
  }),
});

/**
 * Guard para el generador de lista de compras
 */
export const shoppingListGuard = new Guard({
  name: 'shopping-list-guard',
  description: 'Guardrails para el generador de lista de compras',
  
  inputGuard: new InputGuard({
    rules: [promptInjectionRule],
    onFailure: (input: string | object, rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para lista de compras`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Entrada no segura para lista de compras: ${rule.description}`);
    },
  }),

  outputGuard: new OutputGuard({
    rules: [jsonValidationRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para lista de compras`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo generar una lista de compras segura.',
        shoppingList: [],
        recommendation: 'Consulte recetas aprobadas por profesionales.',
      });
    },
  }),
});

/**
 * Guard para el emparejador de recetas
 */
export const recipeMatcherGuard = new Guard({
  name: 'recipe-matcher-guard',
  description: 'Guardrails para el emparejador de recetas',
  
  inputGuard: new InputGuard({
    rules: [promptInjectionRule],
    onFailure: (input: string | object, rule) => {
      logger.error('GUARDRAILS', `Validación de entrada falló para emparejamiento de recetas`, {
        rule: rule.name,
        input: typeof input === 'string' ? input.substring(0, 100) : 'Object',
      });
      throw new Error(`Entrada no segura para emparejamiento de recetas: ${rule.description}`);
    },
  }),

  outputGuard: new OutputGuard({
    rules: [jsonValidationRule],
    onFailure: (output: string, rule: Rule) => {
      logger.error('GUARDRAILS', `Validación de salida falló para emparejamiento de recetas`, {
        rule: rule.name,
        output: output.substring(0, 150),
      });
      
      return JSON.stringify({
        error: 'Validación de seguridad falló',
        message: 'No se pudo encontrar recetas seguras.',
        recipes: [],
        recommendation: 'Consulte recetas aprobadas por nutricionistas.',
      });
    },
  }),
});

/**
 * Función helper para obtener el guard apropiado según el agente
 */
export function getGuardForAgent(agentName: string): Guard {
  const guardMap: Record<string, Guard> = {
    'nutrition-planner': nutritionPlannerGuard,
    'client-analyzer': clientAnalyzerGuard,
    'exercise-planner': exercisePlannerGuard,
    'habit-designer': habitDesignerGuard,
    'quality-validator': qualityValidatorGuard,
    'shopping-list': shoppingListGuard,
    'recipe-matcher': recipeMatcherGuard,
  };

  const guard = guardMap[agentName];
  if (!guard) {
    logger.warn('GUARDRAILS', `No se encontró guard específico para agente: ${agentName}, usando guard por defecto`);
    return nutritionPlannerGuard; // Guard por defecto
  }

  return guard;
}

/**
 * Función helper para aplicar guardrails a cualquier agente
 */
export async function applyGuardrails<T>(
  guard: Guard,
  input: any,
  processFn: (validatedInput: any) => Promise<T>
): Promise<T> {
  try {
    // Validar entrada
    const validatedInput = await guard.inputGuard.validate(input);
    
    // Procesar con la función del agente
    const output = await processFn(validatedInput);
    
    // Validar salida
    const validatedOutput = await guard.outputGuard.validate(
      typeof output === 'string' ? output : JSON.stringify(output)
    );
    
    // Devolver salida validada
    return typeof output === 'string' 
      ? validatedOutput as T
      : JSON.parse(validatedOutput);
      
  } catch (error: any) {
    logger.error('GUARDRAILS', 'Error aplicando guardrails', error);
    
    // Si el error ya es de guardrails, propagarlo
    if (error.message.includes('Validación de seguridad')) {
      throw error;
    }
    
    // Para otros errores, devolver respuesta segura
    throw new Error(`Error de seguridad en procesamiento: ${error.message}`);
  }
}

/**
 * Función para validar rápidamente una respuesta de IA
 */
export async function validateAIResponse(response: string): Promise<{
  isValid: boolean;
  issues: string[];
  sanitizedResponse?: string;
}> {
  const issues: string[] = [];
  let sanitized = response;

  // Verificar disclaimer médico
  if (!(await medicalDisclaimerRule.validate(response))) {
    issues.push('Falta disclaimer médico obligatorio');
    sanitized += '\n\n⚠️ IMPORTANTE: Esta es una recomendación educativa. Consulte con un profesional médico antes de implementar cualquier cambio en su dieta o rutina de ejercicios.';
  }

  // Verificar medicamentos
  if (!(await noMedicationRecommendationRule.validate(response))) {
    issues.push('Posible recomendación de medicamento detectada');
    // Remover nombres de medicamentos
    sanitized = sanitized.replace(
      /\b(ibuprofen|paracetamol|aspirin|metformin|insulin|atorvastatin)\b/gi,
      '[MEDICAMENTO NO RECOMENDADO]'
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    sanitizedResponse: issues.length > 0 ? sanitized : undefined,
  };
}

/**
 * Logger para guardrails
 */
export function logGuardrailEvent(
  event: 'input_validation' | 'output_validation' | 'guardrail_triggered',
  data: {
    guardName: string;
    success: boolean;
    input?: any;
    output?: any;
    rule?: string;
    error?: string;
  }
) {
  logger.info('GUARDRAILS', `Evento de guardrail: ${event}`, data);
}
/**
 * Generación de recomendaciones con PIPELINE SECUENCIAL (3 fases).
 *
 * Fase 1: Analista Clínico — Extrae biomarcadores de documentos médicos (structuredMedicalAnalysis).
 * Fase 2: Health Coach — Genera plan de nutrición (7 días), ejercicios y hábitos usando Fase 1 como contexto.
 * Fase 3: Asistente Logístico — Extrae y consolida la lista de compras del weeklyPlan generado en Fase 2.
 *
 * Cada fase es una llamada LLM independiente para evitar "atención degradada" en prompts masivos.
 */

import { createDeepSeekJSONLLM, robustJsonParse } from "./agents/utils/llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "./logger";

// ── Interfaces de Entrada ──────────────────────────────────

export interface CompositeInput {
  personalData: Record<string, unknown>;
  medicalData: Record<string, unknown>;
  healthAssessment: Record<string, string>;
  mentalHealth: Record<string, string>;
  processedDocuments: Array<{ title: string; content: string; documentType: string; confidence: number }>;
  previousSessions: Array<Record<string, unknown>>;
  coachNotes: string;
  monthNumber: number;
}

// ── Interfaces de Salida por Fase ──────────────────────────

/** Fase 1: Solo análisis médico (estructura inmutable) */
export interface MedicalOutput {
  medicalSummary: string;
  medicalComparativeAnalysis: string;
  labResults: Array<{
    name: string;
    value: string;
    range: string;
    status: 'normal' | 'alto' | 'bajo';
  }>;
  structuredMedicalAnalysis: {
    exams: Array<{
      intro: string;
      table: Array<{ biomarcador: string; valor: string; rango_normal: string; estado: 'Alto' | 'Bajo' | 'Normal' }>;
      analysis: string;
    }>;
    supplements: Array<{
      name: string;
      dosage: string;
      timing: string;
      rationale: string;
      contraindications?: string;
    }>;
  };
}

/** Fase 2: Plan de estilo de vida + clientInsights (sin datos médicos crudos) */
export interface LifestyleOutput {
  clientInsights: {
    summary: string;
    vision: string;
    keyRisks: string[];
    opportunities: string[];
    experienceLevel: "principiante" | "intermedio" | "avanzado";
    idealWeight: string;
    idealBodyFat: string;
    targetImprovements: string[];
  };
  nutritionPlan: {
    weeklyPlan: Array<{
      day: string;
      breakfast: string;
      lunch: string;
      dinner: string;
    }>;
    shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
  };
  exercisePlan: {
    weeklyRoutine: Array<{
      day: string;
      exercises: Array<{
        name: string;
        sets: number;
        repetitions: string;
        timeUnderTension: string;
        progression: string;
      }>;
    }>;
    equipment: string[];
    notes: string;
  };
  habitPlan: {
    toAdopt: Array<{ habit: string; frequency: string; trigger: string }>;
    toEliminate: Array<{ habit: string; replacement: string }>;
    trackingMethod: string;
    motivationTip: string;
  };
  alternatives?: Array<{
    meal: string;
    recipe: string;
    description: string;
  }>;
}

/** Fase 3: Solo lista de compras (extraída del weeklyPlan de Fase 2) */
export interface ShoppingListOutput {
  shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
}

// ── Interface de Salida Final (fusión de ambas fases) ──────

export interface CompositeOutput {
  clientInsights: {
    summary: string;
    vision: string;
    keyRisks: string[];
    opportunities: string[];
    experienceLevel: "principiante" | "intermedio" | "avanzado";
    idealWeight: string;
    idealBodyFat: string;
    targetImprovements: string[];
    medicalSummary: string;
    medicalComparativeAnalysis: string;
    labResults?: Array<{
      name: string;
      value: string;
      range: string;
      status: 'normal' | 'alto' | 'bajo';
    }>;
    structuredMedicalAnalysis?: {
      exams: Array<{
        intro: string;
        table: Array<{ biomarcador: string; valor: string; rango_normal: string; estado: 'Alto' | 'Bajo' | 'Normal' }>;
        analysis: string;
      }>;
      supplements: Array<{
        name: string;
        dosage: string;
        timing: string;
        rationale: string;
        contraindications?: string;
      }>;
    };
  };
  nutritionPlan: {
    weeklyPlan: Array<{
      day: string;
      breakfast: string;
      lunch: string;
      dinner: string;
    }>;
    shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
  };
  exercisePlan: {
    weeklyRoutine: Array<{
      day: string;
      exercises: Array<{
        name: string;
        sets: number;
        repetitions: string;
        timeUnderTension: string;
        progression: string;
      }>;
    }>;
    equipment: string[];
    notes: string;
  };
  habitPlan: {
    toAdopt: Array<{ habit: string; frequency: string; trigger: string }>;
    toEliminate: Array<{ habit: string; replacement: string }>;
    trackingMethod: string;
    motivationTip: string;
  };
  alternatives?: Array<{
    meal: string;
    recipe: string;
    description: string;
  }>;
}

// ── Formateo de datos ──────────────────────────────────────

function formatPersonalData(data: Record<string, unknown>, sessionCount = 0): string {
  return [
    `- Nombre: ${data.name || "No especificado"}`,
    `- Edad: ${data.age || "N/A"}`,
    `- Peso: ${data.weight || "N/A"} | Altura: ${data.height || "N/A"}`,
    `- Género: ${data.gender || "No esp."} | Ocupación: ${data.occupation || "No esp."}`,
    `- Estado civil: ${data.maritalStatus || "No esp."} | Educación: ${data.education || "No esp."}`,
    `- Sesiones previas: ${sessionCount} | Nivel aproximado: ${sessionCount === 0 ? "principiante" : sessionCount < 3 ? "intermedio" : "avanzado"}`,
  ].join("\n");
}

function formatMedicalSummary(data: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    mainComplaint: "Motivo", currentPastConditions: "Condiciones", allergies: "Alergias",
    medications: "Medicamentos", supplements: "Suplementos", surgeries: "Cirugías",
    employmentHistory: "Trabajo", hobbies: "Hobbies", physicalLimitations: "Limitaciones físicas",
    gymAccess: "Acceso a gym", gymAccessDetails: "Detalles de acceso a gym",
    preferredExerciseTypes: "Ejercicios preferidos", exerciseTimeAvailability: "Disponibilidad para ejercicio",
    currentActivityLevel: "Nivel de actividad actual", whoCooks: "Quién cocina y con quién vive",
    housingHistory: "Historial de vivienda (exposición ambiental)",
    dislikedFoodsActivities: "Comidas/actividades que NO le gustan",
    typicalWeekday: "Día de semana típico", typicalWeekend: "Fin de semana típico",
  };
  return Object.entries(labels).map(([k, v]) => data[k] ? `- ${v}: ${data[k]}` : "").filter(Boolean).join("\n") || "- Sin datos médicos";
}

function formatHealthAssess(data: Record<string, string>): string {
  if (!data || Object.keys(data).length === 0) return "- Sin evaluaciones";
  return Object.entries(data)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n") || "- Sin evaluaciones";
}

function formatMental(data: Record<string, string>): string {
  if (!data || Object.keys(data).length === 0) return "- Sin datos";
  return Object.entries(data)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n") || "- Sin datos";
}

function formatDocs(docs: Array<{ title: string; content: string }>): string {
  if (!docs?.length) return "- Sin docs";
  return docs.map((d, i) => `${i + 1}. ${d.title}\n${d.content.substring(0, 3000)}`).join("\n\n");
}

// ── Prompts por Fase ───────────────────────────────────────

/** Prompt Fase 1: Analista Clínico (SOLO documentos médicos) */
function buildMedicalPrompt(
  input: CompositeInput
): { system: string; human: string } {
  const hasDocuments = input.processedDocuments && input.processedDocuments.length > 0;

  return {
    system: "ERES UN ANALISTA CLÍNICO. TU RESPUESTA DEBE SER UN JSON VÁLIDO. Esta es tu ÚNICA tarea: extraer biomarcadores de documentos médicos y generar suplementación. NO generes planes de nutrición ni ejercicios.",
    human: `Eres un analista médico experto. Tu ÚNICA tarea es analizar los documentos clínicos del cliente y generar una estructura JSON con los campos: medicalSummary, medicalComparativeAnalysis, labResults, y structuredMedicalAnalysis.

## DATOS MÉDICOS DEL CLIENTE
${formatMedicalSummary(input.medicalData)}

## DOCUMENTOS CLÍNICOS
${hasDocuments ? formatDocs(input.processedDocuments) : "- NO HAY DOCUMENTOS MÉDICOS DISPONIBLES"}

${input.coachNotes ? `### NOTAS DEL COACH\n${input.coachNotes}\n` : ""}

## INSTRUCCIONES DE SALIDA JSON

${hasDocuments ? `
### OBLIGATORIO: Genera structuredMedicalAnalysis procesando TODOS los datos de laboratorio extraídos de los documentos.
- Agrupa los valores en "exams" (cada examen con "intro", "table" de biomarcadores, y "analysis")
- Propone suplementación específica en "supplements" basada en biomarcadores alterados
- REGLAS ANTI-ALUCINACIÓN: Extrae estrictamente los valores clínicos. IGNORA texto administrativo o menciones de "visitas programadas". NO supongas condiciones genéticas sin contexto explícito. Ofrece alternativas, no diagnósticos concluyentes.
- ⚠️ SI hay documentos y structuredMedicalAnalysis.exams está vacío, tu respuesta se considera INVÁLIDA.
` : `
### NO hay documentos médicos: Devuelve medicalSummary="", medicalComparativeAnalysis="", labResults=[], structuredMedicalAnalysis con exams:[] y supplements:[]
`}

\`\`\`json
{
  "medicalSummary": "${hasDocuments ? "Análisis detallado de laboratorios y biomarcadores extraídos de los documentos" : ""}",
  "medicalComparativeAnalysis": "${hasDocuments ? "Comparativa entre documentos identificando tendencias" : ""}",
  "labResults": [
    ${hasDocuments ? '{ "name": "Glucosa", "value": "95 mg/dL", "range": "70-100 mg/dL", "status": "normal" }' : ""}
  ],
  "structuredMedicalAnalysis": {
    "exams": [
      ${hasDocuments ? `{
        "intro": "El panel de lípidos del paciente muestra...",
        "table": [
          { "biomarcador": "Colesterol Total", "valor": "245 mg/dL", "rango_normal": "125-200 mg/dL", "estado": "Alto" }
        ],
        "analysis": "El colesterol total se encuentra significativamente elevado..."
      }` : ""}
    ],
    "supplements": [
      ${hasDocuments ? '{ "name": "Omega-3", "dosage": "2000 mg/día", "timing": "Con el almuerzo", "rationale": "LDL y triglicéridos elevados", "contraindications": "Precaución con anticoagulantes" }' : ""}
    ]
  }
}
\`\`\`

Responde SOLO con el JSON, sin texto adicional.`
  };
}

/** Prompt Fase 2: Health Coach (estilo de vida + contexto médico de Fase 1) */
function buildLifestylePrompt(
  input: CompositeInput,
  dbRecipes: Array<{ _id: string; title: string; cookTime: number; difficulty: string; category: string[] }>,
  dbExercises: Array<{ _id: string; name: string; difficulty: string; clientLevel: string; equipment: string[]; muscleGroups: string[] }>,
  medicalResult: MedicalOutput
): { system: string; human: string } {
  const recipeList = dbRecipes.map(r =>
    `- [ID:${r._id}] "${r.title}" (⏱${r.cookTime}min | ${r.difficulty})`
  ).join("\n");

  const exerciseList = dbExercises.map(e =>
    `- [ID:${e._id}] "${e.name}" (${e.difficulty} | ${e.clientLevel} | ${e.equipment.join(',') || 'sin equipo'})`
  ).join("\n");

  const medicalContext = medicalResult.structuredMedicalAnalysis.exams.length > 0
    ? `## ANÁLISIS MÉDICO PREVIO (CONTEXTO INMUTABLE — ÚSALO PARA PERSONALIZAR EL PLAN)
- Resumen médico: ${medicalResult.medicalSummary}
- Biomarcadores alterados detectados: ${medicalResult.labResults.filter(lr => lr.status !== 'normal').map(lr => `${lr.name}: ${lr.value} (${lr.status})`).join(', ') || 'Ninguno'}
- Suplementos recomendados: ${medicalResult.structuredMedicalAnalysis.supplements.map(s => `${s.name} (${s.dosage})`).join(', ') || 'Ninguno'}
- Considera estos hallazgos al diseñar el plan de nutrición y ejercicios. Evita alimentos que contradigan los biomarcadores alterados.`
    : '## NO SE DETECTARON DOCUMENTOS MÉDICOS — Diseña el plan basándote únicamente en los datos de estilo de vida del cliente.';

  return {
    system: "Eres un health coach experto. Basándote en el análisis médico previo proporcionado como contexto, genera un plan de nutrición de 7 días, ejercicios y hábitos personalizado. Responde EXACTAMENTE con el JSON solicitado.",
    human: `Eres un entrenador de salud integral. Diseña un plan de 7 días (Lunes a Domingo) que se repetirá durante 4 semanas (1 mes) para este cliente.

${medicalContext}

## DATOS DEL CLIENTE
${formatPersonalData(input.personalData, input.previousSessions.length)}

### Salud y estilo de vida
${formatMedicalSummary(input.medicalData)}

### Evaluaciones de salud
${formatHealthAssess(input.healthAssessment)}

### Salud mental
${formatMental(input.mentalHealth)}

${input.coachNotes ? `### NOTAS DEL COACH\n${input.coachNotes}\n` : ""}

## RECETAS DISPONIBLES EN LA BASE DE DATOS (DEBES USAR SOLO ESTAS)
${recipeList || "- No hay recetas en la DB"}

## EJERCICIOS DISPONIBLES EN LA BASE DE DATOS (DEBES USAR SOLO ESTOS)
${exerciseList || "- No hay ejercicios en la DB"}

## GENERA ESTE JSON USANDO LOS IDs DE LAS LISTAS DE ARRIBA

### 1. clientInsights — Análisis del cliente (BREVE: summary y vision deben ser cortos, sin tanto detalle)
- TONO PROFESIONAL CON CALIDEZ: Usa un tono profesional pero cálido — como un coach que es claro y directo pero también alentador. summary debe comenzar destacando aspectos positivos, fortalezas y logros del cliente, y luego mencionar los desafíos de forma constructiva sin sonar demasiado informal ni demasiado clínico.
- summary: Resumen breve y equilibrado que reconozca fortalezas y logros, y señale áreas de mejora con un tono constructivo (2-3 líneas máximo)
- vision: Visión corta de cómo estará el cliente en 4 semanas (1 mes) — con un tono realista pero motivador (2-3 líneas máximo)

### 2. nutritionPlan — PLAN DE COMIDAS (7 días)
- weeklyPlan: array de 7 objetos (Monday a Sunday)
- Cada día: breakfast, lunch, dinner con el TÍTULO EXACTO de la receta
- DEBES usar SOLO recetas de la lista de arriba. Copia el título EXACTO
- shoppingList: lista de compras con cantidades totales
- IMPORTANTE: Devuelve los ingredientes en una ÚNICA lista unificada. ESTÁ PROHIBIDO categorizar o agrupar por semanas o días.

### 3. exercisePlan — RUTINA DE EJERCICIOS
- weeklyRoutine: días específicos (NO todos, típicamente 3-4 días/semana) con exercises[]
- Cada ejercicio: name con el NOMBRE EXACTO de la lista de arriba
- SELECCIÓN POR NIVEL: clientLevel debe coincidir con el nivel del cliente
- ⚠️ REGLA DE ORO DE CONCURRENCIA SEMANAL: El plan de ejercicios debe tener una frecuencia ESTRICTA de máximo 3 o 4 días por semana (por ejemplo: Lunes, Miércoles y Viernes). Está rotundamente PROHIBIDO asignar rutinas intensas para los 7 días de la semana.
- ⚠️ GUARDIA ANTE CONTEXTO VACÍO: Si los campos de 'gymAccess', 'gymAccessDetails' o 'preferredExerciseTypes' vienen vacíos o no especificados en el perfil del cliente, DEBES asumir por defecto que el cliente NO tiene equipo y entrenará en casa. Diseña la rutina usando exclusivamente ejercicios de peso corporal (Bodyweight) y calistenia ligera enfocada en movilidad y fuerza funcional básica.

### 4. habitPlan — HÁBITOS 
- toAdopt: array con "habit", "frequency", "trigger"
- toEliminate: array con "habit", "replacement"
- trackingMethod, motivationTip

### 5. alternatives — alternativas de recetas (OBLIGATORIO: al menos 3)
- alternatives: array con "meal", "recipe" (TÍTULO EXACTO), "description"

\`\`\`json
{
  "clientInsights": {
    "summary": "Resumen breve del estado actual del cliente...",
    "vision": "Visión corta de cómo estará el cliente en 4 semanas (1 mes)...",
    "keyRisks": ["..."],
    "opportunities": ["..."],
    "experienceLevel": "principiante|intermedio|avanzado",
    "idealWeight": "XX kg",
    "idealBodyFat": "XX%",
    "targetImprovements": ["..."]
  },
  "nutritionPlan": {
    "weeklyPlan": [
      { "day": "Monday", "breakfast": "TÍTULO EXACTO DE RECETA", "lunch": "...", "dinner": "..." },
      { "day": "Tuesday", ... },
      { "day": "Wednesday", ... },
      { "day": "Thursday", ... },
      { "day": "Friday", ... },
      { "day": "Saturday", ... },
      { "day": "Sunday", ... }
    ],
    "shoppingList": [...]
  },
  "exercisePlan": {
    "weeklyRoutine": [
      { "day": "Monday", "exercises": [{ "name": "NOMBRE EXACTO DE EJERCICIO", "sets": 3, "repetitions": "12", "timeUnderTension": "3-1-1", "progression": "..." }] }
    ],
    "equipment": [...],
    "notes": "..."
  },
  "habitPlan": { "toAdopt": [...], "toEliminate": [...], "trackingMethod": "...", "motivationTip": "..." },
  "alternatives": [...]
}
\`\`\`

IMPORTANTE:
- USA SOLO recetas y ejercicios de las listas proporcionadas
- Copia los títulos/nombres EXACTAMENTE como aparecen
- vision DEBE ser tan extensa y detallada como summary
- Responde SOLO con el JSON, sin texto adicional`
  };
}

/** Prompt Fase 3: Asistente Logístico (SOLO lista de compras a partir del weeklyPlan) */
function buildShoppingListPrompt(
  weeklyPlan: Array<{ day: string; breakfast: string; lunch: string; dinner: string }>
): { system: string; human: string } {
  return {
    system: "Eres un asistente nutricional logístico. Lee el plan de comidas de 7 días adjunto y extrae una lista de compras consolidada y exacta para la semana. Agrupa los ingredientes y suma las cantidades lógicas. Tu única tarea es devolver el JSON con la 'shoppingList'. PROHIBIDO devolver un array vacío.",
    human: `Aquí está el plan de comidas semanal:\n\n${JSON.stringify(weeklyPlan, null, 2)}`,
  };
}

/**
 * Ejecuta la Fase 3 (Asistente Logístico) de forma independiente.
 * Toma un weeklyPlan y devuelve una shoppingList consolidada.
 * Útil para re-procesar la lista de compras cuando se edita el plan manualmente.
 */
export async function generateShoppingListFromWeeklyPlan(
  weeklyPlan: Array<{ day: string; breakfast: string; lunch: string; dinner: string }>
): Promise<ShoppingListOutput> {
  logger.info("AI", "🛒 FASE 3 (standalone): Extrayendo lista de compras del plan semanal...");

  // Safety delay para evitar rate limiting de Gemini
  await new Promise(resolve => setTimeout(resolve, 8000));

  const prompt = buildShoppingListPrompt(weeklyPlan);
  const content = await invokeLLM(prompt.system, prompt.human, "FASE 3 (standalone)");

  let result: ShoppingListOutput;
  try {
    result = robustJsonParse<ShoppingListOutput>(content);
  } catch (error: any) {
    logger.error("AI", "❌ Fase 3 (standalone) fallida: No se pudo parsear el JSON", error);
    throw new Error("Fase 3 fallida: El LLM no devolvió un JSON parseable para la lista de compras. " + (error?.message || ""));
  }

  // Guardia Fail-Fast: lista de compras debe ser un array con al menos 1 elemento
  if (!result.shoppingList || !Array.isArray(result.shoppingList) || result.shoppingList.length === 0) {
    logger.error("AI", "❌ Fase 3 (standalone) fallida: Lista de compras inválida o vacía.", new Error("Invalid or empty shopping list"));
    throw new Error("Fase 3 fallida: El LLM no pudo consolidar la lista de compras. Abortando pipeline.");
  }

  logger.info("AI", "✅ Fase 3 (standalone) completada exitosamente.", {
    shoppingListItemCount: result.shoppingList.length,
  });

  return result;
}

// ── Helpers de invocación LLM ──────────────────────────────

async function invokeLLM(
  systemMsg: string,
  humanMsg: string,
  phaseLabel: string
): Promise<string> {
  const llm = await createDeepSeekJSONLLM();
  const response = await llm.invoke([
    new SystemMessage(systemMsg),
    new HumanMessage(humanMsg),
  ]);
  const content = typeof response.content === "string" ? response.content : "";
  if (content.length > 0) {
    logger.info("AI", `${phaseLabel}: LLM respondió con ${content.length} caracteres`);
  } else {
    logger.warn("AI", `${phaseLabel}: LLM respondió con contenido vacío`, {
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
  }
  return content;
}

// ── Orquestador Principal (Pipeline Secuencial) ────────────

export type CompositeOutputWithIds = CompositeOutput & {
  _recipeIds: Record<string, string>;
  _exerciseIds: Record<string, string>;
};

export async function generateCompositeRecommendation(input: CompositeInput): Promise<CompositeOutputWithIds> {
  logger.info("AI", "Iniciando pipeline secuencial de recomendaciones (3 fases)");

  // ── 0. Obtener recetas y ejercicios de la DB ──
  const { getRecipesCollection, getExerciseCollection } = await import("./database");
  const { decrypt: dbDecrypt } = await import("./encryption");

  const recipesColl = await getRecipesCollection();
  const recipeDocs = await recipesColl.find({ isPublished: true }).limit(80).toArray();
  const dbRecipes = recipeDocs.map((d) => ({
    _id: String(d._id),
    title: dbDecrypt(d.title as string),
    cookTime: d.cookTime as number,
    difficulty: dbDecrypt((d.difficulty as string) || 'easy'),
    category: ((d.category as string[]) || []).map((c: string) => dbDecrypt(c)),
  }));
  logger.info("AI", `${dbRecipes.length} recetas obtenidas de la DB`);

  const exercisesColl = await getExerciseCollection();
  const exerciseDocs = await exercisesColl.find({ isPublished: true }).limit(80).toArray();
  const dbExercises = exerciseDocs.map((d) => ({
    _id: String(d._id),
    name: dbDecrypt(d.name as string),
    difficulty: dbDecrypt((d.difficulty as string) || 'medium'),
    clientLevel: dbDecrypt((d.clientLevel as string) || 'principiante'),
    equipment: ((d.equipment as string[]) || []).map((e: string) => dbDecrypt(e)),
    muscleGroups: ((d.muscleGroups as string[]) || []).map((m: string) => dbDecrypt(m)),
  }));
  logger.info("AI", `${dbExercises.length} ejercicios obtenidos de la DB`);

  const hasDocuments = input.processedDocuments && input.processedDocuments.length > 0;

  // ══════════════════════════════════════════════════════════
  // FASE 1: Analista Clínico — Extracción médica aislada
  // ══════════════════════════════════════════════════════════

  logger.info("AI", "🔬 FASE 1: Iniciando análisis médico...");
  const medicalPrompt = buildMedicalPrompt(input);
  const medicalContent = await invokeLLM(medicalPrompt.system, medicalPrompt.human, "FASE 1");

  let medicalResult: MedicalOutput;
  try {
    medicalResult = robustJsonParse<MedicalOutput>(medicalContent);
  } catch (error: any) {
    logger.error("AI", "❌ Fase 1 fallida: No se pudo parsear el JSON médico", error);
    throw new Error("Fase 1 fallida: El LLM no devolvió un JSON parseable para el análisis médico. " + (error?.message || ""));
  }

  // Validación FAIL-FAST: si hay documentos y exams está vacío
  if (hasDocuments && (!medicalResult.structuredMedicalAnalysis?.exams || medicalResult.structuredMedicalAnalysis.exams.length === 0)) {
    logger.error("AI", "❌ Fase 1 fallida: El modelo médico no extrajo las tablas.", new Error("Medical model failed to extract tables"));
    throw new Error("Fase 1 fallida: El modelo médico no extrajo las tablas de biomarcadores. Abortando pipeline.");
  }

  logger.info("AI", "✅ Fase 1 (Análisis Médico) completada exitosamente.", {
    examCount: medicalResult.structuredMedicalAnalysis?.exams?.length ?? 0,
    supplementCount: medicalResult.structuredMedicalAnalysis?.supplements?.length ?? 0,
    labResultCount: medicalResult.labResults?.length ?? 0,
  });

  // ══════════════════════════════════════════════════════════
  // DELAY DE SEGURIDAD: 8 segundos entre fases (evitar 503)
  // ══════════════════════════════════════════════════════════

  await new Promise(resolve => setTimeout(resolve, 8000));

  // ══════════════════════════════════════════════════════════
  // FASE 2: Health Coach — Plan de estilo de vida
  // ══════════════════════════════════════════════════════════

  logger.info("AI", "🏋️ FASE 2: Iniciando plan de estilo de vida...");
  const lifestylePrompt = buildLifestylePrompt(input, dbRecipes, dbExercises, medicalResult);
  const lifestyleContent = await invokeLLM(lifestylePrompt.system, lifestylePrompt.human, "FASE 2");

  let lifestyleResult: LifestyleOutput;
  try {
    lifestyleResult = robustJsonParse<LifestyleOutput>(lifestyleContent);
  } catch (error: any) {
    logger.error("AI", "❌ Fase 2 fallida: No se pudo parsear el JSON de estilo de vida", error);
    throw new Error("Fase 2 fallida: El LLM no devolvió un JSON parseable para el plan de estilo de vida. " + (error?.message || ""));
  }

  logger.info("AI", "✅ Fase 2 (Plan de Estilo de Vida) completada exitosamente.", {
    nutritionDays: lifestyleResult.nutritionPlan?.weeklyPlan?.length ?? 0,
    exerciseDays: lifestyleResult.exercisePlan?.weeklyRoutine?.length ?? 0,
    habitCount: lifestyleResult.habitPlan?.toAdopt?.length ?? 0,
  });

  // ══════════════════════════════════════════════════════════
  // FASE 3: Asistente Logístico — Lista de compras del weeklyPlan
  // ══════════════════════════════════════════════════════════

  const shoppingListResult = await generateShoppingListFromWeeklyPlan(lifestyleResult.nutritionPlan.weeklyPlan);

  // ══════════════════════════════════════════════════════════
  // FUSIÓN FINAL: Combinar Fase 1 + Fase 2 + Fase 3 en CompositeOutput
  // ══════════════════════════════════════════════════════════

  const result: CompositeOutput = {
    clientInsights: {
      ...lifestyleResult.clientInsights,
      medicalSummary: medicalResult.medicalSummary,
      medicalComparativeAnalysis: medicalResult.medicalComparativeAnalysis,
      labResults: medicalResult.labResults,
      structuredMedicalAnalysis: medicalResult.structuredMedicalAnalysis,
    },
    nutritionPlan: {
      ...lifestyleResult.nutritionPlan,
      shoppingList: Array.isArray(shoppingListResult?.shoppingList) ? shoppingListResult.shoppingList : [],
    },
    exercisePlan: lifestyleResult.exercisePlan,
    habitPlan: lifestyleResult.habitPlan,
    alternatives: lifestyleResult.alternatives,
  };

  // Validaciones de estructura mínima (throw si faltan secciones críticas)
  if (!result.clientInsights.summary) {
    throw new Error("Fusión fallida: clientInsights.summary está vacío tras combinar ambas fases.");
  }
  if (!result.clientInsights.vision) {
    throw new Error("Fusión fallida: clientInsights.vision está vacío tras combinar ambas fases.");
  }
  if (!result.nutritionPlan || !result.nutritionPlan.weeklyPlan || result.nutritionPlan.weeklyPlan.length < 7) {
    throw new Error("Fusión fallida: nutritionPlan.weeklyPlan tiene menos de 7 días tras combinar ambas fases.");
  }

  logger.info("AI", "✅ Pipeline secuencial (3 fases) completado exitosamente", {
    hasMedicalAnalysis: (result.clientInsights.structuredMedicalAnalysis?.exams?.length ?? 0) > 0,
    examCount: result.clientInsights.structuredMedicalAnalysis?.exams?.length ?? 0,
    supplementCount: result.clientInsights.structuredMedicalAnalysis?.supplements?.length ?? 0,
    nutritionDays: result.nutritionPlan.weeklyPlan.length,
    shoppingListItemCount: result.nutritionPlan.shoppingList.length,
  });

  // ── Mapeo directo título → ID ──
  const recipeIds: Record<string, string> = {};
  const exerciseIds: Record<string, string> = {};
  for (const rec of dbRecipes) { recipeIds[rec.title] = rec._id; }
  for (const ex of dbExercises) { exerciseIds[ex.name] = ex._id; }

  return { ...result, _recipeIds: recipeIds, _exerciseIds: exerciseIds } as CompositeOutputWithIds;
}

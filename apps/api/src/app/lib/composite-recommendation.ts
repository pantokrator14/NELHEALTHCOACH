/**
 * Generación de recomendaciones con un PROMPT ÚNICO COMPUESTO.
 *
 * Genera un plan de 7 días (Lunes a Domingo) que se repite durante los 3 meses entre sesiones.
 * Nutrición: 7 días × (desayuno + almuerzo + cena) + lista de compras
 * Ejercicios: días específicos con rutinas
 * Hábitos: hábitos semanales
 */

import { createDeepSeekJSONLLM, robustJsonParse } from "./agents/utils/llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "./logger";

// ── Interfaces ──────────────────────────────────────────

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

export interface CompositeOutput {
  clientInsights: {
    summary: string;
    vision: string; // Visión a 12 semanas — tan extensa como el summary
    keyRisks: string[];
    opportunities: string[];
    experienceLevel: "principiante" | "intermedio" | "avanzado";
    idealWeight: string;
    idealBodyFat: string;
    targetImprovements: string[];
    medicalSummary: string;  // Análisis detallado de documentos médicos
    medicalComparativeAnalysis: string;  // Comparativa entre documentos si hay varios
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

// ── Formateo de datos ──────────────────────────────────

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

// ── Prompt único ────────────────────────────────────────

function buildCompositePrompt(
  input: CompositeInput,
  dbRecipes: Array<{ _id: string; title: string; cookTime: number; difficulty: string; category: string[] }>,
  dbExercises: Array<{ _id: string; name: string; difficulty: string; clientLevel: string; equipment: string[]; muscleGroups: string[] }>
): string {
  // Formatear recetas como referencia
  const recipeList = dbRecipes.map(r =>
    `- [ID:${r._id}] "${r.title}" (⏱${r.cookTime}min | ${r.difficulty})`
  ).join("\n");

  // Formatear ejercicios como referencia
  const exerciseList = dbExercises.map(e =>
    `- [ID:${e._id}] "${e.name}" (${e.difficulty} | ${e.clientLevel} | ${e.equipment.join(',') || 'sin equipo'})`
  ).join("\n");

  return `Eres un entrenador de salud integral. Diseña un plan de 7 días (Lunes a Domingo) que se repetirá durante 12 semanas para este cliente.

## DATOS DEL CLIENTE
${formatPersonalData(input.personalData, input.previousSessions.length)}

### Salud y estilo de vida
${formatMedicalSummary(input.medicalData)}

### Evaluaciones de salud
${formatHealthAssess(input.healthAssessment)}

### Salud mental
${formatMental(input.mentalHealth)}

### Documentos
${formatDocs(input.processedDocuments)}
${input.coachNotes ? `\n### NOTAS DEL COACH\n${input.coachNotes}\n` : ""}

## RECETAS DISPONIBLES EN LA BASE DE DATOS (DEBES USAR SOLO ESTAS)
${recipeList || "- No hay recetas en la DB"}

## EJERCICIOS DISPONIBLES EN LA BASE DE DATOS (DEBES USAR SOLO ESTOS)
${exerciseList || "- No hay ejercicios en la DB"}

## GENERA ESTE JSON USANDO LOS IDs DE LAS LISTAS DE ARRIBA

### 1. clientInsights — Análisis del cliente (MUY IMPORTANTE: vision debe ser tan extensa como summary)
- SI hay documentos médicos (sección "Documentos"), genera medicalSummary (análisis detallado de laboratorios, biomarcadores y hallazgos clínicos) y medicalComparativeAnalysis (comparativa entre documentos si hay varios, identificando tendencias y cambios)
- SI NO hay documentos, ambos campos deben ser strings vacíos ""

### 2. nutritionPlan — PLAN DE COMIDAS (7 días)
- weeklyPlan: array de 7 objetos (Monday a Sunday)
- Cada día: breakfast, lunch, dinner con el TÍTULO EXACTO de la receta
- DEBES usar SOLO recetas de la lista de arriba. Copia el título EXACTO
- shoppingList: lista de compras con cantidades totales

### 3. exercisePlan — RUTINA DE EJERCICIOS
- weeklyRoutine: días específicos (NO todos, típicamente 3-4 días/semana) con exercises[]
- Cada ejercicio: name con el NOMBRE EXACTO de la lista de arriba
- DEBES usar SOLO ejercicios de la lista de arriba. Copia el nombre EXACTO
- SELECCIÓN POR NIVEL: clientLevel debe coincidir con el nivel de experiencia del cliente (principiante/medio/avanzado)
- SELECCIÓN POR CONTEXTO: elige ejercicios que el cliente PUEDA hacer según su acceso a gimnasio, equipo disponible y preferencias (mira los datos de Salud y estilo de vida)
- Si el cliente NO tiene acceso a gym, usa SOLO ejercicios de peso corporal (sin equipo). Si tiene gym, puedes usar ejercicios con equipo
- Considera las limitaciones físicas del cliente (NO asignes ejercicios que no pueda hacer)
- equipment y notes: en "notes" incluye recomendaciones personalizadas de horarios según la disponibilidad del cliente (mira "Disponibilidad para ejercicio" en los datos), calentamiento, descanso y progresión

### 4. habitPlan — HÁBITOS 
- toAdopt: array de objetos con: "habit" (nombre descriptivo del hábito, ej: "Beber 2L de agua al día"), "frequency" (diario/semanal), "trigger" (cuándo activarlo)
- toEliminate: array de objetos con: "habit" (hábito a eliminar, ej: "Comer azúcar procesada"), "replacement" (con qué reemplazarlo, ej: "Frutas frescas")
- trackingMethod: método de seguimiento
- motivationTip: consejo motivacional

### 5. alternatives — alternativas de recetas (OBLIGATORIO: generar al menos 3)
- alternatives: array de objetos con: "meal" (desayuno/almuerzo/cena), "recipe" (TÍTULO EXACTO de la receta de la lista), "description" (por qué es buena alternativa)
- DEBES generar al menos 3 alternativas variadas usando recetas de la lista disponible
- Las alternativas son recetas diferentes a las del plan principal, para dar variedad al cliente

\`\`\`json
{
  "clientInsights": {
    "summary": "Análisis detallado y extenso del estado actual del cliente...",
    "vision": "Visión igualmente extensa y detallada de cómo estará el cliente en 12 semanas...",
    "keyRisks": ["..."],
    "opportunities": ["..."],
    "experienceLevel": "principiante|intermedio|avanzado",
    "idealWeight": "XX kg",
    "idealBodyFat": "XX%",
    "targetImprovements": ["..."],
    "medicalSummary": "Si hay documentos médicos, análisis detallado de laboratorios y biomarcadores. Si no, cadena vacía.",
    "medicalComparativeAnalysis": "Si hay múltiples documentos, comparativa entre ellos identificando tendencias. Si no, cadena vacía."
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
- Copia los títulos/nombres EXACTAMENTE como aparecen (incluyendo mayúsculas, paréntesis, etc.)
- vision DEBE ser tan extensa y detallada como summary
- NO asumas el estado civil ni tipo de relación del cliente — usa la información de 'Quién cocina y con quién vive' para entender su contexto real
- Responde SOLO con el JSON, sin texto adicional`;
}

// ── Orquestador principal ───────────────────────────────

export type CompositeOutputWithIds = CompositeOutput & {
  _recipeIds: Record<string, string>;
  _exerciseIds: Record<string, string>;
};

export async function generateCompositeRecommendation(input: CompositeInput): Promise<CompositeOutputWithIds> {
  const logCtx = logger.withContext({ node: "composite-recommendation" });

  logCtx.info("AI", "Generando recomendación con prompt compuesto");

  // ── 1. Obtener recetas y ejercicios de la DB para pasárselos al LLM ──
  const { getRecipesCollection, getExerciseCollection } = await import("./database");
  const { decrypt: dbDecrypt } = await import("./encryption");

  // Recetas: traer todas (títulos desencriptados + datos clave)
  const recipesColl = await getRecipesCollection();
  const recipeDocs = await recipesColl.find({ isPublished: true }).limit(80).toArray();
  const dbRecipes = recipeDocs.map((d) => ({
    _id: String(d._id),
    title: dbDecrypt(d.title as string),
    cookTime: d.cookTime as number,
    difficulty: dbDecrypt((d.difficulty as string) || 'easy'),
    category: ((d.category as string[]) || []).map((c: string) => dbDecrypt(c)),
  }));
  logCtx.info("AI", `${dbRecipes.length} recetas obtenidas de la DB para referencia`);

  // Ejercicios: traer todos
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
  logCtx.info("AI", `${dbExercises.length} ejercicios obtenidos de la DB para referencia`);

  // ── 2. Construir prompt y llamar al LLM ──
  const llm = createDeepSeekJSONLLM();
  const prompt = buildCompositePrompt(input, dbRecipes, dbExercises);

  const response = await llm.invoke([
    new SystemMessage("Eres un entrenador de salud integral. Selecciona recetas y ejercicios de la lista proporcionada para diseñar un plan personalizado. Responde EXACTAMENTE con el JSON solicitado."),
    new HumanMessage(prompt),
  ]);

  const content = typeof response.content === "string" ? response.content : "";
  let result: CompositeOutput;

  try {
    result = robustJsonParse<CompositeOutput>(content);
  } catch {
    logCtx.warn("AI", "Fallo parseo, usando fallback");
    result = {
      clientInsights: { summary: "Plan generado", vision: "Visión del plan generado", keyRisks: [], opportunities: [], experienceLevel: "principiante", idealWeight: "N/A", idealBodyFat: "N/A", targetImprovements: [], medicalSummary: "", medicalComparativeAnalysis: "" },
      nutritionPlan: {
        weeklyPlan: [
          { day: "Monday", breakfast: "Huevos revueltos con aguacate", lunch: "Pechuga de pollo con ensalada", dinner: "Salmón con espárragos" },
          { day: "Tuesday", breakfast: "Omelette de espinacas", lunch: "Ensalada de atún", dinner: "Pollo al horno con verduras" },
          { day: "Wednesday", breakfast: "Huevos revueltos con aguacate", lunch: "Salmón con espárragos", dinner: "Carne molida con calabacín" },
          { day: "Thursday", breakfast: "Batido de proteína con frutos rojos", lunch: "Pechuga de pollo con ensalada", dinner: "Pescado al vapor con brócoli" },
          { day: "Friday", breakfast: "Omelette de espinacas", lunch: "Ensalada de atún", dinner: "Pollo al horno con verduras" },
          { day: "Saturday", breakfast: "Huevos revueltos con aguacate", lunch: "Carne molida con calabacín", dinner: "Salmón con espárragos" },
          { day: "Sunday", breakfast: "Batido de proteína con frutos rojos", lunch: "Pechuga de pollo con ensalada", dinner: "Pescado al vapor con brócoli" },
        ],
        shoppingList: [{ item: "Huevos", quantity: "12 unidades", priority: "high" }, { item: "Pechuga de pollo", quantity: "1 kg", priority: "high" }],
      },
      exercisePlan: {
        weeklyRoutine: [{ day: "Monday", exercises: [{ name: "Sentadillas", sets: 3, repetitions: "12", timeUnderTension: "3-1-1", progression: "Aumentar peso" }] }],
        equipment: [], notes: "",
      },
      habitPlan: { toAdopt: [], toEliminate: [], trackingMethod: "Checklist", motivationTip: "Persistencia" },
    };
  }

  // Validar estructura mínima
  if (!result.clientInsights) result.clientInsights = { summary: "N/A", vision: "N/A", keyRisks: [], opportunities: [], experienceLevel: "principiante", idealWeight: "N/A", idealBodyFat: "N/A", targetImprovements: [], medicalSummary: "", medicalComparativeAnalysis: "" };
  if (!result.nutritionPlan || !result.nutritionPlan.weeklyPlan || result.nutritionPlan.weeklyPlan.length < 7) {
    result.nutritionPlan = result.nutritionPlan || { weeklyPlan: [], shoppingList: [] };
    result.nutritionPlan.weeklyPlan = [
      { day: "Monday", breakfast: "Huevos revueltos con aguacate", lunch: "Pechuga de pollo con ensalada", dinner: "Salmón con espárragos" },
      { day: "Tuesday", breakfast: "Omelette de espinacas", lunch: "Ensalada de atún", dinner: "Pollo al horno con verduras" },
      { day: "Wednesday", breakfast: "Huevos revueltos con aguacate", lunch: "Salmón con espárragos", dinner: "Carne molida con calabacín" },
      { day: "Thursday", breakfast: "Batido de proteína con frutos rojos", lunch: "Pechuga de pollo con ensalada", dinner: "Pescado al vapor con brócoli" },
      { day: "Friday", breakfast: "Omelette de espinacas", lunch: "Ensalada de atún", dinner: "Pollo al horno con verduras" },
      { day: "Saturday", breakfast: "Huevos revueltos con aguacate", lunch: "Carne molida con calabacín", dinner: "Salmón con espárragos" },
      { day: "Sunday", breakfast: "Batido de proteína con frutos rojos", lunch: "Pechuga de pollo con ensalada", dinner: "Pescado al vapor con brócoli" },
    ];
  }

  logCtx.info("AI", "Recomendación generada exitosamente");

  // ── 3. Mapeo directo título → ID (sin búsqueda fuzzy, el LLM usó títulos exactos) ──
  const recipeIds: Record<string, string> = {};
  const exerciseIds: Record<string, string> = {};
  for (const rec of dbRecipes) { recipeIds[rec.title] = rec._id; }
  for (const ex of dbExercises) { exerciseIds[ex.name] = ex._id; }

  return { ...result, _recipeIds: recipeIds, _exerciseIds: exerciseIds } as CompositeOutputWithIds;
}

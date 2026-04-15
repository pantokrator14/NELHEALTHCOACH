import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage, ToolMessage, type BaseMessage, type AIMessageChunk } from "@langchain/core/messages";
import { createDeepSeekWithTools, createDeepSeekJSONLLM } from "../utils/llm";
import type { RecommendationStateType } from "../state";
import { searchExerciseTool, saveExerciseTool } from "../tools/exercise-tools";
import { logger } from "../../logger";

/**
 * Exercise Planner Node with Tool Calling
 *
 * Uses LLM with tools to:
 * 1. Search existing exercises in DB that match client profile
 * 2. Create new exercises when nothing suitable exists
 * 3. Build a weekly exercise plan using selected/created exercises
 */
export async function planExercise(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "planExercise",
    clientId: state.clientId,
    monthNumber: state.monthNumber,
  });

  try {
    if (!state.clientInsights) {
      logCtx.warn("AI", "No client insights available, using fallback exercise plan");
      return {
        errors: ["planExercise: clientInsights not available. Run analyzeClient first."],
        exercisePlan: [],
      };
    }

    logCtx.info("AI", "Starting exercise planning with tool calling");

    const totalWeeks = state.monthNumber * 4;
    const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    const llmWithTools = createDeepSeekWithTools(
      [searchExerciseTool, saveExerciseTool],
      { temperature: 0.5, maxTokens: 6000 }
    );

    const systemPrompt = buildExerciseSystemPrompt(state, weekNumbers);
    const userPrompt = buildExerciseUserPrompt(state, weekNumbers);

    logCtx.debug("AI", "Invoking LLM with tools for exercise planning");

    // Run the tool-calling loop
    const finalContent = await runToolCallingLoop(llmWithTools, systemPrompt, userPrompt, logCtx);

    const exercisePlan = parseExerciseResponse(finalContent, weekNumbers);

    logCtx.info("AI", "Exercise planning completed", {
      weekCount: exercisePlan.length,
    });

    return { exercisePlan };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Exercise planning failed: ${errorMessage}`);

    return {
      errors: [`planExercise: ${errorMessage}`],
      exercisePlan: generateFallbackExercise(state.monthNumber),
    };
  }
}

/**
 * Runs the tool-calling loop: invoke LLM, execute tool calls, repeat until no more tool calls.
 */
async function runToolCallingLoop(
  llm: ReturnType<typeof createDeepSeekWithTools>,
  systemPrompt: string,
  userPrompt: string,
  logCtx: ReturnType<typeof logger.withContext>
): Promise<string> {
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ];

  let hasToolCalls = true;
  let maxIterations = 10;

  while (hasToolCalls && maxIterations > 0) {
    maxIterations--;

    const response = await llm.invoke(messages) as unknown as AIMessageChunk;
    messages.push(response);

    const toolCalls = ((response as unknown as Record<string, unknown>).tool_calls ?? []) as Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;

    if (toolCalls.length === 0) {
      hasToolCalls = false;
      return typeof response.content === "string" ? response.content : "";
    }

    logCtx.info("AI", `Executing ${toolCalls.length} tool call(s)`);

    for (const tc of toolCalls) {
      logCtx.debug("AI", `Executing tool: ${tc.name}`, { args: tc.args });

      const result: string = String(
        tc.name === "search_exercise"
          ? await searchExerciseTool.invoke(tc.args as Parameters<typeof searchExerciseTool.invoke>[0])
          : tc.name === "save_exercise"
            ? await saveExerciseTool.invoke(tc.args as Parameters<typeof saveExerciseTool.invoke>[0])
            : JSON.stringify({ error: `Unknown tool: ${tc.name}` })
      );

      logCtx.debug("AI", `Tool ${tc.name} completed`, { resultLength: result.length });

      messages.push(new ToolMessage({
        content: result,
        tool_call_id: tc.id,
      }));
    }
  }

  const finalResponse = await llm.invoke(messages) as unknown as AIMessageChunk;
  return typeof finalResponse.content === "string" ? finalResponse.content : "";
}

function buildExerciseSystemPrompt(
  state: RecommendationStateType,
  _weekNumbers: number[]
): string {
  const level = state.clientInsights?.experienceLevel ?? "principiante";

  return `Eres un entrenador personal certificado especializado en fuerza funcional, movilidad y longevidad. Tu tarea es diseñar un plan de ejercicio personalizado.

## ESTRUCTURA SEMANAL:
- Días de entrenamiento: miércoles, sábado, domingo
- Duración: 30-45 minutos por sesión
- Caminatas: todos los días excepto miércoles (30-45 min)

## HERRAMIENTAS DISPONIBLES:
Tienes acceso a herramientas para interactuar con la base de datos:

### search_exercise
- Busca ejercicios existentes en la base de datos
- Usa 'query' con palabras clave (ej: "piernas sentadilla", "push pecho")
- Usa 'clientLevel' para filtrar por nivel: "${level}"
- Usa 'equipment' para filtrar por equipo disponible
- **Úsalo PRIMERO** antes de crear ejercicios nuevos

### save_exercise
- Crea y guarda un NUEVO ejercicio cuando no exista uno adecuado
- **Solo úsalo si** search_exercise no devuelve resultados relevantes
- Incluye: name, description, instructions[], category[], equipment[], difficulty, clientLevel, muscleGroups[], sets, repetitions, timeUnderTension, restBetweenSets, progression, tags[]
- Dificultad basada en el nivel del cliente: "${level}"
  - principiante → easy (movimientos simples, bajo riesgo)
  - intermedio → medium (técnicas moderadas)
  - avanzado → hard (movimientos complejos, alta intensidad)

## FLUJO DE TRABAJO:
1. Analiza el perfil del cliente (condiciones médicas, nivel, objetivos)
2. Para CADA ejercicio de CADA semana:
   a. Busca ejercicios existentes con search_exercise
   b. Si encuentras adecuados → úsalos
   c. Si NO encuentras adecuados → crea uno nuevo con save_exercise
3. Genera el plan semanal completo con los ejercicios seleccionados/creados
4. Incluye series, repeticiones, tiempo bajo tensión y progresión

## CRITERIOS DE SELECCIÓN:
- **Principiante**: ejercicios simples, bajo impacto, fácil aprendizaje
- **Intermedio**: ejercicios con técnica moderada, mayor complejidad
- **Avanzado**: ejercicios complejos, alta intensidad, movimientos avanzados
- EXCLUIR ejercicios con contraindicaciones que matchen condiciones médicas del cliente
- Priorizar: fuerza funcional, movilidad, longevidad, prevención de lesiones

Responde SOLO con el JSON del plan de ejercicio al final, después de usar las herramientas necesarias.`;
}

function buildExerciseUserPrompt(
  state: RecommendationStateType,
  weekNumbers: number[]
): string {
  const insights = state.clientInsights;
  const personalData = state.personalData;
  const medicalData = state.medicalData;
  const weekList = weekNumbers.join(", ");

  return `## PERFIL DEL CLIENTE

**Resumen:** ${insights?.summary ?? "No disponible"}
**Nivel:** ${insights?.experienceLevel ?? "principiante"}
**Riesgos:** ${insights?.keyRisks?.join(", ") ?? "Ninguno"}

## DATOS PERSONALES
- Edad: ${personalData.age ?? "N/A"} años
- Peso: ${personalData.weight ?? "N/A"} kg
- Altura: ${personalData.height ?? "N/A"} cm

## CONDICIONES MÉDICAS
- Condiciones: ${medicalData.currentPastConditions ?? "Ninguna"}
- Cirugías: ${medicalData.surgeries ?? "Ninguna"}
- Alergias: ${medicalData.allergies ?? "Ninguna"}

## TU TAREA
Diseña un plan de entrenamiento para las semanas: ${weekList}

### Progresión esperada:
- Semanas 1-4 (Base): 3 series, 12 reps, aprender patrones de movimiento
- Semanas 5-8 (Volumen): 4 series, aumentar complejidad
- Semanas 9-12 (Intensidad): Menor reps, mayor carga, máximo desafío

### Formato de respuesta JSON:
Devuelve un array JSON con esta estructura EXACTA:

\`\`\`json
[
  {
    "weekNumber": number,
    "focus": "Enfoque del entrenamiento (1-2 frases)",
    "routine": [
      {
        "exercise": "nombre del ejercicio",
        "sets": number,
        "repetitions": "rango o número",
        "timeUnderTension": "tempo (ej: 3-1-1)",
        "progression": "cómo progresar respecto a la semana anterior"
      }
    ],
    "equipment": ["lista de equipo necesario"],
    "duration": "duración total estimada"
  }
]
\`\`\`

Recuerda: usa las herramientas disponibles para buscar y/o crear ejercicios antes de generar tu respuesta final.`;
}

/**
 * Parses the LLM response into an array of ExercisePlan objects.
 */
function parseExerciseResponse(
  content: string,
  expectedWeeks: number[]
): Array<{
  weekNumber: number;
  focus: string;
  routine: Array<{ exercise: string; sets: number; repetitions: string; timeUnderTension: string; progression: string }>;
  equipment: string[];
  duration: string;
}> {
  let jsonStr = content;

  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const parsed: unknown = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    return generateFallbackExercise(expectedWeeks.length / 4);
  }

  const result: Array<{
    weekNumber: number;
    focus: string;
    routine: Array<{ exercise: string; sets: number; repetitions: string; timeUnderTension: string; progression: string }>;
    equipment: string[];
    duration: string;
  }> = [];

  for (let index = 0; index < parsed.length; index++) {
    const item = parsed[index] as Record<string, unknown>;
    const weekNumber = typeof item.weekNumber === "number" ? item.weekNumber : expectedWeeks[index] ?? index + 1;

    const routineRaw = item.routine as Array<Record<string, unknown>> | undefined;
    const routine = Array.isArray(routineRaw)
      ? routineRaw.map((ex: Record<string, unknown>) => ({
          exercise: typeof ex.exercise === "string" ? ex.exercise : "Ejercicio genérico",
          sets: typeof ex.sets === "number" ? ex.sets : 3,
          repetitions: typeof ex.repetitions === "string" ? ex.repetitions : "12",
          timeUnderTension: typeof ex.timeUnderTension === "string" ? ex.timeUnderTension : "3-1-1",
          progression: typeof ex.progression === "string" ? ex.progression : "Mantener misma carga",
        }))
      : [];

    const equipmentRaw = item.equipment as Array<unknown> | undefined;
    const equipment = Array.isArray(equipmentRaw)
      ? equipmentRaw.filter((eq: unknown): eq is string => typeof eq === "string")
      : ["Mancuernas", "Banda elástica", "Esterilla"];

    result.push({
      weekNumber,
      focus: typeof item.focus === "string" ? item.focus : "Fortalecimiento general progresivo",
      routine,
      equipment,
      duration: typeof item.duration === "string" ? item.duration : "30-45 minutos",
    });
  }

  return result.filter((plan) => expectedWeeks.includes(plan.weekNumber));
}

/**
 * Generates a fallback exercise plan if the LLM fails.
 */
function generateFallbackExercise(monthNumber: number): Array<{
  weekNumber: number;
  focus: string;
  routine: Array<{ exercise: string; sets: number; repetitions: string; timeUnderTension: string; progression: string }>;
  equipment: string[];
  duration: string;
}> {
  const totalWeeks = monthNumber * 4;
  const plans: Array<{
    weekNumber: number;
    focus: string;
    routine: Array<{ exercise: string; sets: number; repetitions: string; timeUnderTension: string; progression: string }>;
    equipment: string[];
    duration: string;
  }> = [];

  const phaseConfigs: Array<{
    weekRange: [number, number];
    focus: string;
    routine: Array<{ exercise: string; sets: number; repetitions: string; timeUnderTension: string; progression: string }>;
  }> = [
    {
      weekRange: [1, 4],
      focus: "Base - Aprendizaje de patrones de movimiento y estabilidad",
      routine: [
        { exercise: "Sentadilla copa con mancuerna", sets: 3, repetitions: "12", timeUnderTension: "3-1-1", progression: "Aumentar peso gradualmente" },
        { exercise: "Peso muerto rumano", sets: 3, repetitions: "12", timeUnderTension: "3-1-1", progression: "Mantener forma correcta" },
        { exercise: "Press militar con mancuernas", sets: 3, repetitions: "10", timeUnderTension: "2-1-2", progression: "Iniciar con peso ligero" },
        { exercise: "Remo con mancuerna a un brazo", sets: 3, repetitions: "12 cada lado", timeUnderTension: "2-1-2", progression: "Aumentar peso semanalmente" },
        { exercise: "Plancha frontal", sets: 3, repetitions: "20-30 segundos", timeUnderTension: "Isométrico", progression: "Aumentar duración 5s por semana" },
      ],
    },
    {
      weekRange: [5, 8],
      focus: "Volumen - Aumento de series y complejidad de movimientos",
      routine: [
        { exercise: "Sentadilla búlgara", sets: 4, repetitions: "10 cada pierna", timeUnderTension: "3-1-1", progression: "Aumentar peso +2kg" },
        { exercise: "Peso muerto a una pierna", sets: 4, repetitions: "10 cada lado", timeUnderTension: "3-1-1", progression: "Mejorar equilibrio" },
        { exercise: "Press militar de pie", sets: 4, repetitions: "10", timeUnderTension: "2-1-2", progression: "Aumentar peso +1-2kg" },
        { exercise: "Remo con dos mancuernas", sets: 4, repetitions: "10", timeUnderTension: "2-1-2", progression: "Aumentar peso +2kg" },
        { exercise: "Plancha lateral", sets: 4, repetitions: "30 segundos cada lado", timeUnderTension: "Isométrico", progression: "Aumentar duración 5s por semana" },
      ],
    },
    {
      weekRange: [9, 12],
      focus: "Intensidad - Mayor carga, menor reps, máximo desafío",
      routine: [
        { exercise: "Sentadilla frontal", sets: 4, repetitions: "8", timeUnderTension: "3-1-1", progression: "Aumentar peso +2kg" },
        { exercise: "Peso muerto rumano pesado", sets: 4, repetitions: "8", timeUnderTension: "3-1-1", progression: "Aumentar peso +2-4kg" },
        { exercise: "Press militar con barra", sets: 4, repetitions: "8", timeUnderTension: "2-1-2", progression: "Aumentar peso +2kg" },
        { exercise: "Remo con barra", sets: 4, repetitions: "8", timeUnderTension: "2-1-2", progression: "Aumentar peso +2-4kg" },
        { exercise: "Plancha con toque de hombro", sets: 4, repetitions: "45 segundos", timeUnderTension: "Isométrico dinámico", progression: "Mantener forma estricta" },
      ],
    },
  ];

  for (let week = 1; week <= totalWeeks; week++) {
    const phase = phaseConfigs.find((p) => week >= p.weekRange[0] && week <= p.weekRange[1]) ?? phaseConfigs[0];
    plans.push({
      weekNumber: week,
      focus: phase.focus,
      routine: phase.routine,
      equipment: ["Mancuernas (2-10kg)", "Banda elástica", "Esterilla"],
      duration: "30-45 minutos",
    });
  }

  return plans;
}

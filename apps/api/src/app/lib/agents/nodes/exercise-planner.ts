import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createDeepSeekJSONLLM } from "../utils/llm";
import { buildExercisePrompt } from "../utils/prompt-builders";
import type { RecommendationStateType } from "../state";
import { logger } from "../../logger";

/**
 * Exercise Planner Node
 *
 * Generates a progressive exercise plan based on client insights,
 * medical conditions, and experience level.
 */
export async function planExercise(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "planExercise",
    clientId: state.clientId,
  });

  try {
    if (!state.clientInsights) {
      logCtx.warn("AI", "No client insights available, using fallback exercise plan");
      return {
        errors: ["planExercise: clientInsights not available. Run analyzeClient first."],
        exercisePlan: [],
      };
    }

    logCtx.info("AI", "Starting exercise planning");

    const llm = createDeepSeekJSONLLM();
    const totalWeeks = state.monthNumber * 4;
    const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    const prompt = buildExercisePrompt({
      clientInsights: state.clientInsights,
      personalData: state.personalData,
      medicalData: state.medicalData,
      weekNumbers,
    });

    const response = await llm.invoke([
      new SystemMessage("Eres un entrenador personal certificado especializado en fuerza funcional y longevidad. Responde SOLO con JSON válido (array de objetos)."),
      new HumanMessage(prompt),
    ]);

    const content = typeof response.content === "string" ? response.content : "";
    const exercisePlan = parseExerciseResponse(content, weekNumbers);

    logCtx.info("AI", "Exercise planning completed", {
      weekCount: exercisePlan.length,
    });

    return {
      exercisePlan,
    };
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
 * Parses the LLM response into an array of ExercisePlan objects.
 */
function parseExerciseResponse(
  content: string,
  expectedWeeks: number[]
): Array<{
  weekNumber: number;
  focus: string;
  routine: Array<{
    exercise: string;
    sets: number;
    repetitions: string;
    timeUnderTension: string;
    progression: string;
  }>;
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
    routine: Array<{
      exercise: string;
      sets: number;
      repetitions: string;
      timeUnderTension: string;
      progression: string;
    }>;
    equipment: string[];
    duration: string;
  }> = [];

  for (let index = 0; index < parsed.length; index++) {
    const item = parsed[index] as Record<string, unknown>;
    const weekNumber = typeof item.weekNumber === "number"
      ? item.weekNumber
      : expectedWeeks[index] ?? index + 1;

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

  return result.filter(
    (plan) => expectedWeeks.includes(plan.weekNumber)
  );
}

/**
 * Generates a fallback exercise plan if the LLM fails.
 */
function generateFallbackExercise(monthNumber: number): Array<{
  weekNumber: number;
  focus: string;
  routine: Array<{
    exercise: string;
    sets: number;
    repetitions: string;
    timeUnderTension: string;
    progression: string;
  }>;
  equipment: string[];
  duration: string;
}> {
  const totalWeeks = monthNumber * 4;
  const plans: Array<{
    weekNumber: number;
    focus: string;
    routine: Array<{
      exercise: string;
      sets: number;
      repetitions: string;
      timeUnderTension: string;
      progression: string;
    }>;
    equipment: string[];
    duration: string;
  }> = [];

  const phaseConfigs: Array<{
    weekRange: [number, number];
    focus: string;
    routine: Array<{
      exercise: string;
      sets: number;
      repetitions: string;
      timeUnderTension: string;
      progression: string;
    }>;
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
    const phase = phaseConfigs.find(
      (p) => week >= p.weekRange[0] && week <= p.weekRange[1]
    ) ?? phaseConfigs[0];

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

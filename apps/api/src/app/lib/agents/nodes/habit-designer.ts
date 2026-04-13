import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createDeepSeekJSONLLM } from "../utils/llm";
import { buildHabitPrompt } from "../utils/prompt-builders";
import type { RecommendationStateType } from "../state";
import { logger } from "../../logger";

/**
 * Habit Designer Node
 *
 * Generates a progressive habit adoption and elimination plan based on
 * client's health assessment, mental health profile, and insights.
 */
export async function planHabits(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "planHabits",
    clientId: state.clientId,
  });

  try {
    if (!state.clientInsights) {
      logCtx.warn("AI", "No client insights available, using fallback habit plan");
      return {
        errors: ["planHabits: clientInsights not available. Run analyzeClient first."],
        habitPlan: [],
      };
    }

    logCtx.info("AI", "Starting habit planning");

    const llm = createDeepSeekJSONLLM();
    const totalWeeks = state.monthNumber * 4;
    const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    const prompt = buildHabitPrompt({
      clientInsights: state.clientInsights,
      healthAssessment: state.healthAssessment,
      mentalHealth: state.mentalHealth,
      weekNumbers,
    });

    const response = await llm.invoke([
      new SystemMessage("Eres un experto en psicología del comportamiento y formación de hábitos. Responde SOLO con JSON válido (array de objetos)."),
      new HumanMessage(prompt),
    ]);

    const content = typeof response.content === "string" ? response.content : "";
    const habitPlan = parseHabitResponse(content, weekNumbers);

    logCtx.info("AI", "Habit planning completed", {
      weekCount: habitPlan.length,
    });

    return {
      habitPlan,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Habit planning failed: ${errorMessage}`);

    return {
      errors: [`planHabits: ${errorMessage}`],
      habitPlan: generateFallbackHabits(state.monthNumber),
    };
  }
}

/**
 * Parses the LLM response into an array of HabitPlan objects.
 */
function parseHabitResponse(
  content: string,
  expectedWeeks: number[]
): Array<{
  weekNumber: number;
  adoptHabits: Array<{ habit: string; frequency: string; trigger: string }>;
  eliminateHabits: Array<{ habit: string; replacement: string }>;
  trackingMethod: string;
  motivationTip: string;
}> {
  let jsonStr = content;

  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const parsed: unknown = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    return generateFallbackHabits(expectedWeeks.length / 4);
  }

  const result: Array<{
    weekNumber: number;
    adoptHabits: Array<{ habit: string; frequency: string; trigger: string }>;
    eliminateHabits: Array<{ habit: string; replacement: string }>;
    trackingMethod: string;
    motivationTip: string;
  }> = [];

  for (let index = 0; index < parsed.length; index++) {
    const item = parsed[index] as Record<string, unknown>;
    const weekNumber = typeof item.weekNumber === "number"
      ? item.weekNumber
      : expectedWeeks[index] ?? index + 1;

    const adoptHabitsRaw = item.adoptHabits as Array<Record<string, unknown>> | undefined;
    const adoptHabits = Array.isArray(adoptHabitsRaw)
      ? adoptHabitsRaw.map((habit: Record<string, unknown>) => ({
          habit: typeof habit.habit === "string" ? habit.habit : "Nuevo hábito genérico",
          frequency: typeof habit.frequency === "string" ? habit.frequency : "Diario",
          trigger: typeof habit.trigger === "string" ? habit.trigger : "Después de rutina existente",
        }))
      : [];

    const eliminateHabitsRaw = item.eliminateHabits as Array<Record<string, unknown>> | undefined;
    const eliminateHabits = Array.isArray(eliminateHabitsRaw)
      ? eliminateHabitsRaw.map((habit: Record<string, unknown>) => ({
          habit: typeof habit.habit === "string" ? habit.habit : "Hábito a eliminar",
          replacement: typeof habit.replacement === "string" ? habit.replacement : "Reemplazo saludable",
        }))
      : [];

    result.push({
      weekNumber,
      adoptHabits,
      eliminateHabits,
      trackingMethod: typeof item.trackingMethod === "string" ? item.trackingMethod : "Checklist diario en app",
      motivationTip: typeof item.motivationTip === "string" ? item.motivationTip : "Enfócate en el progreso, no la perfección",
    });
  }

  return result.filter(
    (plan) => expectedWeeks.includes(plan.weekNumber)
  );
}

/**
 * Generates a fallback habit plan if the LLM fails.
 */
function generateFallbackHabits(monthNumber: number): Array<{
  weekNumber: number;
  adoptHabits: Array<{ habit: string; frequency: string; trigger: string }>;
  eliminateHabits: Array<{ habit: string; replacement: string }>;
  trackingMethod: string;
  motivationTip: string;
}> {
  const totalWeeks = monthNumber * 4;
  const plans: Array<{
    weekNumber: number;
    adoptHabits: Array<{ habit: string; frequency: string; trigger: string }>;
    eliminateHabits: Array<{ habit: string; replacement: string }>;
    trackingMethod: string;
    motivationTip: string;
  }> = [];

  const phaseConfigs: Array<{
    weekRange: [number, number];
    adoptHabits: Array<{ habit: string; frequency: string; trigger: string }>;
    eliminateHabits: Array<{ habit: string; replacement: string }>;
    trackingMethod: string;
    motivationTip: string;
  }> = [
    {
      weekRange: [1, 4],
      adoptHabits: [
        { habit: "Exposición solar matutina (5-10 min sin gafas)", frequency: "Diario", trigger: "Al despertar, antes del celular" },
        { habit: "Respiración 4-7-8 (4-5 rounds)", frequency: "Diario", trigger: "Antes de dormir o cuando haya estrés" },
        { habit: "Escribir 1 emoción + 1 acción del día", frequency: "Diario", trigger: "Antes de dormir, en checklist" },
      ],
      eliminateHabits: [
        { habit: "Usar celular en la cama", replacement: "Leer libro físico o meditar 5 min" },
        { habit: "Comer frente a pantallas", replacement: "Comer en mesa sin distracciones" },
      ],
      trackingMethod: "Checklist diario impreso o en app",
      motivationTip: "Empieza con solo 1 hábito nuevo por semana. La consistencia > perfección",
    },
    {
      weekRange: [5, 8],
      adoptHabits: [
        { habit: "Caminata de 10 min después de cada comida", frequency: "Diario (3x día)", trigger: "Inmediatamente después de comer" },
        { habit: "Preparar comidas del día siguiente", frequency: "Diario", trigger: "Después de la cena" },
        { habit: "Regla de los 5 minutos ante bloqueo", frequency: "Cuando surja resistencia", trigger: "Al detectar evitación" },
      ],
      eliminateHabits: [
        { habit: "Notificaciones innecesarias del celular", replacement: "Revisar mensajes en horarios fijos (3x día)" },
        { habit: "Decir 'sí' a todo por compromiso", replacement: "Pausar 10 segundos antes de responder" },
      ],
      trackingMethod: "Checklist diario + journal semanal de emociones",
      motivationTip: "Cuando sientas resistencia, aplica la regla de 5 min: haz solo 5 min y decide después",
    },
    {
      weekRange: [9, 12],
      adoptHabits: [
        { habit: "Definir micro-meta emocional semanal cada domingo", frequency: "Semanal", trigger: "Domingos por la tarde" },
        { habit: "Diálogo interno positivo ante errores", frequency: "Cuando ocurra fallo", trigger: "Reemplazar 'no puedo' con '¿qué aprendí?'" },
        { habit: "Sesión sensorial semanal (música + actividad)", frequency: "Semanal (Sábados)", trigger: "Después del entrenamiento" },
      ],
      eliminateHabits: [
        { habit: "Autocrítica destructiva", replacement: "Reencuadrar: '¿Qué aprendí? ¿Qué haré diferente?'" },
        { habit: "Bloqueo emocional ante dificultades", replacement: "Escribir 2 líneas sobre lo que siento" },
      ],
      trackingMethod: "Checklist + journal semanal + revisión dominical",
      motivationTip: "Redefine el fracaso como aprendizaje. Cada error es data para mejorar",
    },
  ];

  for (let week = 1; week <= totalWeeks; week++) {
    const phase = phaseConfigs.find(
      (p) => week >= p.weekRange[0] && week <= p.weekRange[1]
    ) ?? phaseConfigs[0];

    plans.push({
      weekNumber: week,
      adoptHabits: phase.adoptHabits,
      eliminateHabits: phase.eliminateHabits,
      trackingMethod: phase.trackingMethod,
      motivationTip: phase.motivationTip,
    });
  }

  return plans;
}

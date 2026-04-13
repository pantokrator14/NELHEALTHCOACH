import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage, ToolMessage, type BaseMessage, type AIMessageChunk } from "@langchain/core/messages";
import { createDeepSeekWithTools, createDeepSeekJSONLLM, invokeWithTools } from "../utils/llm";
import {
  buildClientAnalysisPrompt,
} from "../utils/prompt-builders";
import type { RecommendationStateType } from "../state";
import { searchRecipeTool, saveRecipeTool, getRecipeByIdTool } from "../tools/recipe-tools";
import { logger } from "../../logger";

interface ClientInsights {
  summary: string;
  keyRisks: string[];
  opportunities: string[];
  experienceLevel: "principiante" | "intermedio" | "avanzado";
  idealWeight: string;
  idealBodyFat: string;
  targetImprovements: string[];
}

/**
 * Client Analyzer Node
 */
export async function analyzeClient(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "analyzeClient",
    clientId: state.clientId,
  });

  try {
    logCtx.info("AI", "Starting client analysis");

    const llm = createDeepSeekJSONLLM();

    const prompt = buildClientAnalysisPrompt({
      personalData: state.personalData,
      medicalData: state.medicalData,
      healthAssessment: state.healthAssessment,
      mentalHealth: state.mentalHealth,
      processedDocuments: state.processedDocuments,
      previousSessions: state.previousSessions,
      coachNotes: state.coachNotes,
    });

    const response = await llm.invoke([
      new SystemMessage("Eres un experto analista de salud integral. Responde SOLO con JSON válido."),
      new HumanMessage(prompt),
    ]);

    const content = typeof response.content === "string" ? response.content : "";
    const insights = parseInsightsResponse(content);

    logCtx.info("AI", "Client analysis completed", {
      experienceLevel: insights.experienceLevel,
      riskCount: insights.keyRisks.length,
      opportunityCount: insights.opportunities.length,
    });

    return {
      clientInsights: insights,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Client analysis failed: ${errorMessage}`);

    return {
      errors: [`analyzeClient: ${errorMessage}`],
      clientInsights: {
        summary: "Error analyzing client profile - using default configuration",
        keyRisks: ["Unable to assess risks due to analysis error"],
        opportunities: ["Retry analysis when system recovers"],
        experienceLevel: "principiante" as const,
        idealWeight: "N/A",
        idealBodyFat: "N/A",
        targetImprovements: ["Complete analysis first"],
      },
    };
  }
}

function parseInsightsResponse(content: string): ClientInsights {
  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const parsed: Record<string, unknown> = JSON.parse(jsonStr);

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "No summary available",
    keyRisks: Array.isArray(parsed.keyRisks)
      ? parsed.keyRisks.filter((item: unknown): item is string => typeof item === "string")
      : [],
    opportunities: Array.isArray(parsed.opportunities)
      ? parsed.opportunities.filter((item: unknown): item is string => typeof item === "string")
      : [],
    experienceLevel:
      parsed.experienceLevel === "principiante" ||
      parsed.experienceLevel === "intermedio" ||
      parsed.experienceLevel === "avanzado"
        ? (parsed.experienceLevel as "principiante" | "intermedio" | "avanzado")
        : "principiante",
    idealWeight: typeof parsed.idealWeight === "string" ? parsed.idealWeight : "N/A",
    idealBodyFat: typeof parsed.idealBodyFat === "string" ? parsed.idealBodyFat : "N/A",
    targetImprovements: Array.isArray(parsed.targetImprovements)
      ? parsed.targetImprovements.filter((item: unknown): item is string => typeof item === "string")
      : [],
  };
}

/**
 * Nutrition Planner Node with Tool Calling
 *
 * Uses LLM with tools to search existing recipes and create new ones
 * as needed for the client's keto meal plan.
 */
export async function planNutrition(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "planNutrition",
    clientId: state.clientId,
    monthNumber: state.monthNumber,
  });

  try {
    if (!state.clientInsights) {
      logCtx.warn("AI", "No client insights available, using fallback nutrition plan");
      return {
        errors: ["planNutrition: clientInsights not available. Run analyzeClient first."],
        nutritionPlan: generateFallbackNutrition(state.monthNumber),
      };
    }

    logCtx.info("AI", "Starting nutrition planning with tool calling");

    const totalWeeks = state.monthNumber * 4;
    const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    const llmWithTools = createDeepSeekWithTools(
      [searchRecipeTool, saveRecipeTool, getRecipeByIdTool],
      { temperature: 0.5, maxTokens: 6000 }
    );

    const systemPrompt = buildNutritionSystemPrompt(state, weekNumbers);
    const userPrompt = buildNutritionUserPrompt(state, weekNumbers);

    logCtx.debug("AI", "Invoking LLM with tools for nutrition planning");

    // Run the tool-calling loop
    const finalContent = await runToolCallingLoop(llmWithTools, systemPrompt, userPrompt, logCtx);

    const nutritionPlan = parseNutritionResponse(finalContent, weekNumbers);

    logCtx.info("AI", "Nutrition planning completed", {
      weekCount: nutritionPlan.length,
    });

    return { nutritionPlan };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Nutrition planning failed: ${errorMessage}`);

    return {
      errors: [`planNutrition: ${errorMessage}`],
      nutritionPlan: generateFallbackNutrition(state.monthNumber),
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

    const response = await invokeWithTools(llm, messages);
    messages.push(response);

    const toolCalls = (response.tool_calls ?? []) as Array<{
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
        tc.name === "search_recipe"
          ? await searchRecipeTool.invoke(tc.args as Parameters<typeof searchRecipeTool.invoke>[0])
          : tc.name === "save_recipe"
            ? await saveRecipeTool.invoke(tc.args as Parameters<typeof saveRecipeTool.invoke>[0])
            : tc.name === "get_recipe_by_id"
              ? await getRecipeByIdTool.invoke(tc.args as Parameters<typeof getRecipeByIdTool.invoke>[0])
              : JSON.stringify({ error: `Unknown tool: ${tc.name}` })
      );

      logCtx.debug("AI", `Tool ${tc.name} completed`, { resultLength: result.length });

      messages.push(new ToolMessage({
        content: result,
        tool_call_id: tc.id,
      }));
    }
  }

  const finalResponse = await invokeWithTools(llm, messages);
  return typeof finalResponse.content === "string" ? finalResponse.content : "";
}

function buildNutritionSystemPrompt(
  state: RecommendationStateType,
  _weekNumbers: number[]
): string {
  const level = state.clientInsights?.experienceLevel ?? "principiante";

  return `Eres un nutricionista experto en dieta cetogénica terapéutica. Tu tarea es diseñar un plan de alimentación KETO personalizado.

## REGLAS CETOGÉNICAS:
1. CERO: azúcar, alcohol, gluten, almidones, procesados
2. Prioridad: alimentos orgánicos, de pastoreo
3. 3 comidas diarias
4. Proteínas altas, grasas moderadas-bajas, carbs <25g
5. Déficit calórico progresivo (0.5 kg/semana)

## HERRAMIENTAS:
- search_recipe: Busca recetas existentes. Usa clientLevel="${level}"
- save_recipe: Crea receta nueva cuando no exista adecuada. difficulty según nivel: principiante=easy, intermedio=medium, avanzado=hard
- get_recipe_by_id: Obtiene detalles completos de una receta

## FLUJO:
1. Busca recetas existentes PRIMERO
2. Si no hay adecuadas, crea nuevas
3. Genera menú semanal con recetas seleccionadas

Responde SOLO con JSON del plan al final, después de usar herramientas.`;
}

function buildNutritionUserPrompt(
  state: RecommendationStateType,
  weekNumbers: number[]
): string {
  const insights = state.clientInsights;
  const personalData = state.personalData;
  const medicalData = state.medicalData;

  return `## CLIENTE
**Nivel:** ${insights?.experienceLevel ?? "principiante"}
**Peso:** ${personalData.weight ?? "N/A"} kg | **Altura:** ${personalData.height ?? "N/A"} cm
**Alergias:** ${medicalData.allergies ?? "Ninguna"}
**Condiciones:** ${medicalData.currentPastConditions ?? "Ninguna"}

## TAREA
Plan para semanas: ${weekNumbers.join(", ")}
- Semanas 1-4: ~1600 kcal
- Semanas 5-8: ~1450 kcal
- Semanas 9-12: ~1350 kcal

## FORMATO JSON
[{
  "weekNumber": number,
  "focus": "string",
  "macros": { "protein": "g", "fat": "g", "carbs": "g", "calories": number },
  "metabolicPurpose": "string",
  "shoppingList": [{ "item": "string", "quantity": "string", "priority": "high|medium|low" }]
}]`;
}

function parseNutritionResponse(
  content: string,
  expectedWeeks: number[]
): Array<{
  weekNumber: number;
  focus: string;
  macros: { protein: string; fat: string; carbs: string; calories: number };
  metabolicPurpose: string;
  shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
}> {
  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const parsed: unknown = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) {
    return generateFallbackNutrition(expectedWeeks.length / 4);
  }

  const result: Array<{
    weekNumber: number;
    focus: string;
    macros: { protein: string; fat: string; carbs: string; calories: number };
    metabolicPurpose: string;
    shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
  }> = [];

  for (let index = 0; index < parsed.length; index++) {
    const item = parsed[index] as Record<string, unknown>;
    const weekNumber = typeof item.weekNumber === "number" ? item.weekNumber : expectedWeeks[index] ?? index + 1;
    const macrosRaw = item.macros as Record<string, unknown> | undefined;
    const shoppingListRaw = item.shoppingList as Array<Record<string, unknown>> | undefined;

    const shoppingList = Array.isArray(shoppingListRaw)
      ? shoppingListRaw.map((sl: Record<string, unknown>) => {
          const priorityRaw = sl.priority as string | undefined;
          const priority: "high" | "medium" | "low" =
            priorityRaw === "high" || priorityRaw === "medium" || priorityRaw === "low" ? priorityRaw : "medium";
          return {
            item: typeof sl.item === "string" ? sl.item : "Alimento genérico",
            quantity: typeof sl.quantity === "string" ? sl.quantity : "1 unidad",
            priority,
          };
        })
      : [];

    result.push({
      weekNumber,
      focus: typeof item.focus === "string" ? item.focus : "Enfoque nutricional estándar",
      macros: {
        protein: typeof macrosRaw?.protein === "string" ? (macrosRaw.protein as string) : "120g",
        fat: typeof macrosRaw?.fat === "string" ? (macrosRaw.fat as string) : "80g",
        carbs: typeof macrosRaw?.carbs === "string" ? (macrosRaw.carbs as string) : "<25g",
        calories: typeof macrosRaw?.calories === "number" ? (macrosRaw.calories as number) : 1500,
      },
      metabolicPurpose: typeof item.metabolicPurpose === "string" ? item.metabolicPurpose : "Mantener cetosis nutricional",
      shoppingList,
    });
  }

  return result.filter((plan) => expectedWeeks.includes(plan.weekNumber));
}

function generateFallbackNutrition(monthNumber: number): Array<{
  weekNumber: number;
  focus: string;
  macros: { protein: string; fat: string; carbs: string; calories: number };
  metabolicPurpose: string;
  shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
}> {
  const totalWeeks = monthNumber * 4;
  const plans: Array<{
    weekNumber: number;
    focus: string;
    macros: { protein: string; fat: string; carbs: string; calories: number };
    metabolicPurpose: string;
    shoppingList: Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>;
  }> = [];

  const phaseConfigs: Array<{ weekRange: [number, number]; calories: number; protein: string; fat: string; focus: string }> = [
    { weekRange: [1, 4], calories: 1600, protein: "120g", fat: "100g", focus: "Adaptación cetogénica" },
    { weekRange: [5, 8], calories: 1450, protein: "125g", fat: "85g", focus: "Optimización quema de grasa" },
    { weekRange: [9, 12], calories: 1350, protein: "130g", fat: "75g", focus: "Máxima oxidación de grasa" },
  ];

  for (let week = 1; week <= totalWeeks; week++) {
    const phase = phaseConfigs.find((p) => week >= p.weekRange[0] && week <= p.weekRange[1]) ?? phaseConfigs[0];
    plans.push({
      weekNumber: week,
      focus: phase.focus,
      macros: { protein: phase.protein, fat: phase.fat, carbs: "<25g", calories: phase.calories },
      metabolicPurpose: "Mantener cetosis con déficit calórico progresivo",
      shoppingList: [
        { item: "Huevos de pastoreo", quantity: "12 unidades", priority: "high" },
        { item: "Pechuga de pollo", quantity: "500g", priority: "high" },
        { item: "Aguacates", quantity: "3 unidades", priority: "high" },
        { item: "Espinacas", quantity: "300g", priority: "medium" },
        { item: "Aceite de oliva", quantity: "500ml", priority: "medium" },
        { item: "Salmón", quantity: "300g", priority: "medium" },
      ],
    });
  }

  return plans;
}

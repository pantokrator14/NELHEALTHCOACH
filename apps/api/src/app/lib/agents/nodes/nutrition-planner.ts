import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage, ToolMessage, type BaseMessage, type AIMessageChunk } from "@langchain/core/messages";
import { createDeepSeekWithTools, createDeepSeekJSONLLM, invokeWithTools } from "../utils/llm";
import {
  buildClientAnalysisPrompt,
} from "../utils/prompt-builders";
import type { RecommendationStateType } from "../state";
import { searchRecipeTool, saveRecipeTool, getRecipeByIdTool } from "../tools/recipe-tools";
import { logger } from "../../logger";
import { nutritionPlannerGuard, applyGuardrails, validateAIResponse } from "../guard";

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

    // Usar guardrails para análisis de cliente
    const insights = await applyGuardrails(
      nutritionPlannerGuard,
      { prompt, personalData: state.personalData, medicalData: state.medicalData },
      async (validatedInput) => {
        const response = await llm.invoke([
          new SystemMessage("Eres un experto analista de salud integral. Responde SOLO con JSON válido."),
          new HumanMessage(validatedInput.prompt),
        ]);

        const content = typeof response.content === "string" ? response.content : "";
        
        // Validación adicional de la respuesta
        const validation = await validateAIResponse(content);
        if (!validation.isValid) {
          logCtx.warn("GUARDRAILS", "Problemas en respuesta de análisis", {
            issues: validation.issues,
          });
        }

        return parseInsightsResponse(validation.sanitizedResponse || content);
      }
    );

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

    // Usar guardrails para planificación nutricional
    const nutritionPlan = await applyGuardrails(
      nutritionPlannerGuard,
      { systemPrompt, userPrompt, clientData: state },
      async (validatedInput) => {
        // Run the tool-calling loop
        const finalContent = await runToolCallingLoop(
          llmWithTools, 
          validatedInput.systemPrompt, 
          validatedInput.userPrompt, 
          logCtx
        );

        // Validar respuesta final
        const validation = await validateAIResponse(finalContent);
        if (!validation.isValid) {
          logCtx.warn("GUARDRAILS", "Problemas en plan nutricional", {
            issues: validation.issues,
            weekCount: weekNumbers.length,
          });
        }

        const plan = parseNutritionResponse(validation.sanitizedResponse || finalContent, weekNumbers);
        
        // Asegurar que cada semana tenga disclaimer médico
        return plan.map(weekPlan => ({
          ...weekPlan,
          focus: weekPlan.focus + " | ⚠️ Consulte con profesional médico",
        }));
      }
    );

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
  const healthAssessment = state.healthAssessment;
  const weekList = weekNumbers.join(", ");

  // Formatear evaluaciones de salud relevantes para nutrición
  const healthConditions: string[] = [];
  if (healthAssessment.carbohydrateAddiction) healthConditions.push("- Adicción a carbohidratos (priorizar cetosis estricta)");
  if (healthAssessment.leptinResistance) healthConditions.push("- Resistencia a leptina (manejo de hambre)");
  if (healthAssessment.microbiotaHealth) healthConditions.push("- Problemas de microbiota (pre/post bióticos)");
  if (healthAssessment.generalToxicity) healthConditions.push("- Toxicidad general (limpieza hepática)");
  if (healthAssessment.sleepHygiene) healthConditions.push("- Problemas de sueño (evitar cafeína tarde)");

  // Preferencias alimentarias
  const foodPreferences: string[] = [];
  if (medicalData.dislikedFoodsActivities) foodPreferences.push(`- No deseados: ${medicalData.dislikedFoodsActivities}`);
  if (medicalData.allergies) foodPreferences.push(`- Alergias: ${medicalData.allergies}`);

  // Calcular IMC para ajuste de calorías
  const weight = parseFloat(personalData.weight) || 0;
  const height = parseFloat(personalData.height) || 0;
  const bmi = height > 0 ? Math.round((weight / ((height / 100) ** 2)) * 10) / 10 : 0;
  let calorieAdjustment = "";
  if (bmi > 30) calorieAdjustment = "Déficit calórico mayor (-500 kcal)";
  else if (bmi > 25) calorieAdjustment = "Déficit calórico moderado (-300 kcal)";
  else if (bmi < 18.5) calorieAdjustment = "Sin déficit, mantenimiento o leve aumento";

  // Estilo de vida para horarios de comida
  const lifestyleInfo = [];
  if (medicalData.typicalWeekday) lifestyleInfo.push(`- Día entre semana: ${medicalData.typicalWeekday.substring(0, 150)}`);
  if (medicalData.typicalWeekend) lifestyleInfo.push(`- Fin de semana: ${medicalData.typicalWeekend.substring(0, 150)}`);
  if (medicalData.whoCooks) lifestyleInfo.push(`- Quién cocina: ${medicalData.whoCooks}`);

  return `## PERFIL DEL CLIENTE

**Resumen:** ${insights?.summary ?? "No disponible"}
**Nivel:** ${insights?.experienceLevel ?? "principiante"}
**Peso ideal objetivo:** ${insights?.idealWeight ?? "No definido"}

## DATOS ANTROPOMÉTRICOS
- Peso: ${personalData.weight ?? "N/A"} kg
- Altura: ${personalData.height ?? "N/A"} cm
- IMC estimado: ${bmi > 0 ? bmi : "N/A"} → ${calorieAdjustment || "Calcular según nivel de actividad"}

## ESTILO DE VIDA (para adaptar horarios de comidas)
${lifestyleInfo.length > 0 ? lifestyleInfo.join("\n") : "- No especificado"}
- Nivel de actividad: ${medicalData.currentActivityLevel ?? "No especificado"}
- Ocupación/horario de trabajo: ${personalData.occupation ?? "No especificado"}

## CONDICIONES MÉDICAS Y ALERGIAS
- Condiciones: ${medicalData.currentPastConditions ?? "Ninguna"}
- Alergias: ${medicalData.allergies ?? "Ninguna"}
- Quién cocina: ${medicalData.whoCooks ?? "No especificado"}

## EVALUACIONES DE SALUD RELEVANTES PARA NUTRICIÓN
${healthConditions.length > 0 ? healthConditions.join("\n") : "- Sin problemas de salud identificados"}

## PREFERENCIAS ALIMENTARIAS
${foodPreferences.length > 0 ? foodPreferences.join("\n") : "- Ninguna especificada"}

## OBJETIVOS DEL CLIENTE
${insights?.targetImprovements?.join(", ") ?? "Mejorar composición corporal y salud general"}

## TAREA
Plan de nutrición para semanas: ${weekList}

### Progresión calórica:
- Semanas 1-4 (Adaptación): ~1600 kcal (mantener cetosis)
- Semanas 5-8 (Optimización): ~1450 kcal (déficit moderado)
- Semanas 9-12 (Intensificación): ~1350 kcal (déficit mayor si IMC > 25)

### Consideraciones especiales:
- Ajustar horarios de comida según rutina del cliente (trabajo, sueño)
- Si quien cocina no es el cliente, priorizar recetas simples que pueda preparar
- Incluir suplementos según condiciones (vit D, omega-3 si hay problemas de microbiota)
- Evitar TODOS los alimentos no deseados/alergias del cliente

### Formato JSON:
\`\`\`json
[{
  "weekNumber": number,
  "focus": "string",
  "macros": { "protein": "g", "fat": "g", "carbs": "g", "calories": number },
  "metabolicPurpose": "string",
  "shoppingList": [{ "item": "string", "quantity": "string", "priority": "high|medium|low" }]
}]
\`\`\``;
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

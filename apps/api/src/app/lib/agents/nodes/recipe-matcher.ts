import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage, ToolMessage, type BaseMessage, type AIMessageChunk } from "@langchain/core/messages";
import { createDeepSeekWithTools, invokeWithTools } from "../utils/llm";
import type { RecommendationStateType, RecipeMatch } from "../state";
import { searchRecipeTool, saveRecipeTool } from "../tools/recipe-tools";
import { logger } from "../../logger";

/**
 * Recipe Matcher Node
 * Secondary validation/consolidation step. Primary recipe matching
 * happens inside planNutrition via tool calling.
 */
export async function matchRecipes(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "matchRecipes",
    clientId: state.clientId,
  });

  try {
    if (!state.nutritionPlan || state.nutritionPlan.length === 0) {
      logCtx.warn("AI", "Nutrition plan is empty, skipping recipe matching");
      return {
        errors: ["matchRecipes: nutritionPlan is empty."],
        recipeMatches: [],
      };
    }

    logCtx.info("AI", "Starting recipe matching validation");

    const llmWithTools = createDeepSeekWithTools(
      [searchRecipeTool, saveRecipeTool],
      { temperature: 0.3, maxTokens: 4000 }
    );

    const matches: RecipeMatch[] = [];

    for (const weekPlan of state.nutritionPlan) {
      const searchQueries = extractSearchQueries(weekPlan.shoppingList);

      for (const query of searchQueries.slice(0, 3)) {
        const systemPrompt = `Busca recetas para "${query}". Si no encuentras adecuadas, crea una nueva.`;
        const userPrompt = `Busca: ${query}. Nivel: ${state.clientInsights?.experienceLevel ?? "principiante"}`;

        const content = await runToolLoopForMatch(llmWithTools, systemPrompt, userPrompt, query, logCtx);
        const matchResult = parseMatchResult(content, query, weekPlan.weekNumber);
        matches.push(matchResult);
      }
    }

    logCtx.info("AI", "Recipe matching completed", { totalMatches: matches.length });

    return { recipeMatches: matches };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Recipe matching failed: ${errorMessage}`);

    return {
      errors: [`matchRecipes: ${errorMessage}`],
      recipeMatches: [],
    };
  }
}

async function runToolLoopForMatch(
  llm: ReturnType<typeof createDeepSeekWithTools>,
  systemPrompt: string,
  userPrompt: string,
  query: string,
  logCtx: ReturnType<typeof logger.withContext>
): Promise<string> {
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ];

  let hasToolCalls = true;
  let maxIterations = 5;

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

    logCtx.debug("AI", `Processing ${toolCalls.length} tool call(s) for: ${query}`);

    for (const tc of toolCalls) {
      const result: string = String(
        tc.name === "search_recipe"
          ? await searchRecipeTool.invoke(tc.args as Parameters<typeof searchRecipeTool.invoke>[0])
          : tc.name === "save_recipe"
            ? await saveRecipeTool.invoke(tc.args as Parameters<typeof saveRecipeTool.invoke>[0])
            : JSON.stringify({ error: `Unknown tool: ${tc.name}` })
      );

      messages.push(new ToolMessage({ content: result, tool_call_id: tc.id }));
    }
  }

  const finalResponse = await invokeWithTools(llm, messages);
  return typeof finalResponse.content === "string" ? finalResponse.content : "";
}

function extractSearchQueries(
  shoppingList: Array<{ item: string; quantity: string; priority: string }>
): string[] {
  const priorityItems = shoppingList
    .filter((item) => item.priority === "high")
    .map((item) => item.item.split(" ")[0]);
  return Array.from(new Set(priorityItems)).slice(0, 5);
}

function parseMatchResult(
  content: string,
  mealType: string,
  weekNumber: number
): RecipeMatch {
  const idMatch = content.match(/"recipeId"\s*:\s*"([^"]+)"/);
  const successMatch = content.match(/"success"\s*:\s*true/);

  if (idMatch && successMatch) {
    return { weekNumber, mealType, recipeId: idMatch[1], matched: true, generatedFallback: false };
  }

  if (idMatch) {
    return { weekNumber, mealType, recipeId: idMatch[1], matched: false, generatedFallback: true };
  }

  return { weekNumber, mealType, recipeId: "", matched: false, generatedFallback: true };
}

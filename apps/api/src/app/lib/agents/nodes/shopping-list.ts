import type { RunnableConfig } from "@langchain/core/runnables";
import type { RecommendationStateType } from "../state";
import { logger } from "../../logger";
import { shoppingListGuard, applyGuardrails } from "../guard";

/**
 * Shopping List Generator Node
 *
 * Consolidates all shopping list items from the nutrition plan
 * into a single organized shopping list grouped by priority.
 */
export async function generateShoppingList(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "generateShoppingList",
    clientId: state.clientId,
  });

  try {
    // Usar guardrails para validar el plan de nutrición antes de procesarlo
    const shoppingList = await applyGuardrails(
      shoppingListGuard,
      { 
        nutritionPlan: state.nutritionPlan,
        clientId: state.clientId 
      },
      async (validatedInput) => {
        if (!validatedInput.nutritionPlan || validatedInput.nutritionPlan.length === 0) {
          logCtx.warn("AI", "Nutrition plan is empty, using fallback shopping list");
          return generateFallbackShoppingList(validatedInput.nutritionPlan);
        }

        logCtx.info("AI", "Generating consolidated shopping list");

        // Consolidate all shopping list items from nutrition plan
        const itemMap = new Map<
          string,
          { total: number; unit: string; priority: "high" | "medium" | "low" }
        >();

        for (const weekPlan of validatedInput.nutritionPlan) {
          for (const item of weekPlan.shoppingList) {
            const key = item.item.toLowerCase();
            const quantity = parseQuantity(item.quantity);

            const existing = itemMap.get(key);
            if (existing) {
              existing.total += quantity.amount;
              // Keep highest priority
              if (
                item.priority === "high" ||
                (item.priority === "medium" && existing.priority === "low")
              ) {
                existing.priority = item.priority;
              }
            } else {
              itemMap.set(key, {
                total: quantity.amount,
                unit: quantity.unit,
                priority: item.priority,
              });
            }
          }
        }

        // Convert map to shopping list array
        const generatedList = Array.from(itemMap.entries()).map(
          ([item, data]) => ({
            item,
            quantity: `${data.total} ${data.unit}`.trim(),
            priority: data.priority,
          })
        );

        // Sort by priority (high first)
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        generatedList.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );

        logCtx.info("AI", "Shopping list generated", {
          itemCount: generatedList.length,
          highPriorityCount: generatedList.filter((i) => i.priority === "high").length,
        });

        return generatedList;
      }
    );

    return {
      shoppingList,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Shopping list generation failed: ${errorMessage}`);

    // Si el error es de guardrails, usar lista de respaldo segura
    if (errorMessage.includes('GUARDRAILS') || errorMessage.includes('seguridad')) {
      logCtx.warn("GUARDRAILS", "Usando lista de compras de respaldo por fallo de seguridad");
      return {
        errors: [`generateShoppingList: Fallo de seguridad - ${errorMessage}`],
        shoppingList: generateFallbackShoppingList(state.nutritionPlan),
      };
    }

    return {
      errors: [`generateShoppingList: ${errorMessage}`],
      shoppingList: generateFallbackShoppingList(state.nutritionPlan),
    };
  }
}

/**
 * Parses a quantity string into a numeric amount and unit.
 * Examples: "500g" -> { amount: 500, unit: "g" }
 *           "3 unidades" -> { amount: 3, unit: "unidades" }
 */
interface ParsedQuantity {
  amount: number;
  unit: string;
}

function parseQuantity(quantity: string): ParsedQuantity {
  const match = quantity.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);

  if (match) {
    return {
      amount: parseFloat(match[1]),
      unit: match[2].trim(),
    };
  }

  return {
    amount: 1,
    unit: quantity,
  };
}

/**
 * Generates a fallback shopping list if consolidation fails.
 */
function generateFallbackShoppingList(
  nutritionPlan: unknown
): Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }> {
  const baseItems = [
    { item: "Huevos de pastoreo", quantity: "30 unidades", priority: "high" as const },
    { item: "Pechuga de pollo orgánica", quantity: "2 kg", priority: "high" as const },
    { item: "Salmón silvestre", quantity: "1 kg", priority: "high" as const },
    { item: "Aguacates", quantity: "12 unidades", priority: "high" as const },
    { item: "Espinacas frescas", quantity: "1 kg", priority: "medium" as const },
    { item: "Brócoli", quantity: "1 kg", priority: "medium" as const },
    { item: "Aceite de oliva extra virgen", quantity: "1 litro", priority: "medium" as const },
    { item: "Aceite de coco", quantity: "500 ml", priority: "low" as const },
    { item: "Semillas de chía", quantity: "250 g", priority: "low" as const },
    { item: "Almendras", quantity: "500 g", priority: "low" as const },
  ];

  const planArray = nutritionPlan as Array<Record<string, unknown>> | undefined;
  if (!planArray || planArray.length === 0) {
    return baseItems;
  }

  return baseItems.map((item) => ({
    ...item,
    quantity: item.quantity,
    priority: item.priority,
  }));
}

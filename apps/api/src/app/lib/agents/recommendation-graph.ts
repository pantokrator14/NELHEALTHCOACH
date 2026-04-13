import { StateGraph, END, START } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import {
  RecommendationState,
  type RecommendationStateType,
} from "./state";
import { analyzeClient } from "./nodes/client-analyzer";
import { planNutrition } from "./nodes/nutrition-planner";
import { planExercise } from "./nodes/exercise-planner";
import { planHabits } from "./nodes/habit-designer";
import { matchRecipes } from "./nodes/recipe-matcher";
import { generateShoppingList } from "./nodes/shopping-list";
import { validateQuality } from "./nodes/quality-validator";

/**
 * Builds the recommendation graph with all nodes and edges.
 *
 * Note: LangGraph 1.2.x has very strict typing for node names in addEdge.
 * The type system expects "__start__" | "__end__" literally for the first param.
 * We work around this by using the graph's internal node registry.
 */
function buildRecommendationGraph() {
  const workflow = new StateGraph(RecommendationState);

  // Register nodes
  workflow.addNode("analyzeClient", analyzeClient);
  workflow.addNode("planNutrition", planNutrition);
  workflow.addNode("planExercise", planExercise);
  workflow.addNode("planHabits", planHabits);
  workflow.addNode("matchRecipes", matchRecipes);
  workflow.addNode("generateShoppingList", generateShoppingList);
  workflow.addNode("validateQuality", validateQuality);

  // Entry point
  // LangGraph 1.2.x typing issue: addEdge expects literal "__start__" type
  // but custom node names are valid at runtime
  workflow.addEdge(START, "analyzeClient" as never);

  // Sequential: analyzeClient must complete first
  workflow.addEdge("analyzeClient" as never, "planNutrition" as never);
  workflow.addEdge("analyzeClient" as never, "planExercise" as never);
  workflow.addEdge("analyzeClient" as never, "planHabits" as never);

  // Parallel planners converge to recipe matching
  workflow.addEdge("planNutrition" as never, "matchRecipes" as never);
  workflow.addEdge("planExercise" as never, "matchRecipes" as never);
  workflow.addEdge("planHabits" as never, "matchRecipes" as never);

  // Recipe matching -> shopping list
  workflow.addEdge("matchRecipes" as never, "generateShoppingList" as never);

  // Shopping list -> validation
  workflow.addEdge("generateShoppingList" as never, "validateQuality" as never);

  // Conditional: revision loop
  workflow.addConditionalEdges(
    "validateQuality" as never,
    (stateVal: RecommendationStateType): "revision" | "complete" => {
      const maxRevisions = stateVal.maxRevisions ?? 2;
      const revisionCount = stateVal.revisionCount ?? 0;

      if (stateVal.needsRevision && revisionCount < maxRevisions) {
        return "revision";
      }
      return "complete";
    },
    {
      revision: "planNutrition" as never,
      complete: END as never,
    }
  );

  return workflow;
}

/**
 * Compiled recommendation graph ready for invocation.
 */
export const recommendationGraph = buildRecommendationGraph().compile();

/**
 * Type-safe wrapper for invoking the graph with proper input type.
 */
export interface RecommendationGraphInput {
  clientId: string;
  monthNumber: number;
  personalData: RecommendationStateType["personalData"];
  medicalData: RecommendationStateType["medicalData"];
  healthAssessment: RecommendationStateType["healthAssessment"];
  mentalHealth: RecommendationStateType["mentalHealth"];
  processedDocuments: RecommendationStateType["processedDocuments"];
  coachNotes?: string;
  previousSessions?: RecommendationStateType["previousSessions"];
  maxRevisions?: number;
}

/**
 * Invokes the recommendation graph with type-safe input.
 * Returns the complete graph execution result.
 */
export async function generateRecommendations(
  input: RecommendationGraphInput,
  config?: RunnableConfig
): Promise<RecommendationStateType> {
  const graphInput: RecommendationStateType = {
    clientId: input.clientId,
    monthNumber: input.monthNumber,
    personalData: input.personalData,
    medicalData: input.medicalData,
    healthAssessment: input.healthAssessment,
    mentalHealth: input.mentalHealth,
    processedDocuments: input.processedDocuments,
    coachNotes: input.coachNotes ?? "",
    previousSessions: input.previousSessions ?? [],
    maxRevisions: input.maxRevisions ?? 2,

    // Initialize empty state
    clientInsights: {
      summary: "",
      keyRisks: [],
      opportunities: [],
      experienceLevel: "principiante" as const,
      idealWeight: "",
      idealBodyFat: "",
      targetImprovements: [],
    },
    nutritionPlan: [],
    exercisePlan: [],
    habitPlan: [],
    recipeMatches: [],
    shoppingList: [],
    validationResults: {
      nutrition: { passed: false, issues: [] },
      exercise: { passed: false, issues: [] },
      habits: { passed: false, issues: [] },
      overall: { passed: false, needsRevision: false },
    },
    session: {},
    checklist: [],
    needsRevision: false,
    revisionCount: 0,
    coachReviewFeedback: undefined,
    errors: [],
  };

  return recommendationGraph.invoke(graphInput, config);
}

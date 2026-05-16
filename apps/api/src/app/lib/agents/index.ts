// LangGraph Recommendation Agents - Main Export
export { recommendationGraph, generateRecommendations } from "./recommendation-graph";
export { RecommendationState } from "./state";
export type {
  RecommendationStateType,
  MedicalAnalysisPlan,
  NutritionPlan,
  ExercisePlan,
  HabitPlan,
  RecipeMatch,
  ValidationResult,
  CoachReviewFeedback,
} from "./state";

// LLM Utilities
export {
  createDeepSeekLLM,
  createDeepSeekJSONLLM,
  createDeepSeekAnalyticalLLM,
  createDeepSeekWithTools,
  createGeminiLLM,
  createGeminiJSONLLM,
  createGeminiWithTools,
  analyzePDFWithGemini,
  analyzeS3PDFWithGemini,
  callGeminiAPI,
  callGeminiAPIWithRetry,
  testGeminiConnection,
} from "./utils/llm";

// Prompt Builders
export {
  buildClientAnalysisPrompt,
  buildMedicalAnalysisPrompt,
  buildNutritionPrompt,
  buildExercisePrompt,
  buildHabitPrompt,
  buildValidationPrompt,
} from "./utils/prompt-builders";

// Graph Nodes
export { analyzeClient, planNutrition } from "./nodes/nutrition-planner";
export { analyzeMedicalData } from "./nodes/medical-analyst";
export { planExercise } from "./nodes/exercise-planner";
export { planHabits } from "./nodes/habit-designer";
export { matchRecipes } from "./nodes/recipe-matcher";
export { generateShoppingList } from "./nodes/shopping-list";
export { validateQuality } from "./nodes/quality-validator";

// Tools
export {
  searchRecipeTool,
  getRecipeByIdTool,
  saveRecipeTool,
} from "./tools/recipe-tools";
export {
  searchExerciseTool,
  saveExerciseTool,
} from "./tools/exercise-tools";
export {
  getClientDataTool,
  getPreviousSessionsTool,
  saveSessionTool,
} from "./tools/db-tools";

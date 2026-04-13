import { Annotation } from "@langchain/langgraph";
import type {
  AIRecommendationSession,
  ChecklistItem,
  PersonalData,
  MedicalData,
} from "@nelhealthcoach/types";

// ─────────────────────────────────────────────
// Schema for intermediate nutrition plan output
// ─────────────────────────────────────────────
export interface NutritionPlan {
  weekNumber: number;
  focus: string;
  macros: {
    protein: string;
    fat: string;
    carbs: string;
    calories: number;
  };
  metabolicPurpose: string;
  shoppingList: Array<{
    item: string;
    quantity: string;
    priority: "high" | "medium" | "low";
  }>;
}

// ─────────────────────────────────────────────
// Schema for intermediate exercise plan output
// ─────────────────────────────────────────────
export interface ExercisePlan {
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
}

// ─────────────────────────────────────────────
// Schema for intermediate habit plan output
// ─────────────────────────────────────────────
export interface HabitPlan {
  weekNumber: number;
  adoptHabits: Array<{
    habit: string;
    frequency: string;
    trigger: string;
  }>;
  eliminateHabits: Array<{
    habit: string;
    replacement: string;
  }>;
  trackingMethod: string;
  motivationTip: string;
}

// ─────────────────────────────────────────────
// Schema for recipe match results
// ─────────────────────────────────────────────
export interface RecipeMatch {
  weekNumber: number;
  mealType: string;
  recipeId: string;
  matched: boolean;
  generatedFallback: boolean;
}

// ─────────────────────────────────────────────
// Schema for validation results
// ─────────────────────────────────────────────
export interface ValidationResult {
  nutrition: {
    passed: boolean;
    issues: string[];
  };
  exercise: {
    passed: boolean;
    issues: string[];
  };
  habits: {
    passed: boolean;
    issues: string[];
  };
  overall: {
    passed: boolean;
    needsRevision: boolean;
  };
}

// ─────────────────────────────────────────────
// Schema for coach review feedback
// ─────────────────────────────────────────────
export interface CoachReviewFeedback {
  nutritionRevisions?: string;
  exerciseRevisions?: string;
  habitRevisions?: string;
  generalNotes?: string;
  approved: boolean;
}

// ─────────────────────────────────────────────
// LangGraph State Definition
// ─────────────────────────────────────────────
export const RecommendationState = Annotation.Root({
  // ── Input data ──
  clientId: Annotation<string>(),
  monthNumber: Annotation<number>(),
  personalData: Annotation<PersonalData>(),
  medicalData: Annotation<MedicalData>,
  healthAssessment: Annotation<Record<string, boolean>>(),
  mentalHealth: Annotation<Record<string, string>>(),
  processedDocuments: Annotation<
    Array<{
      title: string;
      content: string;
      documentType: string;
      confidence: number;
    }>
  >(),
  coachNotes: Annotation<string>(),
  previousSessions: Annotation<AIRecommendationSession[]>(),

  // ── Intermediate outputs ──
  clientInsights: Annotation<{
    summary: string;
    keyRisks: string[];
    opportunities: string[];
    experienceLevel: "principiante" | "intermedio" | "avanzado";
    idealWeight: string;
    idealBodyFat: string;
    targetImprovements: string[];
  }>(),

  nutritionPlan: Annotation<NutritionPlan[]>(),
  exercisePlan: Annotation<ExercisePlan[]>(),
  habitPlan: Annotation<HabitPlan[]>(),

  // ── Recipe matching ──
  recipeMatches: Annotation<RecipeMatch[]>({
    reducer: (current: RecipeMatch[], next: RecipeMatch[]) => [
      ...current,
      ...next,
    ],
  }),

  // ── Shopping list ──
  shoppingList: Annotation<
    Array<{ item: string; quantity: string; priority: "high" | "medium" | "low" }>
  >(),

  // ── Validation ──
  validationResults: Annotation<ValidationResult>(),

  // ── Output ──
  session: Annotation<Partial<AIRecommendationSession>>(),
  checklist: Annotation<ChecklistItem[]>({
    reducer: (current: ChecklistItem[], next: ChecklistItem[]) => [
      ...current,
      ...next,
    ],
  }),

  // ── Control flow ──
  needsRevision: Annotation<boolean>({
    reducer: (current: boolean, next: boolean) => current || next,
  }),
  revisionCount: Annotation<number>({
    reducer: (current: number, _next: number) => current + _next,
  }),
  maxRevisions: Annotation<number>(),
  coachReviewFeedback: Annotation<CoachReviewFeedback | undefined>(),
  errors: Annotation<string[]>({
    reducer: (current: string[], next: string[]) => [...current, ...next],
  }),
});

export type RecommendationStateType = typeof RecommendationState.State;

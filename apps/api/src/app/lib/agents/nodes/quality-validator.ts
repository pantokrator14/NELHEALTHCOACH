import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createDeepSeekJSONLLM } from "../utils/llm"
import { robustJsonParse } from "../utils/llm";
import { buildValidationPrompt, formatFullClientProfile } from "../utils/prompt-builders";
import type {
  RecommendationStateType,
  ValidationResult,
} from "../state";
import { logger } from "../../logger";
import { qualityValidatorGuard, applyGuardrails, validateAIResponse } from "../guard";

/**
 * Quality Validator Node
 *
 * Reviews all generated plans (nutrition, exercise, habits) to ensure
 * they are personalized, safe, and appropriate for the client's profile.
 * Flags issues and determines if revision is needed.
 */
export async function validateQuality(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "validateQuality",
    clientId: state.clientId,
  });

  try {
    if (!state.clientInsights) {
      logCtx.warn("AI", "No client insights available for validation");
      return {
        errors: ["validateQuality: clientInsights not available."],
        validationResults: {
          medicalAnalysis: { passed: false, issues: ["No client insights available"] },
          nutrition: { passed: false, issues: ["No client insights available"] },
          exercise: { passed: false, issues: ["No client insights available"] },
          habits: { passed: false, issues: ["No client insights available"] },
          overall: { passed: false, needsRevision: true },
        },
      };
    }

    logCtx.info("AI", "Starting quality validation");

    const llm = createDeepSeekJSONLLM();

    const validationPrompt = buildValidationPrompt({
      clientInsights: state.clientInsights,
      medicalAnalysisPlan: state.medicalAnalysisPlan as unknown as Array<Record<string, unknown>>,
      nutritionPlan: state.nutritionPlan as unknown as Array<Record<string, unknown>>,
      exercisePlan: state.exercisePlan as unknown as Array<Record<string, unknown>>,
      habitPlan: state.habitPlan as unknown as Array<Record<string, unknown>>,
    });

    const fullProfile = formatFullClientProfile({
      personalData: state.personalData as unknown as Parameters<typeof formatFullClientProfile>[0]['personalData'],
      medicalData: state.medicalData as unknown as Parameters<typeof formatFullClientProfile>[0]['medicalData'],
      healthAssessment: state.healthAssessment as unknown as Parameters<typeof formatFullClientProfile>[0]['healthAssessment'],
      mentalHealth: state.mentalHealth as unknown as Parameters<typeof formatFullClientProfile>[0]['mentalHealth'],
      processedDocuments: state.processedDocuments as unknown as Parameters<typeof formatFullClientProfile>[0]['processedDocuments'],
      previousSessions: state.previousSessions as unknown as Parameters<typeof formatFullClientProfile>[0]['previousSessions'],
      coachNotes: state.coachNotes,
    });
    const prompt = fullProfile + "\n\n" + validationPrompt;

    // Usar guardrails para validación de calidad
    const validationResults = await applyGuardrails(
      qualityValidatorGuard,
      { 
        prompt, 
        clientInsights: state.clientInsights,
        medicalAnalysisPlan: state.medicalAnalysisPlan,
        nutritionPlan: state.nutritionPlan,
        exercisePlan: state.exercisePlan,
        habitPlan: state.habitPlan
      },
      async (validatedInput) => {
        const response = await llm.invoke([
          new SystemMessage("Eres un auditor de calidad en planes de salud integral. Responde SOLO con JSON válido."),
          new HumanMessage(validatedInput.prompt),
        ]);

        const content = typeof response.content === "string" ? response.content : "";
        
        // Validación adicional de la respuesta
        const validation = await validateAIResponse(content);
        if (!validation.isValid) {
          logCtx.warn("GUARDRAILS", "Problemas en respuesta de validación de calidad", {
            issues: validation.issues,
          });
        }

        return parseValidationResponse(validation.sanitizedResponse || content);
      }
    );

    // Check if revision is needed and within limits
    const maxRevisions = state.maxRevisions ?? 2;
    const currentRevisionCount = state.revisionCount ?? 0;
    const needsRevision =
      validationResults.overall.needsRevision && currentRevisionCount < maxRevisions;

    logCtx.info("AI", "Quality validation completed", {
      nutritionPassed: validationResults.nutrition.passed,
      exercisePassed: validationResults.exercise.passed,
      habitsPassed: validationResults.habits.passed,
      needsRevision,
      revisionCount: needsRevision ? currentRevisionCount + 1 : currentRevisionCount,
    });

    return {
      validationResults,
      needsRevision,
      revisionCount: needsRevision ? currentRevisionCount + 1 : 0,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `Quality validation failed: ${errorMessage}`);

    // Si ya alcanzamos el máximo de revisiones, NO forzar otra revisión
    // para evitar loop infinito (GraphRecursionError).
    const currentRevisionCount = state.revisionCount ?? 0;
    const maxRevisions = state.maxRevisions ?? 2;
    const shouldRetry = currentRevisionCount < maxRevisions;

    return {
      errors: [`validateQuality: ${errorMessage}`],
      validationResults: {
        medicalAnalysis: { passed: false, issues: [errorMessage] },
        nutrition: { passed: false, issues: [errorMessage] },
        exercise: { passed: false, issues: [errorMessage] },
        habits: { passed: false, issues: [errorMessage] },
        overall: { passed: false, needsRevision: shouldRetry },
      },
      needsRevision: shouldRetry,
      revisionCount: shouldRetry ? currentRevisionCount + 1 : currentRevisionCount,
    };
  }
}

/**
 * Parses the LLM response into a ValidationResult object.
 */
function parseValidationResponse(content: string): ValidationResult {
  let jsonStr = content;

  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const parsed: Record<string, unknown> = robustJsonParse<Record<string, unknown>>(jsonStr);

  const medicalAnalysis = parsed.medicalAnalysis as Record<string, unknown> | undefined;
  const nutrition = parsed.nutrition as Record<string, unknown> | undefined;
  const exercise = parsed.exercise as Record<string, unknown> | undefined;
  const habits = parsed.habits as Record<string, unknown> | undefined;
  const overall = parsed.overall as Record<string, unknown> | undefined;

  return {
    medicalAnalysis: {
      passed: typeof medicalAnalysis?.passed === "boolean" ? medicalAnalysis.passed : true,
      issues: Array.isArray(medicalAnalysis?.issues)
        ? medicalAnalysis.issues.filter(
            (item: unknown): item is string => typeof item === "string"
          )
        : [],
    },
    nutrition: {
      passed: typeof nutrition?.passed === "boolean" ? nutrition.passed : false,
      issues: Array.isArray(nutrition?.issues)
        ? nutrition.issues.filter(
            (item: unknown): item is string => typeof item === "string"
          )
        : ["No validation data available"],
    },
    exercise: {
      passed: typeof exercise?.passed === "boolean" ? exercise.passed : false,
      issues: Array.isArray(exercise?.issues)
        ? exercise.issues.filter(
            (item: unknown): item is string => typeof item === "string"
          )
        : ["No validation data available"],
    },
    habits: {
      passed: typeof habits?.passed === "boolean" ? habits.passed : false,
      issues: Array.isArray(habits?.issues)
        ? habits.issues.filter(
            (item: unknown): item is string => typeof item === "string"
          )
        : ["No validation data available"],
    },
    overall: {
      passed:
        typeof overall?.passed === "boolean"
          ? overall.passed
          : (nutrition?.passed === true &&
              exercise?.passed === true &&
              habits?.passed === true),
      needsRevision:
        typeof overall?.needsRevision === "boolean"
          ? overall.needsRevision
          : !(
              nutrition?.passed === true &&
              exercise?.passed === true &&
              habits?.passed === true
            ),
    },
  };
}

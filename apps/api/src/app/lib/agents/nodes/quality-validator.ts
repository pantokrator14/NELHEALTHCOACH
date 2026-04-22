import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createDeepSeekJSONLLM } from "../utils/llm";
import { buildValidationPrompt } from "../utils/prompt-builders";
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
          nutrition: { passed: false, issues: ["No client insights available"] },
          exercise: { passed: false, issues: ["No client insights available"] },
          habits: { passed: false, issues: ["No client insights available"] },
          overall: { passed: false, needsRevision: true },
        },
      };
    }

    logCtx.info("AI", "Starting quality validation");

    const llm = createDeepSeekJSONLLM();

    const prompt = buildValidationPrompt({
      clientInsights: state.clientInsights,
      nutritionPlan: state.nutritionPlan as unknown as Array<Record<string, unknown>>,
      exercisePlan: state.exercisePlan as unknown as Array<Record<string, unknown>>,
      habitPlan: state.habitPlan as unknown as Array<Record<string, unknown>>,
    });

    // Usar guardrails para validación de calidad
    const validationResults = await applyGuardrails(
      qualityValidatorGuard,
      { 
        prompt, 
        clientInsights: state.clientInsights,
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

    // On error, allow revision to retry
    return {
      errors: [`validateQuality: ${errorMessage}`],
      validationResults: {
        nutrition: { passed: false, issues: ["Validation error occurred"] },
        exercise: { passed: false, issues: ["Validation error occurred"] },
        habits: { passed: false, issues: ["Validation error occurred"] },
        overall: { passed: false, needsRevision: true },
      },
      needsRevision: true,
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

  const parsed: Record<string, unknown> = JSON.parse(jsonStr);

  const nutrition = parsed.nutrition as Record<string, unknown> | undefined;
  const exercise = parsed.exercise as Record<string, unknown> | undefined;
  const habits = parsed.habits as Record<string, unknown> | undefined;
  const overall = parsed.overall as Record<string, unknown> | undefined;

  return {
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

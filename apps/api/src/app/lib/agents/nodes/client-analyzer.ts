import type { RunnableConfig } from "@langchain/core/runnables";
import { createDeepSeekJSONLLM } from "../utils/llm";
import {
  buildClientAnalysisPrompt,
} from "../utils/prompt-builders";
import type { RecommendationStateType } from "../state";
import { clientAnalyzerGuard, applyGuardrails, validateAIResponse } from "../guard";
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
 *
 * Analyzes the complete client profile and generates structured insights
 * that will be used by downstream nodes (nutrition, exercise, habits).
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
      clientAnalyzerGuard,
      { 
        prompt, 
        personalData: state.personalData, 
        medicalData: state.medicalData,
        clientId: state.clientId 
      },
      async (validatedInput) => {
        const response = await llm.invoke([
          { role: "system", content: "Eres un experto analista de salud integral. Responde SOLO con JSON válido." },
          { role: "user", content: validatedInput.prompt },
        ]);

        const content = typeof response.content === "string" ? response.content : "";
        
        // Validación adicional de la respuesta
        const validation = await validateAIResponse(content);
        if (!validation.isValid) {
          logCtx.warn("GUARDRAILS", "Problemas en respuesta de análisis de cliente", {
            issues: validation.issues,
            clientId: validatedInput.clientId,
          });
        }

        return parseInsightsResponse(validation.sanitizedResponse || content);
      }
    );

    logCtx.info("AI", "Análisis de cliente completado con guardrails", {
      experienceLevel: insights.experienceLevel,
      riskCount: insights.keyRisks.length,
      opportunityCount: insights.opportunities.length,
    });

    return {
      clientInsights: insights,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error in analyzeClient";
    
    logCtx.error("AI", `Análisis de cliente falló: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage), { 
      clientId: state.clientId,
      operation: "analyzeClient"
    });

    return {
      errors: [`analyzeClient: ${errorMessage}`],
      clientInsights: {
        summary: "Error analyzing client profile - using safe fallback",
        keyRisks: ["Unable to assess risks due to security validation"],
        opportunities: ["Consult with healthcare professional"],
        experienceLevel: "principiante" as const,
        idealWeight: "N/A",
        idealBodyFat: "N/A",
        targetImprovements: ["Professional medical evaluation required"],
      },
    };
  }
}

/**
 * Parses the LLM response into a structured ClientInsights object.
 * Handles JSON extraction and validation.
 */
function parseInsightsResponse(content: string): ClientInsights {
  let jsonStr = content;

  // Extract JSON from code blocks if present
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
      ? parsed.targetImprovements.filter(
          (item: unknown): item is string => typeof item === "string"
        )
      : [],
  };
}

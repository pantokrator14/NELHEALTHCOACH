import type { RunnableConfig } from "@langchain/core/runnables";
import { createDeepSeekJSONLLM } from "../utils/llm";
import {
  buildClientAnalysisPrompt,
} from "../utils/prompt-builders";
import type { RecommendationStateType } from "../state";

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

    const response = await llm.invoke([
      { role: "system", content: "Eres un experto analista de salud integral. Responde SOLO con JSON válido." },
      { role: "user", content: prompt },
    ]);

    const content = typeof response.content === "string" ? response.content : "";
    const insights = parseInsightsResponse(content);

    return {
      clientInsights: insights,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error in analyzeClient";

    return {
      errors: [`analyzeClient: ${errorMessage}`],
      clientInsights: {
        summary: "Error analyzing client profile",
        keyRisks: ["Unable to assess risks due to analysis error"],
        opportunities: ["Retry analysis"],
        experienceLevel: "principiante" as const,
        idealWeight: "N/A",
        idealBodyFat: "N/A",
        targetImprovements: ["Complete analysis first"],
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

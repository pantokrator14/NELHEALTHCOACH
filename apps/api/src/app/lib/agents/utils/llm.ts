import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseMessage, AIMessageChunk } from "@langchain/core/messages";
import { logger } from "../../logger";

// ─────────────────────────────────────────────
// Configuración centralizada de Gemini
// ─────────────────────────────────────────────

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_REST_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-pro";

interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

/** Devuelve el modelo Gemini configurado (con log) */
function resolveModel(): string {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return model;
}

// ─────────────────────────────────────────────
// Fabrica principal
// ─────────────────────────────────────────────

function createLLM(options: LLMOptions = {}): ChatOpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("AI", "GEMINI_API_KEY no configurada. Todas las llamadas a Gemini fallarán.");
    throw new Error("GEMINI_API_KEY is required");
  }

  const model = options.model ?? resolveModel();
  logger.info("AI", "Creando instancia LLM Gemini", {
    model,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 8000,
    endpoint: "openai-compat",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ChatOpenAI({
    modelName: model,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 8000,
    streaming: options.streaming ?? false,
    apiKey,
    configuration: { baseURL: GEMINI_BASE_URL },
  }) as any;
}

// ─────────────────────────────────────────────
// Variantes preconfiguradas
// ─────────────────────────────────────────────

export function createDeepSeekLLM(options: LLMOptions = {}): BaseChatModel {
  return createLLM(options) as unknown as BaseChatModel;
}

export function createDeepSeekJSONLLM(): BaseChatModel {
  return createLLM({ temperature: 0.3, maxTokens: 16000 }) as unknown as BaseChatModel;
}

export function createDeepSeekAnalyticalLLM(): BaseChatModel {
  return createLLM({ temperature: 0.8, maxTokens: 3000 }) as unknown as BaseChatModel;
}

export function createDeepSeekWithTools(
  tools: StructuredToolInterface[],
  options: LLMOptions = {}
): BaseChatModel {
  const llm = createLLM({
    temperature: options.temperature ?? 0.5,
    maxTokens: options.maxTokens ?? 6000,
  });

  const bound = (llm as unknown as Record<string, unknown>).bindTools as
    | ((t: StructuredToolInterface[]) => unknown)
    | undefined;
  if (!bound) {
    logger.error("AI", "bindTools no disponible en Gemini. Verifica compatibilidad del endpoint OpenAI.", {
      model: resolveModel(),
    });
    throw new Error("bindTools is not available on this model — Gemini OpenAI compat endpoint may not support function calling");
  }

  logger.debug("AI", "Tools bindeadas a LLM Gemini", { toolCount: tools.length });
  return bound.call(llm, tools) as unknown as BaseChatModel;
}

// ─────────────────────────────────────────────
// Aliases explícitos
// ─────────────────────────────────────────────

export function createGeminiLLM(options: LLMOptions = {}): BaseChatModel {
  return createLLM(options) as unknown as BaseChatModel;
}

export function createGeminiJSONLLM(): BaseChatModel {
  return createDeepSeekJSONLLM();
}

export function createGeminiWithTools(
  tools: StructuredToolInterface[],
  options: LLMOptions = {}
): BaseChatModel {
  return createDeepSeekWithTools(tools, options);
}

// ─────────────────────────────────────────────
// JSON parsing y tool invocation
// ─────────────────────────────────────────────

export function robustJsonParse<T>(raw: string): T {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed) as T; } catch { /* continuar */ }
  const jsonBlock = trimmed.match(/```(?:json)?\s*[\n\r]([\s\S]*?)\n?\s*```/);
  if (jsonBlock) try { return JSON.parse(jsonBlock[1].trim()) as T; } catch { /* continuar */ }
  const anyBlock = trimmed.match(/```\s*[\n\r]([\s\S]*?)\n?\s*```/);
  if (anyBlock) try { return JSON.parse(anyBlock[1].trim()) as T; } catch { /* continuar */ }
  const firstBrace = trimmed.indexOf("{");
  if (firstBrace !== -1) {
    let depth = 0;
    let start = -1;
    for (let i = firstBrace; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === "{") { if (depth === 0) start = i; depth++; }
      else if (ch === "}") { depth--; if (depth === 0 && start !== -1) {
        try { return JSON.parse(trimmed.slice(start, i + 1)) as T; } catch { start = -1; }
      }}
    }
  }
  const firstBracket = trimmed.indexOf("[");
  if (firstBracket !== -1) {
    let depth = 0;
    let start = -1;
    for (let i = firstBracket; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === "[") { if (depth === 0) start = i; depth++; }
      else if (ch === "]") { depth--; if (depth === 0 && start !== -1) {
        try { return JSON.parse(trimmed.slice(start, i + 1)) as T; } catch { start = -1; }
      }}
    }
  }
  throw new Error(`Failed to parse JSON from response (${raw.length} chars). First 200: ${raw.substring(0, 200)}`);
}

export async function invokeWithTools(
  model: BaseChatModel,
  messages: BaseMessage[]
): Promise<AIMessageChunk> {
  try {
    const result = await model.invoke(messages);
    return result as unknown as AIMessageChunk;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("AI", "invokeWithTools failed", {
      error: errMsg.substring(0, 200),
      messageCount: messages.length,
      model: resolveModel(),
    });
    throw error;
  }
}

// ─────────────────────────────────────────────
// Gemini REST API nativa — helpers internos
// ─────────────────────────────────────────────

/** Parsea la respuesta JSON de la API REST nativa de Gemini */
function parseGeminiResponse(
  data: Record<string, unknown>,
  logCtx: ReturnType<typeof logger.withContext>,
  caller: string
): { text: string; finishReason?: string; safetyBlocked: boolean } {
  const candidates = data.candidates as Array<Record<string, unknown>> | undefined;

  // Gemini bloqueó el contenido por seguridad
  if (!candidates || candidates.length === 0) {
    const promptFeedback = data.promptFeedback as Record<string, unknown> | undefined;
    const blockReason = promptFeedback?.blockReason as string | undefined;
    const safetyRatings = promptFeedback?.safetyRatings as Array<Record<string, unknown>> | undefined;

    logCtx.warn("AI", `[${caller}] Gemini bloqueó la respuesta por seguridad`, {
      blockReason: blockReason || "unknown",
      safetyRatings: safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(", ") || "none",
    });

    return { text: "", safetyBlocked: true };
  }

  const candidate = candidates[0];
  const finishReason = candidate.finishReason as string | undefined;
  const parts = (candidate.content as Record<string, unknown> | undefined)?.parts as Array<{ text: string }> | undefined;
  const text = parts?.[0]?.text || "";

  // Log finishReason si no es STOP
  if (finishReason && finishReason !== "STOP") {
    logCtx.warn("AI", `[${caller}] Gemini finishReason no estándar`, {
      finishReason,
      textLength: text.length,
      safetyRatings: (candidate.safetyRatings as Array<Record<string, unknown>>)
        ?.map(r => `${r.category}: ${r.probability}`).join(", ") || "none",
    });
  }

  if (!text && finishReason !== "SAFETY") {
    logCtx.warn("AI", `[${caller}] Gemini devolvió texto vacío`, {
      finishReason,
      candidateKeys: Object.keys(candidate),
    });
  }

  return {
    text,
    finishReason,
    safetyBlocked: finishReason === "SAFETY",
  };
}

/** Hace fetch a la API REST nativa de Gemini y parsea la respuesta */
async function fetchGeminiREST(
  url: string,
  body: Record<string, unknown>,
  logCtx: ReturnType<typeof logger.withContext>,
  caller: string
): Promise<{ text: string; finishReason?: string; safetyBlocked: boolean; rawResponse: unknown }> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error body");
      logCtx.error("AI", `[${caller}] Gemini API error HTTP`, undefined, {
        status: response.status,
        statusText: response.statusText,
        duration,
        errorBody: errorText.substring(0, 500),
      });
      throw new Error(`Gemini API HTTP ${response.status}: ${errorText.substring(0, 300)}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const parsed = parseGeminiResponse(data, logCtx, caller);

    logCtx.info("AI", `[${caller}] Gemini API call exitosa`, {
      duration,
      textLength: parsed.text.length,
      finishReason: parsed.finishReason,
    });

    return { ...parsed, rawResponse: data };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Gemini API HTTP")) {
      throw error; // ya tiene contexto
    }
    const duration = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    logCtx.error("AI", `[${caller}] Gemini fetch error`, error instanceof Error ? error : undefined, {
      errorMessage: errMsg.substring(0, 300),
      duration,
      url: url.substring(0, 100),
    });
    throw new Error(`Gemini REST fetch failed (${caller}): ${errMsg}`);
  }
}

// ─────────────────────────────────────────────
// Gemini — Análisis nativo de PDFs desde S3
// ─────────────────────────────────────────────

export async function analyzePDFWithGemini(
  pdfBase64: string,
  fileName: string,
  analysisContext?: string
): Promise<string> {
  const caller = "analyzePDF";
  const logCtx = logger.withContext({ tool: "gemini-pdf-analysis", fileName });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");

    const model = resolveModel();
    const url = `${GEMINI_REST_URL}/models/${model}:generateContent?key=${apiKey}`;

    logCtx.info("AI", `[${caller}] Iniciando análisis de PDF`, {
      model,
      contextProvided: !!analysisContext,
      base64Length: pdfBase64.length,
    });

    const body = {
      systemInstruction: {
        parts: [{
          text: `Eres un analista médico experto en interpretación de documentos clínicos y resultados de laboratorio.
Extrae y analiza el contenido del PDF proporcionado.

INSTRUCCIONES:
1. Extrae TODO el texto relevante del documento
2. Identifica marcadores de laboratorio con sus valores y unidades
3. Identifica fechas de exámenes y comparativas si existen
4. Organiza la información en formato estructurado
5. NO diagnostiques — solo extrae e interpreta datos
6. Indica si hay valores fuera de rango y qué podrían significar`,
        }],
      },
      contents: [{
        parts: [
          {
            text: `${analysisContext ? `Contexto adicional: ${analysisContext}\n\n` : ""}Analiza el siguiente documento PDF: ${fileName}. Por favor, extrae y estructura toda la información médica y de laboratorio contenida en este documento.`,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16000,
      },
    };

    const result = await fetchGeminiREST(url, body, logCtx, caller);

    if (result.safetyBlocked) {
      logCtx.warn("AI", `[${caller}] PDF bloqueado por filtros de seguridad de Gemini`, { fileName });
      return `[Documento bloqueado por seguridad: ${fileName}]\n\nEl contenido de este documento no pudo ser analizado por los filtros de seguridad de Gemini. Por favor, revisa el documento manualmente.`;
    }

    if (!result.text) {
      logCtx.warn("AI", `[${caller}] Gemini devolvió texto vacío para PDF`, { fileName });
      return `[Documento sin texto extraíble: ${fileName}]\n\nGemini no pudo extraer texto de este documento. Puede estar escaneado como imagen o tener un formato no soportado.`;
    }

    return result.text;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `[${caller}] Falló el análisis de PDF`, error instanceof Error ? error : undefined, {
      fileName,
      errorMessage: errorMessage.substring(0, 300),
    });
    throw error;
  }
}

export async function analyzeS3PDFWithGemini(
  s3Key: string,
  fileName: string,
  analysisContext?: string
): Promise<string> {
  const caller = "analyzeS3PDF";
  const logCtx = logger.withContext({ tool: "gemini-s3-pdf-analysis", s3Key, fileName });

  try {
    logCtx.info("AI", `[${caller}] Descargando PDF de S3`);

    const { getPresignedUrlForAnalysis } = await import("../../s3");
    const presignedUrl = await getPresignedUrlForAnalysis(s3Key);

    const s3StartTime = Date.now();
    const response = await fetch(presignedUrl);

    if (!response.ok) {
      logCtx.error("AI", `[${caller}] Error descargando PDF de S3`, undefined, {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`S3 download failed: ${response.status} ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const s3Duration = Date.now() - s3StartTime;

    logCtx.info("AI", `[${caller}] PDF descargado de S3`, {
      sizeKB: Math.round(pdfBuffer.byteLength / 1024),
      s3Duration,
    });

    return analyzePDFWithGemini(pdfBase64, fileName, analysisContext);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logCtx.error("AI", `[${caller}] Falló`, error instanceof Error ? error : undefined, {
      s3Key,
      fileName,
      errorMessage: errorMessage.substring(0, 300),
    });
    throw error;
  }
}

// ─────────────────────────────────────────────
// Gemini REST API — Llamadas directas centralizadas
// ─────────────────────────────────────────────

interface GeminiGenerateContentParams {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

interface GeminiGenerateContentResponse {
  text: string;
  rawResponse: unknown;
}

export async function callGeminiAPI(
  params: GeminiGenerateContentParams
): Promise<GeminiGenerateContentResponse> {
  const caller = "callGeminiAPI";
  const logCtx = logger.withContext({ caller });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logCtx.error("AI", "GEMINI_API_KEY no configurada");
    throw new Error("GEMINI_API_KEY is required");
  }

  const model = resolveModel();
  const url = `${GEMINI_REST_URL}/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: params.userPrompt }] }],
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxOutputTokens ?? 8000,
    },
  };

  if (params.systemPrompt) {
    body.systemInstruction = { parts: [{ text: params.systemPrompt }] };
  }

  if (params.responseMimeType) {
    (body.generationConfig as Record<string, unknown>).responseMimeType =
      params.responseMimeType;
  }

  logCtx.debug("AI", `[${caller}] Llamando a Gemini`, {
    model,
    temperature: params.temperature ?? 0.7,
    maxOutputTokens: params.maxOutputTokens ?? 8000,
    promptLength: params.userPrompt.length,
    hasSystemPrompt: !!params.systemPrompt,
    responseMimeType: params.responseMimeType || "none",
  });

  const result = await fetchGeminiREST(url, body, logCtx, caller);

  if (result.safetyBlocked) {
    throw new Error(
      "Gemini blocked the response due to safety filters. Prompt may contain sensitive content."
    );
  }

  if (!result.text) {
    throw new Error(
      `Gemini returned empty text. finishReason: ${result.finishReason || "unknown"}. ` +
      "Possible causes: content filtered, max_tokens too low, or model error."
    );
  }

  return { text: result.text, rawResponse: result.rawResponse };
}

export async function callGeminiAPIWithRetry(
  params: GeminiGenerateContentParams,
  maxRetries: number = 3
): Promise<GeminiGenerateContentResponse> {
  const caller = "callGeminiAPIWithRetry";
  const logCtx = logger.withContext({ caller });

  const errors: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logCtx.info("AI", `[${caller}] Reintento ${attempt}/${maxRetries}`);
      }
      return await callGeminiAPI(params);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`attempt ${attempt + 1}: ${errMsg.substring(0, 150)}`);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        logCtx.warn("AI", `[${caller}] Falló intento ${attempt + 1}/${maxRetries + 1}, reintentando en ${delay}ms`, {
          error: errMsg.substring(0, 150),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const fullError = `Gemini API failed after ${maxRetries + 1} attempts:\n${errors.join("\n")}`;
  logCtx.error("AI", `[${caller}] Todos los reintentos fallaron`, undefined, {
    totalAttempts: maxRetries + 1,
    errors: errors.join(" | "),
  });
  throw new Error(fullError);
}

export async function testGeminiConnection(): Promise<boolean> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn("AI", "[testGeminiConnection] GEMINI_API_KEY no configurada");
      return false;
    }

    const model = resolveModel();
    const url = `${GEMINI_REST_URL}/models/${model}:generateContent?key=${apiKey}`;

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      logger.info("AI", "[testGeminiConnection] Conexión exitosa", { model, duration });
      return true;
    }

    const errorText = await response.text().catch(() => "Unable to read error");
    logger.warn("AI", "[testGeminiConnection] Falló la conexión", {
      status: response.status,
      statusText: response.statusText,
      duration,
      errorBody: errorText.substring(0, 300),
    });
    return false;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("AI", "[testGeminiConnection] Error de red", {
      error: errMsg.substring(0, 200),
    });
    return false;
  }
}

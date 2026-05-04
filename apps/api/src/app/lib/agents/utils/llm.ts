import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel, BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseMessage, AIMessageChunk } from "@langchain/core/messages";

interface DeepSeekLLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

/**
 * Creates a DeepSeek LLM instance configured for LangChain.
 */
export function createDeepSeekLLM(
  options: DeepSeekLLMOptions = {}
): BaseChatModel {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_API_URL;

  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is required");
  if (!baseURL) throw new Error("DEEPSEEK_API_URL is required");

  return new ChatOpenAI({
    modelName: options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 8000,
    streaming: options.streaming ?? false,
    apiKey,
    configuration: { baseURL },
    // Desactivar thinking mode DeepSeek V4 — LangChain spreadea modelKwargs al body
    modelKwargs: {
      thinking: { type: "disabled" },
    },
  } as any);
}

export function createDeepSeekJSONLLM(): BaseChatModel {
  return createDeepSeekLLM({ temperature: 0.3, maxTokens: 4000 });
}

export function createDeepSeekAnalyticalLLM(): BaseChatModel {
  return createDeepSeekLLM({ temperature: 0.8, maxTokens: 3000 });
}

/**
 * Returns a chat model with tools bound.
 * Cast to BaseChatModel for consistent typing across nodes.
 */
export function createDeepSeekWithTools(
  tools: StructuredToolInterface[],
  options: DeepSeekLLMOptions = {}
): BaseChatModel {
  const llm = createDeepSeekLLM({
    temperature: options.temperature ?? 0.5,
    maxTokens: options.maxTokens ?? 6000,
  });

  const bound = (llm as unknown as Record<string, unknown>).bindTools as ((t: StructuredToolInterface[]) => unknown) | undefined;
  if (!bound) {
    throw new Error("bindTools is not available on this model");
  }

  return bound.call(llm, tools) as unknown as BaseChatModel;
}

/**
 * Parsea un string a JSON extrayendo el primer bloque JSON válido,
 * ignorando texto extra antes/después (ej: reasoning_content, markdown, notas).
 */
export function robustJsonParse<T>(raw: string): T {
  const trimmed = raw.trim();
  // 1. Intentar directo
  try { return JSON.parse(trimmed) as T; } catch { /* continuar */ }
  // 2. Bloque ```json ... ```
  const jsonBlock = trimmed.match(/```(?:json)?\s*[\n\r]([\s\S]*?)\n?\s*```/);
  if (jsonBlock) try { return JSON.parse(jsonBlock[1].trim()) as T; } catch { /* continuar */ }
  // 3. Cualquier bloque ```
  const anyBlock = trimmed.match(/```\s*[\n\r]([\s\S]*?)\n?\s*```/);
  if (anyBlock) try { return JSON.parse(anyBlock[1].trim()) as T; } catch { /* continuar */ }
  // 4. Primer objeto {} de la respuesta
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) try { return JSON.parse(objMatch[0]) as T; } catch { /* continuar */ }
  // 5. Primer array []
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) try { return JSON.parse(arrMatch[0]) as T; } catch { /* continuar */ }
  throw new Error(`Unexpected non-whitespace character after JSON at position ${raw.length}`);
}
export async function invokeWithTools(
  model: BaseChatModel,
  messages: BaseMessage[]
): Promise<AIMessageChunk> {
  const result = await model.invoke(messages);
  return result as unknown as AIMessageChunk;
}

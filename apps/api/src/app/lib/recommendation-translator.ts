/**
 * recommendation-translator.ts
 *
 * Traducción dinámica de recomendaciones al idioma del cliente.
 *
 * Estrategia:
 *  - El pipeline de generación SIEMPRE produce el plan en español (los títulos
 *    de recetas deben matchear la DB). Después de armar la sesión (con los
 *    IDs ya vinculados), una FASE 4 traduce el contenido visible.
 *  - Las recetas/ejercicios de la DB pueden estar en CUALQUIER idioma
 *    (los coaches los suben en el suyo). Se detecta el idioma de origen
 *    (heurística de stopwords, sin LLM) y se traducen al idioma del cliente.
 *  - Principio de resiliencia: si la traducción falla, se devuelve el texto
 *    ORIGINAL (nunca se rompe la generación ni el PDF).
 *
 * Los textos se traducen en LOTES JSON: el LLM recibe el mismo JSON que debe
 * devolver con los valores de texto traducidos y estructura idéntica.
 */

import { createDeepSeekJSONLLM, robustJsonParse } from "./agents/utils/llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "./logger";
import { encrypt } from "./encryption";

// ── Idiomas soportados (mismos que la UI: en/es/fr/it/pt/de) ────────────────

export const SUPPORTED_LANGS = ['es', 'en', 'it', 'pt', 'fr', 'de'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const DEFAULT_LANG: SupportedLang = 'es';

export const LANG_LABELS: Record<SupportedLang, string> = {
  es: 'español',
  en: 'inglés',
  it: 'italiano',
  pt: 'portugués',
  fr: 'francés',
  de: 'alemán',
};

/** Normaliza el idioma del cliente: valida contra los soportados, default 'es'. */
export function normalizeClientLang(lang: unknown): SupportedLang {
  return typeof lang === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(lang)
    ? (lang as SupportedLang)
    : DEFAULT_LANG;
}

/**
 * Cifra selectivamente los campos de la sesión (igual que el formato histórico:
 * solo los textos largos y las listas de compras; checklist y análisis
 * estructurado se guardan en plano porque el frontend los lee con safeDecrypt).
 * Recibe la sesión EN PLANO (tras la FASE 4) y devuelve la sesión cifrada lista
 * para persistir. `translation` se guarda sin cifrar (no es dato sensible).
 */
export function encryptSessionFields(
  session: any,
  translation?: { targetLang: SupportedLang; sourceLang: SupportedLang }
): any {
  return {
    ...session,
    ...(translation ? { translation } : {}),
    summary: encrypt(session.summary || ''),
    vision: encrypt(session.vision || ''),
    medicalSummary: encrypt(session.medicalSummary || ''),
    medicalComparativeAnalysis: encrypt(session.medicalComparativeAnalysis || ''),
    weeks: (session.weeks || []).map((week: any) => ({
      weekNumber: week.weekNumber,
      nutrition: {
        focus: encrypt(week.nutrition?.focus || ''),
        shoppingList: (week.nutrition?.shoppingList || []).map((item: any) => ({
          item: encrypt(item.item || ''),
          quantity: encrypt(item.quantity || ''),
          priority: item.priority || 'medium',
        })),
      },
      exercise: {
        focus: encrypt(week.exercise?.focus || ''),
        equipment: (week.exercise?.equipment || []).map((eq: string) => encrypt(eq || '')),
      },
      habits: {
        trackingMethod: week.habits?.trackingMethod ? encrypt(week.habits.trackingMethod) : undefined,
        motivationTip: week.habits?.motivationTip ? encrypt(week.habits.motivationTip) : undefined,
      },
    })),
    checklist: session.checklist || [],
  };
}

// ── Detección heurística de idioma (stopwords, sin LLM) ─────────────────────

const STOPWORDS: Record<SupportedLang, string[]> = {
  es: ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'en', 'un', 'una', 'con', 'para', 'por', 'que', 'al', 'a', 'es', 'se', 'su', 'como', 'más', 'muy', 'las', 'los'],
  en: ['the', 'and', 'of', 'to', 'in', 'a', 'is', 'for', 'with', 'on', 'you', 'it', 'that', 'at', 'by', 'from', 'this', 'are', 'your', 'be'],
  it: ['il', 'lo', 'la', 'i', 'gli', 'le', 'di', 'del', 'e', 'o', 'in', 'un', 'una', 'con', 'per', 'che', 'al', 'a', 'è', 'si', 'su', 'come', 'più', 'molto'],
  pt: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'e', 'ou', 'em', 'um', 'uma', 'com', 'para', 'por', 'que', 'ao', 'é', 'se', 'su', 'como', 'mais', 'muito'],
  fr: ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'en', 'un', 'une', 'avec', 'pour', 'par', 'que', 'au', 'à', 'est', 'se', 'son', 'comme', 'plus', 'très'],
  de: ['der', 'die', 'das', 'den', 'dem', 'des', 'und', 'oder', 'in', 'ein', 'eine', 'mit', 'für', 'von', 'zu', 'ist', 'sich', 'sein', 'wie', 'mehr', 'sehr'],
};

/** Detecta el idioma predominante en un conjunto de textos. Default: 'es'. */
export function detectLanguage(texts: string[]): SupportedLang {
  const sample = texts
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .join(' ')
    .toLowerCase()
    .slice(0, 20_000);

  if (!sample) return DEFAULT_LANG;

  const words = sample.split(/[^a-zà-ÿñçäöüß]+/).filter((w) => w.length > 0);

  const scores = (Object.keys(STOPWORDS) as SupportedLang[]).map((lang) => {
    const stop = new Set(STOPWORDS[lang]);
    const score = words.reduce((acc, w) => (stop.has(w) ? acc + 1 : acc), 0);
    return { lang, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];

  // Empate (o muestra sin stopwords): español por defecto
  if (!top || top.score === 0 || (second && top.score === second.score)) {
    return DEFAULT_LANG;
  }
  return top.lang;
}

// ── Invocación LLM (inyectable para tests) ──────────────────────────────────

export type LLMFn = (system: string, human: string, maxTokens?: number) => Promise<string>;

/** Implementación real por defecto (DeepSeek vía LangChain). */
export async function defaultLLM(
  system: string,
  human: string,
  maxTokens = 12000
): Promise<string> {
  const llm = await createDeepSeekJSONLLM({ maxTokens });
  const response = await llm.invoke([
    new SystemMessage(system),
    new HumanMessage(human),
  ]);
  const content = typeof response?.content === 'string' ? response.content : '';
  if (!content) throw new Error('LLM devolvió contenido vacío');
  return content;
}

// ── Prompt de traducción estricta ───────────────────────────────────────────

function buildTranslationSystem(targetLang: SupportedLang, sourceHint: string): string {
  return [
    `Eres un traductor profesional médico/deportivo. Traduce el contenido al ${LANG_LABELS[targetLang]} (código ISO: ${targetLang}).`,
    `El contenido original está en ${sourceHint}.`,
    '',
    'REGLAS ESTRICTAS:',
    '1. Devuelve EXACTAMENTE el mismo JSON que recibes, con la MISMA estructura, claves y tipos.',
    '2. Traduce SOLO los valores de texto (strings). NUNCA traduzcas: números, unidades, claves JSON, IDs, enlaces, emails, ni valores de enums como high/medium/low o status.',
    '3. Mantén los nombres propios, marcas y términos técnicos sin traducción si no tienen equivalente claro.',
    '4. Mantén la cantidad de elementos de cada array idéntica.',
    '5. No añadas ni elimines campos. No añadas comentarios.',
    '6. Responde ÚNICAMENTE con el JSON traducido, sin texto adicional ni markdown.',
  ].join('\n');
}

const MAX_CHARS_PER_BATCH = 30_000;
const MAX_RETRIES = 2;

// ── Concurrencia limitada (DeepSeek penaliza con 503 el paralelismo alto) ──

/** Ejecuta `fn` sobre cada item con un máximo de `limit` tareas concurrentes. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Estima maxTokens de SALIDA a partir del tamaño del payload de ENTRADA. */
function estimateMaxTokens(payloadChars: number): number {
  // JSON con escape ~4 chars/token; la salida es similar a la entrada.
  const est = Math.ceil(payloadChars / 4) + 500;
  return Math.min(12_000, Math.max(2_000, est));
}

/** Traduce un objeto JSON por lotes: conserva estructura, traduce strings. */
export async function translateJsonBatch<T>(
  data: T,
  targetLang: SupportedLang,
  sourceHint: string,
  llm: LLMFn = defaultLLM
): Promise<T> {
  const system = buildTranslationSystem(targetLang, sourceHint);
  const payload = JSON.stringify(data);

  if (payload.length > MAX_CHARS_PER_BATCH) {
    // Entrada demasiado grande → traducir por partes (top-level arrays)
    if (Array.isArray(data)) {
      const chunks: unknown[][] = [];
      let current: unknown[] = [];
      let size = 0;
      for (const item of data) {
        const itemJson = JSON.stringify(item);
        if (size + itemJson.length > MAX_CHARS_PER_BATCH && current.length > 0) {
          chunks.push(current);
          current = [];
          size = 0;
        }
        current.push(item);
        size += itemJson.length;
      }
      if (current.length > 0) chunks.push(current);

      const translatedChunks: unknown[][] = [];
      for (const chunk of chunks) {
        const translated = await translateJsonBatch(chunk, targetLang, sourceHint, llm);
        translatedChunks.push(Array.isArray(translated) ? translated : chunk);
      }
      return translatedChunks.flat() as T;
    }
    // Objeto grande → traducir cada valor top-level por separado
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const valJson = JSON.stringify(val);
        if (typeof val === 'string') {
          out[key] = val;
        } else if (valJson && valJson.length > MAX_CHARS_PER_BATCH) {
          out[key] = await translateJsonBatch(val, targetLang, sourceHint, llm);
        } else {
          out[key] = await translateJsonBatch(val, targetLang, sourceHint, llm);
        }
      }
      return out as T;
    }
    return data;
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await llm(system, payload, estimateMaxTokens(payload.length));
      let parsed: unknown = robustJsonParse<unknown>(raw);
      // Algunos modelos devuelven el JSON como STRING escapado ("{\"...\"}"):
      // parsear de nuevo hasta quedarnos con el objeto real.
      for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
        parsed = robustJsonParse<unknown>(parsed as string);
      }
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Respuesta JSON con tipo inesperado');
      }
      return parsed as T;
    } catch (err) {
      lastError = err;
      logger.warn('TRANSLATE', `Intento ${attempt + 1} de traducción fallido: ${(err as Error)?.message}`, { targetLang });
    }
  }
  // Fallback resiliente: devolver el original (nunca romper el flujo)
  logger.error('TRANSLATE', 'Traducción fallida tras reintentos — usando contenido ORIGINAL', lastError as Error);
  return data;
}

// ── Traducción de la sesión completa (FASE 4 en la generación) ──────────────

/**
 * Traduce TODO el contenido visible de la sesión al idioma objetivo.
 * Recibe la sesión en PLANO (sin cifrar) y devuelve la MISMA estructura
 * con los textos traducidos. Los campos no-texto (ids, enums, números) se
 * conservan intactos.
 */
export async function translateSessionContent(
  session: any,
  targetLang: SupportedLang,
  sourceHint: string,
  llm: LLMFn = defaultLLM
): Promise<any> {
  const translated: any = { ...session };

  // Las secciones son independientes entre sí: se traducen con concurrencia
  // limitada (2) para acortar FASE 4 sin provocar 503 de DeepSeek.
  const CONCURRENCY = 2;

  // 1. Textos narrativos principales
  const narrative = {
    summary: session.summary || '',
    vision: session.vision || '',
    medicalSummary: session.medicalSummary || '',
    medicalComparativeAnalysis: session.medicalComparativeAnalysis || '',
  };

  const sections = [
    {
      key: 'narrative',
      run: () => translateJsonBatch(narrative, targetLang, sourceHint, llm),
      apply: (res: any) => {
        translated.summary = res?.summary ?? session.summary;
        translated.vision = res?.vision ?? session.vision;
        translated.medicalSummary = res?.medicalSummary ?? session.medicalSummary;
        translated.medicalComparativeAnalysis = res?.medicalComparativeAnalysis ?? session.medicalComparativeAnalysis;
      },
    },
    {
      key: 'structuredMedicalAnalysis',
      run: () => session.structuredMedicalAnalysis
        ? translateJsonBatch(session.structuredMedicalAnalysis, targetLang, sourceHint, llm)
        : Promise.resolve(null),
      apply: (res: any) => { if (res) translated.structuredMedicalAnalysis = res; },
    },
    {
      key: 'weeks',
      run: () => Array.isArray(session.weeks)
        ? translateJsonBatch(session.weeks, targetLang, sourceHint, llm)
        : Promise.resolve(null),
      apply: (res: any) => { if (res) translated.weeks = res; },
    },
    {
      key: 'checklist',
      run: () => Array.isArray(session.checklist)
        ? translateJsonBatch(session.checklist, targetLang, sourceHint, llm)
        : Promise.resolve(null),
      apply: (res: any) => { if (res) translated.checklist = res; },
    },
    {
      key: 'baselineMetrics',
      run: () => session.baselineMetrics
        ? translateJsonBatch(session.baselineMetrics, targetLang, sourceHint, llm)
        : Promise.resolve(null),
      apply: (res: any) => { if (res) translated.baselineMetrics = res; },
    },
    {
      key: 'labResults',
      run: () => Array.isArray(session.labResults)
        ? translateJsonBatch(session.labResults, targetLang, sourceHint, llm)
        : Promise.resolve(null),
      apply: (res: any) => { if (res) translated.labResults = res; },
    },
  ];

  const results = await mapLimit(sections, CONCURRENCY, (s) => s.run());
  sections.forEach((s, i) => s.apply(results[i]));

  return translated;
}

// ── Traducción de recetas y ejercicios para el PDF ──────────────────────────

export interface PDFRecipeContent {
  title: string;
  ingredients: Array<string | { name: string; quantity: string; notes?: string }>;
  instructions: string[];
}

export interface PDFExerciseContent {
  name: string;
  description?: string;
  instructions: string[];
  equipment?: string[];
  muscleGroups?: string[];
}

/**
 * Traduce recetas y ejercicios al idioma objetivo (para el PDF).
 * Conserva imágenes, macros, sets/reps y demás datos numéricos.
 */
export async function translatePDFContent(
  recipes: Record<string, PDFRecipeContent>,
  exercises: Record<string, PDFExerciseContent>,
  targetLang: SupportedLang,
  sourceHint: string,
  llm: LLMFn = defaultLLM
): Promise<{ recipes: Record<string, PDFRecipeContent>; exercises: Record<string, PDFExerciseContent> }> {
  const outRecipes: Record<string, PDFRecipeContent> = {};
  const outExercises: Record<string, PDFExerciseContent> = {};

  const recipeEntries = Object.entries(recipes);
  const exerciseEntries = Object.entries(exercises);

  // Recetas y ejercicios en paralelo (2 llamadas LLM en vez de 2 secuenciales)
  const [translatedRecipes, translatedExercises] = await Promise.all([
    recipeEntries.length > 0
      ? translateJsonBatch(
          Object.fromEntries(recipeEntries.map(([id, r]) => [id, r])),
          targetLang,
          sourceHint,
          llm
        )
      : Promise.resolve(null),
    exerciseEntries.length > 0
      ? translateJsonBatch(
          Object.fromEntries(exerciseEntries.map(([key, e]) => [key, e])),
          targetLang,
          sourceHint,
          llm
        )
      : Promise.resolve(null),
  ]);

  for (const [id, r] of recipeEntries) {
    outRecipes[id] = (translatedRecipes as any)?.[id] ?? r;
  }
  for (const [key, e] of exerciseEntries) {
    outExercises[key] = (translatedExercises as any)?.[key] ?? e;
  }

  return { recipes: outRecipes, exercises: outExercises };
}

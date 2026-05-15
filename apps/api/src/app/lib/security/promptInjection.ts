// apps/api/src/app/lib/security/promptInjection.ts
// Detección de prompt injection a nivel HTTP
// Escanea el body de requests entrantes que alimentan LLMs
// Se usa en route handlers (Node.js runtime)

import type { PromptInjectionPattern, SecurityCheckResult } from './types';
import { logger } from '../logger';

// ─── Patrones de prompt injection ───

const INJECTION_PATTERNS: readonly PromptInjectionPattern[] = [
  // ── Ignorar / sobrescribir instrucciones ──
  {
    name: 'ignore-instructions',
    pattern: /\b(ignore|forget|disregard|override|override)\s+(all\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|messages?|context|conversation)\b/i,
    severity: 'critical',
  },
  {
    name: 'new-instructions',
    pattern: /\b(your\s+new\s+(instructions?|task|role|job|function|purpose)|new\s+system\s+(prompt|message|instruction))\b/i,
    severity: 'critical',
  },
  {
    name: 'start-fresh',
    pattern: /\b(start\s+(fresh|over|anew|again)|reset\s+(yourself|conversation|context|memory)|wipe\s+your\s+memory)\b/i,
    severity: 'critical',
  },

  // ── System prompt extraction ──
  {
    name: 'system-prompt-extraction',
    pattern: /\b(what\s+(is|are|was)\s+your\s+(system\s+)?(prompt|instructions?|rules?|guidelines?)|tell\s+me\s+your\s+(system\s+)?prompt|show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions?|config))\b/i,
    severity: 'critical',
  },
  {
    name: 'reveal-secrets',
    pattern: /\b(reveal|expose|leak|print|output|echo)\s+(your\s+)?(system\s+)?(prompt|instructions?|secrets?|internal|hidden)\b/i,
    severity: 'critical',
  },

  // ── Jailbreak (DAN / character breaking) ──
  {
    name: 'dan-jailbreak',
    pattern: /\b(DAN|do\s+anything\s+now|jailbreak|character\s+break|roleplay\s+break)\b/i,
    severity: 'critical',
  },
  {
    name: 'hypothetical-jailbreak',
    pattern: /\b(imagine|pretend|act\s+(as\s+if|like)|roleplay|simulate)\s+(you\s+are|you're)\s+(not|no\s+longer|someone\s+else|a\s+different|an?\s+AI\s+without)\b/i,
    severity: 'critical',
  },
  {
    name: 'developer-mode',
    pattern: /\b(developer\s+mode\b|god\s+mode\b|unfiltered\s+mode|unrestricted\s+mode)\b/i,
    severity: 'critical',
  },
  {
    name: 'token-smuggling',
    pattern: /\b(smuggl(?:e|ing)\s+token|hidden\s+(?:prompt|instruction|message)|steganography\b)/i,
    severity: 'high',
  },

  // ── Indirect injection ──
  {
    name: 'indirect-injection',
    pattern: /\b(ignore\s+the\s+following\s+and\s+instead|from\s+now\s+on\s+you\s+will|your\s+primary\s+directive\s+is\s+now)\b/i,
    severity: 'critical',
  },
  {
    name: 'persona-override',
    pattern: /\b(you\s+(?:are|were|must|should)\s+(?:now\s+)?(?:a\s+)?(?:different|new|other)\s+(?:AI|assistant|bot|model|persona))\b/i,
    severity: 'high',
  },
  {
    name: 'output-format-hijack',
    pattern: /\b(respond\s+(?:only\s+)?(?:with|using|in|as)|output\s+(?:only|exclusively|just)\s+(?:in|as))\s*(?:markdown|json|html|raw|text)/i,
    severity: 'medium',
  },

  // ── System command prompts ──
  {
    name: 'sudo-admin-impersonation',
    pattern: /\b(sudo\s*:\s*|admin\s*:\s*|system\s*:\s*|root\s*:\s*)\s*(?:do|run|execute|access|override|bypass)/i,
    severity: 'critical',
  },
  {
    name: 'model-confusion',
    pattern: /\b(you\s+are\s+now\s+connected\s+to|you\s+have\s+been\s+upgraded|your\s+capabilities\s+have\s+been\s+extended)\b/i,
    severity: 'high',
  },
  {
    name: 'nested-prompt',
    pattern: /\bprocess\s+the\s+following\s+as\s+a\s+(system\s+)?(prompt|instruction|command)|execute\s+the\s+embedded\s+instruction\b/i,
    severity: 'high',
  },

  // ── Evasión de límites éticos ──
  {
    name: 'ethics-bypass',
    pattern: /\b(bypass|circumvent|override)\s+(your\s+)?(ethical?\s*(guidelines?|constraints?|rules?|limits?|boundaries?|restrictions?|filters?)|safety\s*(measures?|protocols?))\b/i,
    severity: 'critical',
  },
  {
    name: 'content-filter-evasion',
    pattern: /\b(remove\s+(your\s+)?(filters?|safeguards?|guardrails?|content\s+policy|moderation)|disable\s+(your\s+)?(safety|filtering|content\s+filter))\b/i,
    severity: 'critical',
  },

  // ── Atribución engañosa ──
  {
    name: 'fake-authority',
    pattern: /\b(this\s+is\s+(urgent|critical|emergency|life\s*or\s*death|official)|this\s+message\s+is\s+from\s+(the\s+)?(developer|admin|CEO|owner|creator))\b/i,
    severity: 'high',
  },
];

// ─── Funciones ───

/**
 * Extrae recursivamente todos los valores string de cualquier estructura
 * para escanear en busca de prompt injection.
 */
function extractAllStrings(input: unknown): string[] {
  const results: string[] = [];

  if (typeof input === 'string') {
    results.push(input);
  } else if (Array.isArray(input)) {
    for (const item of input) {
      results.push(...extractAllStrings(item));
    }
  } else if (input !== null && typeof input === 'object') {
    for (const value of Object.values(input as Record<string, unknown>)) {
      results.push(...extractAllStrings(value));
    }
  }

  return results;
}

/**
 * Escanea un solo valor string contra todos los patrones de injection.
 */
function scanSingleValue(value: string): PromptInjectionPattern | null {
  const normalized = value.trim();
  if (normalized.length === 0) return null;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.pattern.test(normalized)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Verifica si el body de un request contiene intentos de prompt injection.
 * Pensado para rutas que alimentan LLMs (recomendaciones, análisis, etc.).
 *
 * @param body - Cuerpo parseado del request
 * @returns SecurityCheckResult con passed=true si está limpio, o bloqueo
 */
export function scanForPromptInjection(body: unknown): SecurityCheckResult | null {
  if (body === null || body === undefined) return null;

  const strings = extractAllStrings(body);

  for (const value of strings) {
    const hit = scanSingleValue(value);
    if (hit) {
      logger.warn('PROMPT_INJECTION', `Prompt injection detectado: ${hit.name}`, {
        severity: hit.severity,
        valuePreview: value.substring(0, 150),
      });

      return {
        passed: false,
        reason: `PROMPT_INJECTION: ${hit.name}`,
        statusCode: 400,
        message: 'Entrada bloqueada: posible intento de manipulación del sistema detectado',
      };
    }
  }

  return null;
}

/**
 * Versión ligera para usar en middleware (no escanea body, solo campos conocidos).
 * Útil para headers o parámetros que llegan por URL.
 */
export function scanSingleFieldForInjection(
  fieldName: string,
  value: string,
): SecurityCheckResult | null {
  const hit = scanSingleValue(value);
  if (hit) {
    logger.warn('PROMPT_INJECTION', `Prompt injection en campo ${fieldName}: ${hit.name}`, {
      severity: hit.severity,
      valuePreview: value.substring(0, 150),
    });

    return {
      passed: false,
      reason: `PROMPT_INJECTION: ${hit.name} en ${fieldName}`,
      statusCode: 400,
      message: 'Entrada bloqueada: contenido sospechoso detectado',
    };
  }

  return null;
}

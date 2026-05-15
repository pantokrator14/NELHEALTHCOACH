// apps/api/src/app/lib/security/shield.ts
// Middleware de detección de ataques (Edge-compatible, sin Node.js APIs)
// Detecta: SQLi, NoSQLi, XSS, path traversal, shell injection

import type { ShieldPattern, SecurityCheckResult, RequestContext } from './types';

// ─── Patrones de ataque ───

const SHIELD_PATTERNS: readonly ShieldPattern[] = [
  // ── SQL Injection ──
  {
    name: 'SQLi: tautology',
    pattern: /['"]\s*OR\s+'?\d+'?\s*=\s*'?\d/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: union select',
    pattern: /\bUNION\s+(ALL\s+)?SELECT\b/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: drop/truncate/alter',
    pattern: /\b(DROP|TRUNCATE|ALTER)\s+(TABLE|DATABASE|INDEX)\b/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: insert/delete',
    pattern: /\b(INSERT\s+INTO|DELETE\s+FROM)\b/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: exec/xp_cmdshell',
    pattern: /\b(EXEC|x?p_cmdshell|sp_executesql)\b/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: load_file/info',
    pattern: /\b(LOAD_FILE|SLEEP|BENCHMARK|INFORMATION_SCHEMA)\b/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: comment injection',
    pattern: /(\bOR\b|\bAND\b)\s+\d+\s*[=<>].*--/i,
    category: 'sqli',
  },
  {
    name: 'SQLi: stacked queries',
    pattern: /[;\s](DROP|DELETE|INSERT|UPDATE|SELECT)\s/i,
    category: 'sqli',
  },

  // ── NoSQL Injection (MongoDB) ──
  {
    name: 'NoSQLi: operator injection',
    pattern: /\{\s*"\$(gt|ne|where|regex|nin|or|and|nor|exists|type|mod|text|search)"\s*:/i,
    category: 'nosqli',
  },
  {
    name: 'NoSQLi: boolean operator',
    pattern: /"\$(eq|ne|gt|gte|lt|lte)":/i,
    category: 'nosqli',
  },
  {
    name: 'NoSQLi: empty object',
    pattern: /"\$where":\s*"function/i,
    category: 'nosqli',
  },

  // ── XSS ──
  {
    name: 'XSS: script tag',
    pattern: /<\s*script\b[^>]*>/i,
    category: 'xss',
  },
  {
    name: 'XSS: inline handlers',
    pattern: /\bon(load|error|click|mouseover|focus|blur|resize|submit|change|keydown|keyup|scroll)\s*=/i,
    category: 'xss',
  },
  {
    name: 'XSS: javascript URI',
    pattern: /javascript\s*:/i,
    category: 'xss',
  },
  {
    name: 'XSS: eval/innerHTML',
    pattern: /\b(eval|setTimeout|setInterval)\s*\(\s*['"`][^)]*\b(document\.|window\.)/i,
    category: 'xss',
  },
  {
    name: 'XSS: iframe/data URI',
    pattern: /<\s*iframe\b[^>]*\bsrc\s*=\s*['"]\s*data:/i,
    category: 'xss',
  },
  {
    name: 'XSS: svg onload',
    pattern: /<\s*svg\b[^>]*\bonload\s*=/i,
    category: 'xss',
  },
  {
    name: 'XSS: alert/confirm',
    pattern: /\b(alert|confirm|prompt)\s*\(\s*['"]/i,
    category: 'xss',
  },
  {
    name: 'XSS: expression/css',
    pattern: /\bexpression\s*\(\s*['"`]?\s*document\./i,
    category: 'xss',
  },

  // ── Path Traversal ──
  {
    name: 'Path: traversal dots',
    pattern: /(?:\.\.\/|\.\.\\){2,}/,
    category: 'pathTraversal',
  },
  {
    name: 'Path: encoded traversal',
    pattern: /(?:%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c|\.\.%5c)/i,
    category: 'pathTraversal',
  },
  {
    name: 'Path: etc/passwd',
    pattern: /\/etc\/(passwd|shadow|hosts|group|sudoers)/i,
    category: 'pathTraversal',
  },
  {
    name: 'Path: windows system',
    pattern: /(?:C:\\(?:Windows|WINNT|system32)\\|\\\\(?:Windows|WINNT|system32)\\)/i,
    category: 'pathTraversal',
  },

  // ── Shell / Command Injection ──
  {
    name: 'Shell: backtick command',
    pattern: /`[^`]*(?:rm|wget|curl|nc|bash|sh|powershell)[^`]*`/i,
    category: 'shellInjection',
  },
  {
    name: 'Shell: subshell',
    pattern: /\$\(\s*(?:rm|wget|curl|nc|cat|id|whoami|uname)/i,
    category: 'shellInjection',
  },
  {
    name: 'Shell: pipe chain',
    pattern: /\|\s*(?:bash|sh|zsh|python|perl|ruby|nc|netcat)/i,
    category: 'shellInjection',
  },
  {
    name: 'Shell: chained execution',
    pattern: /&&\s*(?:rm|wget|curl|nc|cat|echo)/i,
    category: 'shellInjection',
  },
  {
    name: 'Shell: dev null redir',
    pattern: />\/dev\/null\s*2>&1|2>&1\s*>/i,
    category: 'shellInjection',
  },
];

// ─── Funciones de escaneo ───

/**
 * Escanea un string contra los patrones del shield.
 * Retorna el primer patrón que hace match, o null si pasa limpio.
 */
function scanValue(value: string): ShieldPattern | null {
  const normalized = value.trim();
  if (normalized.length === 0) return null;

  for (const p of SHIELD_PATTERNS) {
    if (p.pattern.test(normalized)) {
      return p;
    }
  }

  return null;
}

/**
 * Extrae recursivamente todos los valores string de un objeto/array
 * para escanearlos en busca de patrones maliciosos.
 */
function extractStrings(input: unknown): string[] {
  const results: string[] = [];

  if (typeof input === 'string') {
    results.push(input);
  } else if (Array.isArray(input)) {
    for (const item of input) {
      results.push(...extractStrings(item));
    }
  } else if (input !== null && typeof input === 'object') {
    for (const value of Object.values(input as Record<string, unknown>)) {
      results.push(...extractStrings(value));
    }
  }

  return results;
}

/**
 * Escanea el cuerpo de un request en busca de patrones de ataque.
 * Compatible con Edge Runtime (sin dependencias Node.js).
 */
export function scanRequestBody(body: unknown): SecurityCheckResult | null {
  if (body === null || body === undefined) return null;

  const strings = extractStrings(body);

  for (const value of strings) {
    const hit = scanValue(value);
    if (hit) {
      return {
        passed: false,
        reason: `SHIELD: ${hit.name}`,
        statusCode: 403,
        message: `Solicitud bloqueada: patrón de ataque detectado (${hit.category})`,
      };
    }
  }

  return null;
}

/**
 * Escanea los query params de una URL en busca de patrones de ataque.
 */
export function scanQueryParams(
  searchParams: URLSearchParams,
): SecurityCheckResult | null {
  let result: SecurityCheckResult | null = null;

  searchParams.forEach((value) => {
    if (result) return; // Ya encontramos un match, seguir buscando no es necesario

    const hit = scanValue(value);
    if (hit) {
      result = {
        passed: false,
        reason: `SHIELD: ${hit.name}`,
        statusCode: 403,
        message: `Query param bloqueado: patrón de ataque detectado (${hit.category})`,
      };
    }
  });

  return result;
}

/**
 * Escanea los headers críticos del request.
 */
export function scanHeaders(headers: Headers): SecurityCheckResult | null {
  // Solo escanear headers que pueden contener input del usuario
  const scannableHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'referer',
    'x-custom-header',
    'x-request-id',
    'x-correlation-id',
    'x-visitor-id',
  ];

  for (const header of scannableHeaders) {
    const value = headers.get(header);
    if (value) {
      const hit = scanValue(value);
      if (hit) {
        return {
          passed: false,
          reason: `SHIELD: ${hit.name}`,
          statusCode: 403,
          message: `Header malicioso detectado en '${header}' (${hit.category})`,
        };
      }
    }
  }

  return null;
}

/**
 * Escanea la URL completa del request.
 * Detecta path traversal y otros patrones en la ruta misma.
 */
export function scanUrl(url: string): SecurityCheckResult | null {
  const hit = scanValue(url);
  if (hit) {
    return {
      passed: false,
      reason: `SHIELD: ${hit.name}`,
      statusCode: 403,
      message: `URL maliciosa detectada: patrón de ataque (${hit.category})`,
    };
  }

  return null;
}

/**
 * Shield completo: escanea URL, headers y query params.
 * Compatible con Edge Runtime.
 * El body se escanea en el route handler (cuando está disponible).
 */
export function runShield(ctx: RequestContext, searchParams: URLSearchParams): SecurityCheckResult | null {
  // 1. Escanear URL
  const urlResult = scanUrl(ctx.path);
  if (urlResult) return urlResult;

  // 2. Escanear query params
  const queryResult = scanQueryParams(searchParams);
  if (queryResult) return queryResult;

  // No escanear body acá porque en middleware no tenemos acceso al body
  // El body se escanea en scanRequestBody() desde el route handler

  return null;
}

/**
 * Verifica si un objeto del body contiene solo tipos seguros de datos.
 * Útil como pre-check rápido antes de procesar.
 */
export function isSafeBodyType(body: unknown): boolean {
  if (body === null || body === undefined) return true;
  if (typeof body === 'string') return true;
  if (typeof body === 'number') return true;
  if (typeof body === 'boolean') return true;
  if (Array.isArray(body)) {
    return body.every(isSafeBodyType);
  }
  if (typeof body === 'object') {
    return Object.values(body as Record<string, unknown>).every(isSafeBodyType);
  }
  return false;
}

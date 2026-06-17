// apps/api/src/app/lib/logger.ts
// Logger estructurado con soporte de colores ANSI para consola.
//
// 📌 Los colores facilitan la lectura en terminal:
//   INFO  → azul      WARN  → amarillo
//   ERROR → rojo       DEBUG → gris
//   Contextos tienen colores por grupo (auth→magenta, db→verde, api→cian...)

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

type LogContext = 'DATABASE' | 'AUTH' | 'ENCRYPTION' | 'API' | 'CLIENTS' | 'HEALTH' | 'MIDDLEWARE' | 'UPLOAD' | 'AI_SERVICE' | 'AI' | 'API_AI' | 'FRONTEND' | 'EMAIL' | 'PDF' | 'REPAIR' | 'AI_REGEN' | 'RECIPES' | 'RECIPE_UPLOAD' | 'NUTRITION_SERVICE' | 'NUTRITION_ANALYSIS' | 'generateShoppingList' | 'getRecipeById' | 'parseShoppingListResponse' | 'generateShoppingListFromItems' | 'LEAD' | 'OTHER' | 'EXERCISES' | 'EXERCISE_UPLOAD' | 'GUARDRAILS' | 'RATE_LIMITER' | 'PROMPT_INJECTION' | 'INICIO' | 'ERROR' | 'FIN' | 'VIDEO' | 'TRANSCRIPTION' | 'REMINDER' | 'PAYMENTS' | 'STRIPE_CONNECT' | 'TRIAL' | 'TRIAL_REMINDER' | 'ACCOUNT' | 'PROPOSAL' | 'FINANCES' | 'NOTIFICATIONS' | 'AUDIT' | 'COACHES';

import { sanitizeMessage } from './sanitize';

// ─── Colores ANSI ────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Texto
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Fondo
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',

  // Bright
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

// Niveles con color + icono
const LEVEL_STYLES: Record<LogLevel, { color: string; icon: string; bg?: string }> = {
  INFO: { color: C.blue, icon: 'ℹ', bg: C.bgBlue },
  WARN: { color: C.yellow, icon: '⚠', bg: C.bgYellow },
  ERROR: { color: C.red, icon: '✖', bg: C.bgRed },
  DEBUG: { color: C.gray, icon: '●', bg: undefined },
};

// Colores por grupo de contexto (para identificar visualmente el área)
function contextColor(ctx: LogContext): string {
  const auth = ['AUTH', 'LOGIN', 'REGISTER', 'ACCOUNT'];
  const db = ['DATABASE', 'MODEL'];
  const api = ['API', 'MIDDLEWARE', 'FRONTEND'];
  const ai = ['AI', 'AI_SERVICE', 'API_AI', 'PROMPT_INJECTION'];
  const security = ['GUARDRAILS', 'RATE_LIMITER', 'SHIELD'];
  const media = ['VIDEO', 'UPLOAD', 'RECIPES', 'EXERCISES', 'RECIPE_UPLOAD', 'EXERCISE_UPLOAD'];
  const finance = ['PAYMENTS', 'STRIPE_CONNECT', 'FINANCES'];
  const email = ['EMAIL', 'NOTIFICATIONS'];

  if (auth.includes(ctx)) return C.magenta;
  if (db.includes(ctx)) return C.green;
  if (api.includes(ctx)) return C.cyan;
  if (ai.includes(ctx)) return C.brightMagenta;
  if (security.includes(ctx)) return C.yellow;
  if (media.includes(ctx)) return C.brightCyan;
  if (finance.includes(ctx)) return C.green;
  if (email.includes(ctx)) return C.brightBlue;
  if (ctx === 'AUDIT') return C.brightYellow;
  if (ctx === 'ERROR') return C.brightRed;
  return C.white;
}

// ─── Interfaces ──────────────────────────────────────────────────

interface LogMetadata {
  requestId?: string;
  userId?: string;
  clientId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;

  aiInfo?: { model?: string; tokenCount?: number; temperature?: number; sessionId?: string; monthNumber?: number };
  fileInfo?: { fileName?: string; fileSize?: number; fileType?: string; fileCategory?: 'profile' | 'document'; s3Key?: string };

  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: unknown;

  requestId?: string;
  userId?: string;
  clientId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;

  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    details?: unknown;
  };

  [key: string]: unknown;
}

// ─── Logger class ────────────────────────────────────────────────

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formatea un log ENTERO con colores ANSI.
   * Ejemplo de salida:
   *   ℹ 2026-06-13T12:00:00.000Z  [AUTH]   usuario logueado  [abc123]  (42ms)
   *   ⚠ 2026-06-13T12:00:01.000Z  [RATE_LIMITER]  rate limit excedido  [ip=1.2.3.4]
   */
  private formatLog(entry: LogEntry): string {
    const { timestamp, level, context, message, requestId, clientId, endpoint, method, duration } = entry;
    const levelStyle = LEVEL_STYLES[level];
    const ctxCol = contextColor(context);

    // Timestamp en gris
    let output = `${C.dim}${timestamp}${C.reset} `;

    // Level con color + icono
    const levelTag = `${levelStyle.color}${levelStyle.icon} ${level.padEnd(5)}${C.reset}`;
    output += levelTag;

    // Contexto con su color
    output += ` ${ctxCol}${C.bold}[${context}]${C.reset}`;

    // Request ID abreviado
    if (requestId) {
      output += ` ${C.dim}${requestId.substring(0, 8)}${C.reset}`;
    }

    // Client ID
    if (clientId) {
      output += ` ${C.gray}cli:${clientId.substring(0, 8)}${C.reset}`;
    }

    // Endpoint + method
    if (endpoint && method) {
      output += ` ${C.cyan}${method} ${endpoint}${C.reset}`;
    }

    // Mensaje principal (sanitizado)
    output += ` ${sanitizeMessage(message)}`;

    // Duración
    if (duration !== undefined) {
      const durColor = duration > 1000 ? C.red : duration > 500 ? C.yellow : C.green;
      output += ` ${durColor}(${duration}ms)${C.reset}`;
    }

    return output;
  }

  /**
   * Log a consola con colores + datos estructurados adjuntos.
   */
  private logToConsole(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry);
    const structuredData = this.extractStructuredData(entry);

    // En DEBUG solo mostrar si está habilitado
    if (entry.level === 'DEBUG') {
      if (process.env.NODE_ENV !== 'development' && process.env.ENABLE_DEBUG_LOGS !== 'true') {
        return;
      }
    }

    switch (entry.level) {
      case 'ERROR':
        console.error(formattedLog, structuredData ?? '');
        break;
      case 'WARN':
        console.warn(formattedLog, structuredData ?? '');
        break;
      case 'DEBUG':
        console.debug(formattedLog, structuredData ?? '');
        break;
      default:
        console.log(formattedLog, structuredData ?? '');
    }
  }

  private extractStructuredData(entry: LogEntry): Record<string, unknown> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { timestamp, level, context, message, requestId, userId, clientId, endpoint, method, duration, ...rest } = entry;

    const structured: Record<string, unknown> = {};

    if (rest.data) structured.data = rest.data;
    if (rest.error) structured.error = rest.error;
    if (rest.fileInfo) structured.fileInfo = rest.fileInfo;
    if (rest.aiInfo) structured.aiInfo = rest.aiInfo;

    const { data, error, fileInfo, aiInfo, ...dynamicProps } = rest;
    if (Object.keys(dynamicProps).length > 0) {
      // Solo incluir props que no sean undefined
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dynamicProps)) {
        if (v !== undefined) clean[k] = v;
      }
      if (Object.keys(clean).length > 0) {
        structured.extra = clean;
      }
    }

    return Object.keys(structured).length > 0 ? structured : undefined;
  }

  // ─── Métodos públicos ────────────────────────────────────────

  info(
    context: LogContext,
    message: string,
    data?: unknown,
    metadata?: LogMetadata,
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context,
      message,
      data,
      ...metadata,
    });
  }

  warn(
    context: LogContext,
    message: string,
    data?: unknown,
    metadata?: LogMetadata,
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'WARN',
      context,
      message,
      data,
      ...metadata,
    });
  }

  error(
    context: LogContext,
    message: string,
    error?: Error | unknown,
    data?: unknown,
    metadata?: LogMetadata,
  ) {
    const errorObj = error
      ? {
          name: (error instanceof Error ? error.name : (error as Record<string, unknown>).name as string) || 'UnknownError',
          message: (error instanceof Error ? error.message : String(error)),
          stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
          code: (error as Record<string, unknown>).code as string ?? (error as Record<string, unknown>).statusCode as string,
          details: (error as Record<string, unknown>).details || ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)?.data,
        }
      : undefined;

    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'ERROR',
      context,
      message,
      data,
      error: errorObj,
      ...metadata,
    });
  }

  debug(
    context: LogContext,
    message: string,
    data?: unknown,
    metadata?: LogMetadata,
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'DEBUG',
      context,
      message,
      data,
      ...metadata,
    });
  }

  // Log específico para IA
  ai(
    context: LogContext,
    message: string,
    aiInfo: { model?: string; tokenCount?: number; temperature?: number; sessionId?: string; monthNumber?: number },
    metadata?: LogMetadata,
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context,
      message,
      aiInfo,
      ...metadata,
    });
  }

  // Mide duración con requestId automático
  async time<T>(
    context: LogContext,
    operation: string,
    fn: () => Promise<T>,
    metadata?: LogMetadata,
  ): Promise<T> {
    const requestId = metadata?.requestId || this.generateRequestId();
    const start = Date.now();

    this.info(context, `${C.cyan}▶ Iniciando:${C.reset} ${operation}`, undefined, {
      ...metadata,
      requestId,
    });

    try {
      const result = await fn();
      const duration = Date.now() - start;

      this.info(context, `${C.green}✓ Completado:${C.reset} ${operation}`, undefined, {
        ...metadata,
        requestId,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.error(context, `${C.red}✗ Falló:${C.reset} ${operation}`, error, undefined, {
        ...metadata,
        requestId,
        duration,
      });

      throw error;
    }
  }

  // Logger con contexto predefinido
  withContext(metadata: LogMetadata) {
    return {
      info: (context: LogContext, message: string, data?: unknown) =>
        this.info(context, message, data, metadata),
      warn: (context: LogContext, message: string, data?: unknown) =>
        this.warn(context, message, data, metadata),
      error: (context: LogContext, message: string, error?: Error, data?: unknown) =>
        this.error(context, message, error, data, metadata),
      debug: (context: LogContext, message: string, data?: unknown) =>
        this.debug(context, message, data, metadata),
      ai: (context: LogContext, message: string, aiInfo: { model?: string; tokenCount?: number; temperature?: number; sessionId?: string; monthNumber?: number }) =>
        this.ai(context, message, aiInfo, metadata),
      time: <T>(context: LogContext, operation: string, fn: () => Promise<T>) =>
        this.time(context, operation, fn, metadata),
    };
  }
}

export const logger = new Logger();

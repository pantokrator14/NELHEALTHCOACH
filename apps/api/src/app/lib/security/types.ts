// apps/api/src/app/lib/security/types.ts
// Tipos compartidos para el módulo de seguridad — SIN 'any'

export interface SecurityCheckResult {
  readonly passed: boolean;
  readonly reason?: string;
  readonly statusCode?: number;
  readonly message?: string;
  readonly retryAfter?: number;
}

export interface RateLimitConfig {
  readonly windowSeconds: number;
  readonly maxRequests: number;
}

export interface ShieldPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly category: 'sqli' | 'nosqli' | 'xss' | 'pathTraversal' | 'shellInjection';
}

export interface BotSignature {
  readonly name: string;
  readonly pattern: RegExp;
}

export interface BotCheckResult {
  readonly isBot: boolean;
  readonly matchedSignature?: string;
  readonly confidence: 'low' | 'medium' | 'high';
}

export interface PromptInjectionPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly severity: 'critical' | 'high' | 'medium';
}

export interface RequestContext {
  readonly ip: string;
  readonly userAgent: string;
  readonly method: string;
  readonly path: string;
  readonly visitorId?: string;
}

export interface RateLimitEntry {
  readonly _id?: string;
  readonly key: string;
  readonly count: number;
  readonly expiresAt: Date;
}

export interface SecurityHeaders {
  readonly name: string;
  readonly value: string;
}

// ─── Zod-related types (para schemas de validación) ───

/** Errores de validación tipificados */
export interface ValidationErrorDetail {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface ValidationResult<T> {
  readonly success: true;
  readonly data: T;
}

export interface ValidationError {
  readonly success: false;
  readonly errors: readonly ValidationErrorDetail[];
}

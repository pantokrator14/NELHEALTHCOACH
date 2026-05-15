// apps/api/src/app/lib/security/index.ts
// Barrel export del módulo de seguridad

// Tipos
export type {
  SecurityCheckResult,
  RateLimitConfig,
  ShieldPattern,
  BotSignature,
  BotCheckResult,
  PromptInjectionPattern,
  RequestContext,
  RateLimitEntry,
  SecurityHeaders,
  ValidationErrorDetail,
  ValidationResult,
  ValidationError,
} from './types';

// Shield — detección de ataques (Edge-compatible)
export {
  scanRequestBody,
  scanQueryParams,
  scanHeaders,
  scanUrl,
  runShield,
  isSafeBodyType,
} from './shield';

// Bot detection — UA + headers (Edge-compatible)
export {
  detectBotByUserAgent,
  detectSuspiciousHeaders,
  checkBrowserConsistency,
  categorizeAgent,
  isAllowedBot,
  runBotDetection,
} from './botDetector';

// Rate limiter — MongoDB-based (Node.js runtime only)
export {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStats,
} from './rateLimiter';

// Prompt injection — HTTP-level (Node.js runtime)
export {
  scanForPromptInjection,
  scanSingleFieldForInjection,
} from './promptInjection';

// Route guard — helper combinado para route handlers
export {
  requireRateLimit,
  requireShieldBody,
  requirePromptInjectionCheck,
  secureRoute,
} from './routeGuard';

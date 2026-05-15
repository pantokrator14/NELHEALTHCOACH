// apps/api/src/app/lib/security/botDetector.ts
// Detector de bots y tráfico automatizado (Edge-compatible)
// Analiza: User-Agent, headers, fingerprint opcional

import type { BotSignature, BotCheckResult, SecurityCheckResult, RequestContext } from './types';

// ─── Firmas de bots conocidos ───

const BOT_SIGNATURES: readonly BotSignature[] = [
  // Bots y crawlers comunes
  { name: 'Googlebot', pattern: /Googlebot/i },
  { name: 'Bingbot', pattern: /bingbot/i },
  { name: 'Slurp', pattern: /Slurp/i },
  { name: 'DuckDuckBot', pattern: /DuckDuckBot/i },
  { name: 'Baiduspider', pattern: /Baiduspider/i },
  { name: 'YandexBot', pattern: /Yandex(Bot|Webmaster|Images|Video|News|Metrika|Market)/i },
  { name: 'Sogou', pattern: /Sogou\s*(web|spider|web\sspider)/i },
  { name: 'Exabot', pattern: /Exabot/i },
  { name: 'Facebot', pattern: /facebookexternalhit|Facebot/i },
  { name: 'Twitterbot', pattern: /Twitterbot/i },
  { name: 'LinkedInBot', pattern: /LinkedInBot/i },
  { name: 'WhatsApp', pattern: /WhatsApp/i },
  { name: 'TelegramBot', pattern: /TelegramBot/i },
  { name: 'Discordbot', pattern: /Discordbot/i },
  { name: 'Slackbot', pattern: /Slackbot(-LinkExpanding)?/i },
  { name: 'Pinterest', pattern: /Pinterest/i },
  { name: 'AhrefsBot', pattern: /AhrefsBot/i },
  { name: 'SemrushBot', pattern: /SemrushBot/i },
  { name: 'DotBot', pattern: /DotBot/i },
  { name: 'MJ12bot', pattern: /MJ12bot/i },
  { name: 'BLEXBot', pattern: /BLEXBot/i },
  { name: 'Bytespider', pattern: /Bytespider/i },
  { name: 'PetalBot', pattern: /PetalBot/i },
  { name: 'DataForSeoBot', pattern: /DataForSeoBot/i },
  { name: 'rogerbot', pattern: /rogerbot/i },

  // Headless browsers
  { name: 'HeadlessChrome', pattern: /HeadlessChrome/i },
  { name: 'PhantomJS', pattern: /PhantomJS/i },
  { name: 'Playwright', pattern: /Playwright/i },
  { name: 'Puppeteer', pattern: /Puppeteer/i },
  { name: 'Cypress', pattern: /Cypress/i }, // Testing tool

  // Scraping tools
  { name: 'Scrapy', pattern: /Scrapy/i },
  { name: 'wget', pattern: /^wget\//i },
  { name: 'curl', pattern: /^curl\//i },
  { name: 'Python-urllib', pattern: /Python-urllib/i },
  { name: 'Go-http-client', pattern: /Go-http-client/i },
  { name: 'node-fetch', pattern: /node-fetch/i },
  { name: 'axios', pattern: /^axios\//i },
  { name: 'Apache-HttpClient', pattern: /Apache-HttpClient/i },
  { name: 'Java/', pattern: /^Java\/[\d.]+$/i },
  { name: 'okhttp', pattern: /okhttp/i },

  // Security scanners
  { name: 'nmap', pattern: /nmap/i },
  { name: 'Nikto', pattern: /Nikto/i },
  { name: 'sqlmap', pattern: /sqlmap/i },
  { name: 'Burp Suite', pattern: /Burp\s*Suite/i },
  { name: 'ZAP', pattern: /OWASP\s*ZAP|Zed\s*Attack\s*Proxy/i },
  { name: 'Nessus', pattern: /Nessus/i },
  { name: 'OpenVAS', pattern: /OpenVAS/i },
  { name: 'Acunetix', pattern: /Acunetix/i },
  { name: 'Wfuzz', pattern: /Wfuzz/i },
  { name: 'DirBuster', pattern: /DirBuster/i },
  { name: 'Gobuster', pattern: /gobuster/i },

  // Spam/scam bots
  { name: 'spambot', pattern: /\b(spam|scam|hack)bot\b/i },
  { name: 'BruteForcer', pattern: /(brute|hydra|medusa|patator)/i },
];

// ─── Patrones de headers sospechosos ───

interface SuspiciousHeaderCheck {
  readonly header: string;
  readonly check: (value: string | null) => boolean;
  readonly reason: string;
}

const SUSPICIOUS_HEADER_CHECKS: readonly SuspiciousHeaderCheck[] = [
  {
    header: 'user-agent',
    check: (v) => v === null || v.trim() === '',
    reason: 'User-Agent vacío',
  },
  {
    header: 'user-agent',
    check: (v) => v !== null && v.length < 10,
    reason: 'User-Agent anormalmente corto',
  },
  {
    header: 'accept',
    check: (v) => v !== null && v === '*/*',
    reason: 'Accept header genérico',
  },
  {
    header: 'accept-language',
    check: (v) => v === null || v.trim() === '',
    reason: 'Accept-Language ausente',
  },
  {
    header: 'accept-encoding',
    check: (v) => v !== null && !/gzip|deflate|br/i.test(v),
    reason: 'Accept-Encoding sin compresión estándar',
  },
  {
    header: 'connection',
    check: (v) => v !== null && /close/i.test(v) && !/keep-alive/i.test(v),
    reason: 'Connection: close sin keep-alive (propio de scripts)',
  },
];

// ─── Funciones ───

/**
 * Analiza el User-Agent contra la lista de firmas de bots.
 */
export function detectBotByUserAgent(userAgent: string): BotCheckResult | null {
  if (!userAgent || userAgent.trim() === '') {
    return {
      isBot: true,
      matchedSignature: 'User-Agent vacío',
      confidence: 'high',
    };
  }

  for (const signature of BOT_SIGNATURES) {
    if (signature.pattern.test(userAgent)) {
      // Permitir Googlebot, Bingbot, etc. si se configura explícitamente
      // Por ahora bloqueamos todo lo que no sea navegador
      return {
        isBot: true,
        matchedSignature: signature.name,
        confidence: 'high',
      };
    }
  }

  return null;
}

/**
 * Verifica headers sospechosos que indican tráfico automatizado.
 */
export function detectSuspiciousHeaders(headers: Headers): BotCheckResult | null {
  for (const check of SUSPICIOUS_HEADER_CHECKS) {
    const value = headers.get(check.header);
    if (check.check(value)) {
      return {
        isBot: true,
        matchedSignature: check.reason,
        confidence: 'medium',
      };
    }
  }

  return null;
}

/**
 * Verifica si el Sec-CH-UA header es consistente con un navegador real.
 */
export function checkBrowserConsistency(headers: Headers): boolean {
  const secChUa = headers.get('sec-ch-ua');
  const secChUaPlatform = headers.get('sec-ch-ua-platform');
  const secChUaMobile = headers.get('sec-ch-ua-mobile');
  const userAgent = headers.get('user-agent');

  // Los navegadores modernos envían sec-ch-ua
  if (userAgent && userAgent.includes('Mozilla') && userAgent.length > 50) {
    // Si tiene Sec-CH-UA, bien. Si no, podría ser bot.
    if (!secChUa && !secChUaPlatform) {
      // Navegadores muy viejos o bots — verificamos con User-Agent
      const oldBrowserPatterns = [/MSIE\s\d/, /Trident\/\d/, /Edge\/\d/];
      const isOldBrowser = oldBrowserPatterns.some((p) => p.test(userAgent));
      return isOldBrowser; // Se permite si parece ser un navegador viejo legítimo
    }
  }

  return true; // OK: tiene sec-ch-ua o no es un navegador típico (curl, etc.)
}

/**
 * Categoriza un User-Agent como: 'browser', 'bot', 'tool', 'unknown'
 */
export function categorizeAgent(userAgent: string): 'browser' | 'bot' | 'tool' | 'unknown' {
  if (!userAgent || userAgent.trim() === '') return 'unknown';

  if (/Mozilla\/\d|Chrome\/\d|Safari\/\d|Firefox\/\d|Edge\/\d|Opera\/\d|OPR\/\d/.test(userAgent)) {
    return 'browser';
  }

  if (BOT_SIGNATURES.some((s) => s.pattern.test(userAgent))) {
    return 'bot';
  }

  if (/curl|wget|PostmanRuntime|insomnia|k6|ab\b|wrk|vegeta/i.test(userAgent)) {
    return 'tool';
  }

  return 'unknown';
}

/**
 * Verifica si un User-Agent debería ser admitido (allowlist).
 */
export function isAllowedBot(userAgent: string, allowedBotNames: readonly string[]): boolean {
  for (const name of allowedBotNames) {
    const signature = BOT_SIGNATURES.find((s) => s.name === name);
    if (signature && signature.pattern.test(userAgent)) {
      return true;
    }
  }
  return false;
}

/**
 * Ejecuta todas las verificaciones de bot detection.
 * @returns SecurityCheckResult si se detecta bot, null si pasa
 */
export function runBotDetection(
  ctx: RequestContext,
  headers: Headers,
): SecurityCheckResult | null {
  // 1. Verificar User-Agent
  const uaResult = detectBotByUserAgent(ctx.userAgent);
  if (uaResult) {
    return {
      passed: false,
      reason: `BOT: ${uaResult.matchedSignature}`,
      statusCode: 403,
      message: 'Acceso bloqueado: tráfico automatizado detectado',
    };
  }

  // 2. Verificar headers sospechosos
  const headerResult = detectSuspiciousHeaders(headers);
  if (headerResult) {
    return {
      passed: false,
      reason: `BOT: ${headerResult.matchedSignature}`,
      statusCode: 403,
      message: 'Acceso bloqueado: patrón de tráfico sospechoso detectado',
    };
  }

  // 3. Verificar consistencia de browser (si parece browser)
  const category = categorizeAgent(ctx.userAgent);
  if (category === 'browser' && !checkBrowserConsistency(headers)) {
    return {
      passed: false,
      reason: 'BOT: browser inconsistente (sin Sec-CH-UA)',
      statusCode: 403,
      message: 'Acceso bloqueado: inconsistencia de navegador detectada',
    };
  }

  return null;
}

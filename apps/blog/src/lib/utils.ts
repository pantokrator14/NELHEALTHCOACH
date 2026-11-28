// apps/blog/src/lib/utils.ts
// Utilidades puras y testables del blog (sin dependencias de navegador).

import { SUPPORTED_LANGS, type SupportedLang } from './translations';

export const BLOG_LANG_COOKIE = 'nhc_blog_lang';

export const LANG_OPTIONS: ReadonlyArray<{
  code: SupportedLang;
  short: string;
  label: string;
}> = [
  { code: 'es', short: 'ES', label: 'Español' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'fr', short: 'FR', label: 'Français' },
  { code: 'it', short: 'IT', label: 'Italiano' },
  { code: 'pt', short: 'PT', label: 'Português' },
  { code: 'de', short: 'DE', label: 'Deutsch' },
];

/** Normaliza un idioma (acepta 'en-US', 'es', etc.) → SupportedLang o 'es'. */
export function normalizeLang(lang: unknown): SupportedLang {
  if (typeof lang === 'string') {
    const base = lang.split('-')[0].toLowerCase();
    if ((SUPPORTED_LANGS as readonly string[]).includes(base)) {
      return base as SupportedLang;
    }
  }
  return 'es';
}

/**
 * Extrae el idioma del header Accept-Language (para SSR):
 * toma el primer idioma listado, lo normaliza y cae a 'es' si no es soportado.
 */
export function langFromAcceptLanguage(header?: string | null): SupportedLang {
  if (!header) return 'es';
  const first = header.split(',')[0]?.trim();
  return normalizeLang(first);
}

/**
 * Idioma desde el query param ?lang=XX. A diferencia de normalizeLang,
 * devuelve null si no es un idioma soportado (para no canonicalizar basura)
 * y null si no viene el parámetro (se usará cookie o Accept-Language).
 */
export function langFromQuery(value: unknown): SupportedLang | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const base = value.trim().split('-')[0].toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? (base as SupportedLang) : null;
}

/**
 * Extrae la preferencia explícita de idioma desde las cookies HTTP (SSR).
 * Prioriza `nhc_blog_lang` (guardada por el selector) y luego `i18next`.
 */
export function langFromCookie(cookieHeader?: string | null): SupportedLang | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const pairs = cookieHeader.split(';');
  const map = new Map<string, string>();
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    try {
      map.set(key, decodeURIComponent(val));
    } catch {
      map.set(key, val);
    }
  }
  return langFromQuery(map.get(BLOG_LANG_COOKIE)) ?? langFromQuery(map.get('i18next'));
}

/** Formatea una fecha ISO con Intl según el idioma (sin dependencias). */
export function formatDate(date: string | Date | null | undefined, lang: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

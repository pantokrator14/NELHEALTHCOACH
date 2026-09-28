// apps/blog/src/lib/utils.ts
// Utilidades puras y testables del blog (sin dependencias de navegador).

import { SUPPORTED_LANGS, type SupportedLang } from './translations';

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
 * y null si no viene el parámetro (se usará Accept-Language).
 */
export function langFromQuery(value: unknown): SupportedLang | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const base = value.trim().split('-')[0].toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? (base as SupportedLang) : null;
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

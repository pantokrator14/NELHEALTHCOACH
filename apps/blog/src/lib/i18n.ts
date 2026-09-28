// apps/blog/src/lib/i18n.ts
// i18n del blog — mismo patrón que landing/form/dashboard:
// LanguageDetector con orden navigator → localStorage → cookie,
// fallback 'es' y 6 idiomas soportados (en/es/fr/it/pt/de).
// Las traducciones viven en ./translations para poder testearlas sin
// ejecutar el detector del navegador en Node.
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { en, es, fr, it, pt, de, SUPPORTED_LANGS } from './translations';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'es',
    fallbackLng: 'es',
    supportedLngs: [...SUPPORTED_LANGS],
    detection: {
      order: ['navigator', 'localStorage', 'cookie'],
      caches: ['localStorage', 'cookie'],
      cookieMinutes: 10080,
    },
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
      pt: { translation: pt },
      de: { translation: de },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;

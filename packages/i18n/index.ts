'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

// Configure i18next
i18n
  // Language detector - automatically detect from browser/navigator
  .use(LanguageDetector)
  // React i18next initializer
  .use(initReactI18next)
  .init({
    // Default language
    fallbackLng: 'en',
    // Supported languages
    supportedLngs: ['en', 'es'],
    
    // Detection options
    detection: {
      order: ['navigator', 'htmlTag', 'localStorage', 'cookie'],
      caches: ['localStorage', 'cookie'],
      cookieMinutes: 10080, // 1 week
    },
    
    // Translation resources
    resources: {
      en: { translation: en },
      es: { translation: es }
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false // React already escapes by default
    },
    
    // React i18next options
    react: {
      useSuspense: false
    }
  });

export default i18n;

// Helper function to get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Helper function to change language
export const changeLanguage = async (lang: string): Promise<void> => {
  await i18n.changeLanguage(lang);
};

// Helper to check if current language is Spanish
export const isSpanish = (): boolean => {
  return getCurrentLanguage() === 'es';
};

// Helper to check if current language is English
export const isEnglish = (): boolean => {
  return getCurrentLanguage() === 'en';
};
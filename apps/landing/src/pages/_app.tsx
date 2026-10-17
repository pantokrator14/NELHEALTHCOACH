import '@/styles/globals.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
// i18n — se inicializa en SSR con español (porque LanguageDetector no funciona en servidor)
// Luego en useEffect se detecta el idioma respetando query param, preferencia guardada o navegador
import i18n from '@/lib/i18n';
import { initFingerprint } from '@/lib/fingerprint';
import CookieBanner from '@/components/common/CookieBanner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'it', 'pt', 'de'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // 1. Prioridad: parámetro de consulta en URL (?lang=es, ?lang=en, etc.)
    const queryLang = typeof router.query.lang === 'string' ? router.query.lang : null;
    if (queryLang && SUPPORTED_LANGS.includes(queryLang)) {
      if (queryLang !== i18n.language) void i18n.changeLanguage(queryLang);
      return;
    }

    // 2. Preferencia explícita guardada por el usuario en localStorage
    const savedLang = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
    if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
      if (savedLang !== i18n.language) void i18n.changeLanguage(savedLang);
      return;
    }

    // 3. Detección automática por idioma del navegador
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language?.split('-')[0];
      if (browserLang && SUPPORTED_LANGS.includes(browserLang) && browserLang !== i18n.language) {
        void i18n.changeLanguage(browserLang);
      }
    }
  }, [router.query.lang]);

  useEffect(() => {
    const runFingerprint = () => {
      initFingerprint().catch((err) => {
        console.warn('FingerprintJS init failed (non-blocking):', err);
      });
    };

    runFingerprint();
    window.addEventListener('nhc_consent_updated', runFingerprint);
    return () => window.removeEventListener('nhc_consent_updated', runFingerprint);
  }, []);

  return (
    <div className={`${inter.variable} ${inter.className} font-sans`}>
      <Head>
        <title>NelHealthCoach | Transforma tu vida</title>
        <meta name="application-name" content="NelHealthCoach" />
        <meta name="description" content="Programa de coaching de salud integral, hábitos ancestrales y longevidad" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
      {/* Banner de cookies al inicio del DOM para acceso inmediato con teclado */}
      <CookieBanner />
      <Component {...pageProps} />
    </div>
  );
}

import '@/styles/globals.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
// i18n — se inicializa en SSR con español (porque LanguageDetector no funciona en servidor)
// Luego en useEffect se fuerza la detección del idioma real del navegador
import i18n from '@/lib/i18n';
import { initFingerprint } from '@/lib/fingerprint';
import ErrorBoundary from '@/components/ErrorBoundary';

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'it', 'pt', 'de'];

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // ─── Forzar detección del idioma del navegador ───
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language?.split('-')[0];
      if (browserLang && SUPPORTED_LANGS.includes(browserLang) && browserLang !== i18n.language) {
        i18n.changeLanguage(browserLang);
      }
    }

    initFingerprint().catch((err) => {
      console.warn('FingerprintJS init failed (non-blocking):', err);
    });
  }, []);

  return (
    <>
      <Head>
        <title>NELHEALTHCOACH | Contrato de Servicios y Cuestionario inicial</title>
        <meta name="description" content="Contrato formal de servicios de Coaching y cuestionario encriptado para uso de los mismos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}
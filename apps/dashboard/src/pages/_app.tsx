import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from 'react';
// i18n — se inicializa en SSR con español (porque LanguageDetector no funciona en servidor)
// Luego en useEffect se fuerza la detección del idioma real del navegador
import i18n from '@/lib/i18n';
import { initFingerprint } from '@/lib/fingerprint';

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

    // Inicializar FingerprintJS al montar la app
    initFingerprint().catch((err) => {
      console.warn('FingerprintJS init failed (non-blocking):', err);
    });
  }, []);

  return (
    <>
      <Head>
        <title>NELHEALTHCOACH | Dashboard</title>
        <meta name="description" content="Administración de servicios de coaching y bienestar." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
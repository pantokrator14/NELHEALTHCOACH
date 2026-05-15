import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from 'react';
// i18n configuration - automatically detects browser language
import '@/lib/i18n';
import { initFingerprint } from '@/lib/fingerprint';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
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
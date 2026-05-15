import '@/styles/globals.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
// i18n configuration - automatically detects browser language
import '@/lib/i18n';
import { initFingerprint } from '@/lib/fingerprint';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initFingerprint().catch((err) => {
      console.warn('FingerprintJS init failed (non-blocking):', err);
    });
  }, []);

  return (
    <>
      <Head>
        <title>NELHEALTHCOACH | Transforma tu vida</title>
        <meta name="description" content="Programa de coaching de salud integral con enfoque keto" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
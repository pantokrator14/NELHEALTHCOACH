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
        <title>NELHEALTHCOACH | Contrato de Servicios y Cuestionario inicial</title>
        <meta name="description" content="Contrato formal de servicios de Coaching y cuestionario encriptado para uso de los mismos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
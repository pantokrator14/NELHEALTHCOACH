import '@/styles/globals.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
// i18n — se inicializa con español; en SSR y primera hidratación se sincroniza
// con pageProps.lang para que HTML servidor y cliente coincidan sin mismatch.
import i18n from '@/lib/i18n';
import { langFromQuery } from '@/lib/utils';
import { initFingerprint } from '@/lib/fingerprint';
import CookieBanner from '@/components/CookieBanner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'it', 'pt', 'de'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pageLang = langFromQuery((pageProps as { lang?: unknown })?.lang);

  // Sincronía SSR + primera hidratación antes de montar hijos: evita flash/mismatch.
  useState(() => {
    if (pageLang && i18n.language !== pageLang) {
      void i18n.changeLanguage(pageLang);
    }
    return pageLang;
  });

  // Fingerprint reactivo al consentimiento
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

  // Sincronización de idioma:
  // - Si la página trae pageLang (SSR), manda sobre navigator.language para que
  //   UI + artículo traducido coincidan siempre (incluido al volver a 'es').
  // - En páginas client-only (/admin/*), prioriza ?lang → localStorage → navegador.
  useEffect(() => {
    const queryLang = langFromQuery(router.query.lang);
    const resolved = pageLang ?? queryLang;

    if (resolved) {
      if (resolved !== i18n.language) void i18n.changeLanguage(resolved);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = resolved;
      }
      return;
    }

    const saved =
      typeof window !== 'undefined' ? langFromQuery(localStorage.getItem('i18nextLng')) : null;
    if (saved) {
      if (saved !== i18n.language) void i18n.changeLanguage(saved);
      if (typeof document !== 'undefined') document.documentElement.lang = saved;
      return;
    }

    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
      if (browserLang && SUPPORTED_LANGS.includes(browserLang)) {
        if (browserLang !== i18n.language) void i18n.changeLanguage(browserLang);
        if (typeof document !== 'undefined') document.documentElement.lang = browserLang;
      }
    }
  }, [pageLang, router.query.lang]);

  return (
    <div className={`${inter.variable} ${inter.className} font-sans`}>
      <Head>
        <title>Blog | NelHealthCoach</title>
        <meta name="application-name" content="NelHealthCoach" />
        <meta name="description" content="Blog de salud ancestral y longevidad de NelHealthCoach" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <CookieBanner />
    </div>
  );
}

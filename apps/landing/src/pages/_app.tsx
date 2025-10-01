import '@/styles/globals.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
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
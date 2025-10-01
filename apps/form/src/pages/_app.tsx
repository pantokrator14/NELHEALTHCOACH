import '@/styles/globals.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
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
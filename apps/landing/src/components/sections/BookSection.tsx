'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * ⚡ INTERRUPTOR MAESTRO (variable de entorno):
 *   NEXT_PUBLIC_BOOK_PUBLISHED=true  → presentación oficial del libro (Amazon + bono).
 *   (por defecto)                    → sección secreta con captura de lista VIP.
 * Al lanzar el libro basta con definir la variable en Vercel y redeployar.
 */
const IS_PUBLISHED = process.env.NEXT_PUBLIC_BOOK_PUBLISHED === 'true';
// Enlaces del libro (se configuran en Vercel al lanzar, sin tocar código)
const BOOK_AMAZON_URL = process.env.NEXT_PUBLIC_BOOK_AMAZON_URL || '#';
const BOOK_SAMPLE_URL = process.env.NEXT_PUBLIC_BOOK_SAMPLE_URL || '#';

export const BookSection: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot anti-spam
  const [isSent, setIsSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'book', website }),
      });
      if (!res.ok) throw new Error('request failed');
      setIsSent(true);
      setEmail('');
    } catch {
      setError(t('landing.bookSecret.error'));
    } finally {
      setSending(false);
    }
  };

  if (!IS_PUBLISHED) {
    return (
      <section
        id="libro"
        className="relative min-h-[75vh] py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center text-center"
      >
        {/* Auras y luces difusas de fondo */}
        <div
          aria-hidden="true"
          className="absolute top-1/4 -left-20 w-[28rem] h-[28rem] bg-white/10 rounded-full blur-[120px] pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-10 right-0 w-[30rem] h-[30rem] bg-sky-400/15 rounded-full blur-[140px] pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/15 rounded-full blur-[100px] pointer-events-none"
        />

        <div className="container mx-auto max-w-4xl relative z-10">
          {/* Badge confidencial */}
          <div className="inline-flex items-center gap-2.5 bg-blue-950/50 border border-sky-300/40 rounded-full px-4 py-1.5 mb-8 shadow-lg shadow-blue-950/40 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-300" />
            </span>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-sky-100">
              {t('landing.bookSecret.badge')}
            </span>
          </div>

          {/* Símbolo abstracto bio-circadiano */}
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-full bg-blue-950/60 border border-blue-300/40 flex items-center justify-center shadow-2xl relative">
            <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(147,197,253,0.6)]">🧬</span>
          </div>

          {/* Titular intrigante */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6">
            {t('landing.bookSecret.titleLead')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-sky-300 to-blue-200">
              {t('landing.bookSecret.titleHighlight')}
            </span>
          </h2>

          <p className="text-base sm:text-lg text-blue-100 leading-relaxed font-light max-w-2xl mx-auto mb-10">
            {t('landing.bookSecret.text')}
          </p>

          {/* Caja de Registro Prioritario */}
          <div className="max-w-xl mx-auto bg-white/95 border border-blue-200 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sky-500 text-sm">✦</span>
              <h3 className="text-sm sm:text-base font-bold text-blue-900 tracking-wide uppercase">
                {t('landing.bookSecret.listTitle')}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-blue-700/80 mb-5 leading-relaxed">
              {t('landing.bookSecret.listText1')}
              <strong className="text-blue-900">{t('landing.bookSecret.listTextStrong')}</strong>
              {t('landing.bookSecret.listText2')}
            </p>

            {!isSent ? (
              <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col sm:flex-row gap-3">
                {/* Honeypot: campo oculto para humanos */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="book-website">Website</label>
                  <input
                    id="book-website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('landing.bookSecret.emailPlaceholder')}
                  required
                  className="flex-grow px-4 py-3 bg-white border border-blue-200 focus:border-blue-500 rounded-xl text-sm text-blue-900 placeholder-blue-300 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex-shrink-0 disabled:opacity-60"
                >
                  {sending ? t('common.loading') : `${t('landing.bookSecret.submit')} →`}
                </button>
              </form>
            ) : (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-emerald-700 text-sm">
                {t('landing.bookSecret.success')}
              </div>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── Libro publicado (NEXT_PUBLIC_BOOK_PUBLISHED=true) ──
    return (
      <section id="libro" className="bg-white py-16 md:py-24 px-4 relative overflow-hidden">
        {/* Decoración sutil de fondo */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-72 h-72 bg-blue-100 rounded-full opacity-50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 w-80 h-80 bg-sky-100 rounded-full opacity-50 blur-3xl"
        />

        <div className="container mx-auto max-w-6xl relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Columna de texto */}
            <div className="w-full lg:w-[55%] text-center lg:text-left order-2 lg:order-1">
              <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest border border-blue-100 rounded-full px-4 py-1.5 mb-5">
                {t('landing.book.eyebrow')}
              </span>

              <h2 className="text-4xl md:text-5xl font-extrabold text-blue-900 leading-tight mb-1">
                {t('landing.book.title')}
              </h2>
              <p className="text-2xl md:text-3xl font-light italic text-blue-500 mb-2">
                {t('landing.book.subtitle')}
              </p>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-7">
                {t('landing.book.author')}
              </p>

              <p className="text-lg leading-relaxed text-gray-600 mb-4">
                {t('landing.book.description1')}
              </p>
              <p className="text-lg leading-relaxed text-gray-600 mb-9">
                {t('landing.book.description2')}
              </p>

              {/* Botones de compra */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-9">
                <a
                  href={BOOK_AMAZON_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.03] active:scale-95 transition-all"
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                    />
                  </svg>
                  {t('landing.book.ctaAmazon')}
                </a>

                <a
                  href={BOOK_SAMPLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 border-2 border-blue-600 text-blue-700 font-bold text-lg rounded-xl hover:bg-blue-50 transition-colors"
                >
                  {t('landing.book.ctaOther')}
                </a>
              </div>

              {/* Oferta */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 md:p-6 text-left flex items-start gap-4 max-w-xl mx-auto lg:mx-0">
                <div className="flex-shrink-0 bg-blue-600 rounded-full p-2.5 text-white">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.25-9.75h16.5m-16.5 0a1.5 1.5 0 0 1-1.5-1.5V7.5a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v1.5m-4.5 0h4.5m-9 0h16.5"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-blue-900">{t('landing.book.offerTitle')}</p>
                  <p className="text-blue-900/70 text-sm md:text-base mt-1">
                    {t('landing.book.offerText')}
                  </p>
                </div>
              </div>
            </div>

            {/* Portada del libro (alineada a la derecha en desktop) */}
            <div className="w-full lg:w-[45%] flex justify-center order-1 lg:order-2">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 bg-gradient-to-tr from-blue-200 via-sky-100 to-transparent rounded-[2rem] rotate-3 blur-sm"
                />
                <div className="relative w-64 sm:w-80 lg:w-[22rem] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-blue-900/10 rotate-1 hover:rotate-0 hover:scale-[1.02] transition-transform duration-500">
                  <div className="relative aspect-[3/4] w-full">
                    <Image
                      src="/images/libro.png"
                      alt={t('landing.book.alt')}
                      fill
                      sizes="(max-width: 640px) 16rem, (max-width: 1024px) 20rem, 22rem"
                      priority
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
};

export default BookSection;

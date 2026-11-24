import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/layout/Layout';
import '@/lib/i18n';
import {
  helpContent,
  normalizeHelpLang,
  type HelpCategoryId,
} from '@/lib/helpContent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nelhealthcoach.com';
const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://app.nelhealthcoach.com' : 'http://localhost:3002');

const CATEGORY_ORDER: HelpCategoryId[] = [
  'all',
  'plans',
  'onboarding',
  'videocalls',
  'libraries',
  'billing',
];

export default function HelpCenterPage() {
  const { i18n } = useTranslation();
  const lang = normalizeHelpLang(i18n.language);
  const copy = helpContent[lang];

  const [selectedCategory, setSelectedCategory] = useState<HelpCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({
    'plans-comparison': true,
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredFaqs = useMemo(() => {
    return copy.faqs.filter((faq) => {
      const matchesCategory =
        selectedCategory === 'all' || faq.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        faq.question,
        faq.answer,
        ...(faq.bullets || []),
        copy.categories[faq.category],
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [copy.faqs, copy.categories, selectedCategory, normalizedQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const canonicalUrl = `${SITE_URL}/ayuda`;

  const faqSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      name: copy.seoTitle,
      url: canonicalUrl,
      inLanguage: lang,
      mainEntity: copy.faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.bullets?.length
            ? `${item.answer} ${item.bullets.join(' ')}`
            : item.answer,
        },
      })),
    }),
    [copy.seoTitle, copy.faqs, canonicalUrl, lang]
  );

  const mailtoHref = `mailto:${copy.supportBlock.emailAddress}?subject=${encodeURIComponent(
    copy.supportBlock.emailSubject
  )}`;

  return (
    <>
      <Head>
        <title>{copy.seoTitle}</title>
        <meta name="description" content={copy.seoDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:site_name" content="NELHEALTHCOACH" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={copy.seoTitle} />
        <meta property="og:description" content={copy.seoDescription} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c'),
          }}
        />
      </Head>

      <Layout>
        {/* Hero azul con id="inicio" para adaptar el Navbar al hacer scroll */}
        <section id="inicio" className="relative bg-gradient-to-br from-blue-700 to-blue-900">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700/40 to-gray-800/20" />
          <div className="relative container mx-auto px-4 pt-36 pb-16 md:pt-44 md:pb-20 text-center max-w-4xl">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/15 text-blue-100 border border-white/25 mb-4">
              {copy.heroBadge}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {copy.heroTitle}
            </h1>
            <p className="text-blue-100 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              {copy.heroSubtitle}
            </p>

            {/* Buscador interactivo */}
            <div className="max-w-2xl mx-auto">
              <label htmlFor="help-center-search" className="sr-only">
                {copy.searchLabel}
              </label>
              <div className="relative">
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  id="help-center-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full pl-12 pr-24 py-4 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-xl border border-blue-200/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 text-sm sm:text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    {copy.clearSearch}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Contenido principal FAQ */}
        <section className="bg-slate-50 py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Pestañas de categorías */}
            <div
              className="flex flex-wrap items-center justify-center gap-2 mb-6"
              role="group"
              aria-label={copy.searchLabel}
            >
              {CATEGORY_ORDER.map((catId) => {
                const isSelected = selectedCategory === catId;
                return (
                  <button
                    key={catId}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(catId)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                      isSelected
                        ? 'bg-blue-700 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {copy.categories[catId]}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-gray-500 text-center mb-8">
              {filteredFaqs.length} {copy.resultsCountLabel}
            </p>

            {/* Lista de acordeones o estado vacío */}
            {filteredFaqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm mb-12">
                <p className="text-lg font-bold text-gray-900 mb-2">
                  {copy.noResultsTitle}
                </p>
                <p className="text-sm text-gray-600 mb-5">
                  {copy.noResultsDescription}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center px-5 py-2.5 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {copy.resetFilters}
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-14">
                {filteredFaqs.map((faq) => {
                  const isOpen = normalizedQuery.length > 0 || Boolean(openFaqIds[faq.id]);
                  const buttonId = `faq-btn-${faq.id}`;
                  const panelId = `faq-panel-${faq.id}`;

                  return (
                    <article
                      key={faq.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                    >
                      <h2>
                        <button
                          id={buttonId}
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 hover:bg-blue-50/40 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-none"
                        >
                          <div>
                            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">
                              {copy.categories[faq.category]}
                            </span>
                            <span className="block text-base sm:text-lg font-semibold text-gray-900 leading-snug">
                              {faq.question}
                            </span>
                          </div>
                          <span
                            aria-hidden="true"
                            className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-200 ${
                              isOpen
                                ? 'bg-blue-700 text-white border-blue-700 rotate-180'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </button>
                      </h2>

                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        hidden={!isOpen}
                        className="px-6 pb-6 pt-1 border-t border-gray-100 text-gray-700 text-sm sm:text-base leading-relaxed"
                      >
                        <p>{faq.answer}</p>
                        {faq.bullets && faq.bullets.length > 0 && (
                          <ul className="mt-3 space-y-2">
                            {faq.bullets.map((bullet, idx) => (
                              <li key={idx} className="flex items-start">
                                <span
                                  aria-hidden="true"
                                  className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 shrink-0"
                                />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Bloque de soporte exclusivo por correo para casos extremos */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-700/60">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex-1">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/15 text-blue-100 border border-white/20 mb-3">
                    {copy.supportBlock.badge}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    {copy.supportBlock.title}
                  </h2>
                  <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-4">
                    {copy.supportBlock.description}
                  </p>

                  <div className="bg-amber-400/15 border border-amber-300/35 rounded-2xl px-4 py-3 text-xs sm:text-sm text-amber-100 mb-5">
                    {copy.supportBlock.noWhatsappNotice}
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-2">
                    {copy.supportBlock.checklistTitle}
                  </p>
                  <ul className="space-y-1.5 text-sm text-blue-50">
                    {copy.supportBlock.checklistItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span aria-hidden="true" className="text-emerald-300 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="md:w-72 shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-1">
                      {copy.supportBlock.emailLabel}
                    </p>
                    <p className="text-base font-bold text-white break-all mb-4">
                      {copy.supportBlock.emailAddress}
                    </p>
                  </div>

                  <a
                    href={mailtoHref}
                    className="inline-flex items-center justify-center w-full text-center px-4 py-3 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm transition-colors shadow-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    {copy.supportBlock.ctaLabel}
                  </a>

                  <p className="text-[11px] text-blue-200 mt-3 leading-relaxed">
                    {copy.supportBlock.responseNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Navegación rápida final */}
            <div className="mt-12 pt-8 border-t border-gray-200 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {copy.bottomCta.title}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {copy.bottomCta.subtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  <span>←</span>
                  <span>{copy.bottomCta.backToHome}</span>
                </Link>
                <Link
                  href="/#contacto"
                  className="inline-flex items-center px-6 py-3 rounded-full bg-white hover:bg-gray-50 text-blue-700 border border-blue-300 font-semibold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {copy.bottomCta.viewPlans}
                </Link>
                <a
                  href={`${DASHBOARD_URL}/login`}
                  className="inline-flex items-center px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {copy.bottomCta.loginPortal}
                </a>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}

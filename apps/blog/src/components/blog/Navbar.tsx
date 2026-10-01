import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { localizedPath } from '@/lib/seo';
import { LANDING_URL } from '@/lib/links';
import '@/lib/i18n';

/**
 * Navbar del blog (misma estética que la landing):
 * - Sobre el hero (si existe): fondo transparente + logo blanco.
 * - Fuera del hero o sin hero: fondo blanco con sombra + logo azul.
 * Enlaces: Inicio · Categorías · Web Principal (retorno a la landing) · Login (admin) — preservan el idioma (?lang=).
 * En móvil se colapsa en un menú hamburguesa.
 */
const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const lang = typeof router.query.lang === 'string' ? router.query.lang : 'es';
  const [overHero, setOverHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const hero = document.getElementById('blog-hero');
    if (!hero) return; // páginas sin hero → nav blanco por defecto

    observerRef.current = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' },
    );
    observerRef.current.observe(hero);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const background = overHero ? 'bg-transparent shadow-none' : 'bg-white shadow-md';
  const textColor = overHero ? 'text-white hover:text-blue-200' : 'text-gray-700 hover:text-blue-600';
  const logoPath = overHero ? '/images/logo1.png' : '/images/logo.png';

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className={`fixed w-full h-auto z-50 transition-all duration-300 ${background} py-2`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href={localizedPath('/', lang)} className="relative shrink-0" aria-label="Blog NELHEALTHCOACH">
          <div className="relative h-14 w-44 sm:h-17 sm:w-60 pt-4 sm:pt-5">
            <Image src={logoPath} alt="NELHEALTHCOACH" fill sizes="240px" className="object-contain" priority />
          </div>
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
          <Link
            href={localizedPath('/', lang)}
            className={`font-medium transition-colors ${textColor}`}
          >
            {t('nav.home')}
          </Link>
          <Link
            href={localizedPath('/#categorias', lang)}
            className={`font-medium transition-colors ${textColor}`}
          >
            {t('nav.categories')}
          </Link>

          {/* Botón que lleva de regreso a la landing con orden intuitivo */}
          <a
            href={LANDING_URL}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              overHero
                ? 'border-white/50 text-white bg-white/10 hover:bg-white hover:text-blue-900'
                : 'border-blue-600/30 text-blue-700 bg-blue-50/70 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm'
            }`}
            title="NELHEALTHCOACH"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t('nav.backToLanding')}</span>
          </a>

          <Link
            href={localizedPath('/admin/login', lang)}
            className={`font-medium transition-colors text-xs opacity-75 hover:opacity-100 ${textColor}`}
          >
            {t('nav.login')}
          </Link>
        </nav>

        {/* Botón hamburguesa (móvil) */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.menu')}
          aria-expanded={mobileOpen}
          aria-controls="blog-mobile-menu"
          className={`md:hidden p-2 rounded-lg transition-colors ${
            overHero ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-blue-50'
          }`}
        >
          {mobileOpen ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {mobileOpen && (
        <nav
          id="blog-mobile-menu"
          className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100"
        >
          <div className="container mx-auto px-4 py-2 flex flex-col">
            <Link
              href={localizedPath('/', lang)}
              onClick={closeMobile}
              className="py-3.5 font-medium text-gray-700 hover:text-blue-600 border-b border-gray-100"
            >
              {t('nav.home')}
            </Link>
            <Link
              href={localizedPath('/#categorias', lang)}
              onClick={closeMobile}
              className="py-3.5 font-medium text-gray-700 hover:text-blue-600 border-b border-gray-100"
            >
              {t('nav.categories')}
            </Link>
            <a
              href={LANDING_URL}
              onClick={closeMobile}
              className="py-3.5 font-medium text-blue-600 hover:text-blue-700 border-b border-gray-100 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('nav.backToLanding')}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">nelhealthcoach.com ↗</span>
            </a>
            <Link
              href={localizedPath('/admin/login', lang)}
              onClick={closeMobile}
              className="py-3.5 font-medium text-gray-500 hover:text-blue-600 last:border-0"
            >
              {t('nav.login')}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;

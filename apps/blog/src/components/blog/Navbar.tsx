import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { localizedPath } from '@/lib/seo';
import { landingHomeUrl, LANDING_URL } from '@/lib/links';
import {
  BLOG_LANG_COOKIE,
  LANG_OPTIONS,
  langFromQuery,
  normalizeLang,
} from '@/lib/utils';
import type { SupportedLang } from '@/lib/translations';
import '@/lib/i18n';

interface Props {
  lang?: string;
}

function persistBlogLangPreference(nextLang: SupportedLang): void {
  try {
    document.cookie = `${BLOG_LANG_COOKIE}=${encodeURIComponent(nextLang)}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem('i18nextLng', nextLang);
  } catch {
    // Ignorar si almacenamiento bloqueado
  }
}

/**
 * Navbar del blog (misma estética que la landing):
 * - Sobre el hero (si existe): fondo transparente + logo blanco.
 * - Fuera del hero o sin hero: fondo blanco con sombra + logo azul.
 * Enlaces: Inicio · Categorías · Web Principal (retorno a la landing) · Selector de idioma · Login (admin).
 * En móvil incluye selector de idioma compacto + menú hamburguesa.
 */
const Navbar: React.FC<Props> = ({ lang: propLang }) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const activeLang = normalizeLang(
    propLang ?? langFromQuery(router.query.lang) ?? i18n.language,
  );
  const currentOption =
    LANG_OPTIONS.find((opt) => opt.code === activeLang) ?? LANG_OPTIONS[0];

  const [overHero, setOverHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hero = document.getElementById('blog-hero');
    if (!hero) {
      const frame = requestAnimationFrame(() => setOverHero(false));
      return () => cancelAnimationFrame(frame);
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' },
    );
    observerRef.current.observe(hero);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [router.pathname]);

  useEffect(() => {
    if (!langMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLangMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [langMenuOpen]);

  const background = overHero ? 'bg-transparent shadow-none' : 'bg-white shadow-md';
  const textColor = overHero ? 'text-white hover:text-blue-200' : 'text-gray-700 hover:text-blue-600';
  const logoPath = overHero ? '/images/logo1.png' : '/images/logo.png';
  const landingHref = landingHomeUrl(LANDING_URL, activeLang);

  const closeMobile = () => setMobileOpen(false);

  const selectLanguage = (nextLang: SupportedLang) => {
    setLangMenuOpen(false);
    closeMobile();

    persistBlogLangPreference(nextLang);
    void i18n.changeLanguage(nextLang);

    if (router.pathname.startsWith('/admin')) return;

    let basePath = '/';
    if (router.pathname === '/post/[slug]' && typeof router.query.slug === 'string') {
      basePath = `/post/${encodeURIComponent(router.query.slug)}`;
    } else if (router.pathname === '/') {
      const cat =
        typeof router.query.categoria === 'string' && router.query.categoria !== ''
          ? router.query.categoria
          : null;
      basePath = cat ? `/?categoria=${encodeURIComponent(cat)}` : '/';
    } else {
      basePath = (router.asPath || '/').split('?')[0] || '/';
    }

    const targetUrl = localizedPath(basePath, nextLang);
    if (targetUrl === router.asPath) {
      router.reload();
    } else {
      void router.push(targetUrl);
    }
  };

  return (
    <header className={`fixed w-full h-auto z-50 transition-all duration-300 ${background} py-2`}>
      <div className="container mx-auto px-4 flex justify-between items-center gap-2">
        <Link href={localizedPath('/', activeLang)} className="relative shrink-0" aria-label="Blog NELHEALTHCOACH">
          <div className="relative h-14 w-36 sm:h-17 sm:w-52 md:w-60 pt-4 sm:pt-5">
            <Image src={logoPath} alt="NELHEALTHCOACH" fill sizes="240px" className="object-contain" priority />
          </div>
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden md:flex items-center space-x-5 lg:space-x-7">
          <Link
            href={localizedPath('/', activeLang)}
            className={`font-medium transition-colors ${textColor}`}
          >
            {t('nav.home')}
          </Link>
          <Link
            href={localizedPath('/#categorias', activeLang)}
            className={`font-medium transition-colors ${textColor}`}
          >
            {t('nav.categories')}
          </Link>

          {/* Selector de idioma dinámico (6 idiomas) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen((open) => !open)}
              aria-label={t('nav.language')}
              aria-expanded={langMenuOpen}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                overHero
                  ? 'border-white/40 text-white bg-white/10 hover:bg-white/20'
                  : 'border-gray-200 text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>{currentOption.short}</span>
              <svg className={`w-3 h-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {langMenuOpen && (
              <div
                role="menu"
                aria-label={t('nav.language')}
                className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50"
              >
                {LANG_OPTIONS.map((opt) => {
                  const isActive = opt.code === activeLang;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => selectLanguage(opt.code)}
                      className={`w-full px-3.5 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                        {opt.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botón que lleva de regreso a la landing preservando el idioma */}
          <a
            href={landingHref}
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
            href={localizedPath('/admin/login', activeLang)}
            className={`font-medium transition-colors text-xs opacity-75 hover:opacity-100 ${textColor}`}
          >
            {t('nav.login')}
          </Link>
        </nav>

        {/* Controles móviles: selector rápido de idioma + botón hamburguesa */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(true);
            }}
            aria-label={`${t('nav.language')}: ${currentOption.label}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              overHero
                ? 'border-white/40 text-white bg-white/10 hover:bg-white/20'
                : 'border-gray-200 text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span>{currentOption.short}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.menu')}
            aria-expanded={mobileOpen}
            aria-controls="blog-mobile-menu"
            className={`p-2 rounded-lg transition-colors ${
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
      </div>

      {/* Menú móvil desplegable */}
      {mobileOpen && (
        <nav
          id="blog-mobile-menu"
          className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100"
        >
          <div className="container mx-auto px-4 py-2 flex flex-col">
            <Link
              href={localizedPath('/', activeLang)}
              onClick={closeMobile}
              className="py-3.5 font-medium text-gray-700 hover:text-blue-600 border-b border-gray-100"
            >
              {t('nav.home')}
            </Link>
            <Link
              href={localizedPath('/#categorias', activeLang)}
              onClick={closeMobile}
              className="py-3.5 font-medium text-gray-700 hover:text-blue-600 border-b border-gray-100"
            >
              {t('nav.categories')}
            </Link>

            {/* Selector de idioma en menú móvil */}
            <div className="py-3.5 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
                {t('nav.language')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LANG_OPTIONS.map((opt) => {
                  const isActive = opt.code === activeLang;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => selectLanguage(opt.code)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border text-left flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                        {opt.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <a
              href={landingHref}
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
              href={localizedPath('/admin/login', activeLang)}
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

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { localizedPath } from '@/lib/seo';
import '@/lib/i18n';

/**
 * Navbar del blog (misma estética que la landing):
 * - Sobre el hero (si existe): fondo transparente + logo blanco.
 * - Fuera del hero o sin hero: fondo blanco con sombra + logo azul.
 * Enlaces: Inicio · Categorías · Login (admin) — preservan el idioma (?lang=).
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

  // Preserva el idioma (?lang=) al navegar entre páginas
  const navLinks = [
    { href: localizedPath('/', lang), label: t('nav.home') },
    { href: localizedPath('/#categorias', lang), label: t('nav.categories') },
    { href: localizedPath('/admin/login', lang), label: t('nav.login') },
  ];

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
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-medium transition-colors ${textColor}`}
            >
              {link.label}
            </Link>
          ))}
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className="py-3.5 font-medium text-gray-700 hover:text-blue-600 border-b border-gray-100 last:border-0"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;

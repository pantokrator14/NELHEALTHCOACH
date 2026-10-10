import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

interface NavSectionItem {
  id: string;
  labelKey: string;
}

interface LegalNavItem {
  href: string;
  labelKey: string;
  defaultLabel: string;
}

const LEGAL_NAV_ITEMS: LegalNavItem[] = [
  { href: '/politica-privacidad', labelKey: 'landing.nav.privacy', defaultLabel: 'Privacidad' },
  { href: '/terminos-condiciones', labelKey: 'landing.nav.terms', defaultLabel: 'Términos' },
  { href: '/aviso-legal', labelKey: 'landing.nav.notice', defaultLabel: 'Aviso Legal' },
  { href: '/cookies', labelKey: 'landing.nav.cookies', defaultLabel: 'Cookies' },
  { href: '/reembolsos', labelKey: 'landing.nav.refunds', defaultLabel: 'Reembolsos' },
];

const LANDING_NAV_ITEMS: NavSectionItem[] = [
  { id: 'inicio', labelKey: 'landing.nav.inicio' },
  { id: 'metodo', labelKey: 'landing.nav.metodo' },
  { id: 'sobre-mi', labelKey: 'landing.nav.sobreMi' },
  { id: 'blog', labelKey: 'landing.nav.blog' },
  { id: 'libro', labelKey: 'landing.nav.libro' },
  { id: 'contacto', labelKey: 'landing.nav.contacto' },
];

const Navbar: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOverHero, setIsOverHero] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const isLegalPage = LEGAL_NAV_ITEMS.some((item) => item.href === router.pathname);

  // Cerrar el menú móvil en transiciones de ruta mediante suscripción a eventos
  useEffect(() => {
    const handleRouteChange = () => {
      setMobileMenuOpen(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  // Efecto para detectar cuándo estamos sobre la sección hero
  useEffect(() => {
    const heroSection = document.getElementById('inicio');
    if (!heroSection) {
      const timer = setTimeout(() => {
        setIsOverHero(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsOverHero(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '-80px 0px 0px 0px',
      }
    );

    observerRef.current.observe(heroSection);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [router.pathname]);

  // Scroll suave en la landing page
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setMobileMenuOpen(false);
  };

  // Clic en el logo: vuelve al inicio de la landing o hace scroll al inicio
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isLegalPage && router.pathname === '/') {
      e.preventDefault();
      scrollToSection('inicio');
    }
    setMobileMenuOpen(false);
  };

  // Determinar estilos y logo según la posición
  const navbarBackground = isOverHero
    ? 'bg-transparent shadow-none'
    : 'bg-white shadow-md';

  const textColor = isOverHero
    ? 'text-white/90 hover:text-white'
    : 'text-gray-700 hover:text-blue-600';

  const logoPath = isOverHero
    ? '/images/logo1.png' // Logo blanco para el hero
    : '/images/logo.png'; // Logo azul para el resto

  return (
    <header className={`fixed w-full h-auto z-50 transition-all duration-300 ${navbarBackground} py-2`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo con enlace hacia la landing page */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="cursor-pointer relative inline-block transition-transform hover:opacity-95"
          aria-label="NELHEALTHCOACH - Inicio"
        >
          <div className="relative h-16 w-52 sm:w-60 pt-2">
            <Image
              src={logoPath}
              alt="NELHEALTHCOACH"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
          {isLegalPage ? (
            <>
              {LEGAL_NAV_ITEMS.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`font-medium text-sm transition-all pb-1 ${
                      isActive
                        ? isOverHero
                          ? 'text-white font-bold border-b-2 border-white'
                          : 'text-blue-600 font-bold border-b-2 border-blue-600'
                        : textColor
                    }`}
                  >
                    {t(item.labelKey, item.defaultLabel)}
                  </Link>
                );
              })}

              {/* Botón directo para volver a la landing */}
              <Link
                href="/"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  isOverHero
                    ? 'bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm shadow-sm'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                }`}
              >
                <span>←</span>
                <span>{t('landing.nav.backToHome', 'Volver al Inicio')}</span>
              </Link>
            </>
          ) : (
            LANDING_NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`font-medium transition-colors cursor-pointer ${textColor}`}
              >
                {t(item.labelKey)}
              </a>
            ))
          )}
        </nav>

        {/* Botón de menú móvil */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? t('common.closeMenu', 'Cerrar menú') : t('common.openMenu', 'Abrir menú')}
          className={`lg:hidden text-2xl p-2 rounded-lg transition-colors ${
            isOverHero ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden py-4 px-6 transition-all duration-300 shadow-xl ${
            isOverHero ? 'bg-gray-900/95 backdrop-blur-md text-white' : 'bg-white text-gray-800'
          }`}
        >
          <div className="flex flex-col space-y-3">
            {isLegalPage ? (
              <>
                <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isOverHero ? 'text-gray-300' : 'text-gray-600'}`}>
                  Páginas Legales
                </p>
                {LEGAL_NAV_ITEMS.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`font-medium text-base py-2 transition-colors flex items-center justify-between ${
                        isActive
                          ? isOverHero
                            ? 'text-blue-300 font-bold'
                            : 'text-blue-600 font-bold'
                          : isOverHero
                          ? 'text-white/90 hover:text-white'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      <span>{t(item.labelKey, item.defaultLabel)}</span>
                      {isActive && <span className="text-xs">●</span>}
                    </Link>
                  );
                })}

                <div className="pt-3 border-t border-gray-700/30">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all"
                  >
                    <span>←</span>
                    <span>{t('landing.nav.backToHome', 'Volver al Inicio')}</span>
                  </Link>
                </div>
              </>
            ) : (
              LANDING_NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`font-medium transition-colors py-2 cursor-pointer ${
                    isOverHero ? 'text-white hover:text-blue-200' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {t(item.labelKey)}
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

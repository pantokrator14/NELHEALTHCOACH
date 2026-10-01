import React, { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';
import '@/lib/i18n';

interface Props {
  /** Página activa para resaltar en la navegación. */
  active: 'panel' | 'author' | 'editor' | 'comments';
  children: ReactNode;
}

/**
 * Layout del panel de administración del blog:
 * cabecera azul (colores del proyecto), navegación y contenido.
 * En móvil la navegación se colapsa en un menú hamburguesa.
 */
const AdminLayout: React.FC<Props> = ({ active, children }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: Array<{ key: Props['active']; href: string; label: string }> = [
    { key: 'panel', href: '/admin', label: t('admin.navPanel') },
    { key: 'author', href: '/admin/author', label: t('admin.navAuthor') },
    { key: 'comments', href: '/admin/comments', label: t('admin.navComments') },
  ];

  const handleLogout = () => {
    apiClient.logout();
    void router.replace('/admin/login');
  };

  const closeMobile = () => setMobileOpen(false);

  const linkClass = (key: Props['active']) =>
    `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
      active === key
        ? 'bg-white text-blue-700 shadow-sm'
        : 'text-blue-100 hover:bg-blue-600 hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 via-white to-white">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <header className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/admin" aria-label="Panel del blog" className="relative h-10 w-32 sm:h-12 sm:w-40 shrink-0">
            <Image src="/images/logo1.png" alt="NELHEALTHCOACH" fill sizes="160px" className="object-contain object-left" priority />
          </Link>

          {/* Navegación de escritorio */}
          <nav className="hidden md:flex items-center gap-1.5">
            {links.map((link) => (
              <Link key={link.key} href={link.href} className={`${linkClass(link.key)} whitespace-nowrap`}>
                {link.label}
              </Link>
            ))}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-100 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
            >
              {t('admin.navViewBlog')} ↗
            </a>
          </nav>

          <button
            onClick={handleLogout}
            className="hidden md:block text-sm font-semibold border border-blue-300/60 rounded-lg px-3 py-1.5 text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            {t('admin.logout')}
          </button>

          {/* Botón hamburguesa (móvil/tablet) */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.menu')}
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-menu"
            className="md:hidden p-2 rounded-lg text-white hover:bg-blue-600 transition-colors"
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
          <nav id="admin-mobile-menu" className="md:hidden bg-blue-800 border-t border-blue-600/40 shadow-lg">
            <div className="container mx-auto px-4 py-2 flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={closeMobile}
                  className={`py-3.5 font-semibold border-b border-blue-700/60 ${
                    active === link.key ? 'text-white' : 'text-blue-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobile}
                className="py-3.5 font-semibold text-blue-100 border-b border-blue-700/60"
              >
                {t('admin.navViewBlog')} ↗
              </a>
              <button
                onClick={handleLogout}
                className="py-3.5 text-left font-semibold text-blue-100"
              >
                {t('admin.logout')}
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 flex-1 w-full">{children}</main>
    </div>
  );
};

export default AdminLayout;

'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { legalContent, normalizeLegalLang, backLabels, type LegalPageKey } from '../../lib/legalContent';

interface LegalPageProps {
  pageKey: LegalPageKey;
}

/**
 * Página legal genérica (Política de Privacidad, Términos y Condiciones, Aviso Legal).
 * Mantiene la estética de la landing:
 * - Hero con gradiente azul y logo blanco (el Navbar cambia automáticamente al logo
 *   azul al hacer scroll gracias al id="inicio" y al IntersectionObserver).
 * - Contenido sobre fondo blanco con acentos azules.
 */
const LegalPage: React.FC<LegalPageProps> = ({ pageKey }) => {
  const { i18n } = useTranslation();
  const doc = legalContent[normalizeLegalLang(i18n.language)][pageKey];

  return (
    <div>
      {/* Hero azul - el id="inicio" hace que el Navbar use logo blanco sobre este fondo */}
      <section id="inicio" className="relative bg-gradient-to-br from-blue-700 to-blue-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/40 to-gray-700/20"></div>
        <div className="relative container mx-auto px-4 pt-36 pb-16 md:pt-44 md:pb-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {doc.title}
          </h1>
          <p className="text-blue-200 text-sm md:text-base font-medium">
            {doc.updated}
          </p>
        </div>
      </section>

      {/* Contenido del documento */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          {doc.sections.map((section) => (
            <section key={section.title} className="mb-10">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="space-y-2 mt-2">
                  {section.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start text-gray-700 leading-relaxed">
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* Volver al inicio */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <Link
              href="/"
              className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-full transition-colors"
            >
              ← {backLabels[normalizeLegalLang(i18n.language)]}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;

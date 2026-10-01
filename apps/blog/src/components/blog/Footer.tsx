import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LANDING_URL } from '@/lib/links';
import '@/lib/i18n';

/**
 * Footer del blog — MISMOS ELEMENTOS que el footer de la landing:
 * marca + descripción, enlaces legales (apuntan a la landing), contacto
 * y redes sociales, más botón de retorno a la landing principal.
 */
const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">NELHEALTHCOACH</h3>
            <p className="text-gray-400 mb-4">{t('footer.description')}</p>
            <a
              href={LANDING_URL}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{t('footer.backToLanding')}</span>
            </a>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={LANDING_URL}
                  className="text-blue-400 hover:text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('footer.backToLanding')}
                </a>
              </li>
              <li>
                <a
                  href={`${LANDING_URL}/politica-privacidad`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <a
                  href={`${LANDING_URL}/terminos-condiciones`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.terms')}
                </a>
              </li>
              <li>
                <a
                  href={`${LANDING_URL}/aviso-legal`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.legalNotice')}
                </a>
              </li>
              <li>
                <Link href="/rss.xml" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.rss')} (XML)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.contact')}</h4>
            <address className="not-italic text-gray-400">
              <p className="mb-2">contact@nelhealthcoach.com</p>
              <p className="mb-2">+1 (442) 342-5050 - {t('footer.spanishSupport')}</p>
              <p className="mb-2">+1 (760) 980-5880 - {t('footer.englishSupport')}</p>
              <p>33450 shifting Sands Trail, cathedral city, CA, 92234 (USA)</p>
            </address>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.social')}</h4>
            <div className="flex space-x-4">
              {['facebook', 'instagram', 'youtube'].map((social) => (
                <a
                  key={social}
                  href={`https://${social}.com/NELHEALTHCOACH`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={`Síguenos en ${social}`}
                >
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                    {social.charAt(0).toUpperCase()}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} NELHEALTHCOACH. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

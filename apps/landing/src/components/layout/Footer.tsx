import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

// URL del blog (app independiente del monorepo)
const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL || 'http://localhost:3003';

/**
 * Pie de página con:
 * - Información de la empresa y datos fiscales
 * - Enlaces rápidos
 * - Enlaces legales estructurados
 * - Información de contacto y soporte
 * - Redes sociales
 * - Descargo médico legal indeleble
 */
const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">NELHEALTHCOACH</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              {t('landing.footer.description')}
            </p>
            <p className="text-xs text-gray-500">
              NELHEALTHCOACH LLC · Cathedral City, CA 92234
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('landing.footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={BLOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('landing.nav.blog')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('landing.footer.legal')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/politica-privacidad" className="text-gray-400 hover:text-white transition-colors">
                  {t('landing.footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terminos-condiciones" className="text-gray-400 hover:text-white transition-colors">
                  {t('landing.footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/aviso-legal" className="text-gray-400 hover:text-white transition-colors">
                  {t('landing.footer.legalNotice')}
                </Link>
              </li>
              <li>
                <Link href="/reembolsos" className="text-gray-400 hover:text-white transition-colors">
                  {t('landing.footer.refunds')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                  {t('landing.footer.cookies')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('landing.footer.contact')}</h4>
            <address className="not-italic text-gray-400 text-sm space-y-2">
              <p>
                <a href="mailto:soporte@nelhealthcoach.com" className="hover:text-white transition-colors">
                  soporte@nelhealthcoach.com
                </a>
              </p>
              <p>+1 (442) 342-5050 · {t('landing.footer.spanishSupport')}</p>
              <p>+1 (760) 980-5880 · {t('landing.footer.englishSupport')}</p>
              <p className="text-xs text-gray-500 pt-1">
                33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)
              </p>
            </address>
          </div>
        </div>

        {/* Descargo Médico Legal Indeleble */}
        <div className="border-t border-gray-800 pt-6 pb-4">
          <p className="text-xs text-gray-400 text-center leading-relaxed max-w-4xl mx-auto">
            ⚖️ {t('landing.footer.medicalDisclaimer')}
          </p>
        </div>
        
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            {t('landing.footer.copyright')}
          </p>
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
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm font-semibold hover:bg-gray-700">
                  {social.charAt(0).toUpperCase()}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

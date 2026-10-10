// apps/landing/src/components/common/CookieBanner.tsx
// Banner de Gestión de Consentimiento de Cookies (CMP)
// Colores y diseño corporativo de NelHealthCoach (Limpio, blanco y azul).
// Cumplimiento estricto RGPD, Directiva ePrivacy y guías EDPB/AEPD.

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const STORAGE_CONSENT_KEY = 'nhc_cookie_consent';
const ANALYTICS_CONSENT_KEY = 'nhc_consent_analytics';
const MAX_AGE_DAYS = 180;

interface ConsentRecord {
  consent: 'all' | 'essential' | 'custom';
  analytics: boolean;
  timestamp: number;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('nhc_consent_updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('nhc_consent_updated', callback);
  };
}

function getSnapshot(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_CONSENT_KEY);
    if (!stored) return false;
    const record: ConsentRecord = JSON.parse(stored);
    const ageDays = (Date.now() - record.timestamp) / (1000 * 60 * 60 * 24);
    return ageDays < MAX_AGE_DAYS;
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return true; // En SSR no se renderiza para evitar hydration mismatch
}

export const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showConfig, setShowConfig] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const saveConsent = (type: 'all' | 'essential' | 'custom', analytics: boolean) => {
    try {
      const record: ConsentRecord = {
        consent: type,
        analytics,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_CONSENT_KEY, JSON.stringify(record));
      localStorage.setItem(ANALYTICS_CONSENT_KEY, analytics ? 'granted' : 'denied');
      window.dispatchEvent(new Event('nhc_consent_updated'));
    } catch {
      // Ignorar excepciones de cuota o cookies deshabilitadas
    }
  };

  const handleAcceptAll = () => saveConsent('all', true);
  const handleRejectAll = () => saveConsent('essential', false);
  const handleSaveCustom = () => saveConsent('custom', analyticsEnabled);

  if (hasConsent) return null;

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label={t('cookieBanner.title', 'Gestión de Cookies y Privacidad')}
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 bg-white/95 backdrop-blur-md text-gray-800 border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="max-w-6xl mx-auto">
        {!showConfig ? (
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1 pr-0 lg:pr-6">
              <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-2">
                <span className="text-xl">🍪</span>{' '}
                {t('cookieBanner.title', 'Gestión de Cookies y Privacidad')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {t(
                  'cookieBanner.description',
                  'Utilizamos cookies técnicas necesarias para el funcionamiento del sitio y, con tu consentimiento, analíticas para optimizar nuestros servicios educativos.'
                )}{' '}
                <Link
                  href="/cookies"
                  className="text-blue-600 hover:text-blue-800 underline font-medium focus-visible:ring-2 focus-visible:ring-blue-500 rounded outline-none"
                >
                  {t('cookieBanner.learnMore', 'Más información en nuestra Política de Cookies')}
                </Link>
              </p>
            </div>

            {/* Opciones con diseño de marca corporativo */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={handleRejectAll}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              >
                {t('cookieBanner.rejectNonEssential', 'Rechazar no esenciales')}
              </button>
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-blue-200 hover:border-blue-300 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs sm:text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              >
                {t('cookieBanner.customize', 'Configurar')}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-md shadow-blue-500/20 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              >
                {t('cookieBanner.acceptAll', 'Aceptar todas')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm sm:text-base font-bold text-blue-900">
                {t('cookieBanner.title', 'Gestión de Cookies y Privacidad')} —{' '}
                {t('cookieBanner.customize', 'Configurar')}
              </h3>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-gray-500 hover:text-blue-700 text-xs font-medium underline p-1"
              >
                ← Volver
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Categoría 1: Técnicas */}
              <div className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-gray-800">
                      {t('cookieBanner.essentialTitle', 'Cookies Técnicas (Necesarias)')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium border border-blue-200">
                      {t('cookieBanner.alwaysActive', 'Siempre activas')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t(
                      'cookieBanner.essentialDesc',
                      'Imprescindibles para el funcionamiento seguro de la plataforma y sesiones.'
                    )}
                  </p>
                </div>
                <input
                  id="cookie-essential-disabled"
                  type="checkbox"
                  disabled
                  checked
                  aria-label={t('cookieBanner.essentialTitle', 'Cookies Técnicas (Necesarias)')}
                  className="h-4 w-4 rounded text-blue-600 opacity-60 cursor-not-allowed mt-1"
                />
              </div>

              {/* Categoría 2: Analíticas */}
              <label htmlFor="cookie-analytics-toggle" className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200 flex items-start justify-between gap-3 cursor-pointer hover:border-blue-300 transition-colors">
                <div className="space-y-1">
                  <span className="font-semibold text-xs sm:text-sm text-gray-800 block">
                    {t('cookieBanner.analyticsTitle', 'Cookies Analíticas y Medición')}
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t(
                      'cookieBanner.analyticsDesc',
                      'Nos permiten entender el uso global del sitio para mejorar los contenidos.'
                    )}
                  </p>
                </div>
                <input
                  id="cookie-analytics-toggle"
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  aria-label={t('cookieBanner.analyticsTitle', 'Cookies Analíticas y Medición')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
              >
                {t('cookieBanner.savePreferences', 'Guardar preferencias')}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default CookieBanner;

// apps/dashboard/src/components/CoachContractStep.tsx
// Acuerdo de Asesor/Coach con soporte i18n (6 idiomas) — v2026.1
// Desacople de consentimientos legales, confidencialidad médica y términos de suscripción.
// Las traducciones viven en apps/dashboard/src/lib/i18n.ts bajo el namespace register.contract

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface CoachContractStepProps {
  onAccept: () => void;
  onReject: () => void;
  isTrial?: boolean;
}

// Número total de secciones del acuerdo (1..12)
const TOTAL_SECTIONS = 12;

const CoachContractStep: React.FC<CoachContractStepProps> = ({ onAccept, onReject, isTrial = false }) => {
  const { t } = useTranslation();
  const subscriptionAmount = process.env.NEXT_PUBLIC_COACH_SUBSCRIPTION_AMOUNT || '150';

  const [termsConsent, setTermsConsent] = useState(false);
  const [confidentialityConsent, setConfidentialityConsent] = useState(false);
  const [autoRenewalConsent, setAutoRenewalConsent] = useState(false);

  const canAccept = termsConsent && confidentialityConsent && autoRenewalConsent;

  const bgGradient = isTrial
    ? 'from-emerald-400 via-emerald-500 to-emerald-600'
    : 'from-blue-400 via-blue-500 to-blue-600';
  const accentColor = isTrial ? 'text-emerald-700' : 'text-blue-700';
  const sectionTitleColor = isTrial ? 'text-emerald-700' : 'text-blue-700';
  const btnColor = isTrial ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';

  const getItems = (section: number): string[] | null => {
    const items = t(`register.contract.section${section}Items`, {
      returnObjects: true,
      defaultValue: [],
    }) as unknown;
    return Array.isArray(items) ? (items as string[]) : null;
  };

  const getText = (section: number, kind: 'Content' | 'Intro' | 'Price'): string => {
    const value = t(`register.contract.section${section}${kind}`, { defaultValue: '' });
    return typeof value === 'string' ? value : '';
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} py-12 px-4`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-16">
                <Image
                  src="/logo2.png"
                  alt="NELHEALTHCOACH"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold text-center ${accentColor} mb-2`}>
              {t('register.contract.title')}
            </h1>
            <p className="text-center text-sm text-gray-500 mb-8">
              {t('register.contract.version')}
            </p>

            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg max-h-96 overflow-y-auto mb-8 border border-gray-200">
              <div className="space-y-6 text-gray-700">
                {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((section) => {
                  const title = t(`register.contract.section${section}Title`, { defaultValue: '' });
                  const intro = getText(section, 'Intro');
                  const content = getText(section, 'Content');
                  const price = getText(section, 'Price');
                  const items = getItems(section);

                  if (!title && !content && !intro && !items && !price) return null;

                  return (
                    <section key={section}>
                      <h2 className={`text-lg sm:text-xl font-semibold ${sectionTitleColor} mb-2`}>{title}</h2>
                      {intro && <p className="text-sm mb-2">{intro}</p>}
                      {content && <p className="text-sm">{content}</p>}
                      {price && (
                        <p className="text-sm mt-1">
                          <strong>{t('register.contract.section3Price', { amount: subscriptionAmount })}</strong>
                        </p>
                      )}
                      {items && items.length > 0 && (
                        <ul className="list-disc list-inside mt-2 text-sm ml-4">
                          {items.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Casillas de consentimiento independientes para Coaches */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
              <h3 className={`text-sm font-bold ${accentColor} uppercase tracking-wide`}>
                Consentimientos y Compromisos Regulatorios
              </h3>

              {/* Casilla 1: Términos y Contrato */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="coach-consent-terms"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-800 leading-snug">
                  <span className="font-semibold text-blue-950">* </span>
                  {t('register.contract.checkboxTerms')}
                </span>
              </label>

              {/* Casilla 2: Confidencialidad y RGPD de Clientes */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="coach-consent-confidentiality"
                  checked={confidentialityConsent}
                  onChange={(e) => setConfidentialityConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-800 leading-snug">
                  <span className="font-semibold text-blue-950">* </span>
                  {t('register.contract.checkboxDataConfidentiality')}
                </span>
              </label>

              {/* Casilla 3: Renovación y Cancelación */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="coach-consent-autorenewal"
                  checked={autoRenewalConsent}
                  onChange={(e) => setAutoRenewalConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-800 leading-snug">
                  <span className="font-semibold text-blue-950">* </span>
                  {t('register.contract.checkboxAutoRenewal')}
                </span>
              </label>

              {!canAccept && (
                <p className="text-xs text-amber-700 font-medium pt-1">
                  ⚠️ {t('register.contract.requiredConsentsNote')}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={onReject}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold order-2 sm:order-1"
              >
                {t('register.contract.rejectButton')}
              </button>
              <button
                type="button"
                disabled={!canAccept}
                onClick={onAccept}
                className={`px-8 py-3 rounded-lg font-semibold transition-all order-1 sm:order-2 ${
                  canAccept
                    ? `text-white ${btnColor} shadow-lg cursor-pointer transform hover:scale-[1.02]`
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-75'
                }`}
              >
                {t('register.contract.acceptButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachContractStep;

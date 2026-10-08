// apps/form/src/components/ContractStep.tsx
// Contrato de servicios de coaching para clientes — i18n 6 idiomas (v2026.1)
// Cumplimiento RGPD Art. 9, directrices FTC y consentimiento informado explícito.
// Las traducciones viven en apps/form/src/lib/i18n.ts bajo el namespace form.contract

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export interface ContractConsentData {
  healthDataConsent: boolean;
  termsAndPrivacyConsent: boolean;
  immediateServiceConsent: boolean;
  marketingConsent: boolean;
  consentTimestamp: string;
  consentPolicyVersion: string;
}

interface ContractStepProps {
  onAccept: (consentData?: ContractConsentData) => void;
  onReject: () => void;
}

// Número total de secciones del contrato (1..14)
const TOTAL_SECTIONS = 14;

const ContractStep: React.FC<ContractStepProps> = ({ onAccept, onReject }) => {
  const { t } = useTranslation();

  // Estados de consentimiento desacoplados (ninguno premarcado por defecto)
  const [termsAndPrivacyConsent, setTermsAndPrivacyConsent] = useState(false);
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const [immediateServiceConsent, setImmediateServiceConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const canAccept = termsAndPrivacyConsent && healthDataConsent && immediateServiceConsent;

  const handleAcceptClick = () => {
    if (!canAccept) return;
    onAccept({
      healthDataConsent: true,
      termsAndPrivacyConsent: true,
      immediateServiceConsent: true,
      marketingConsent,
      consentTimestamp: new Date().toISOString(),
      consentPolicyVersion: '2026.1',
    });
  };

  const getItems = (section: number): string[] | null => {
    const items = t(`form.contract.section${section}Items`, {
      returnObjects: true,
      defaultValue: [],
    }) as unknown;
    return Array.isArray(items) ? (items as string[]) : null;
  };

  const getText = (section: number, kind: 'Content' | 'Intro'): string => {
    const value = t(`form.contract.section${section}${kind}`, { defaultValue: '' });
    return typeof value === 'string' ? value : '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-16">
                <Image
                  src="/logo.png"
                  alt="NELHEALTHCOACH"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-800 mb-2">
              {t('form.contract.title')}
            </h1>
            <p className="text-center text-sm text-gray-500 mb-8">
              {t('form.contract.version')}
            </p>

            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg max-h-96 overflow-y-auto mb-8 border border-gray-200">
              <div className="space-y-6 text-gray-700">
                {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((section) => {
                  const title = t(`form.contract.section${section}Title`, { defaultValue: '' });
                  const intro = getText(section, 'Intro');
                  const content = getText(section, 'Content');
                  const items = getItems(section);

                  if (!title && !content && !intro && !items) return null;

                  return (
                    <section key={section}>
                      <h2 className="text-lg sm:text-xl font-semibold text-blue-700 mb-2">{title}</h2>
                      {intro && <p className="text-sm mb-2">{intro}</p>}
                      {content && <p className="text-sm">{content}</p>}
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

            {/* Aviso de privacidad — datos de salud procesados con IA (SEC-14) */}
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-6">
              <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-2">
                {t('form.contract.privacyTitle')}
              </h2>
              <p className="text-sm text-amber-900 mb-2">{t('form.contract.privacyIntro')}</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-900 ml-4">
                {[1, 2, 3].map((i) => {
                  const item = t(`form.contract.privacyItem${i}`, { defaultValue: '' });
                  return item ? <li key={i}>{item}</li> : null;
                })}
              </ul>
              <p className="text-xs text-amber-700 italic mt-2">{t('form.contract.privacyConsent')}</p>
            </div>

            {/* Casillas de consentimiento independientes (RGPD Art. 9 & FTC) */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 space-y-4">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                Declaración y Consentimientos Informados
              </h3>

              {/* Casilla 1: Términos y Privacidad (Obligatoria) */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="consent-terms"
                  checked={termsAndPrivacyConsent}
                  onChange={(e) => setTermsAndPrivacyConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-800 leading-snug">
                  <span className="font-semibold text-blue-950">* </span>
                  {t('form.contract.checkboxTerms')}{' '}
                  <span className="inline-block mt-0.5">
                    (
                    <a
                      href="/terminos-condiciones"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 font-medium"
                    >
                      {t('form.contract.linkTerms')}
                    </a>
                    {' · '}
                    <a
                      href="/politica-privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 font-medium"
                    >
                      {t('form.contract.linkPrivacy')}
                    </a>
                    )
                  </span>
                </span>
              </label>

              {/* Casilla 2: Datos de Salud RGPD Art. 9 (Obligatoria) */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="consent-health-data"
                  checked={healthDataConsent}
                  onChange={(e) => setHealthDataConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-800 leading-snug">
                  <span className="font-semibold text-blue-950">* </span>
                  {t('form.contract.checkboxHealthData')}
                </span>
              </label>

              {/* Casilla 3: Inicio Inmediato y Renuncia Desistimiento Digital (Obligatoria) */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="consent-immediate-service"
                  checked={immediateServiceConsent}
                  onChange={(e) => setImmediateServiceConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-800 leading-snug">
                  <span className="font-semibold text-blue-950">* </span>
                  {t('form.contract.checkboxImmediateService')}
                </span>
              </label>

              {/* Casilla 4: Marketing y Newsletter (Opcional, desmarcada) */}
              <label className="flex items-start gap-3 cursor-pointer select-none pt-1 border-t border-blue-100">
                <input
                  type="checkbox"
                  id="consent-marketing"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-600 leading-snug">
                  {t('form.contract.checkboxMarketing')}
                </span>
              </label>

              {!canAccept && (
                <p className="text-xs text-amber-700 font-medium pt-1">
                  ⚠️ {t('form.contract.requiredConsentsNote')}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={onReject}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold order-2 sm:order-1"
              >
                {t('form.contract.rejectButton')}
              </button>
              <button
                type="button"
                disabled={!canAccept}
                onClick={handleAcceptClick}
                className={`px-8 py-3 rounded-lg font-semibold transition-all order-1 sm:order-2 ${
                  canAccept
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg cursor-pointer transform hover:scale-[1.02]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-75'
                }`}
              >
                {t('form.contract.acceptButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractStep;

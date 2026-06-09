// apps/dashboard/src/components/CoachContractStep.tsx
// Contrato para coaches/asesores con soporte i18n

import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface CoachContractStepProps {
  onAccept: () => void;
  onReject: () => void;
  isTrial?: boolean;
}

const CoachContractStep: React.FC<CoachContractStepProps> = ({ onAccept, onReject, isTrial = false }) => {
  const { t } = useTranslation();
  const subscriptionAmount = process.env.NEXT_PUBLIC_COACH_SUBSCRIPTION_AMOUNT || '150';

  const bgGradient = isTrial
    ? 'from-emerald-400 via-emerald-500 to-emerald-600'
    : 'from-blue-400 via-blue-500 to-blue-600';
  const accentColor = isTrial ? 'text-emerald-700' : 'text-blue-700';
  const sectionTitleColor = isTrial ? 'text-emerald-700' : 'text-blue-700';
  const btnColor = isTrial ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} py-12 px-4`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8">
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
            <h1 className={`text-3xl font-bold text-center ${accentColor} mb-8`}>
              {t('register.contract.title')}
            </h1>

            <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto mb-8">
              <div className="space-y-6 text-gray-700">
                <section>
                  <h2 className={`text-xl font-semibold ${sectionTitleColor} mb-2`}>
                    {t('register.contract.section1Title')}
                  </h2>
                  <p className="text-sm">{t('register.contract.section1Content')}</p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    {(t('register.contract.section1Items', { returnObjects: true }) as string[]).map(
                      (item: string, i: number) => <li key={i}>{item}</li>
                    )}
                  </ul>
                </section>

                <section>
                  <h2 className={`text-xl font-semibold ${sectionTitleColor} mb-2`}>
                    {t('register.contract.section2Title')}
                  </h2>
                  <p className="text-sm">
                    {t('register.contract.section2Content')}{' '}
                    <strong>{t('register.contract.section2Price', { amount: subscriptionAmount })}</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    {(t('register.contract.section2Items', { returnObjects: true }) as string[]).map(
                      (item: string, i: number) => <li key={i}>{item}</li>
                    )}
                  </ul>
                </section>

                <section>
                  <h2 className={`text-xl font-semibold ${sectionTitleColor} mb-2`}>
                    {t('register.contract.section3Title')}
                  </h2>
                  <p className="text-sm">{t('register.contract.section3Intro')}</p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    {(t('register.contract.section3Items', { returnObjects: true }) as string[]).map(
                      (item: string, i: number) => <li key={i}>{item}</li>
                    )}
                  </ul>
                </section>

                <section>
                  <h2 className={`text-xl font-semibold ${sectionTitleColor} mb-2`}>
                    {t('register.contract.section4Title')}
                  </h2>
                  <p className="text-sm">{t('register.contract.section4Content')}</p>
                </section>

                <section>
                  <h2 className={`text-xl font-semibold ${sectionTitleColor} mb-2`}>
                    {t('register.contract.section5Title')}
                  </h2>
                  <p className="text-sm">{t('register.contract.section5Content')}</p>
                </section>

                <section>
                  <h2 className={`text-xl font-semibold ${sectionTitleColor} mb-2`}>
                    {t('register.contract.section6Title')}
                  </h2>
                  <p className="text-sm">{t('register.contract.section6Content')}</p>
                </section>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                {t('register.contract.acceptInfo')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onReject}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                {t('register.contract.rejectButton')}
              </button>
              <button
                onClick={onAccept}
                className={`px-8 py-3 text-white rounded-lg transition-colors font-semibold ${btnColor}`}
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

// apps/form/src/components/ContractStep.tsx
// Contrato de servicios de coaching para clientes — i18n 6 idiomas (v1.0)
// Las traducciones viven en apps/form/src/lib/i18n.ts bajo el namespace form.contract

import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface ContractStepProps {
  onAccept: () => void;
  onReject: () => void;
}

// Número total de secciones del contrato (1..14)
const TOTAL_SECTIONS = 14;

const ContractStep: React.FC<ContractStepProps> = ({ onAccept, onReject }) => {
  const { t } = useTranslation();

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
          <div className="p-8">
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

            <h1 className="text-3xl font-bold text-center text-blue-800 mb-2">
              {t('form.contract.title')}
            </h1>
            <p className="text-center text-sm text-gray-500 mb-8">
              {t('form.contract.version')}
            </p>

            <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto mb-8">
              <div className="space-y-6 text-gray-700">
                {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((section) => {
                  const title = t(`form.contract.section${section}Title`, { defaultValue: '' });
                  const intro = getText(section, 'Intro');
                  const content = getText(section, 'Content');
                  const items = getItems(section);

                  if (!title && !content && !intro && !items) return null;

                  return (
                    <section key={section}>
                      <h2 className="text-xl font-semibold text-blue-700 mb-2">{title}</h2>
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

            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">{t('form.contract.acceptInfo')}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onReject}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                {t('form.contract.rejectButton')}
              </button>
              <button
                onClick={onAccept}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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

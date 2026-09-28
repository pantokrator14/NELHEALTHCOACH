import React from 'react';
import { useTranslation } from 'react-i18next';
import { landingContactUrl } from '@/lib/links';
import '@/lib/i18n';

/**
 * Llamada a la acción al final de cada entrada: lleva al formulario de la
 * sesión gratuita en la landing (sección de contacto, abierta directamente).
 */
const PostCta: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="mt-10 bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-6 sm:p-8 text-white text-center">
      <h2 className="text-xl sm:text-2xl font-bold mb-2">{t('cta.title')}</h2>
      <p className="text-blue-100 mb-6 max-w-xl mx-auto">{t('cta.text')}</p>
      <a
        href={landingContactUrl()}
        className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
      >
        {t('cta.button')}
      </a>
    </section>
  );
};

export default PostCta;

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const MethodSection: React.FC = () => {
  const { t } = useTranslation();
  const methods = [
    {
      id: 1,
      titleKey: 'landing.method.personalized.title',
      icon: "🥗",
      desckey: 'landing.method.personalized.description'
    },
    {
      id: 2,
      titleKey: 'landing.method.exercise.title',
      icon: "💪",
      desckey: 'landing.method.exercise.description'
    },
    {
      id: 3,
      titleKey: 'landing.method.habits.title',
      icon: "🔄",
      desckey: 'landing.method.habits.description'
    },
    {
      id: 4,
      titleKey: 'landing.method.mindset.title',
      icon: "🧠",
      desckey: 'landing.method.mindset.description'
    }
  ];

  return (
    <section id="metodo" className="min-h-screen py-16 px-4 bg-gray-50 flex items-center">
      <div className="container mx-auto max-w-6xl w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-500 text-center mb-4">{t('landing.method.title')}</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          {t('landing.method.subtitle')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {methods.map((method) => (
            <div 
              key={method.id} 
              className="bg-white p-6 rounded-xl shadow-md text-center transition-transform hover:scale-105"
            >
              <div className="text-4xl mb-4">{method.icon}</div>
              <h3 className="text-xl text-blue-500 font-bold mb-3">{t(method.titleKey)}</h3>
              <p className="text-gray-600">{t(method.desckey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MethodSection;
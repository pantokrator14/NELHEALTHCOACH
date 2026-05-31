import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const AboutSection: React.FC = () => {
  const { t } = useTranslation();
  const badges = [
    t('landing.about.badge1'),
    t('landing.about.badge2'),
    t('landing.about.badge3')
  ];

  return (
    <section id="sobre-mi" className="bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white min-h-screen py-16 px-4 flex items-center">
      <div className="container mx-auto max-w-6xl w-full">
        <h2 className="text-3xl text-white md:text-4xl font-bold text-center mb-16">{t('landing.about.title')}</h2>
        
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-10 lg:gap-12">
          <div className="w-full max-w-[350px] lg:max-w-none lg:w-[40%]">
            <div className="relative w-full h-96 lg:h-full">
             <Image
               src="/images/about/nelhealthcoach.jpeg"
               alt="Manuel Martínez | NelHealthCoach"
               fill
               className="rounded-2xl shadow-2xl hover:scale-[1.02] transition-transform duration-300 object-cover"
               priority
             />
            </div>
          </div>
          
          <div className="lg:w-[60%] w-full text-center lg:text-left">
            <h3 className="text-2xl text-white font-bold mb-4">{t('landing.about.subtitle')}</h3>
            <p className="mb-4 text-white">
              {t('landing.about.description1')}
            </p>
            <p className="mb-4 text-white">
              {t('landing.about.description2')}
            </p>
            <p className="mb-6 text-white">
              {t('landing.about.description3')}
            </p>
            <p className="mb-6 text-white">
              {t('landing.about.description4')}
            </p>
            <p className="mb-6 text-white">
              {t('landing.about.description5')}
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {badges.map((badge, index) => (
                <div 
                  key={index} 
                  className="bg-blue-100 text-blue-800 py-2 px-4 rounded-full text-sm font-medium"
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
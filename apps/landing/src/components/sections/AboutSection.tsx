import React from 'react';
import Image from 'next/image';

const AboutSection: React.FC = () => {
  return (
    <section id="sobre-mi" className="section-padding">
      <div className="container mx-auto max-w-6xl">
        <h2 className="section-title">¿Pero quién soy yo?</h2>
        
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="lg:w-1/2 w-full">
            <div className="relative h-96 w-full rounded-xl overflow-hidden shadow-xl">
              <Image
                src="/images/nelhealthcoach.jpg"
                alt="Nel Health Coach"
                fill
                className="object-cover"
                quality={90}
              />
            </div>
          </div>
          
          <div className="lg:w-1/2 w-full">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Mi nombre es Manuel Martínez</h3>
            <p className="text-gray-700 mb-4">
              Con más de 10 años de experiencia en coaching de salud y nutrición, he ayudado a cientos de personas a transformar sus vidas.
            </p>
            <p className="text-gray-700 mb-4">
              Mi enfoque combina la sabiduría ancestral con las últimas investigaciones científicas para crear un método único que realmente funciona.
            </p>
            <p className="text-gray-700 mb-6">
              Certificado en Nutrición Holística y Especialista en Dieta Keto, mi pasión es guiarte hacia la mejor versión de ti mismo.
            </p>
            
            <div className="flex flex-wrap gap-3">
              {[
                "Certificación Internacional", 
                "+500 Clientes Transformados", 
                "Especialista en Keto"
              ].map((badge, index) => (
                <div 
                  key={index} 
                  className="bg-blue-100 text-blue-800 py-2 px-4 rounded-full font-medium whitespace-nowrap"
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
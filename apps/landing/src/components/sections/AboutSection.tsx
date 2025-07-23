import React from 'react';
import Image from 'next/image';

const AboutSection: React.FC = () => {
  return (
    <section id="sobre-mí" className="section-padding">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">¿Pero quién soy yo?</h2>
        
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2">
            <div className="relative h-96 w-full rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/images/nelhealthcoach.jpg"
                alt="Nel Health Coach"
                fill
                className="object-cover"
                quality={90}
              />
            </div>
          </div>
          
          <div className="lg:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Mi nombre es Manuel Martinez.</h3>
            <p className="text-gray-700 mb-4">
              Con más de 10 años de experiencia en coaching de salud y nutrición, he ayudado a cientos de personas a transformar sus vidas.
            </p>
            <p className="text-gray-700 mb-4">
              Mi enfoque combina la sabiduría ancestral con las últimas investigaciones científicas para crear un método único que realmente funciona.
            </p>
            <p className="text-gray-700 mb-6">
              Certificado en Nutrición Holística y Especialista en Dieta Keto, mi pasión es guiarte hacia la mejor versión de ti mismo.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-blue-100 text-blue-800 py-2 px-4 rounded-full font-medium">
                Certificación Internacional
              </div>
              <div className="bg-blue-100 text-blue-800 py-2 px-4 rounded-full font-medium">
                +500 Clientes Transformados
              </div>
              <div className="bg-blue-100 text-blue-800 py-2 px-4 rounded-full font-medium">
                Especialista en Keto
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
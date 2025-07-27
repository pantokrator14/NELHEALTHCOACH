import React from 'react';
import Image from 'next/image';

/**
 * Sección biográfica con:
 * - Título "¿Pero quién soy yo?"
 * - Foto a la izquierda (en escritorio) o arriba (en móvil)
 * - Biografía a la derecha (en escritorio) o abajo (en móvil)
 * - Badges de certificaciones y logros
 */
const AboutSection: React.FC = () => {
  return (
    <section id="sobre-mi" className="bg-blue-500 min-h-screen py-16 px-4 flex items-center">
      <div className="container mx-auto max-w-6xl w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Pero... ¿Quién soy yo?</h2>
        
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div>
             <Image
               src="/images/about/nelhealthcoach.jpg"
               alt="Nel Health Coach"
               width={600}
               height={800}
              className="w-full h-auto rounded-xl shadow-lg"
              priority
            />
          </div>
          
          <div className="lg:w-1/2 w-full">
            <h3 className="text-2xl font-bold mb-4">Mi nombre es Manuel Martinez.</h3>
            <p className="mb-4">
              Con más de 10 años de experiencia en coaching de salud y nutrición, he ayudado a cientos de personas a transformar sus vidas.
            </p>
            <p className="mb-4">
              Mi enfoque combina la sabiduría ancestral con las últimas investigaciones científicas para crear un método único que realmente funciona.
            </p>
            <p className="mb-6">
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
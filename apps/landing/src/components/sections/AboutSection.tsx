import React from 'react';

/**
 * Sección biográfica con:
 * - Título "¿Pero quién soy yo?"
 * - Foto a la izquierda (en escritorio) o arriba (en móvil)
 * - Biografía a la derecha (en escritorio) o abajo (en móvil)
 * - Badges de certificaciones y logros
 */
const AboutSection: React.FC = () => {
  return (
    <section id="sobre-mi" className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Pero... ¿Quién soy yo?</h2>
        
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="lg:w-1/2 w-full">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-96" />
          </div>
          
          <div className="lg:w-1/2 w-full">
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
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
    <section id="sobre-mi" className="bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 min-h-screen py-16 px-4 flex items-center">
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
            <h3 className="text-2xl font-bold mb-4">Mi nombre es Manuel Martínez.</h3>
            <p className="mb-4">
              Soy un hombre cuya vida dio un giro radical tras comprender la manipulación en la alimentación y la medicina moderna.
            </p>
            <p className="mb-4">
              En mi recorrido por este camino que es la vida, así como el gusto por ella, además de mi aprendizaje diario, he comprendido que en todo nos han manipulado, he aprendido y he tenido experiencias familiares que me han llevado hacia un cambio. 
            </p>
            <p className="mb-6">
              Esta experiencia me impulsó a obtener una CERTIFICACIÓN EN NUTRICIÓN MODERNA para fortalecer a las mujeres, a quienes considero el pilar de la sociedad. Mi misión es ayudar a las familias a liberarse de la dependencia de productos procesados y de la desinformación, promoviendo la alimentación como medicina y la importancia de escuchar al propio cuerpo para prevenir y revertir enfermedades.
            </p>
            
            <div className="flex flex-wrap gap-3">
              {[
                "COACH CERTIFICADO EN NUTRICIÓN MODERNA", 
                "+50 Clientes Transformados", 
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
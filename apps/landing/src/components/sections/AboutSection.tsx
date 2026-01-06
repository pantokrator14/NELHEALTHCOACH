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
               src="/images/about/nelhealthcoach.png"
               alt="Manuel Martínez | NelHealthCoach"
               width={600}
               height={800}
              className="w-full h-auto rounded-xl shadow-lg"
              priority
            />
          </div>
          
          <div className="lg:w-1/2 w-full">
            <h3 className="text-2xl font-bold mb-4">Mi nombre es Manuel Martínez.</h3>
            <p className="mb-4">
              Durante la pandemia comprendí que <strong>muchos alimentos enferman y que la medicina convencional a menudo solo alivia síntomas, sin abordar la causa de raíz.</strong>
            </p>
            <p className="mb-4">
              Decidí escuchar a mi cuerpo y mi vida cambió por completo: <strong>descubrí que la mejor medicina es la alimentación ancestral.</strong>
            </p>
            <p className="mb-6">
              Un claro ejemplo es mi hija, quien tomó medicamentos para la tiroides durante diez años sin mejorar. Al cambiar su alimentación, recuperó su salud de forma natural.
            </p>
            <p className="mb-6">
              Estas experiencias me impulsaron a formarme con <strong>dos certificaciones en nutrición</strong> para acompañar y empoderar a otras personas a liberarse de esa dependencia.
Esta es mi historia… y podría ser la tuya.
            </p>
            <p className="mb-6">
              <strong>La alimentación es tu mejor medicina.</strong>
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
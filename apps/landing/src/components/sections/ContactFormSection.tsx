import React from 'react';

const ContactFormSection: React.FC = () => {
  const openCalendly = () => {
    window.open(
      'https://calendly.com/nelhealthcoach/30min',
      '_blank',
      'noopener,noreferrer,width=800,height=600'
    );
  };

  return (
    <section id="contacto" className="py-16 px-4 bg-blue-200">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="md:flex">
            {/* Panel izquierdo - Beneficios */}
            <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Hablamos?</h2>
              <p className="mb-6 text-xl text-blue-100">
                Prepárate para tomar el control de tu vida de una vez por todas.
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">Sesión personalizada de 60 minutos</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">Análisis inicial de tus objetivos</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">Plan de acción personalizado</span>
                </li>
              </ul>
            </div>
            
            {/* Panel derecho - Botón único */}
            <div className="md:w-1/2 p-12 flex flex-col justify-center items-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Agenda tu sesión gratuita
              </h3>
              
              <p className="text-gray-600 mb-6 text-center">
                Elige el día y hora que mejor te convenga en solo 2 clics
              </p>
              
              {/* BOTÓN ÚNICO */}
              <button
                onClick={openCalendly}
                className="px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">📅</span>
                <span>Ver horarios disponibles</span>
              </button>
              
              <div className="mt-8 space-y-4">
                <p className="text-gray-500 text-sm text-center flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Sin registros necesario
                </p>
                <p className="text-gray-500 text-sm text-center flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Recibirás confirmación por email
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactFormSection;
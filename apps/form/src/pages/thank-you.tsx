import Image from 'next/image';
import { useRouter } from 'next/router';
import React from 'react';
import { useEffect } from 'react';

const ThankYouPage = () => {
  const router = useRouter();
  const { status } = router.query;

  useEffect(() => {
    if (status === 'rejected') {
      // Opcional: Registrar el rechazo
      console.log('Usuario rechazó el contrato');
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-16">
            <Image
              src="/logo.png"
              alt="NELHEALTHCOACH"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {status === 'rejected' ? 'Gracias por su interés' : '¡Formulario Enviado!'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {status === 'rejected' 
            ? 'Lamentamos que no haya podido continuar. Si cambia de opinión, estaremos aquí para ayudarle.'
            : 'Hemos recibido su información de forma segura. Nos pondremos en contacto con usted pronto para programar su sesión.'}
        </p>

        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default ThankYouPage;
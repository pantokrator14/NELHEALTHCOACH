import React from 'react';
import Image from 'next/image';

const SuccessStep: React.FC = () => {
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
          ¡Formulario Completado!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Gracias por completar el formulario de salud. Hemos recibido tu información de forma segura y puedes cerrar esta ventana.
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-700">
            <strong>Próximos pasos:</strong> Revisaremos tu información y te contactaremos dentro de las próximas 24-48 horas para coordinar una sesión.
          </p>
        </div>

      </div>
    </div>
  );
};

export default SuccessStep;
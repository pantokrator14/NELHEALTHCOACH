import React from 'react';

interface ContractStepProps {
  onAccept: () => void;
  onReject: () => void;
}

const ContractStep: React.FC<ContractStepProps> = ({ onAccept, onReject }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">
            CONTRATO DE COACHING EN NUTRICIÓN Y BIENESTAR
          </h1>
          
          <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto mb-8">
            <div className="space-y-4 text-gray-700">
              <section>
                <h2 className="text-xl font-semibold text-blue-700 mb-2">1. SERVICIOS PRESTADOS</h2>
                <p className="text-sm">
                  El Coach se compromete a proporcionar servicios de coaching en salud y bienestar 
                  enfocados en nutrición, hábitos de vida y cambios conductuales para ayudar al 
                  Cliente a alcanzar sus metas personales de bienestar.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-blue-700 mb-2">2. NATURALEZA DE LA RELACIÓN</h2>
                <p className="text-sm">
                  El Cliente reconoce que el coaching no constituye asesoramiento médico, 
                  psicoterapia o tratamiento diagnóstico. El Coach no prescribe dietas, 
                  tratamientos o medicamentos.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-blue-700 mb-2">5. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</h2>
                <p className="text-sm">
                  Toda la información compartida por el Cliente se mantendrá estrictamente 
                  confidencial. NELHEALTHCOACH cumple con las regulaciones de protección de 
                  datos incluyendo HIPAA, CCPA/CPRA y leyes estatales aplicables.
                </p>
              </section>

              {/* Resto del contrato... */}
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              Al hacer clic en &quot;Aceptar&quot;, usted reconoce haber leído y entendido 
              los términos de este contrato y da su consentimiento para el 
              tratamiento de sus datos según lo establecido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onReject}
              className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
            >
              Rechazar
            </button>
            <button
              onClick={onAccept}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractStep;
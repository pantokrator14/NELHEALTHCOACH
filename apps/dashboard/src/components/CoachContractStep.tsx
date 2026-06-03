// apps/dashboard/src/components/CoachContractStep.tsx
// Contrato específico para coaches/asesores

import React from 'react';
import Image from 'next/image';

interface CoachContractStepProps {
  onAccept: () => void;
  onReject: () => void;
}

const CoachContractStep: React.FC<CoachContractStepProps> = ({ onAccept, onReject }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-16">
                <Image
                  src="/logo2.png"
                  alt="NELHEALTHCOACH"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">
              Contrato de Asesor / Coach
            </h1>

            <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto mb-8">
              <div className="space-y-6 text-gray-700">
                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">1. SERVICIOS DEL COACH</h2>
                  <p className="text-sm">
                    El Coach se compromete a proporcionar servicios de coaching en salud y bienestar
                    a los clientes asignados, incluyendo:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>Planes de acción personalizados para cada cliente.</li>
                    <li>Sesiones de seguimiento mensuales por videollamada.</li>
                    <li>Recursos educativos sobre nutrición y bienestar.</li>
                    <li>Apoyo motivacional y seguimiento continuo.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">2. TARIFAS Y SUSCRIPCIÓN</h2>
                  <p className="text-sm">
                    El acceso a la plataforma de NELHEALTHCOACH como coach tiene un costo de
                    <strong> ${process.env.NEXT_PUBLIC_COACH_SUBSCRIPTION_AMOUNT || '150'} USD mensuales</strong>.
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>El pago se realiza mediante suscripción mensual automática.</li>
                    <li>La suscripción se renueva cada mes hasta que sea cancelada.</li>
                    <li>Puedes cancelar en cualquier momento desde el portal de facturación.</li>
                    <li>Al cancelar, conservarás acceso hasta el final del período pagado.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">3. RESPONSABILIDADES</h2>
                  <p className="text-sm">El Coach se compromete a:</p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>Mantener la confidencialidad de todos los datos de los clientes.</li>
                    <li>Cumplir con las regulaciones HIPAA y CCPA en el manejo de datos.</li>
                    <li>Proporcionar un ambiente profesional y de apoyo.</li>
                    <li>Mantener límites profesionales y éticos.</li>
                    <li>Utilizar la plataforma asignada para todas las comunicaciones con clientes.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">4. PROPIEDAD INTELECTUAL</h2>
                  <p className="text-sm">
                    Los materiales, metodologías y recursos proporcionados por NELHEALTHCOACH son
                    propiedad de la empresa y no pueden ser compartidos, reproducidos o utilizados
                    fuera de la plataforma sin autorización expresa.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">5. TERMINACIÓN</h2>
                  <p className="text-sm">
                    Cualquiera de las partes puede terminar este acuerdo con 7 días de notificación.
                    Al terminar la suscripción, el Coach deberá completar las sesiones pendientes
                    con sus clientes activos o transferirlos a otro coach asignado por la empresa.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">6. LEY APLICABLE</h2>
                  <p className="text-sm">
                    Este acuerdo se regirá por las leyes del estado de California, y cualquier
                    disputa se resolverá en los tribunales de Riverside, California.
                  </p>
                </section>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                Al hacer clic en &quot;Aceptar&quot;, confirmas que has leído y aceptas los términos
                de este contrato y autorizas el cobro mensual de la suscripción.
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
                Aceptar y continuar al pago
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachContractStep;

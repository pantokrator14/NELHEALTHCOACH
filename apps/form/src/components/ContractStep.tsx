import React from 'react';
import Image from 'next/image';

interface ContractStepProps {
  onAccept: () => void;
  onReject: () => void;
}

const ContractStep: React.FC<ContractStepProps> = ({ onAccept, onReject }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
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
            <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">
              CONTRATO DE COACHING EN NUTRICIÓN Y BIENESTAR
            </h1>
            
            <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto mb-8">
              <div className="space-y-6 text-gray-700">
                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">1. SERVICIOS PRESTADOS</h2>
                  <p className="text-sm">
                    NELHEALTHCOACH, a partir de ahora &quot;el Coach&quot;, se compromete a proporcionar servicios de coaching en salud y bienestar
                    enfocados en nutrición, hábitos de vida y cambios conductuales para ayudar al
                    Cliente a alcanzar sus metas personales de bienestar. Los servicios pueden incluir, entre otros:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>Planes de acción personalizados.</li>
                    <li>Recursos educativos sobre nutrición y bienestar.</li>
                    <li>Guía para la formación de hábitos y establecimiento de metas.</li>
                    <li>Apoyo motivacional y seguimiento.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">2. NATURALEZA DE LA RELACIÓN</h2>
                  <p className="text-sm">
                    El Cliente reconoce que:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>El coaching <strong>no constituye asesoramiento médico, psicoterapia o tratamiento diagnóstico</strong>.</li>
                    <li>El Coach no prescribe dietas, tratamientos o medicamentos.</li>
                    <li>Se recomienda al Cliente consultar con un profesional de la salud antes de realizar cambios significativos en su estilo de vida.</li>
                    <li>El coaching es un proceso colaborativo, y los resultados dependen en gran medida del compromiso y participación del Cliente.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">3. RESPONSABILIDADES DEL CLIENTE</h2>
                  <p className="text-sm">
                    El Cliente se compromete a:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>Proporcionar información completa y veraz sobre su salud y estilo de vida.</li>
                    <li>Participar activa y honestamente en todas las sesiones.</li>
                    <li>Completar las tareas acordadas entre sesiones.</li>
                    <li>Informar al Coach sobre cualquier problema físico, emocional o mental que surja durante el proceso.</li>
                    <li>Buscar apoyo médico o psicológico profesional si es necesario.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">4. RESPONSABILIDADES DEL COACH</h2>
                  <p className="text-sm">
                    El Coach se compromete a:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>Proporcionar un ambiente confidencial, de apoyo y sin juicios.</li>
                    <li>Utilizar la información proporcionada por el Cliente para personalizar las sesiones.</li>
                    <li>Mantener límites profesionales y éticos en todo momento.</li>
                    <li>Respetar la privacidad y autonomía del Cliente.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">5. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</h2>
                  
                  <h3 className="text-lg font-semibold text-blue-600 mb-2 mt-4">5.1. Información confidencial</h3>
                  <p className="text-sm">
                    Toda la información compartida por el Cliente—incluyendo datos personales, de salud y estilo de vida—se mantendrá estrictamente confidencial, a menos que la divulgación sea requerida por ley.
                  </p>

                  <h3 className="text-lg font-semibold text-blue-600 mb-2 mt-4">5.2. Cumplimiento normativo</h3>
                  <p className="text-sm">
                    NELHEALTHCOACH cumple con las regulaciones de protección de datos, incluyendo:
                  </p>
                  <ul className="list-disc list-inside mt-1 text-sm ml-4">
                    <li><strong>HIPAA</strong> (Ley de Portabilidad y Responsabilidad de Seguros de Salud)</li>
                    <li><strong>CCPA/CPRA</strong> (Ley de Privacidad del Consumidor de California/Derechos de Privacidad)</li>
                    <li>Leyes estatales aplicables</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-blue-600 mb-2 mt-4">5.3. Uso de los datos</h3>
                  <p className="text-sm">
                    Los datos del Cliente se utilizarán únicamente para:
                  </p>
                  <ul className="list-disc list-inside mt-1 text-sm ml-4">
                    <li>Diseñar e impartir los servicios de coaching.</li>
                    <li>Realizar seguimiento del progreso y evaluar resultados.</li>
                    <li>Comunicaciones relacionadas con el coaching.</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-blue-600 mb-2 mt-4">5.4. Almacenamiento y seguridad de datos</h3>
                  <ul className="list-disc list-inside mt-1 text-sm ml-4">
                    <li>Los registros electrónicos se almacenan en plataformas compatibles con HIPAA.</li>
                    <li>Los documentos físicos se guardan bajo llave.</li>
                    <li>Los datos se conservarán durante cinco años después de finalizada la relación de coaching.</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-blue-600 mb-2 mt-4">5.5. Excepciones a la confidencialidad</h3>
                  <p className="text-sm">
                    La confidencialidad podrá verse suspendida si:
                  </p>
                  <ul className="list-disc list-inside mt-1 text-sm ml-4">
                    <li>Existe riesgo de daño para el Cliente u otras personas.</li>
                    <li>Es requerido por orden judicial o ley.</li>
                    <li>Se sospecha abuso de menores o adultos vulnerables.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">6. CONSENTIMIENTO INFORMADO E HISTORIAL DE SALUD</h2>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li>El Cliente completará un Formulario de Historial de Salud para personalizar el programa.</li>
                    <li>El Cliente consiente el uso de esta información únicamente para fines de coaching.</li>
                    <li>El Cliente puede solicitar acceder, corregir o eliminar sus datos en cualquier momento.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">7. DETALLES DE LAS SESIONES</h2>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li><strong>Duración:</strong> Cada sesión tendrá una duración de 60 minutos.</li>
                    <li><strong>Frecuencia:</strong> Las sesiones se realizarán mensualmente.</li>
                    <li><strong>Plataforma:</strong> Las sesiones se llevarán a cabo mediante videollamadas a través de Google Meets o Zoom.</li>
                    <li><strong>Reagendación/Cancelación:</strong> Las cancelaciones o cambios de la sesión con menos de 24 horas de antelación podrán generar un cargo de 15%.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">8. HONORARIOS Y PAGOS</h2>
                  <ul className="list-disc list-inside mt-2 text-sm ml-4">
                    <li><strong>Estructura de honorarios:</strong> 150$ por sesión.</li>
                    <li><strong>Métodos de pago:</strong> Zelle, transferencia bancaria (BOFA).</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">9. PROPIEDAD INTELECTUAL</h2>
                  <p className="text-sm">
                    Todos los materiales proporcionados por el Coach (libros de trabajo, planes, recursos) son para uso personal del Cliente y no pueden compartirse, reproducirse o revenderse.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">10. TERMINACIÓN DEL CONTRATO</h2>
                  <p className="text-sm">
                    Cualquiera de las partes puede terminar este acuerdo con <strong>7 días de notificación por escrito</strong>. Tras la terminación, el Cliente pagará por todos los servicios prestados hasta la fecha de terminación.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">11. EXENCIÓN DE RESPONSABILIDAD</h2>
                  <p className="text-sm">
                    El Cliente comprende que el coaching no sustituye la atención médica o de salud mental. El Coach no se hace responsable de lesiones, daños o pérdidas resultantes de las acciones o decisiones del Cliente basadas en las sesiones de coaching.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-blue-700 mb-2">12. LEY APLICABLE</h2>
                  <p className="text-sm">
                    Este acuerdo se regirá por las leyes del estado de California, y cualquier disputa se resolverá en los tribunales de Riverside, California.
                  </p>
                </section>
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
    </div>
  );
};

export default ContractStep;
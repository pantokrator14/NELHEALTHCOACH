import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Image from 'next/image';
import { medicalDataSchema } from '@/lib/validation';

interface MedicalDataStepProps {
  data: any;
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const MedicalDataStep: React.FC<MedicalDataStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  const yesNoQuestions = [
    {
      section: 'carbohydrateAddiction',
      title: 'Adicción a los carbohidratos',
      questions: [
        '¿El primer alimento que consumes en el día es de sabor dulce (azúcar o carbohidrato)?',
        '¿Consumes alimentos procesados (los que tienen más de 5 ingredientes)?',
        'Durante el último año ¿has comido más azúcar de lo que pretendías?',
        '¿Alguna vez has dejado de hacer tus actividades cotidianas por comer alimentos con azúcar?',
        '¿Sientes que necesitas o que deberías reducir tu consumo de azúcar?',
        '¿Alguna vez has comido alimentos con azúcar para calmar una emoción (fatiga, tristeza, enojo, aburrimiento)?',
        '¿Haces más de 5 comidas al día? ¿Comes cada 3-4 horas?',
        '¿Te da dolor de cabeza si pasas más de 4 horas sin comer?',
        '¿Piensas constantemente en alimentos con azúcar?',
        '¿Crees que debes terminar la comida con un alimento dulce?',
        '¿Sientes que no tienes control en lo que comes?'
      ]
    },
    {
      section: 'leptinResistance',
      title: 'Resistencia a la leptina',
      questions: [
        '¿Tienes sobrepeso u obesidad?',
        '¿Tienes hambre constantemente?',
        '¿Tienes antojos por carbohidratos, especialmente por las noches?',
        '¿Tienes problemas para dormir? (insomnio)',
        '¿Te sientes sin energía durante el día?',
        '¿Sientes que al despertar no descansaste bien durante la noche?',
        '¿Te ejercitas menos de 30 minutos al día?',
        '¿Te saltas el desayuno?'
      ]
    },
    {
      section: 'circadianRhythms',
      title: 'Alteración de los ritmos circadianos / Exposición al sol',
      questions: [
        '¿Lo primero que ves al despertar es tu celular?',
        '¿Entra luz artificial a tu habitación al momento de dormir?',
        '¿Estás expuesto a la luz artificial después del atardecer? (pantallas de computadoras, televisiones, celulares, tablets, focos de luz blanca o amarilla)',
        '¿Utilizas algún tipo de tecnología Wifi, 2G, 3G, 4G, 5G y/o luz artificial durante la noche?',
        '¿Exponerte al sol te hace daño (sufres quemaduras)?',
        '¿Utilizas gafas/lentes solares?',
        '¿Utilizas cremas o protectores solares?',
        '¿Comes pocos pescados, moluscos y/o crustáceos (menos de 1 vez a la semana)?',
        '¿Comes cuando ya no hay luz del sol?',
        '¿Tu exposición al sol es de menos de 30 minutos al día?',
        '¿Haces grounding (caminar descalzo sobre hierba, tierra, o arena) menos de 30 minutos al día?'
      ]
    },
    {
      section: 'sleepHygiene',
      title: 'Alteración en la higiene del sueño',
      questions: [
        '¿Duermes con el celular encendido cerca de ti?',
        '¿Te despiertas con la alarma del celular?',
        '¿La temperatura de tu habitación es muy caliente o muy fría?',
        '¿Entra luz artificial a tu habitación al momento de dormir?',
        '¿La cabecera de tu cama está pegada a la pared?',
        '¿Duermes con el wifi de tu casa encendido?',
        '¿Te duermes después de las 11 pm?',
        'Cuando te despiertas ¿ya amaneció?',
        '¿Duermes menos de 4 horas?',
        '¿Haces cenas copiosas?',
        '¿Te acuestas inmediatamente después de cenar?'
      ]
    },
    {
      section: 'electrosmogExposure',
      title: 'Exposición al electrosmog',
      questions: [
        'Al hacer llamadas por celular ¿te lo pegas a la oreja?',
        '¿Llevas el celular cerca de tu cuerpo (por ejemplo: en el bolsillo del pantalón)?',
        '¿Vives cerca de líneas de alta tensión?',
        '¿Utilizas el microondas?',
        '¿Presentas cansancio general durante el día? O ¿Duermes en exceso?',
        '¿Tienes piel sensible o con erupciones?',
        '¿Tienes taquicardia o arritmia?',
        '¿Tienes problemas de presión arterial?',
        '¿Tienes colon irritable?',
        '¿Tienes pérdida auditiva, oyes un zumbido (tinitus) o te duelen los oídos?'
      ]
    },
    {
      section: 'generalToxicity',
      title: 'Toxicidad general',
      questions: [
        '¿Bebes agua embotellada?',
        '¿Utilizas protector solar convencional?',
        '¿Algún miembro de tu familia ha sido diagnosticado con fibromialgia, fatiga crónica o sensibilidades químicas múltiples?',
        '¿Tienes algún historial de disfunción renal?',
        '¿Tienes tú o algún miembro de tu familia inmediata antecedentes de cáncer?',
        '¿Tienes algún historial de enfermedad cardíaca, infarto de miocardio (ataque cardíaco) o de accidentes cerebrovasculares?',
        '¿Alguna vez te han diagnosticado trastorno bipolar, esquizofrenia o depresión?',
        '¿Alguna vez te han diagnosticado diabetes o tiroiditis?'
      ]
    },
    {
      section: 'microbiotaHealth',
      title: 'Salud de la microbiota',
      questions: [
        '¿Sufres de estreñimiento o de diarrea?',
        '¿Sientes distensión, hinchazón, sensación de saciedad y/o ruidos en el intestino después de comer carbohidratos como brócoli, coles de Bruselas u otras verduras?',
        '¿Tienes a menudo gases con olor desagradable como a azufre?',
        '¿Alguna vez has sido vegano o vegetariano durante algún tiempo?',
        '¿Tienes intolerancia a la carne?',
        '¿Has usado o utilizas antiácidos, inhibidores de la bomba de protones o cualquier otro medicamento que bloquee el ácido?',
        'Cuando consumes alcohol, ¿tienes confusión mental o una sensación tóxica incluso después de 1 porción?',
        '¿Has tomado antibióticos durante un período prolongado o con frecuencia (aún de niño)?',
        '¿Naciste por cesárea?',
        '¿Tomaste leche de fórmula en lugar de ser amamantado?'
      ]
    }
  ];

  // Función para manejar el envío del formulario
  const handleFormSubmit = (formData: any) => {
    onSubmit(formData);;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        

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
            <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
              Información Médica y de Vida
            </h2>
            
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
              {/* Campos de texto */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Cuál es tu mayor queja? Por favor enlista todos los síntomas y cuándo comenzaron *
                  </label>
                  <textarea
                    rows={4}
                    {...register('mainComplaint')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Describe detalladamente tus síntomas..."
                  />
                  {errors.mainComplaint && (
                    <p className="text-red-500 text-sm mt-1">{errors.mainComplaint.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Qué medicamentos estás tomando?
                  </label>
                  <textarea
                    rows={3}
                    {...register('medications')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Lista los medicamentos y dosis..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Qué suplementos estás tomando? (vitaminas y/o minerales)
                  </label>
                  <textarea
                    rows={3}
                    {...register('supplements')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Lista los suplementos que tomas..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indica tus condiciones de salud actuales y pasadas (por ejemplo: Diabetes Mellitus, Hipertensión, etc.)
                  </label>
                  <textarea
                    rows={3}
                    {...register('currentPastConditions')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Describe tus condiciones de salud..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Hay algo más en tu historial médico que debamos considerar? (incluso de tu niñez)
                  </label>
                  <textarea
                    rows={3}
                    {...register('additionalMedicalHistory')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Información adicional de tu historial médico..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Cuál es tu historial de empleos? Por favor incluye un breve detalle de cada uno
                  </label>
                  <textarea
                    rows={3}
                    {...register('employmentHistory')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Describe tu historial laboral..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Cuáles son tus hobbies? (incluye los presentes y los pasados)
                  </label>
                  <textarea
                    rows={3}
                    {...register('hobbies')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Describe tus hobbies y actividades..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Tienes alguna alergia? ¿Cuáles?
                  </label>
                  <textarea
                    rows={3}
                    {...register('allergies')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Lista tus alergias..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enlista las cirugías a las que te has sometido
                  </label>
                  <textarea
                    rows={3}
                    {...register('surgeries')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Lista tus cirugías..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detalla el historial de vivienda que has tenido (tipo de casas, en dónde y cuándo)
                  </label>
                  <textarea
                    rows={3}
                    {...register('housingHistory')}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Describe tu historial de vivienda..."
                  />
                </div>
              </div>

              {/* Instrucciones para las secciones SÍ/NO */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-2">Instrucciones:</h3>
                <p className="text-sm text-blue-600">
                  Marca SÍ o NO para responder las siguientes preguntas. Si no sabes la respuesta, simplemente déjala en blanco.
                </p>
              </div>

              {/* Secciones de preguntas SÍ/NO */}
              {yesNoQuestions.map((section, sectionIndex) => (
                <div key={section.section} className="border border-blue-200 rounded-lg p-6 bg-white">
                  <h3 className="text-xl font-semibold text-blue-700 mb-4">{section.title}</h3>
                  <div className="space-y-4">
                    {section.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="flex-1 text-sm text-gray-700 pr-4">{question}</span>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="true"
                              {...register(`${section.section}.${questionIndex}`)}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-blue-800">SÍ</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="false"
                              {...register(`${section.section}.${questionIndex}`)}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-blue-800">NO</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Finalizar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalDataStep;
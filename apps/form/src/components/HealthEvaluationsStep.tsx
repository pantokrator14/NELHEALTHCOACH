// apps/form/src/components/HealthEvaluationsStep.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { medicalDataSchema, MedicalDataFormValues } from '../lib/validation';
import Image from 'next/image';

interface HealthEvaluationsStepProps {
  data: MedicalDataFormValues;
  onSubmit: (data: MedicalDataFormValues) => void;
  onBack: () => void;
}

const HealthEvaluationsStep: React.FC<HealthEvaluationsStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<MedicalDataFormValues>({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  // Preguntas exactas como en el formulario original
  const yesNoQuestions = [
    {
      section: 'carbohydrateAddiction' as const,
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
      section: 'leptinResistance' as const,
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
      section: 'circadianRhythms' as const,
      title: 'Alteración de los ritmos circadianos / Exposición al sol',
      questions: [
        '¿Lo primero que ves al despertar es tu celular?',
        '¿Entra luz artificial a tu habitación al momento de dormir?',
        '¿Estás expuesto a la luz artificial después del atardecer? (pantallas de computadoras, televisiones, celulares, tablets, focos de luz blanca o amarilla)',
        '¿Utilizas algún tipo de tecnología Wifi, 2G, 3G, 4G, 5G y/o luz artificial durante la noche?',
        '¿Exponerte al sol te hace daño (sufres quemadas)?',
        '¿Utilizas gafas/lentes solares?',
        '¿Utilizas cremas o protectores solares?',
        '¿Comes pocos pescados, moluscos y/o crustáceos (menos de 1 vez a la semana)?',
        '¿Comes cuando ya no hay luz del sol?',
        '¿Tu exposición al sol es de menos de 30 minutos al día?',
        '¿Haces grounding (caminar descalzo sobre hierba, tierra, o arena) menos de 30 minutos al día?'
      ]
    },
    {
      section: 'sleepHygiene' as const,
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
      section: 'electrosmogExposure' as const,
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
      section: 'generalToxicity' as const,
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
      section: 'microbiotaHealth' as const,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
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
          
          <h2 className="text-3xl font-bold text-center text-pink-800 mb-8">
            Evaluaciones de Salud
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Instrucciones */}
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-pink-700 mb-2">Instrucciones:</h3>
              <p className="text-sm text-pink-600">
                Marca SÍ o NO para responder las siguientes preguntas. Si no sabes la respuesta, simplemente déjala en blanco.
              </p>
            </div>

            {/* Secciones de preguntas SÍ/NO */}
            {yesNoQuestions.map((section) => (
              <div key={section.section} className="border border-pink-200 rounded-lg p-6 bg-pink-50">
                <h3 className="text-xl font-semibold text-pink-700 mb-4">{section.title}</h3>
                <div className="space-y-4">
                  {section.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="flex items-start justify-between p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                      <span className="flex-1 text-sm text-pink-700 pr-4">{question}</span>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="true"
                            {...register(`${section.section}.${questionIndex}`)}
                            className="mr-2 text-pink-700 focus:ring-pink-500"
                          />
                          <span className="text-sm font-semibold text-pink-700">SÍ</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="false"
                            {...register(`${section.section}.${questionIndex}`)}
                            className="mr-2 text-pink-700 focus:ring-pink-500"
                          />
                          <span className="text-sm font-semibold text-pink-700">NO</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={onBack}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-semibold"
              >
                Siguiente
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HealthEvaluationsStep;
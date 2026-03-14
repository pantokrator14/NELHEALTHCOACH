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

// Opciones para preguntas de frecuencia
const frequencyOptions = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'rara-vez', label: 'Rara vez' },
  { value: 'a-veces', label: 'A veces' },
  { value: 'casi-siempre', label: 'Casi siempre' },
  { value: 'siempre', label: 'Siempre' },
];

// Opciones para preguntas de sí/no
const yesNoOptions = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

// Definición de secciones con preguntas y sus tipos
const sections: {
  section: keyof Pick<MedicalDataFormValues, 
    'carbohydrateAddiction' | 'leptinResistance' | 'circadianRhythms' | 
    'sleepHygiene' | 'electrosmogExposure' | 'generalToxicity' | 'microbiotaHealth'
  >;
  title: string;
  questions: { text: string; type: 'frequency' | 'yesno' }[];
}[] = [
  {
    section: 'carbohydrateAddiction',
    title: 'Adicción a los carbohidratos',
    questions: [
      { text: '¿El primer alimento que consumes en el día es de sabor dulce (azúcar o carbohidrato)?', type: 'frequency' },
      { text: '¿Consumes alimentos procesados (los que tienen más de 5 ingredientes)?', type: 'frequency' },
      { text: 'Durante el último año ¿has comido más azúcar de lo que pretendías?', type: 'frequency' },
      { text: '¿Alguna vez has dejado de hacer tus actividades cotidianas por comer alimentos con azúcar?', type: 'frequency' },
      { text: '¿Sientes que necesitas o que deberías reducir tu consumo de azúcar?', type: 'frequency' },
      { text: '¿Alguna vez has comido alimentos con azúcar para calmar una emoción (fatiga, tristeza, enojo, aburrimiento)?', type: 'frequency' },
      { text: '¿Haces más de 5 comidas al día? ¿Comes cada 3-4 horas?', type: 'frequency' },
      { text: '¿Te da dolor de cabeza si pasas más de 4 horas sin comer?', type: 'frequency' },
      { text: '¿Piensas constantemente en alimentos con azúcar?', type: 'frequency' },
      { text: '¿Crees que debes terminar la comida con un alimento dulce?', type: 'frequency' },
      { text: '¿Sientes que no tienes control en lo que comes?', type: 'frequency' },
    ],
  },
  {
    section: 'leptinResistance',
    title: 'Resistencia a la leptina',
    questions: [
      { text: '¿Tienes sobrepeso u obesidad?', type: 'yesno' },
      { text: '¿Tienes hambre constantemente?', type: 'frequency' },
      { text: '¿Tienes antojos por carbohidratos, especialmente por las noches?', type: 'frequency' },
      { text: '¿Tienes problemas para dormir? (insomnio)', type: 'frequency' },
      { text: '¿Te sientes sin energía durante el día?', type: 'frequency' },
      { text: '¿Sientes que al despertar no descansaste bien durante la noche?', type: 'frequency' },
      { text: '¿Te ejercitas menos de 30 minutos al día?', type: 'frequency' },
      { text: '¿Te saltas el desayuno?', type: 'frequency' },
    ],
  },
  {
    section: 'circadianRhythms',
    title: 'Alteración de los ritmos circadianos / Exposición al sol',
    questions: [
      { text: '¿Lo primero que ves al despertar es tu celular?', type: 'frequency' },
      { text: '¿Estás expuesto a la luz artificial después del atardecer? (pantallas de computadoras, televisiones, celulares, tablets, focos de luz blanca o amarilla)', type: 'frequency' },
      { text: '¿Utilizas algún tipo de tecnología Wifi, 2G, 3G, 4G, 5G y/o luz artificial durante la noche?', type: 'frequency' },
      { text: '¿Exponerte al sol te hace daño (sufres quemadas)?', type: 'frequency' },
      { text: '¿Utilizas gafas/lentes solares?', type: 'frequency' },
      { text: '¿Utilizas cremas o protectores solares?', type: 'frequency' },
      { text: '¿Comes pocos pescados, moluscos y/o crustáceos (menos de 1 vez a la semana)?', type: 'yesno' },
      { text: '¿Comes cuando ya no hay luz del sol?', type: 'frequency' },
      { text: '¿Tu exposición al sol es de menos de 30 minutos al día?', type: 'yesno' },
      { text: '¿Haces grounding (caminar descalzo sobre hierba, tierra, o arena) menos de 30 minutos al día?', type: 'frequency' },
      { text: '¿Utilizas filtros de luz azul en tus dispositivos electrónicos (modo noche, aplicaciones) por la noche?', type: 'frequency' },
    ],
  },
  {
    section: 'sleepHygiene',
    title: 'Alteración en la higiene del sueño',
    questions: [
      { text: '¿Duermes con el celular encendido cerca de ti?', type: 'yesno' },
      { text: '¿Te despiertas con la alarma del celular?', type: 'yesno' },
      { text: '¿La temperatura de tu habitación es muy caliente o muy fría?', type: 'yesno' },
      { text: '¿Entra luz artificial a tu habitación al momento de dormir?', type: 'yesno' },
      { text: '¿La cabecera de tu cama está pegada a la pared?', type: 'yesno' },
      { text: '¿Duermes con el wifi de tu casa encendido?', type: 'yesno' },
      { text: '¿Te duermes después de las 11 pm?', type: 'frequency' },
      { text: 'Cuando te despiertas ¿ya amaneció?', type: 'frequency' },
      { text: '¿Duermes menos de 4 horas?', type: 'frequency' },
      { text: '¿Haces cenas copiosas?', type: 'frequency' },
      { text: '¿Te acuestas inmediatamente después de cenar?', type: 'frequency' },
      { text: '¿Tu horario de sueño es regular? (¿Te acuestas y levantas más o menos a la misma hora todos los días, incluidos fines de semana?)', type: 'frequency' },
    ],
  },
  {
    section: 'electrosmogExposure',
    title: 'Exposición al electrosmog',
    questions: [
      { text: 'Al hacer llamadas por celular ¿te lo pegas a la oreja?', type: 'frequency' },
      { text: '¿Llevas el celular cerca de tu cuerpo (por ejemplo: en el bolsillo del pantalón)?', type: 'frequency' },
      { text: '¿Vives cerca de líneas de alta tensión?', type: 'yesno' },
      { text: '¿Utilizas el microondas?', type: 'frequency' },
      { text: '¿Presentas cansancio general durante el día? O ¿Duermes en exceso?', type: 'frequency' },
      { text: '¿Tienes piel sensible o con erupciones?', type: 'frequency' },
      { text: '¿Tienes taquicardia o arritmia?', type: 'frequency' },
      { text: '¿Tienes problemas de presión arterial?', type: 'yesno' },
      { text: '¿Tienes colon irritable?', type: 'yesno' },
      { text: '¿Tienes pérdida auditiva, oyes un zumbido (tinitus) o te duelen los oídos?', type: 'frequency' },
    ],
  },
  {
    section: 'generalToxicity',
    title: 'Toxicidad general',
    questions: [
      { text: '¿Bebes agua embotellada?', type: 'frequency' },
      { text: '¿Utilizas protector solar convencional?', type: 'frequency' },
      { text: '¿Algún miembro de tu familia ha sido diagnosticado con fibromialgia, fatiga crónica o sensibilidades químicas múltiples?', type: 'yesno' },
      { text: '¿Tienes algún historial de disfunción renal?', type: 'yesno' },
      { text: '¿Tienes tú o algún miembro de tu familia inmediata antecedentes de cáncer?', type: 'yesno' },
      { text: '¿Tienes algún historial de enfermedad cardíaca, infarto de miocardio (ataque cardíaco) o de accidentes cerebrovasculares?', type: 'yesno' },
      { text: '¿Alguna vez te han diagnosticado trastorno bipolar, esquizofrenia o depresión?', type: 'yesno' },
      { text: '¿Alguna vez te han diagnosticado diabetes o tiroiditis?', type: 'yesno' },
      { text: '¿Fumas o consumes algún tipo de vapeador?', type: 'frequency' },
      { text: '¿Consumes alcohol? ¿Con qué frecuencia y cantidad?', type: 'frequency' }, // Esta es más compleja, pero la dejamos como frecuencia
    ],
  },
  {
    section: 'microbiotaHealth',
    title: 'Salud de la microbiota',
    questions: [
      { text: '¿Sufres de estreñimiento o de diarrea?', type: 'frequency' },
      { text: '¿Sientes distensión, hinchazón, sensación de saciedad y/o ruidos en el intestino después de comer carbohidratos como brócoli, coles de Bruselas u otras verduras?', type: 'frequency' },
      { text: '¿Tienes a menudo gases con olor desagradable como a azufre?', type: 'frequency' },
      { text: '¿Alguna vez has sido vegano o vegetariano durante algún tiempo?', type: 'yesno' },
      { text: '¿Tienes intolerancia a la carne?', type: 'yesno' },
      { text: '¿Has usado o utilizas antiácidos, inhibidores de la bomba de protones o cualquier otro medicamento que bloquee el ácido?', type: 'frequency' },
      { text: 'Cuando consumes alcohol, ¿tienes confusión mental o una sensación tóxica incluso después de 1 porción?', type: 'frequency' },
      { text: '¿Has tomado antibióticos durante un período prolongado o con frecuencia (aún de niño)?', type: 'frequency' },
      { text: '¿Naciste por cesárea?', type: 'yesno' },
      { text: '¿Tomaste leche de fórmula en lugar de ser amamantado?', type: 'yesno' },
      { text: '¿Consumes alimentos fermentados con regularidad (kéfir, chucrut, kombucha, yogur natural, kimchi)?', type: 'frequency' },
      { text: 'En tu opinión, ¿crees que consumes suficiente fibra de frutas, verduras y legumbres?', type: 'yesno' },
    ],
  },
];

const HealthEvaluationsStep: React.FC<HealthEvaluationsStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<MedicalDataFormValues>({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  // Función para manejar el submit y asegurar que los datos sean arrays de strings
  const onSubmitHandler = (formData: MedicalDataFormValues) => {
    console.log('HealthEvaluationsStep - datos antes de enviar:', formData);
    onSubmit(formData);
  };

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
          
          <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-8">
            {/* Instrucciones */}
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-pink-700 mb-2">Instrucciones:</h3>
              <p className="text-sm text-pink-600">
                Responde según la frecuencia con que ocurre cada situación. Si la pregunta requiere una respuesta de Sí/No, elige la opción correspondiente.
              </p>
            </div>

            {/* Secciones de preguntas */}
            {sections.map((section) => (
              <div key={section.section} className="border border-pink-200 rounded-lg p-6 bg-pink-50">
                <h3 className="text-xl font-semibold text-pink-700 mb-4">{section.title}</h3>
                <div className="space-y-4">
                  {section.questions.map((question, questionIndex) => {
                    const options = question.type === 'frequency' ? frequencyOptions : yesNoOptions;
                    return (
                      <div key={questionIndex} className="flex flex-col md:flex-row md:items-start justify-between p-4 bg-white rounded-lg hover:bg-pink-100 transition-colors border border-pink-100">
                        <span className="flex-1 text-sm text-pink-700 md:pr-4 mb-2 md:mb-0">{question.text}</span>
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt) => (
                            <label key={opt.value} className="flex items-center space-x-1">
                              <input
                                type="radio"
                                value={opt.value}
                                {...register(`${section.section}.${questionIndex}`)}
                                className="text-pink-700 focus:ring-pink-500"
                              />
                              <span className="text-xs font-medium text-pink-700">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
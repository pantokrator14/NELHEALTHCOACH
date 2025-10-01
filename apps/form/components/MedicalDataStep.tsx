import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { medicalDataSchema } from '../lib/validation';

interface MedicalDataStepProps {
  data: any;
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const MedicalDataStep: React.FC<MedicalDataStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
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
    // Agregar las demás secciones...
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
            Información Médica y de Vida
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Campos de texto */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Cuál es tu mayor queja? Por favor enlista todos los síntomas y cuándo comenzaron *
                </label>
                <textarea
                  rows={4}
                  {...register('mainComplaint')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Lista los medicamentos y dosis..."
                />
              </div>

              {/* Agregar los demás campos de texto... */}
            </div>

            {/* Secciones de preguntas SÍ/NO */}
            {yesNoQuestions.map((section, sectionIndex) => (
              <div key={section.section} className="border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">{section.title}</h3>
                <div className="space-y-4">
                  {section.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="flex-1 text-sm text-gray-700">{question}</span>
                      <div className="flex space-x-4 ml-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="true"
                            {...register(`${section.section}.${questionIndex}`)}
                            className="mr-2"
                          />
                          <span className="text-sm">SÍ</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="false"
                            {...register(`${section.section}.${questionIndex}`)}
                            className="mr-2"
                          />
                          <span className="text-sm">NO</span>
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
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Finalizar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MedicalDataStep;
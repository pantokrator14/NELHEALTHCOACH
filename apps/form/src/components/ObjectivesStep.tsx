// apps/form/src/components/ObjectivesStep.tsx
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { MedicalDataFormValues } from '../lib/validation';
import Image from 'next/image';

interface ObjectivesStepProps {
  data: Partial<MedicalDataFormValues>;
  onSubmit: (data: Partial<MedicalDataFormValues>) => void;
  onBack: () => void;
}

const ObjectivesStep: React.FC<ObjectivesStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, watch } = useForm<MedicalDataFormValues>({
    defaultValues: data,
  });

  const onSubmitHandler: SubmitHandler<MedicalDataFormValues> = (formData) => {
    console.log('Submit de ObjectivesStep', formData);
    onSubmit(formData);
  };

  const motivationOptions = [
    { value: 'perder-peso', label: 'Perder peso / grasa corporal' },
    { value: 'ganar-musculo', label: 'Ganar masa muscular / tonificar' },
    { value: 'mas-energia', label: 'Tener más energía durante el día' },
    { value: 'mejorar-digestion', label: 'Mejorar mi digestión' },
    { value: 'reducir-estres', label: 'Reducir el estrés y la ansiedad' },
    { value: 'dormir-mejor', label: 'Dormir mejor' },
    { value: 'prevenir-enfermedades', label: 'Prevenir enfermedades futuras' },
    { value: 'rendimiento-deportivo', label: 'Mejorar mi rendimiento deportivo' },
    { value: 'manejar-condicion', label: 'Manejar una condición de salud específica' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-16">
              <Image src="/logo.png" alt="NELHEALTHCOACH" fill sizes="192px" className="object-contain" priority />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-indigo-700 mb-8">
            Objetivos y Expectativas
          </h2>
          
          <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
            {/* Motivación principal */}
            <div>
              <label className="block text-sm font-medium text-indigo-600 mb-2">
                ¿Cuál es tu motivación principal? (Selecciona hasta 3)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {motivationOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
                    <input
                      type="checkbox"
                      value={opt.value}
                      {...register('motivation')}
                      className="text-indigo-600 focus:ring-indigo-500 rounded"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nivel de compromiso */}
            <div>
              <label className="block text-sm font-medium text-indigo-600 mb-2">
                En una escala del 1 al 10, ¿cuál es tu nivel de compromiso para realizar cambios en tus hábitos en los próximos 3 meses? (1: Nada comprometido, 10: Totalmente comprometido)
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <label
                    key={`commitment-${num}`}
                    htmlFor={`commitmentLevel-${num}`}
                    className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      watch('commitmentLevel') == num
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : 'bg-white text-gray-700 border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <input
                      id={`commitmentLevel-${num}`}
                      type="radio"
                      value={num}
                      {...register('commitmentLevel', { valueAsNumber: true })}
                      className="sr-only"
                    />
                    <span className="text-lg font-bold">{num}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experiencia previa con coach */}
            <div>
              <label className="block text-sm font-medium text-indigo-600 mb-2">
                ¿Has trabajado antes con un coach de salud o nutricionista?
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="true"
                    {...register('previousCoachExperience')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Sí</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="false"
                    {...register('previousCoachExperience')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
            </div>

            {/* Si sí, qué funcionó / no funcionó */}
            <div>
              <label className="block text-sm font-medium text-indigo-600 mb-2">
                Si respondiste que sí, ¿qué fue lo que funcionó bien y qué no?
              </label>
              <textarea
                rows={3}
                {...register('previousCoachExperienceDetails')}
                className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-700"
                placeholder="Ej: Trabajé con nutricionista hace 2 años por 6 meses, perdí 8kg pero lo recuperé. Seguía dietas muy restrictivas que no podía mantener. Con entrenador personal hice 3 meses de gimnasio pero me lesioné la rodilla. Aprendí que necesito un enfoque más sostenible y menos extremo."
              />
            </div>

            {/* Fecha límite */}
            <div>
              <label className="block text-sm font-medium text-indigo-600 mb-2">
                ¿Tienes alguna fecha límite o evento importante en mente para alcanzar tus objetivos? (opcional)
              </label>
              <input
                type="text"
                {...register('targetDate')}
                className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-700"
                placeholder="Ej: Boda de mi hermana en 4 meses (quiero bajar 2 tallas de vestido), vacaciones en la playa en 3 meses, revisión médica anual en 5 meses donde quiero mostrar mejoras en mis marcadores de salud, evento importante del trabajo en 2 meses"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between pt-6 gap-3">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold order-2 sm:order-1"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold order-1 sm:order-2"
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

export default ObjectivesStep;
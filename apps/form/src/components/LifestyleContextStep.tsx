// apps/form/src/components/LifestyleContextStep.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { medicalDataSchema, MedicalDataFormValues } from '../lib/validation';
import Image from 'next/image';

interface LifestyleContextStepProps {
  data: Partial<MedicalDataFormValues>;
  onSubmit: (data: Partial<MedicalDataFormValues>) => void;
  onBack: () => void;
}

const LifestyleContextStep: React.FC<LifestyleContextStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit } = useForm<MedicalDataFormValues>({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-16">
              <Image src="/logo.png" alt="NELHEALTHCOACH" fill className="object-contain" priority />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-teal-700 mb-8">
            Contexto y Estilo de Vida
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Día típico entre semana */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                Describe un día típico entre semana (desde que te levantas hasta que te acuestas). Incluye horarios de comidas, trabajo y tiempo libre.
              </label>
              <textarea
                rows={4}
                {...register('typicalWeekday')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Me levanto a las 7am, desayuno a las 8, trabajo de 9 a 6, como a las 2..."
              />
            </div>

            {/* Día típico fin de semana */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Cómo es un día típico de fin de semana? ¿Es muy diferente al de entre semana?
              </label>
              <textarea
                rows={4}
                {...register('typicalWeekend')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Describe tu fin de semana típico..."
              />
            </div>

            {/* Quién cocina */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Quién cocina en casa principalmente? ¿Con qué frecuencia comes fuera de casa o pides comida a domicilio?
              </label>
              <textarea
                rows={3}
                {...register('whoCooks')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Yo cocino, pero como fuera 2 veces por semana..."
              />
            </div>

            {/* Nivel de actividad física actual */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Cuál es tu nivel de actividad física actual? ¿Qué tipo de ejercicio disfrutas o estarías dispuesto a probar?
              </label>
              <textarea
                rows={3}
                {...register('currentActivityLevel')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Sedentario, me gustaría caminar o probar yoga..."
              />
            </div>

            {/* Limitaciones físicas */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Tienes alguna lesión o limitación física que debamos tener en cuenta al recomendar ejercicios?
              </label>
              <textarea
                rows={3}
                {...register('physicalLimitations')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Problemas de rodilla, dolor de espalda..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between pt-6 gap-3">
              <button
                type="button"
                onClick={onBack} // Asegúrate de recibir onBack como prop
                className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold order-2 sm:order-1"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold order-1 sm:order-2"
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

export default LifestyleContextStep;
// apps/form/src/components/BasicMedicalStep.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { medicalDataSchema } from '../lib/validation';
import Image from 'next/image';

interface BasicMedicalStepProps {
  data: any;
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const BasicMedicalStep: React.FC<BasicMedicalStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 py-12 px-4">
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
          
          <h2 className="text-3xl font-bold text-center text-yellow-700 mb-8">
            Información Médica Básica
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Campos de texto básicos */}
            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Cuál es tu mayor queja? Por favor enlista todos los síntomas y cuándo comenzaron *
              </label>
              <textarea
                rows={4}
                {...register('mainComplaint')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Describe detalladamente tus síntomas..."
              />
              {errors.mainComplaint?.message && (
                <p className="text-red-500 text-sm mt-1">{String(errors.mainComplaint.message)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Qué medicamentos estás tomando?
              </label>
              <textarea
                rows={3}
                {...register('medications')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Lista los medicamentos y dosis..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Qué suplementos estás tomando? (vitaminas y/o minerales)
              </label>
              <textarea
                rows={3}
                {...register('supplements')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Lista los suplementos que tomas..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                Indica tus condiciones de salud actuales y pasadas (por ejemplo: Diabetes Mellitus, Hipertensión, etc.)
              </label>
              <textarea
                rows={3}
                {...register('currentPastConditions')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Describe tus condiciones de salud..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Hay algo más en tu historial médico que debamos considerar? (incluso de tu niñez)
              </label>
              <textarea
                rows={3}
                {...register('additionalMedicalHistory')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Información adicional de tu historial médico..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Tienes alguna alergia? ¿Cuáles?
              </label>
              <textarea
                rows={3}
                {...register('allergies')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Lista tus alergias..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                Enlista las cirugías a las que te has sometido
              </label>
              <textarea
                rows={3}
                {...register('surgeries')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Lista tus cirugías..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Cuál es tu historial de empleos? Por favor incluye un breve detalle de cada uno
              </label>
              <textarea
                rows={3}
                {...register('employmentHistory')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Describe tu historial laboral..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Cuáles son tus hobbies? (incluye los presentes y los pasados)
              </label>
              <textarea
                rows={3}
                {...register('hobbies')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Describe tus hobbies y actividades..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                Detalla el historial de vivienda que has tenido (tipo de casas, en dónde y cuándo)
              </label>
              <textarea
                rows={3}
                {...register('housingHistory')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Describe tu historial de vivienda..."
              />
            </div>

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
                className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
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

export default BasicMedicalStep;
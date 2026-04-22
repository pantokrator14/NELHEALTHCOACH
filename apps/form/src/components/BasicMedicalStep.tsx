// apps/form/src/components/BasicMedicalStep.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { medicalDataSchema } from '../lib/validation';
import { InferType } from 'yup';
import Image from 'next/image';
type MedicalData = InferType<typeof medicalDataSchema>;

interface BasicMedicalStepProps {
  data: Partial<MedicalData>;
  onSubmit: (data: MedicalData) => void;
  onBack: () => void;
}

const BasicMedicalStep: React.FC<BasicMedicalStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<MedicalData>({
    defaultValues: data as Partial<MedicalData>,
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
                placeholder="Ej: Dolor de cabeza constante desde hace 3 meses, fatiga crónica que me impide hacer ejercicio, insomnio 3-4 noches por semana, ansiedad por las tardes. Los síntomas comenzaron después de un período de estrés laboral intenso."
              />
              {errors.mainComplaint?.message && (
                <p className="text-red-500 text-sm mt-1">{String(errors.mainComplaint.message)}</p>
              )}
            </div>

            {/* Intensidad (1-10) */}
            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                En una escala del 1 al 10, ¿cómo calificarías la intensidad de esa queja? (1: leve, 10: insoportable)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                {...register('mainComplaintIntensity')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Ej: 7"
              />
            </div>

            {/* Impacto */}
            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Este síntoma te impide realizar alguna actividad específica en tu día a día?
              </label>
              <textarea
                rows={3}
                {...register('mainComplaintImpact')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Ej: Me impide hacer ejercicio cardiovascular por más de 10 minutos, dificulta mi concentración en el trabajo después del mediodía, afecta mi calidad de sueño, limita mi capacidad para realizar tareas domésticas que requieren esfuerzo físico."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Qué medicamentos estás tomando?
              </label>
              <textarea
                rows={3}
                {...register('medications')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Ej: Metformina 500mg 2 veces al día para diabetes tipo 2, Levotiroxina 50mcg diario para hipotiroidismo, Omeprazol 20mg al día para reflujo, suplemento de vitamina D 2000 UI diarias. No tomo medicamentos para la presión arterial ni antidepresivos."
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
                placeholder="Ej: Multivitamínico diario, Omega-3 1000mg al día, Magnesio 400mg antes de dormir, Probiótico en la mañana. No tomo creatina ni proteína en polvo."
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
                placeholder="Ej: Diabetes tipo 2 diagnosticada hace 5 años, hipertensión controlada con medicación, hipotiroidismo de Hashimoto, síndrome de ovario poliquístico, ansiedad generalizada. En el pasado: mononucleosis a los 18 años, apendicectomía a los 25."
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
                placeholder="Ej: Historial familiar: madre con diabetes tipo 2, padre con enfermedad cardíaca. En la niñez: asma infantil que se resolvió en la adolescencia, múltiples infecciones de oído. Historial quirúrgico: cesárea hace 8 años, extracción de vesícula biliar hace 3 años."
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
                placeholder="Ej: Alergia a la penicilina (reacción cutánea severa), alergia estacional al polen en primavera, intolerancia a la lactosa. No tengo alergias alimentarias conocidas a frutos secos, mariscos o gluten."
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
                placeholder="Ej: Apendicectomía (2015), cesárea (2018), extracción de vesícula biliar (2021), cirugía de menisco rodilla derecha (2022). No he tenido cirugías cardíacas, cerebrales o de columna."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                Describe brevemente tu trabajo ACTUAL. ¿Es principalmente sedentario, físicamente activo, o una mezcla? ¿Estás expuesto a estrés crónico, químicos, ruido o turnos rotativos?
              </label>
              <textarea
                rows={3}
                {...register('employmentHistory')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
                placeholder="Ej: Trabajo como analista de datos en oficina, 8 horas diarias sentado frente a computadora. Exposición moderada a estrés por plazos ajustados. No estoy expuesto a químicos, ruido industrial o turnos rotativos. Trabajo de lunes a viernes, horario fijo de 9am a 6pm."
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
                placeholder="Ej: Actual: lectura, caminatas en parque los fines de semana, cocinar recetas saludables, yoga ocasional. Pasados: jugué fútbol en la universidad, practiqué natación durante 5 años, toqué guitarra en una banda. Me gustaría retomar el ejercicio regular."
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
                placeholder="Ej: Nací y crecí en ciudad con alta contaminación. Viví en apartamento pequeño hasta los 25, luego casa con jardín en suburbio por 10 años. Actualmente vivo en departamento moderno con buena ventilación. Nunca he vivido cerca de fábricas o zonas industriales pesadas."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                ¿Has tenido cambios significativos en tu apetito o sed recientemente?
              </label>
              <select
                {...register('appetiteChanges')}
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-gray-700"
              >
                <option value="">Selecciona una opción</option>
                <option value="mucho-hambre">Sí, mucha más hambre</option>
                <option value="mucha-sed">Sí, mucha más sed</option>
                <option value="no">No</option>
              </select>
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
                className="w-full sm:w-auto px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold order-1 sm:order-2"
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
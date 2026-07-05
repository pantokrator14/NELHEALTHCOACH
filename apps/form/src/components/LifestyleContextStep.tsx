// apps/form/src/components/LifestyleContextStep.tsx
import React, { useEffect } from 'react';
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
  const { register, handleSubmit, formState: { errors } } = useForm<MedicalDataFormValues>({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  // Log errores de validación al desarrollador (consola)
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('❌ Errores de validación en Estilo de Vida:', JSON.stringify(errors, null, 2));
    }
  }, [errors]);

  const onValidSubmit = (formData: MedicalDataFormValues) => {
    console.log('✅ Estilo de Vida - datos válidos:', Object.keys(formData).length, 'campos');
    onSubmit(formData);
  };

  const onInvalidSubmit = (formErrors: typeof errors) => {
    console.error('❌ Estilo de Vida - validación fallida:', JSON.stringify(formErrors, null, 2));
  };

  // Scroll al primer campo con error cuando hay errores de validación
  useEffect(() => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstFieldName = errorFields[0];
      // Buscar el elemento por su atributo name (react-hook-form lo asigna via register)
      const firstErrorElement = document.getElementsByName(firstFieldName)[0];
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Intentar focus si es un input/select/textarea
        if (typeof (firstErrorElement as HTMLElement).focus === 'function') {
          (firstErrorElement as HTMLElement).focus();
        }
      }
    }
  }, [errors]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-16">
              <Image src="/logo.png" alt="NELHEALTHCOACH" fill sizes="192px" className="object-contain" priority />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-teal-700 mb-8">
            Contexto y Estilo de Vida
          </h2>

          {/* BANNER DE ERRORES VISIBLE PARA EL USUARIO */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
              <div className="flex items-start">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800 text-sm mb-1">
                    Corrige los siguientes errores para continuar:
                  </p>
                  <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>
                        <span className="font-medium">{field}:</span>{' '}
                        {error?.message || 'Valor no válido'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} className="space-y-6">
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
                ¿Cómo es un día típico de fin de semana? ¿Es muy diferente al de entre semana? Describe actividades, horarios, comidas y si sales o te quedas en casa.
              </label>
              <textarea
                rows={4}
                {...register('typicalWeekend')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Los sábados me levanto más tarde (9am), desayuno ligero, hago compras o visito familia. Los domingos cocino para la semana, veo películas. Como más relajado, a veces pido pizza. Salgo con amigos el sábado por la noche..."
              />
            </div>

            {/* Quién cocina */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Quién cocina en casa? Describe quiénes viven contigo y cómo se organizan con las comidas. ¿Con qué frecuencia comes fuera o pides comida a domicilio?
              </label>
              <textarea
                rows={3}
                {...register('whoCooks')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Vivo con mi papá. Entre los dos cocinamos: yo preparo el desayuno y cena, él hace el almuerzo. Comemos fuera los viernes. No pedimos delivery casi nunca..."
              />
            </div>

            {/* Nivel de actividad física actual */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Cuál es tu nivel de actividad física actual? Sé lo más detallado posible: ¿caminas? ¿subes escaleras? ¿tienes un trabajo activo o sedentario?
              </label>
              <textarea
                rows={3}
                {...register('currentActivityLevel')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Trabajo en oficina todo el día sentado. Camino 15 min para llegar al trabajo. No hago ejercicio actualmente pero antes iba al gym 2 veces por semana. Subo 3 pisos de escaleras en casa..."
              />
            </div>

            {/* Limitaciones físicas */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Tienes alguna lesión, operación o limitación física que debamos considerar al diseñar tus ejercicios? Describe cuándo ocurrió, cómo te afecta y si has recibido tratamiento.
              </label>
              <textarea
                rows={3}
                {...register('physicalLimitations')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Me lastimé la rodilla izquierda jugando fútbol hace 2 años. Me operaron en 2024. Todavía me duele al correr más de 10 minutos. El médico me recomendó evitar impacto pero puedo hacer natación y bicicleta. También tengo dolor de espalda baja ocasional por mi trabajo de oficina..."
              />
            </div>

            {/* Acceso a gimnasio o equipos */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Tienes acceso a un gimnasio, parque de calistenia o equipos de ejercicio en casa?
              </label>
              <select
                {...register('gymAccess')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
              >
                <option value="">Selecciona una opción</option>
                <option value="si-gimnasio">Sí, tengo acceso a un gimnasio</option>
                <option value="si-parque">Sí, tengo acceso a un parque de calistenia o área al aire libre</option>
                <option value="equipos-casa">Sí, tengo equipos básicos en casa (pesas, bandas de resistencia, etc.)</option>
                <option value="peso-corporal">Prefiero ejercicios sin equipo (peso corporal)</option>
                <option value="no-acceso">No tengo acceso a equipos específicos</option>
              </select>
              {errors.gymAccess?.message && (
                <p className="text-red-500 text-sm mt-1">{String(errors.gymAccess?.message)}</p>
              )}
            </div>

            {/* Detalles del acceso */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                Describe los equipos o espacios disponibles (ej: tipo de máquinas, pesas libres, barras, etc.)
              </label>
              <textarea
                rows={3}
                {...register('gymAccessDetails')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: En el gimnasio tienen máquinas de cardio, pesas libres hasta 20kg, barras para dominadas..."
              />
            </div>

            {/* Tipos de ejercicio preferidos */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Qué tipos de ejercicio disfrutas o estarías dispuesto a probar? (ej: cardio, fuerza, yoga, natación, etc.)
              </label>
              <textarea
                rows={3}
                {...register('preferredExerciseTypes')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Me gusta caminar y yoga, estaría dispuesto a probar entrenamiento de fuerza básico..."
              />
            </div>

            {/* Disponibilidad de tiempo para ejercicio */}
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-2">
                ¿Cuánto tiempo puedes dedicar al ejercicio por sesión y cuántas veces por semana?
              </label>
              <textarea
                rows={2}
                {...register('exerciseTimeAvailability')}
                className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-700"
                placeholder="Ej: Puedo dedicar 30-45 minutos, 3-4 veces por semana, preferiblemente por las mañanas..."
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
// apps/form/src/components/MentalHealthStep.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { medicalDataSchema } from '../lib/validation';
import Image from 'next/image';

interface MentalHealthStepProps {
  data?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

const MentalHealthStep: React.FC<MentalHealthStepProps> = ({ data, onSubmit, onBack }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, unknown>>({
    defaultValues: data,
    resolver: yupResolver(medicalDataSchema),
  });

  // Preguntas de salud mental - opción múltiple (EXACTAMENTE como en el formulario original)
  const mentalHealthMultipleChoice = [
    {
      field: 'mentalHealthEmotionIdentification',
      question: '¿Puedes identificar con facilidad qué emoción estás sintiendo en momentos clave de tu día (ej. enojo, tristeza, ansiedad, alegría)?',
      options: [
        { value: 'a', label: 'Casi siempre' },
        { value: 'b', label: 'A veces' },
        { value: 'c', label: 'Rara vez' }
      ]
    },
    {
      field: 'mentalHealthEmotionIntensity',
      question: '¿Cómo de intensas suelen ser tus emociones?',
      options: [
        { value: 'a', label: 'Muy intensas, a veces me desbordan' },
        { value: 'b', label: 'Moderadas, las puedo manejar' },
        { value: 'c', label: 'Poco intensas, casi no las noto' }
      ]
    },
    {
      field: 'mentalHealthUncomfortableEmotion',
      question: '¿Qué haces cuando sientes una emoción incómoda?',
      options: [
        { value: 'a', label: 'La evito o la reprimo' },
        { value: 'b', label: 'Me dejo llevar por ella sin control' },
        { value: 'c', label: 'La acepto y trato de entender su mensaje' }
      ]
    },
    {
      field: 'mentalHealthInternalDialogue',
      question: 'Cuando algo sale mal, ¿cuál es tu diálogo interno más frecuente?',
      options: [
        { value: 'a', label: '"Siempre me pasa a mí", "No sirvo para esto"' },
        { value: 'b', label: '"Es una oportunidad para aprender"' },
        { value: 'c', label: '"No puedo hacer nada para cambiarlo"' }
      ]
    },
    {
      field: 'mentalHealthStressStrategies',
      question: 'Ante una situación estresante, ¿qué estrategias sueles utilizar?',
      options: [
        { value: 'a', label: 'Comer, fumar, distraerme con pantallas' },
        { value: 'b', label: 'Hablar con alguien, respirar, hacer deporte' },
        { value: 'c', label: 'Me bloqueo y no hago nada' }
      ]
    },
    {
      field: 'mentalHealthSayingNo',
      question: '¿Te resulta difícil decir "no" por miedo a decepcionar a los demás?',
      options: [
        { value: 'a', label: 'Sí, casi siempre' },
        { value: 'b', label: 'Solo en algunas situaciones' },
        { value: 'c', label: 'No, priorizo mis necesidades' }
      ]
    },
    {
      field: 'mentalHealthRelationships',
      question: 'En tus relaciones, ¿sueles sentir que das más de lo que recibes?',
      options: [
        { value: 'a', label: 'Sí, con frecuencia' },
        { value: 'b', label: 'A veces' },
        { value: 'c', label: 'No, hay equilibrio' }
      ]
    },
    {
      field: 'mentalHealthExpressThoughts',
      question: '¿Expresas abiertamente lo que piensas y sientes, incluso cuando es incómodo?',
      options: [
        { value: 'a', label: 'Casi nunca' },
        { value: 'b', label: 'Depende de la situación' },
        { value: 'c', label: 'Sí, de manera asertiva' }
      ]
    },
    {
      field: 'mentalHealthEmotionalDependence',
      question: '¿Alguna relación actual o pasada te genera malestar o dependencia emocional?',
      options: [
        { value: 'a', label: 'Sí' },
        { value: 'b', label: 'No estoy seguro/a' },
        { value: 'c', label: 'No' }
      ]
    },
    {
      field: 'mentalHealthPurpose',
      question: '¿Sientes que tienes un propósito o metas que te motivan?',
      options: [
        { value: 'a', label: 'Sí, claramente' },
        { value: 'b', label: 'Estoy en proceso de definirlas' },
        { value: 'c', label: 'No, me siento perdido/a' }
      ]
    },
    {
      field: 'mentalHealthFailureReaction',
      question: 'Cuando enfrentas un fracaso, ¿cómo reaccionas?',
      options: [
        { value: 'a', label: 'Me hundo y tardo en recuperarme' },
        { value: 'b', label: 'Me frustro, pero sigo adelante' },
        { value: 'c', label: 'Lo veo como parte del aprendizaje' }
      ]
    },
    {
      field: 'mentalHealthSelfConnection',
      question: '¿Practicas alguna rutina que te ayude a conectar contigo mismo/a (meditación, escritura, naturaleza, etc.)?',
      options: [
        { value: 'a', label: 'Sí, regularmente' },
        { value: 'b', label: 'Ocasionalmente' },
        { value: 'c', label: 'No' }
      ]
    }
  ];

  // Preguntas de salud mental - texto abierto (EXACTAMENTE como en el formulario original)
  const mentalHealthOpenEnded = [
    {
      field: 'mentalHealthSelfRelationship',
      question: 'Si tuvieras que describir tu relación contigo mismo/a en tres palabras, ¿cuáles serían?',
      placeholder: 'Escribe tres palabras que describan tu relación contigo mismo/a...'
    },
    {
      field: 'mentalHealthLimitingBeliefs',
      question: '¿Hay alguna creencia o pensamiento recurrente que sientas que te limita en tu vida actual?',
      placeholder: 'Describe las creencias o pensamientos que sientes que te limitan...'
    },
    {
      field: 'mentalHealthIdealBalance',
      question: 'Imagina que has alcanzado un equilibrio emocional ideal. ¿Qué cambiaría en tu día a día?',
      placeholder: 'Describe cómo sería tu día a día con un equilibrio emocional ideal...'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 py-12 px-4">
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
          
          <h2 className="text-3xl font-bold text-center text-purple-800 mb-8">
            Bienestar Emocional
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* NUEVA SECCIÓN: Salud Mental - Opción Múltiple */}
            <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
              <h3 className="text-2xl font-semibold text-purple-600 mb-6 text-center">
                Salud y Bienestar Emocional
              </h3>
              <div className="space-y-8">
                {mentalHealthMultipleChoice.map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg border border-purple-100">
                    <label className="block text-lg font-medium text-purple-600 mb-4">
                      {item.question}
                    </label>
                    <div className="space-y-3">
                      {item.options.map(option => (
                        <label key={option.value} className="flex items-center p-3 hover:bg-purple-50 rounded-lg transition-colors">
                          <input
                            type="radio"
                            value={option.value}
                            {...register(item.field)}
                            className="mr-3 text-purple-600 focus:ring-purple-700 h-4 w-4"
                          />
                          <span className="text-base text-gray-700 font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NUEVA SECCIÓN: Salud Mental - Preguntas Abiertas */}
            <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
              <h3 className="text-2xl font-semibold text-purple-600 mb-6 text-center">
                Reflexión Personal
              </h3>
              <div className="space-y-6">
                {mentalHealthOpenEnded.map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg border border-purple-100">
                    <label className="block text-lg font-medium text-purple-800 mb-3">
                      {item.question}
                    </label>
                    <textarea
                      rows={4}
                      {...register(item.field)}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-gray-700"
                      placeholder={item.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

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
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
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

export default MentalHealthStep;
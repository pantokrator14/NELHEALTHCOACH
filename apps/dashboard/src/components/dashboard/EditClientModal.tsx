// apps/dashboard/src/components/dashboard/EditClientModal.tsx
import { useState, useEffect } from 'react'
import {
  evaluationQuestions,
  mentalHealthMultipleChoiceQuestions,
  mentalHealthOptions,
  mentalHealthOpenQuestions,
  lifestyleQuestions,
} from '../../lib/formConstants';
import { useTranslation } from 'react-i18next';

interface UploadedFile {
  url: string;
  key: string;
  name: string;
  type: 'profile' | 'document';
  size: number;
  uploadedAt?: string;
}

interface Client {
  _id: string
  personalData: {
    name: string
    address: string
    phone: string
    email: string
    birthDate: string
    gender: string
    age: string
    weight: string
    height: string
    maritalStatus: string
    education: string
    occupation: string
    profilePhoto?: UploadedFile;
    bodyFatPercentage?: string;
    weightVariation?: string;
    dislikedFoodsActivities?: string;
  }
  medicalData: {
    // Básicos
    mainComplaint: string
    mainComplaintIntensity?: number
    mainComplaintImpact?: string
    medications: string
    supplements: string
    currentPastConditions: string
    additionalMedicalHistory: string
    employmentHistory: string
    hobbies: string
    allergies: string
    surgeries: string
    housingHistory: string
    appetiteChanges?: string
    documents?: UploadedFile[];

    // Evaluaciones
    carbohydrateAddiction: string[] | boolean[] | string
    leptinResistance: string[] | boolean[] | string
    circadianRhythms: string[] | boolean[] | string
    sleepHygiene: string[] | boolean[] | string
    electrosmogExposure: string[] | boolean[] | string
    generalToxicity: string[] | boolean[] | string
    microbiotaHealth: string[] | boolean[] | string

    // Salud mental - opción múltiple
    mentalHealthEmotionIdentification: string
    mentalHealthEmotionIntensity: string
    mentalHealthUncomfortableEmotion: string
    mentalHealthInternalDialogue: string
    mentalHealthStressStrategies: string
    mentalHealthSayingNo: string
    mentalHealthRelationships: string
    mentalHealthExpressThoughts: string
    mentalHealthEmotionalDependence: string
    mentalHealthPurpose: string
    mentalHealthFailureReaction: string
    mentalHealthSelfConnection: string
    mentalHealthSupportNetwork?: 'si-tengo' | 'algunas' | 'no'
    mentalHealthDailyStress?: 'bajo' | 'moderado' | 'alto' | 'muy-alto'

    // Salud mental - texto abierto
    mentalHealthSelfRelationship: string
    mentalHealthLimitingBeliefs: string
    mentalHealthIdealBalance: string

    // Objetivos
    motivation?: string[] | string
    commitmentLevel?: number
    previousCoachExperience?: boolean
    previousCoachExperienceDetails?: string
    targetDate?: string

    // Estilo de vida
    typicalWeekday?: string
    typicalWeekend?: string
    whoCooks?: string
    currentActivityLevel?: string
    physicalLimitations?: string
    // Nuevos campos para acceso a equipos de ejercicio
    gymAccess?: 'si-gimnasio' | 'si-parque' | 'no-acceso' | 'equipos-casa' | 'peso-corporal'
    gymAccessDetails?: string
    equipmentAvailable?: string
    preferredExerciseTypes?: string
    exerciseTimeAvailability?: string
  }
  contractAccepted: string
  ipAddress: string
  submissionDate: string
}

interface EditClientModalProps {
  client: Client
  onClose: () => void
  onSave: () => void
}

// Opciones para selects
const weightVariationOptions = [
  { value: 'estable', label: 'Estable' },
  { value: 'bajo', label: 'Ha bajado' },
  { value: 'subido', label: 'Ha subido' },
];

const appetiteChangeOptions = [
  { value: 'mucho-hambre', label: 'Sí, mucha más hambre' },
  { value: 'mucha-sed', label: 'Sí, mucha más sed' },
  { value: 'no', label: 'No' },
];

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

// Opciones para evaluaciones
const frequencyOptions = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'rara-vez', label: 'Rara vez' },
  { value: 'a-veces', label: 'A veces' },
  { value: 'casi-siempre', label: 'Casi siempre' },
  { value: 'siempre', label: 'Siempre' },
];

const yesNoOptions = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

// Definir qué preguntas son de frecuencia y cuáles de sí/no en cada sección
const evaluationTypes: Record<string, ('frequency' | 'yesno')[]> = {
  carbohydrateAddiction: Array(11).fill('frequency'),
  leptinResistance: ['yesno', 'frequency', 'frequency', 'frequency', 'frequency', 'frequency', 'frequency', 'frequency'],
  circadianRhythms: [
    'frequency', 'frequency', 'frequency', 'frequency', 'frequency', 'frequency',
    'yesno', 'frequency', 'yesno', 'frequency', 'frequency'
  ],
  sleepHygiene: [
    'yesno', 'yesno', 'yesno', 'yesno', 'yesno', 'yesno',
    'frequency', 'frequency', 'frequency', 'frequency', 'frequency', 'frequency'
  ],
  electrosmogExposure: [
    'frequency', 'frequency', 'yesno', 'frequency', 'frequency',
    'frequency', 'frequency', 'yesno', 'yesno', 'frequency'
  ],
  generalToxicity: [
    'frequency', 'frequency', 'yesno', 'yesno', 'yesno', 'yesno', 'yesno', 'yesno',
    'frequency', 'frequency'
  ],
  microbiotaHealth: [
    'frequency', 'frequency', 'frequency', 'yesno', 'yesno',
    'frequency', 'frequency', 'frequency', 'yesno', 'yesno',
    'frequency', 'yesno'
  ],
};

// Función para parsear los datos de evaluación, manejando booleanos y strings
const parseEvaluationData = (
  data: unknown,
  section: keyof typeof evaluationTypes
): string[] => {
  if (!data) return [];

  const types = evaluationTypes[section] || [];

  if (Array.isArray(data)) {
    return data.map((item, index) => {
      const type = types[index] || 'frequency';
      if (typeof item === 'string') return item;
      if (typeof item === 'boolean') {
        if (type === 'frequency') {
          return item ? 'siempre' : 'nunca';
        } else {
          return item ? 'si' : 'no';
        }
      }
      if (typeof item === 'number') return item.toString();
      return '';
    }).filter(v => v !== '');
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => {
          const type = types[index] || 'frequency';
          if (typeof item === 'string') return item;
          if (typeof item === 'boolean') {
            if (type === 'frequency') {
              return item ? 'siempre' : 'nunca';
            } else {
              return item ? 'si' : 'no';
            }
          }
          if (typeof item === 'number') return item.toString();
          return '';
        }).filter(v => v !== '');
      }
    } catch {
      return [];
    }
  }

  return [];
};

// Función para parsear campos que pueden ser string o array (como motivation)
const parseStringArray = (field: unknown): string[] => {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default function EditClientModal({ client, onClose, onSave }: EditClientModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('personal')
  const [footerExpanded, setFooterExpanded] = useState(false)

  // Efecto para cerrar con tecla Escape
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  // Parsear todas las evaluaciones y campos especiales al inicializar el estado
  const initialFormData: Client = {
    ...client,
    medicalData: {
      ...client.medicalData,
      carbohydrateAddiction: parseEvaluationData(client.medicalData.carbohydrateAddiction, 'carbohydrateAddiction'),
      leptinResistance: parseEvaluationData(client.medicalData.leptinResistance, 'leptinResistance'),
      circadianRhythms: parseEvaluationData(client.medicalData.circadianRhythms, 'circadianRhythms'),
      sleepHygiene: parseEvaluationData(client.medicalData.sleepHygiene, 'sleepHygiene'),
      electrosmogExposure: parseEvaluationData(client.medicalData.electrosmogExposure, 'electrosmogExposure'),
      generalToxicity: parseEvaluationData(client.medicalData.generalToxicity, 'generalToxicity'),
      microbiotaHealth: parseEvaluationData(client.medicalData.microbiotaHealth, 'microbiotaHealth'),
      motivation: parseStringArray(client.medicalData.motivation),
    }
  };

  const [formData, setFormData] = useState<Client>(initialFormData);

  const handleInputChange = (
    section: 'personalData' | 'medicalData',
    field: string,
    value: string | number | boolean | string[] | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleEvaluationChange = (
    section: keyof Client['medicalData'],
    questionIndex: number,
    value: string
  ) => {
    const currentArray = [...(formData.medicalData[section] as string[])];
    while (currentArray.length <= questionIndex) {
      currentArray.push('');
    }
    currentArray[questionIndex] = value;

    setFormData(prev => ({
      ...prev,
      medicalData: {
        ...prev.medicalData,
        [section]: currentArray
      }
    }));
  };

  const getEvaluationValue = (
    section: keyof Client['medicalData'],
    questionIndex: number
  ): string => {
    const arr = formData.medicalData[section] as string[];
    return arr[questionIndex] || '';
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clients/${formData._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      const responseData = await response.json();
      if (response.ok) {
        onSave();
        onClose();
      } else {
        alert(t('clients.errorSaving', { error: responseData.message || '' }));
      }
    } catch (error) {
      console.error('Error guardando cliente:', error);
      alert(t('common.error'));
    }
  };

  const formatLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      name: 'Nombre completo',
      address: 'Dirección',
      phone: 'Teléfono',
      email: 'Correo electrónico',
      birthDate: 'Fecha de nacimiento',
      gender: 'Género',
      age: 'Edad',
      weight: 'Peso (kg)',
      height: 'Altura (cm)',
      maritalStatus: 'Estado civil',
      education: 'Educación',
      occupation: 'Ocupación',
      bodyFatPercentage: '% grasa corporal',
      weightVariation: 'Variación de peso (6 meses)',
      dislikedFoodsActivities: 'Alimentos/actividades no deseadas',
      mainComplaint: 'Motivo principal de consulta',
      mainComplaintIntensity: 'Intensidad (1-10)',
      mainComplaintImpact: 'Impacto en actividades',
      medications: 'Medicamentos',
      supplements: 'Suplementos',
      currentPastConditions: 'Condiciones actuales y pasadas',
      additionalMedicalHistory: 'Historial médico adicional',
      employmentHistory: 'Historial laboral',
      hobbies: 'Hobbies e intereses',
      allergies: 'Alergias',
      surgeries: 'Cirugías',
      housingHistory: 'Historial de vivienda',
      appetiteChanges: 'Cambios en apetito/sed',
      mentalHealthSelfRelationship: 'Relación consigo mismo',
      mentalHealthLimitingBeliefs: 'Creencias limitantes',
      mentalHealthIdealBalance: 'Balance ideal',
      mentalHealthSupportNetwork: 'Red de apoyo',
      mentalHealthDailyStress: 'Estrés diario',
      motivation: 'Motivación',
      commitmentLevel: 'Nivel de compromiso',
      previousCoachExperience: 'Experiencia previa con coach',
      previousCoachExperienceDetails: 'Detalles de experiencia previa',
      targetDate: 'Fecha límite / evento importante',
      typicalWeekday: 'Día típico entre semana',
      typicalWeekend: 'Día típico fin de semana',
      whoCooks: 'Quién cocina / frecuencia comida fuera',
      currentActivityLevel: 'Nivel de actividad física actual',
      physicalLimitations: 'Limitaciones físicas',
    };
    return labels[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-blue-200">
        {/* Encabezado */}
        <div className="p-6 border-b border-blue-200 bg-blue-600 text-white rounded-t-xl">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h2 className="text-2xl font-bold">Editar Información del Cliente</h2>
          </div>
        </div>

        {/* Pestañas - altura fija en móvil, scroll horizontal */}
        <div className="border-b border-blue-200 bg-white overflow-x-auto lg:overflow-visible min-h-[60px]">
          <div className="flex flex-nowrap lg:flex-wrap items-stretch gap-1 px-6 py-2 min-w-max lg:min-w-full">
            <button 
              onClick={() => setActiveTab('personal')} 
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap text-sm lg:text-base min-w-[120px] lg:min-w-0 lg:flex-1 lg:justify-center ${
                activeTab === 'personal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Personal</span>
            </button>
            <button 
              onClick={() => setActiveTab('objectives')} 
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap text-sm lg:text-base min-w-[120px] lg:min-w-0 lg:flex-1 lg:justify-center ${
                activeTab === 'objectives' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-indigo-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Objetivos</span>
            </button>
            <button 
              onClick={() => setActiveTab('medical')} 
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap text-sm lg:text-base min-w-[120px] lg:min-w-0 lg:flex-1 lg:justify-center ${
                activeTab === 'medical' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-yellow-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>Médico</span>
            </button>
            <button 
              onClick={() => setActiveTab('evaluations')} 
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap text-sm lg:text-base min-w-[120px] lg:min-w-0 lg:flex-1 lg:justify-center ${
                activeTab === 'evaluations' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-pink-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Evaluaciones</span>
            </button>
            <button 
              onClick={() => setActiveTab('mental')} 
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap text-sm lg:text-base min-w-[120px] lg:min-w-0 lg:flex-1 lg:justify-center ${
                activeTab === 'mental' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Emocional</span>
            </button>
            <button 
              onClick={() => setActiveTab('lifestyle')} 
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap text-sm lg:text-base min-w-[120px] lg:min-w-0 lg:flex-1 lg:justify-center ${
                activeTab === 'lifestyle' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-teal-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Estilo de vida</span>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 bg-blue-50">
          {/* PERSONAL */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.personalData).map(([key, value]) => {
                if (key === 'profilePhoto' || key === 'documents') return null;
                return (
                  <div key={key} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      {formatLabel(key)}
                    </label>
                    {key === 'birthDate' ? (
                      <input type="date" value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500" />
                    ) : key === 'maritalStatus' ? (
                      <select value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar</option>
                        <option value="Soltero">Soltero</option>
                        <option value="Casado">Casado</option>
                        <option value="Divorciado">Divorciado</option>
                        <option value="Viudo">Viudo</option>
                        <option value="Unión libre">Unión libre</option>
                      </select>
                    ) : key === 'education' ? (
                      <select value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar</option>
                        <option value="Primaria">Primaria</option>
                        <option value="Secundaria">Secundaria</option>
                        <option value="Bachillerato">Bachillerato</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Universitario">Universitario</option>
                        <option value="Posgrado">Posgrado</option>
                      </select>
                    ) : key === 'gender' ? (
                      <select value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500">
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                        <option value="Prefiero no decir">Prefiero no decir</option>
                      </select>
                    ) : key === 'weightVariation' ? (
                      <select value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar</option>
                        {weightVariationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : key === 'age' || key === 'weight' || key === 'height' ? (
                      <input type="number" value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500" step={key === 'weight' ? '0.1' : '1'} />
                    ) : key === 'bodyFatPercentage' ? (
                      <input type="text" value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Ej: 25%" />
                    ) : key === 'dislikedFoodsActivities' ? (
                      <textarea rows={3} value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500" />
                    ) : (
                      <input type="text" value={value as string} onChange={(e) => handleInputChange('personalData', key, e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* OBJETIVOS */}
          {activeTab === 'objectives' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm">
                <label className="block text-lg font-medium text-indigo-700 mb-4">Motivación (selecciona hasta 3)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {motivationOptions.map(opt => {
                    // Asegurar que motivation es array
                    const motivationArray = Array.isArray(formData.medicalData.motivation) ? formData.medicalData.motivation : [];
                    return (
                      <label key={opt.value} className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition cursor-pointer">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={motivationArray.includes(opt.value)}
                          onChange={(e) => {
                            const current = motivationArray;
                            const newValue = e.target.checked
                              ? [...current, opt.value]
                              : current.filter(v => v !== opt.value);
                            handleInputChange('medicalData', 'motivation', newValue);
                          }}
                          className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
                        />
                        <span className="text-gray-700">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm">
                <label className="block text-lg font-medium text-indigo-700 mb-4">Nivel de compromiso (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.medicalData.commitmentLevel || 5}
                  onChange={(e) => handleInputChange('medicalData', 'commitmentLevel', parseInt(e.target.value))}
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="text-center mt-2 text-xl font-semibold text-indigo-700">
                  {formData.medicalData.commitmentLevel || 5} / 10
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm">
                <label className="block text-lg font-medium text-indigo-700 mb-4">¿Has trabajado antes con un coach?</label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="prevCoach"
                      checked={formData.medicalData.previousCoachExperience === true}
                      onChange={() => handleInputChange('medicalData', 'previousCoachExperience', true)}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Sí</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="prevCoach"
                      checked={formData.medicalData.previousCoachExperience === false}
                      onChange={() => handleInputChange('medicalData', 'previousCoachExperience', false)}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">No</span>
                  </label>
                </div>
              </div>

              {formData.medicalData.previousCoachExperience && (
                <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm">
                  <label className="block text-lg font-medium text-indigo-700 mb-4">Detalles de la experiencia</label>
                  <textarea
                    rows={4}
                    value={formData.medicalData.previousCoachExperienceDetails || ''}
                    onChange={(e) => handleInputChange('medicalData', 'previousCoachExperienceDetails', e.target.value)}
                    className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Cuéntanos qué funcionó y qué no..."
                  />
                </div>
              )}

              <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm">
                <label className="block text-lg font-medium text-indigo-700 mb-4">Fecha límite / evento importante</label>
                <input
                  type="text"
                  value={formData.medicalData.targetDate || ''}
                  onChange={(e) => handleInputChange('medicalData', 'targetDate', e.target.value)}
                  className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Boda en 6 meses, Viaje en verano..."
                />
              </div>
            </div>
          )}

          {/* MÉDICO */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              {Object.entries(formData.medicalData)
                .filter(([key]) => 
                  !key.includes('mentalHealth') && 
                  !key.includes('Addiction') && 
                  !key.includes('Resistance') &&
                  !key.includes('Rhythms') &&
                  !key.includes('Hygiene') &&
                  !key.includes('Exposure') &&
                  !key.includes('Toxicity') &&
                  !key.includes('Health') &&
                  !key.includes('documents') &&
                  key !== 'carbohydrateAddiction' &&
                  key !== 'leptinResistance' &&
                  key !== 'circadianRhythms' &&
                  key !== 'sleepHygiene' &&
                  key !== 'electrosmogExposure' &&
                  key !== 'generalToxicity' &&
                  key !== 'microbiotaHealth' &&
                  !key.startsWith('motivation') &&
                  !key.startsWith('commitment') &&
                  !key.startsWith('previousCoach') &&
                  key !== 'targetDate' &&
                  !key.startsWith('typical') &&
                  key !== 'whoCooks' &&
                  key !== 'currentActivityLevel' &&
                  key !== 'physicalLimitations'
                )
                .map(([key, value]) => (
                  <div key={key} className="bg-white p-4 rounded-lg border border-yellow-100 shadow-sm">
                    <label className="block text-sm font-medium text-yellow-700 mb-2">
                      {formatLabel(key)}
                    </label>
                    {key === 'appetiteChanges' ? (
                      <select value={value as string} onChange={(e) => handleInputChange('medicalData', key, e.target.value)} className="w-full px-3 py-2 border border-yellow-200 rounded-md focus:ring-2 focus:ring-yellow-500">
                        <option value="">Seleccionar</option>
                        {appetiteChangeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : key === 'mainComplaintIntensity' ? (
                      <input type="number" min="1" max="10" value={value as number || ''} onChange={(e) => handleInputChange('medicalData', key, e.target.value ? parseInt(e.target.value) : undefined)} className="w-full px-3 py-2 border border-yellow-200 rounded-md focus:ring-2 focus:ring-yellow-500" />
                    ) : (
                      <textarea rows={3} value={value as string} onChange={(e) => handleInputChange('medicalData', key, e.target.value)} className="w-full px-3 py-2 border border-yellow-200 rounded-md focus:ring-2 focus:ring-yellow-500" />
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* EVALUACIONES */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              {Object.entries(evaluationQuestions).map(([section, { title, questions }]) => {
                const sectionKey = section as keyof Client['medicalData'];
                const types = evaluationTypes[section] || Array(questions.length).fill('frequency');
                return (
                  <div key={section} className="bg-white rounded-lg border border-pink-200 p-6">
                    <h3 className="text-xl font-semibold text-pink-700 mb-4">{title}</h3>
                    <div className="space-y-4">
                      {questions.map((question, qIndex) => {
                        const currentValue = getEvaluationValue(sectionKey, qIndex);
                        const options = types[qIndex] === 'frequency' ? frequencyOptions : yesNoOptions;
                        return (
                          <div key={qIndex} className="flex flex-col md:flex-row md:items-start justify-between p-4 bg-pink-50 rounded-lg">
                            <span className="flex-1 text-sm text-gray-700 md:pr-4 mb-3 md:mb-0">{question}</span>
                            <div className="flex flex-wrap gap-3">
                              {options.map(opt => (
                                <label key={opt.value} className="flex items-center space-x-1">
                                  <input
                                    type="radio"
                                    name={`${section}-${qIndex}`}
                                    value={opt.value}
                                    checked={currentValue === opt.value}
                                    onChange={() => handleEvaluationChange(sectionKey, qIndex, opt.value)}
                                    className="text-pink-700 focus:ring-pink-500"
                                  />
                                  <span className="text-sm font-medium text-pink-700">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SALUD EMOCIONAL */}
          {activeTab === 'mental' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-purple-200 p-6">
                <h3 className="text-xl font-semibold text-purple-700 mb-4">Preguntas de Opción Múltiple</h3>
                <div className="space-y-6">
                  {Object.entries(mentalHealthMultipleChoiceQuestions).map(([field, question]) => {
                    const currentValue = formData.medicalData[field as keyof Client['medicalData']] as string;
                    const options = mentalHealthOptions[field] || {};
                    return (
                      <div key={field} className="bg-purple-50 rounded-lg p-4">
                        <label className="block text-lg font-medium text-purple-700 mb-3">{question}</label>
                        <div className="space-y-2">
                          {Object.entries(options).map(([value, label]) => (
                            <label key={value} className="flex items-center p-2 hover:bg-purple-100 rounded transition cursor-pointer">
                              <input
                                type="radio"
                                value={value}
                                checked={currentValue === value}
                                onChange={(e) => handleInputChange('medicalData', field, e.target.value)}
                                className="mr-3 text-purple-600 focus:ring-purple-500 h-4 w-4"
                              />
                              <span className="text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-purple-200 p-6">
                <h3 className="text-xl font-semibold text-purple-700 mb-4">Preguntas Abiertas</h3>
                <div className="space-y-4">
                  {Object.entries(mentalHealthOpenQuestions).map(([field, question]) => (
                    <div key={field} className="bg-purple-50 p-4 rounded-lg">
                      <label className="block text-lg font-medium text-purple-700 mb-2">{question}</label>
                      <textarea
                        rows={3}
                        value={formData.medicalData[field as keyof Client['medicalData']] as string || ''}
                        onChange={(e) => handleInputChange('medicalData', field, e.target.value)}
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ESTILO DE VIDA */}
          {activeTab === 'lifestyle' && (
            <div className="space-y-4">
              {Object.entries(lifestyleQuestions).map(([field, question]) => {
                const currentValue = formData.medicalData[field as keyof Client['medicalData']] as string || '';
                
                // gymAccess es un select, no un textarea
                if (field === 'gymAccess') {
                  return (
                    <div key={field} className="bg-white p-4 rounded-lg border border-teal-100 shadow-sm">
                      <label className="block text-sm font-medium text-teal-700 mb-2">{question}</label>
                      <select
                        value={currentValue}
                        onChange={(e) => handleInputChange('medicalData', field, e.target.value)}
                        className="w-full px-3 py-2 border border-teal-200 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="si-gimnasio">Sí, tengo acceso a un gimnasio</option>
                        <option value="si-parque">Sí, tengo acceso a un parque de calistenia o área al aire libre</option>
                        <option value="equipos-casa">Sí, tengo equipos básicos en casa (pesas, bandas de resistencia, etc.)</option>
                        <option value="peso-corporal">Prefiero ejercicios sin equipo (peso corporal)</option>
                        <option value="no-acceso">No tengo acceso a equipos específicos</option>
                      </select>
                    </div>
                  );
                }
                
                // Los demás campos son textarea
                return (
                  <div key={field} className="bg-white p-4 rounded-lg border border-teal-100 shadow-sm">
                    <label className="block text-sm font-medium text-teal-700 mb-2">{question}</label>
                    <textarea
                      rows={3}
                      value={currentValue}
                      onChange={(e) => handleInputChange('medicalData', field, e.target.value)}
                      className="w-full px-3 py-2 border border-teal-200 rounded-md focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="p-6 border-t border-blue-200 bg-white rounded-b-xl">
          {/* Botón de expandir/contraer solo en móvil */}
          <div className="flex justify-between items-center md:hidden mb-2">
            <span className="text-sm text-gray-600">Acciones</span>
            <button
              onClick={() => setFooterExpanded(!footerExpanded)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${footerExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          <div className={`${footerExpanded ? 'flex' : 'hidden'} md:flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3`}>
            <button
              onClick={onClose}
              className="w-full md:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium flex items-center justify-center shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
// apps/dashboard/src/components/dashboard/EditClientModal.tsx
import { useState } from 'react'

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
    mainComplaint: string
    medications: string
    supplements: string
    currentPastConditions: string
    additionalMedicalHistory: string
    employmentHistory: string
    hobbies: string
    allergies: string
    surgeries: string
    housingHistory: string
    mainComplaintIntensity?: number;
    mainComplaintImpact?: string;
    appetiteChanges?: string;
    documents?: UploadedFile[];
    // Evaluaciones
    carbohydrateAddiction: string[]
    leptinResistance: string[]
    circadianRhythms: string[]
    sleepHygiene: string[]
    electrosmogExposure: string[]
    generalToxicity: string[]
    microbiotaHealth: string[]
    // Salud mental
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
    mentalHealthSelfRelationship: string
    mentalHealthLimitingBeliefs: string
    mentalHealthIdealBalance: string
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

// Definimos un tipo para las secciones de evaluación que existen en medicalData
type EvaluationSection = keyof Pick<Client['medicalData'],
  'carbohydrateAddiction' |
  'leptinResistance' |
  'circadianRhythms' |
  'sleepHygiene' |
  'electrosmogExposure' |
  'generalToxicity' |
  'microbiotaHealth'
>;

const evaluationQuestions: Record<EvaluationSection, { title: string; questions: string[] }> = {
  carbohydrateAddiction: {
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
  leptinResistance: {
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
  circadianRhythms: {
    title: 'Alteración de los ritmos circadianos / Exposición al sol',
    questions: [
      '¿Lo primero que ves al despertar es tu celular?',
      '¿Estás expuesto a la luz artificial después del atardecer? (pantallas de computadoras, televisiones, celulares, tablets, focos de luz blanca o amarilla)',
      '¿Utilizas algún tipo de tecnología Wifi, 2G, 3G, 4G, 5G y/o luz artificial durante la noche?',
      '¿Exponerte al sol te hace daño (sufres quemaduras)?',
      '¿Utilizas gafas/lentes solares?',
      '¿Utilizas cremas o protectores solares?',
      '¿Comes pocos pescados, moluscos y/o crustáceos (menos de 1 vez a la semana)?',
      '¿Comes cuando ya no hay luz del sol?',
      '¿Tu exposición al sol es de menos de 30 minutos al día?',
      '¿Haces grounding (caminar descalzo sobre hierba, tierra, o arena) menos de 30 minutos al día?',
      '¿Utilizas filtros de luz azul en tus dispositivos electrónicos (modo noche, aplicaciones) por la noche?'
    ]
  },
  sleepHygiene: {
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
      '¿Te acuestas inmediatamente después de cenar?',
      '¿Tu horario de sueño es regular? (¿Te acuestas y levantas más o menos a la misma hora todos los días, incluidos fines de semana?)'
    ]
  },
  electrosmogExposure: {
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
  generalToxicity: {
    title: 'Toxicidad general',
    questions: [
      '¿Bebes agua embotellada?',
      '¿Utilizas protector solar convencional?',
      '¿Algún miembro de tu familia ha sido diagnosticado con fibromialgia, fatiga crónica o sensibilidades químicas múltiples?',
      '¿Tienes algún historial de disfunción renal?',
      '¿Tienes tú o algún miembro de tu familia inmediata antecedentes de cáncer?',
      '¿Tienes algún historial de enfermedad cardíaca, infarto de miocardio (ataque cardíaco) o de accidentes cerebrovasculares?',
      '¿Alguna vez te han diagnosticado trastorno bipolar, esquizofrenia o depresión?',
      '¿Alguna vez te han diagnosticado diabetes o tiroiditis?',
      '¿Fumas o consumes algún tipo de vapeador?',
      '¿Consumes alcohol? ¿Con qué frecuencia y cantidad?'
    ]
  },
  microbiotaHealth: {
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
      '¿Tomaste leche de fórmula en lugar de ser amamantado?',
      '¿Consumes alimentos fermentados con regularidad (kéfir, chucrut, kombucha, yogur natural, kimchi)?',
      'En tu opinión, ¿crees que consumes suficiente fibra de frutas, verduras y legumbres?'
    ]
  }
};

const mentalHealthOptions: { [key: string]: { [key: string]: string } } = {
  mentalHealthEmotionIdentification: {
    a: 'Casi siempre',
    b: 'A veces',
    c: 'Rara vez'
  },
  mentalHealthEmotionIntensity: {
    a: 'Muy intensas, a veces me desbordan',
    b: 'Moderadas, las puedo manejar',
    c: 'Poco intensas, casi no las noto'
  },
  mentalHealthUncomfortableEmotion: {
    a: 'La evito o la reprimo',
    b: 'Me dejo llevar por ella sin control',
    c: 'La acepto y trato de entender su mensaje'
  },
  mentalHealthInternalDialogue: {
    a: '"Siempre me pasa a mí", "No sirvo para esto"',
    b: '"Es una oportunidad para aprender"',
    c: '"No puedo hacer nada para cambiarlo"'
  },
  mentalHealthStressStrategies: {
    a: 'Comer, fumar, distraerme con pantallas',
    b: 'Hablar con alguien, respirar, hacer deporte',
    c: 'Me bloqueo y no hago nada'
  },
  mentalHealthSayingNo: {
    a: 'Sí, casi siempre',
    b: 'Solo en algunas situaciones',
    c: 'No, priorizo mis necesidades'
  },
  mentalHealthRelationships: {
    a: 'Sí, con frecuencia',
    b: 'A veces',
    c: 'No, hay equilibrio'
  },
  mentalHealthExpressThoughts: {
    a: 'Casi nunca',
    b: 'Depende de la situación',
    c: 'Sí, de manera asertiva'
  },
  mentalHealthEmotionalDependence: {
    a: 'Sí',
    b: 'No estoy seguro/a',
    c: 'No'
  },
  mentalHealthPurpose: {
    a: 'Sí, claramente',
    b: 'Estoy en proceso de definirlas',
    c: 'No, me siento perdido/a'
  },
  mentalHealthFailureReaction: {
    a: 'Me hundo y tardo en recuperarme',
    b: 'Me frustro, pero sigo adelante',
    c: 'Lo veo como parte del aprendizaje'
  },
  mentalHealthSelfConnection: {
    a: 'Sí, regularmente',
    b: 'Ocasionalmente',
    c: 'No'
  },
  mentalHealthSupportNetwork: {
    'si-tengo': 'Sí, tengo personas de confianza',
    'algunas': 'Tengo algunas personas, pero no siempre me siento cómodo/a',
    'no': 'No, me siento solo/a en este aspecto'
  },
  mentalHealthDailyStress: {
    'bajo': 'Bajo',
    'moderado': 'Moderado',
    'alto': 'Alto',
    'muy-alto': 'Muy Alto'
  }
};

const frequencyOptions = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'rara-vez', label: 'Rara vez' },
  { value: 'a-veces', label: 'A veces' },
  { value: 'casi-siempre', label: 'Casi siempre' },
  { value: 'siempre', label: 'Siempre' },
];

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

export default function EditClientModal({ client, onClose, onSave }: EditClientModalProps) {
  const [activeTab, setActiveTab] = useState('personal')
  const [formData, setFormData] = useState(client)

  const handleInputChange = (
    section: 'personalData' | 'medicalData',
    field: string,
    value: string | number | undefined
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
    section: EvaluationSection,
    questionIndex: number,
    value: string
  ) => {
    const currentArray = [...(formData.medicalData[section] as string[] || [])];
    if (currentArray.length <= questionIndex) {
      for (let i = currentArray.length; i <= questionIndex; i++) {
        currentArray.push('');
      }
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
    section: EvaluationSection,
    questionIndex: number
  ): string => {
    const arr = formData.medicalData[section];
    if (Array.isArray(arr) && arr.length > questionIndex) {
      const item = arr[questionIndex];
      return typeof item === 'string' ? item : '';
    }
    return '';
  };

  const handleSave = async () => {
    try {
      console.log('🔄 Guardando cliente...', formData._id);
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
        console.log('✅ Cliente actualizado');
        onSave();
        onClose();
      } else {
        alert(`Error: ${responseData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error de conexión');
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

        {/* Pestañas */}
        <div className="border-b border-blue-200 bg-white">
          <div className="flex space-x-1 px-6 overflow-x-auto">
            <button onClick={() => setActiveTab('personal')} className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'personal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Datos Personales
            </button>
            <button onClick={() => setActiveTab('medical')} className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'medical' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-yellow-600'}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Información Médica
            </button>
            <button onClick={() => setActiveTab('evaluations')} className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'evaluations' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-pink-600'}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Evaluaciones
            </button>
            <button onClick={() => setActiveTab('mental')} className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'mental' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Salud Emocional
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 bg-blue-50">
          {/* Pestaña Personal */}
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

          {/* Pestaña Médica */}
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
                  key !== 'microbiotaHealth'
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

          {/* Pestaña Evaluaciones */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              {(Object.entries(evaluationQuestions) as [EvaluationSection, { title: string; questions: string[] }][]).map(([section, { title, questions }]) => (
                <div key={section} className="bg-white rounded-lg border border-pink-200 p-6">
                  <h3 className="text-lg font-semibold text-pink-700 mb-4">{title}</h3>
                  <div className="space-y-4">
                    {questions.map((question, qIndex) => {
                      const currentValue = getEvaluationValue(section, qIndex);
                      return (
                        <div key={qIndex} className="flex flex-col md:flex-row md:items-start justify-between p-4 bg-pink-50 rounded-lg">
                          <span className="flex-1 text-sm text-gray-700 md:pr-4 mb-2 md:mb-0">{question}</span>
                          <div className="flex flex-wrap gap-2">
                            {frequencyOptions.map(opt => (
                              <label key={opt.value} className="flex items-center space-x-1">
                                <input
                                  type="radio"
                                  name={`${section}-${qIndex}`}
                                  value={opt.value}
                                  checked={currentValue === opt.value}
                                  onChange={() => handleEvaluationChange(section, qIndex, opt.value)}
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
            </div>
          )}

          {/* Pestaña Salud Emocional */}
          {activeTab === 'mental' && (
            <div className="space-y-6">
              {/* Opciones múltiples */}
              <div className="bg-white rounded-lg border border-purple-200 p-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">Preguntas de Opción Múltiple</h3>
                <div className="space-y-6">
                  {Object.entries(mentalHealthOptions).map(([field, options]) => {
                    const currentValue = formData.medicalData[field as keyof Client['medicalData']] as string;
                    const questionMap: { [key: string]: string } = {
                      mentalHealthEmotionIdentification: '¿Puedes identificar con facilidad qué emoción estás sintiendo en momentos clave de tu día?',
                      mentalHealthEmotionIntensity: '¿Cómo de intensas suelen ser tus emociones?',
                      mentalHealthUncomfortableEmotion: '¿Qué haces cuando sientes una emoción incómoda?',
                      mentalHealthInternalDialogue: 'Cuando algo sale mal, ¿cuál es tu diálogo interno más frecuente?',
                      mentalHealthStressStrategies: 'Ante una situación estresante, ¿qué estrategias sueles utilizar?',
                      mentalHealthSayingNo: '¿Te resulta difícil decir "no" por miedo a decepcionar a los demás?',
                      mentalHealthRelationships: 'En tus relaciones, ¿sueles sentir que das más de lo que recibes?',
                      mentalHealthExpressThoughts: '¿Expresas abiertamente lo que piensas y sientes, incluso cuando es incómodo?',
                      mentalHealthEmotionalDependence: '¿Alguna relación actual o pasada te genera malestar o dependencia emocional?',
                      mentalHealthPurpose: '¿Sientes que tienes un propósito o metas que te motivan?',
                      mentalHealthFailureReaction: 'Cuando enfrentas un fracaso, ¿cómo reaccionas?',
                      mentalHealthSelfConnection: '¿Practicas alguna rutina que te ayude a conectar contigo mismo/a?',
                      mentalHealthSupportNetwork: '¿Cuentas con una red de apoyo sólida (amigos, familia, pareja) con quien puedas hablar abiertamente?',
                      mentalHealthDailyStress: 'En general, ¿cómo calificarías tu nivel de estrés diario?'
                    };
                    return (
                      <div key={field} className="bg-purple-50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-purple-700 mb-3">{questionMap[field] || field}</label>
                        <div className="space-y-2">
                          {Object.entries(options).map(([value, label]) => (
                            <label key={value} className="flex items-center p-2 hover:bg-purple-100 rounded transition">
                              <input
                                type="radio"
                                value={value}
                                checked={currentValue === value}
                                onChange={(e) => handleInputChange('medicalData', field, e.target.value)}
                                className="mr-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preguntas abiertas */}
              <div className="bg-white rounded-lg border border-purple-200 p-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">Preguntas Abiertas</h3>
                <div className="space-y-4">
                  {Object.entries(formData.medicalData)
                    .filter(([key]) => 
                      key.includes('mentalHealth') && 
                      !Object.keys(mentalHealthOptions).includes(key) &&
                      key !== 'mentalHealthSupportNetwork' &&
                      key !== 'mentalHealthDailyStress'
                    )
                    .map(([key, value]) => (
                      <div key={key} className="bg-purple-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-purple-700 mb-2">{formatLabel(key)}</label>
                        <textarea
                          rows={3}
                          value={value as string}
                          onChange={(e) => handleInputChange('medicalData', key, e.target.value)}
                          className="w-full px-3 py-2 border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="p-6 border-t border-blue-200 bg-white rounded-b-xl flex justify-end space-x-3">
          <button onClick={onClose} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium flex items-center shadow-md">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button onClick={handleSave} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center shadow-md">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}
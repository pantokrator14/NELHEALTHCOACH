import { useState } from 'react'

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
    
    // Evaluaciones (arrays JSON)
    carbohydrateAddiction: boolean[]
    leptinResistance: boolean[]
    circadianRhythms: boolean[]
    sleepHygiene: boolean[]
    electrosmogExposure: boolean[]
    generalToxicity: boolean[]
    microbiotaHealth: boolean[]
    
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
    
    // Salud mental - texto abierto
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

// Preguntas para las evaluaciones SÍ/NO (las mismas que en MedicalDataStep.tsx)
const evaluationQuestions = {
  carbohydrateAddiction: [
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
  ],
  leptinResistance: [
    '¿Tienes sobrepeso u obesidad?',
    '¿Tienes hambre constantemente?',
    '¿Tienes antojos por carbohidratos, especialmente por las noches?',
    '¿Tienes problemas para dormir? (insomnio)',
    '¿Te sientes sin energía durante el día?',
    '¿Sientes que al despertar no descansaste bien durante la noche?',
    '¿Te ejercitas menos de 30 minutos al día?',
    '¿Te saltas el desayuno?'
  ],
  circadianRhythms: [
    '¿Lo primero que ves al despertar es tu celular?',
    '¿Entra luz artificial a tu habitación al momento de dormir?',
    '¿Estás expuesto a la luz artificial después del atardecer? (pantallas de computadoras, televisiones, celulares, tablets, focos de luz blanca o amarilla)',
    '¿Utilizas algún tipo de tecnología Wifi, 2G, 3G, 4G, 5G y/o luz artificial durante la noche?',
    '¿Exponerte al sol te hace daño (sufres quemaduras)?',
    '¿Utilizas gafas/lentes solares?',
    '¿Utilizas cremas o protectores solares?',
    '¿Comes pocos pescados, moluscos y/o crustáceos (menos de 1 vez a la semana)?',
    '¿Comes cuando ya no hay luz del sol?',
    '¿Tu exposición al sol es de menos de 30 minutos al día?',
    '¿Haces grounding (caminar descalzo sobre hierba, tierra, o arena) menos de 30 minutos al día?'
  ],
  sleepHygiene: [
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
    '¿Te acuestas inmediatamente después de cenar?'
  ],
  electrosmogExposure: [
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
  ],
  generalToxicity: [
    '¿Bebes agua embotellada?',
    '¿Utilizas protector solar convencional?',
    '¿Algún miembro de tu familia ha sido diagnosticado con fibromialgia, fatiga crónica o sensibilidades químicas múltiples?',
    '¿Tienes algún historial de disfunción renal?',
    '¿Tienes tú o algún miembro de tu familia inmediata antecedentes de cáncer?',
    '¿Tienes algún historial de enfermedad cardíaca, infarto de miocardio (ataque cardíaco) o de accidentes cerebrovasculares?',
    '¿Alguna vez te han diagnosticado trastorno bipolar, esquizofrenia o depresión?',
    '¿Alguna vez te han diagnosticado diabetes o tiroiditis?'
  ],
  microbiotaHealth: [
    '¿Sufres de estreñimiento o de diarrea?',
    '¿Sientes distensión, hinchazón, sensación de saciedad y/o ruidos en el intestino después de comer carbohidratos como brócoli, coles de Bruselas u otras verduras?',
    '¿Tienes a menudo gases con olor desagradable como a azufre?',
    '¿Alguna vez has sido vegano o vegetariano durante algún tiempo?',
    '¿Tienes intolerancia a la carne?',
    '¿Has usado o utilizas antiácidos, inhibidores de la bomba de protones o cualquier otro medicamento que bloquee el ácido?',
    'Cuando consumes alcohol, ¿tienes confusión mental o una sensación tóxica incluso después de 1 porción?',
    '¿Has tomado antibióticos durante un período prolongado o con frecuencia (aún de niño)?',
    '¿Naciste por cesárea?',
    '¿Tomaste leche de fórmula en lugar de ser amamantado?'
  ]
}

// Opciones para salud mental
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
  }
}

export default function EditClientModal({ client, onClose, onSave }: EditClientModalProps) {
  const [activeTab, setActiveTab] = useState('personal')
  const [formData, setFormData] = useState(client)

  const handleInputChange = (section: 'personalData' | 'medicalData', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  // Función para manejar cambios en evaluaciones SÍ/NO
  const handleEvaluationChange = (section: string, questionIndex: number, value: boolean) => {
    try {
      // Ahora debería ser un array directo, no un string encriptado
      const currentArray = [...(formData.medicalData[section as keyof Client['medicalData']] as boolean[] || [])];
      
      // Asegurar longitud mínima
      if (currentArray.length <= questionIndex) {
        currentArray.push(...Array(questionIndex - currentArray.length + 1).fill(false));
      }
      
      // Actualizar valor
      currentArray[questionIndex] = value;
      
      setFormData(prev => ({
        ...prev,
        medicalData: {
          ...prev.medicalData,
          [section]: currentArray
        }
      }));
    } catch (error) {
      console.error(`Error en handleEvaluationChange:`, error);
    }
  };

  // Función para obtener el valor de una evaluación específica
  const getEvaluationValue = (section: string, questionIndex: number): boolean => {
    try {
      const data = formData.medicalData[section as keyof Client['medicalData']];
      
      // Si es un array, devolver el valor directamente
      if (Array.isArray(data)) {
        return data[questionIndex] || false;
      }
      
      // Si es un string (fallback por compatibilidad), intentar parsear
      if (typeof data === 'string') {
        const parsed = JSON.parse(data || '[]');
        return Array.isArray(parsed) ? (parsed[questionIndex] || false) : false;
      }
      
      // Por defecto, false
      return false;
    } catch (error) {
      console.warn(`Error obteniendo valor de evaluación ${section}[${questionIndex}]:`, error);
      return false;
    }
  }

  const handleSave = async () => {
    try {
      console.log('🔄 Intentando guardar cliente:', {
        clientId: client._id,
        endpoint: `/api/clients/${client._id}`,
        formData: formData
      });

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clients/${client._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const responseData = await response.json();
      console.log('📨 Respuesta del servidor:', responseData);

      if (response.ok) {
        console.log('✅ Cliente actualizado exitosamente');
        onSave()
        onClose()
      } else {
        console.error('❌ Error del servidor:', responseData);
        alert(`Error al guardar los cambios: ${responseData.message || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('❌ Error completo actualizando cliente:', error)
      alert('Error de conexión al guardar los cambios')
    }
  }

  // Función para formatear las etiquetas en español
  const formatLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      // Datos personales
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
      
      // Datos médicos
      mainComplaint: 'Motivo principal de consulta',
      medications: 'Medicamentos',
      supplements: 'Suplementos',
      currentPastConditions: 'Condiciones actuales y pasadas',
      additionalMedicalHistory: 'Historial médico adicional',
      employmentHistory: 'Historial laboral',
      hobbies: 'Hobbies e intereses',
      allergies: 'Alergias',
      surgeries: 'Cirugías',
      housingHistory: 'Historial de vivienda',
      
      // Salud mental
      mentalHealthSelfRelationship: 'Relación consigo mismo',
      mentalHealthLimitingBeliefs: 'Creencias limitantes',
      mentalHealthIdealBalance: 'Balance ideal',
      
      // Evaluaciones
      carbohydrateAddiction: 'Adicción a los carbohidratos',
      leptinResistance: 'Resistencia a la leptina',
      circadianRhythms: 'Ritmos circadianos',
      sleepHygiene: 'Higiene del sueño',
      electrosmogExposure: 'Exposición al electrosmog',
      generalToxicity: 'Toxicidad general',
      microbiotaHealth: 'Salud de la microbiota'
    }
    return labels[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase()
  }

  // Función para obtener el texto de la opción de salud mental
  const getMentalHealthOptionText = (field: string, value: string): string => {
    return mentalHealthOptions[field]?.[value] || value
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-blue-200">
        {/* Encabezado del modal */}
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
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-blue-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Datos Personales
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
                activeTab === 'medical'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-yellow-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Información Médica
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
                activeTab === 'evaluations'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-pink-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Evaluaciones
            </button>
            <button
              onClick={() => setActiveTab('mental')}
              className={`py-4 px-6 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
                activeTab === 'mental'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-purple-600'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Salud y Bienestar Emocional
            </button>
          </div>
        </div>

        {/* Contenido del formulario */}
        <div className="flex-1 overflow-y-auto p-6 bg-blue-50">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.personalData).map(([key, value]) => (
                <div key={key} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    {formatLabel(key)}
                  </label>
                  
                  {key === 'birthDate' ? (
                    // Date picker para fecha de nacimiento
                    <input
                      type="date"
                      value={value as string}
                      onChange={(e) => handleInputChange('personalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : key === 'maritalStatus' ? (
                    // Select para estado civil
                    <select
                      value={value as string}
                      onChange={(e) => handleInputChange('personalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar estado civil</option>
                      <option value="Soltero">Soltero</option>
                      <option value="Casado">Casado</option>
                      <option value="Divorciado">Divorciado</option>
                      <option value="Viudo">Viudo</option>
                      <option value="Unión libre">Unión libre</option>
                    </select>
                  ) : key === 'education' ? (
                    // Select para educación
                    <select
                      value={value as string}
                      onChange={(e) => handleInputChange('personalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar nivel educativo</option>
                      <option value="Primaria">Primaria</option>
                      <option value="Secundaria">Secundaria</option>
                      <option value="Bachillerato">Bachillerato</option>
                      <option value="Técnico">Técnico</option>
                      <option value="Universitario">Universitario</option>
                      <option value="Posgrado">Posgrado</option>
                    </select>
                  ) : key === 'gender' ? (
                    // Select para género (mejorado)
                    <select
                      value={value as string}
                      onChange={(e) => handleInputChange('personalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                      <option value="Prefiero no decir">Prefiero no decir</option>
                    </select>
                  ) : key === 'age' || key === 'weight' || key === 'height' ? (
                    // Input number para campos numéricos
                    <input
                      type="number"
                      value={value as string}
                      onChange={(e) => handleInputChange('personalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={key === 'age' ? 0 : key === 'weight' ? 0 : key === 'height' ? 0 : undefined}
                      step={key === 'weight' ? "0.1" : "1"}
                    />
                  ) : (
                    // Input text para los demás campos
                    <input
                      type="text"
                      value={value as string}
                      onChange={(e) => handleInputChange('personalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

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
                    <textarea
                      rows={3}
                      value={value as string}
                      onChange={(e) => handleInputChange('medicalData', key, e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-yellow-200 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder={`Describe ${formatLabel(key).toLowerCase()}...`}
                    />
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              {Object.entries(evaluationQuestions).map(([section, questions]) => (
                <div key={section} className="bg-white rounded-lg border border-pink-200 p-6">
                  <h3 className="text-lg font-semibold text-pink-700 mb-4">
                    {formatLabel(section)}
                  </h3>
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-pink-50 rounded-lg">
                        <span className="flex-1 text-sm text-gray-700 pr-4">{question}</span>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={getEvaluationValue(section, index) === true}
                              onChange={() => handleEvaluationChange(section, index, true)}
                              className="mr-2 text-pink-700 focus:ring-pink-500"
                            />
                            <span className="text-sm font-semibold text-pink-700">SÍ</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={getEvaluationValue(section, index) === false}
                              onChange={() => handleEvaluationChange(section, index, false)}
                              className="mr-2 text-pink-700 focus:ring-pink-500"
                            />
                            <span className="text-sm font-semibold text-pink-700">NO</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'mental' && (
            <div className="space-y-6">
              {/* Opciones múltiples */}
              <div className="bg-white rounded-lg border border-purple-200 p-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  Preguntas de Opción Múltiple
                </h3>
                <div className="space-y-6">
                  {Object.entries(mentalHealthOptions).map(([field, options]) => (
                    <div key={field} className="bg-purple-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-purple-700 mb-3">
                        {(() => {
                          // Preguntas correspondientes a cada campo
                          const questions: { [key: string]: string } = {
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
                            mentalHealthSelfConnection: '¿Practicas alguna rutina que te ayude a conectar contigo mismo/a?'
                          }
                          return questions[field] || field
                        })()}
                      </label>
                      <div className="space-y-2">
                        {Object.entries(options).map(([value, label]) => (
                          <label key={value} className="flex items-center p-2 hover:bg-purple-100 rounded transition-colors">
                            <input
                              type="radio"
                              value={value}
                              checked={formData.medicalData[field as keyof Client['medicalData']] === value}
                              onChange={(e) => handleInputChange('medicalData', field, e.target.value)}
                              className="mr-3 text-purple-600 focus:ring-purple-500 h-4 w-4"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preguntas abiertas */}
              <div className="bg-white rounded-lg border border-purple-200 p-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  Preguntas Abiertas
                </h3>
                <div className="space-y-4">
                  {Object.entries(formData.medicalData)
                    .filter(([key]) => 
                      key.includes('mentalHealth') && 
                      !Object.keys(mentalHealthOptions).includes(key)
                    )
                    .map(([key, value]) => (
                      <div key={key} className="bg-purple-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          {formatLabel(key)}
                        </label>
                        <textarea
                          rows={3}
                          value={value as string}
                          onChange={(e) => handleInputChange('medicalData', key, e.target.value)}
                          className="w-full px-3 py-2 text-gray-700 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={`Describe ${formatLabel(key).toLowerCase()}...`}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="p-6 border-t border-blue-200 bg-white rounded-b-xl flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center shadow-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center shadow-md"
          >
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
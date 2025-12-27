import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/dashboard/Layout'
import Head from 'next/head'
import EditClientModal from '../../../components/dashboard/EditClientModal'
import { apiClient } from '@/lib/api';
import Image from 'next/image'
import AIRecommendationsModal from '../../../components/dashboard/AIRecommendationsModal';

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
    documents?: UploadedFile[];
    
    // Evaluaciones
    carbohydrateAddiction: boolean[]
    leptinResistance: boolean[]
    circadianRhythms: boolean[]
    sleepHygiene: boolean[]
    electrosmogExposure: boolean[]
    generalToxicity: boolean[]
    microbiotaHealth: boolean[]
    
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
    
    // Salud mental - texto abierto
    mentalHealthSelfRelationship: string
    mentalHealthLimitingBeliefs: string
    mentalHealthIdealBalance: string
  }
  contractAccepted: string
  ipAddress: string
  submissionDate: string
}

// Mapeo de opciones para salud mental
const mentalHealthOptions: Record<string, Record<string, string>> = {
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

// Preguntas para las evaluaciones SÍ/NO
const evaluationQuestions: Record<string, { title: string; questions: string[] }> = {
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
      '¿Sientes que no tienes control en lo que eats?'
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
      '¿Te acuestas inmediatamente después de cenar?'
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
      '¿Alguna vez te han diagnosticado diabetes o tiroiditis?'
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
      '¿Tomaste leche de fórmula en lugar de ser amamantado?'
    ]
  }
}

export default function ClientProfile() {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [expandedEvaluations, setExpandedEvaluations] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { id } = router.query
  const [selectedDocument, setSelectedDocument] = useState<UploadedFile | null>(null)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isProfilePhotoModalOpen, setIsProfilePhotoModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  
  // Asegurar que el id es string
  const clientId = Array.isArray(id) ? id[0] : id || '';

  const fetchClient = useCallback(async () => {
    try {
      if (!clientId) return;
      
      const result = await apiClient.getClient(clientId);
      setClient(result.data);
    } catch (error) {
      console.error('Error fetching client:', error)
      alert('Error al cargar los datos del cliente')
    } finally {
      setLoading(false)
    }
  }, [clientId]);

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    if (clientId) {
      fetchClient()
    }
  }, [clientId, router, fetchClient])

  const handleDelete = async () => {
    if (!clientId || !confirm(`¿Estás seguro de que deseas eliminar a ${client?.personalData.name}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await apiClient.deleteClient(clientId);
      router.push('/dashboard/clients')
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error al eliminar el cliente')
    }
  }

  // Función para obtener la etiqueta de la opción de salud mental
  const getMentalHealthLabel = (field: string, value: string): string => {
    if (!value) return 'No especificado'
    return mentalHealthOptions[field]?.[value] || value
  }

  // Función para dividir el nombre completo en nombre y apellido
  const getNames = (fullName: string) => {
    const names = fullName.split(' ')
    return {
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || ''
    }
  }

  // Función para alternar acordeones de evaluaciones
  const toggleEvaluation = (evaluationKey: string) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [evaluationKey]: !prev[evaluationKey]
    }))
  }

  // Función para obtener las respuestas de una evaluación específica
  const getEvaluationAnswers = (evaluationData: unknown): boolean[] => {
    if (Array.isArray(evaluationData)) {
      return evaluationData;
    }
    
    // Si por alguna razón viene como string, intentar parsear
    if (typeof evaluationData === 'string') {
      try {
        const parsed = JSON.parse(evaluationData);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    
    return [];
  };

  // Función para cambiar la foto de perfil
  const handleProfilePhotoChange = async (file: File) => {
    if (!clientId) return;
    
    setUploading(true);
    try {
      // 1. Obtener URL de upload para la nueva foto
      const uploadResponse = await apiClient.generateUploadURL(
        clientId,
        file.name,
        file.type,
        file.size,
        'profile'
      );

      // 2. Subir archivo a S3
      await fetch(uploadResponse.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // 3. Confirmar upload y actualizar en base de datos
      await apiClient.confirmUpload(
        clientId,
        uploadResponse.fileKey,
        file.name,
        file.type,
        file.size,
        'profile',
        uploadResponse.uploadURL // Usar uploadURL ya que fileURL no existe en la respuesta
      );

      // 4. Recargar datos del cliente
      await fetchClient();
      
      alert('Foto de perfil actualizada exitosamente');
      setIsProfilePhotoModalOpen(false);
    } catch (error) {
      console.error('Error actualizando foto de perfil:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert('Error al actualizar la foto de perfil: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Función para eliminar un documento
  const handleDeleteDocument = async (document: UploadedFile) => {
    if (!clientId || !confirm(`¿Estás seguro de que deseas eliminar el documento "${document.name}"?`)) {
      return;
    }

    try {
      await apiClient.deleteDocument(clientId, document.key);
      await fetchClient(); // Recargar datos
      alert('Documento eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando documento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert('Error al eliminar el documento: ' + errorMessage);
    }
  };

  // Función para subir nuevos documentos
  const handleUploadDocuments = async () => {
    if (!clientId || selectedFiles.length === 0) return;
    
    setUploading(true);
    
    const uploadPromises = selectedFiles.map(async (file) => {
      try {
        // 1. Obtener URL de upload
        const uploadResponse = await apiClient.generateUploadURL(
          clientId,
          file.name,
          file.type,
          file.size,
          'document'
        );

        // 2. Subir archivo a S3
        await fetch(uploadResponse.uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        // 3. Confirmar upload
        await apiClient.confirmUpload(
          clientId,
          uploadResponse.fileKey,
          file.name,
          file.type,
          file.size,
          'document',
          uploadResponse.uploadURL // Usar uploadURL ya que fileURL no existe en la respuesta
        );

        return { success: true, fileName: file.name };
      } catch (error) {
        console.error(`Error subiendo ${file.name}:`, error);
        return { success: false, fileName: file.name, error };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        alert(`${successful} documentos subidos exitosamente, ${failed} fallaron. Revisa la consola para más detalles.`);
      } else {
        alert('Todos los documentos se subieron exitosamente');
      }

      await fetchClient(); // Recargar datos
      setSelectedFiles([]);
      setIsDocumentsModalOpen(false);
    } catch (error) {
      console.error('Error subiendo documentos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert('Error al subir los documentos: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Funciones para drag & drop
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!client) {
    return (
      <Layout>
        <div className="p-8">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Cliente no encontrado</h3>
            <button 
              onClick={() => router.push('/dashboard/clients')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Volver a la lista de clientes
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const { firstName, lastName } = getNames(client.personalData.name)

  return (
    <>
      <Head>
        <title>{firstName} {lastName} - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-8 flex flex-col lg:flex-row gap-8 min-h-full">
          {/* Información del cliente - 30% */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sticky top-8 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="flex flex-col items-center text-center mb-6">
                {client.personalData.profilePhoto ? (
                <div className="relative mb-4">
                  <Image 
                    src={client.personalData.profilePhoto.url} 
                    alt={`Foto de ${firstName} ${lastName}`}
                    className="w-60 h-60 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                    width={240}
                    height={240}
                  />
                  {/* Botón circular azul para editar foto */}
                  <button
                    onClick={() => setIsProfilePhotoModalOpen(true)}
                    className="absolute bottom-2 right-2 bg-blue-700 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition duration-200"
                    title="Cambiar foto de perfil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative mb-4">
                  <div className="w-60 h-60 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-4 border-blue-600">
                    <span className="text-white font-bold text-4xl">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </span>
                  </div>
                  {/* Botón circular azul para agregar foto */}
                  <button
                    onClick={() => setIsProfilePhotoModalOpen(true)}
                    className="absolute bottom-2 right-2 bg-blue-700 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition duration-200"
                    title="Agregar foto de perfil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
                
                {/* Nombre debajo de la foto */}
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {firstName} {lastName}
                </h1>
                
                {/* Fecha debajo del nombre */}
                <p className="text-gray-600 text-sm">
                  Cliente desde el {new Date(client.submissionDate).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              {/* Navegación por pestañas */}
              <div className="mb-6">
                <div className="flex space-x-1 bg-blue-50 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'personal'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-blue-600 hover:text-blue-700 hover:bg-white'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setActiveTab('medical')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'medical'
                        ? 'bg-yellow-600 text-white shadow-sm'
                        : 'text-yellow-600 hover:text-yellow-900 hover:bg-white'
                    }`}
                  >
                    Médico
                  </button>
                  <button
                    onClick={() => setActiveTab('mental')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'mental'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-600 hover:text-purple-900 hover:bg-white'
                    }`}
                  >
                    Emocional
                  </button>
                </div>
              </div>

              {/* Contenido de las pestañas */}
              <div className="space-y-4">
                {activeTab === 'personal' && (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Email</label>
                      <p className="text-gray-800 font-medium">{client.personalData.email}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Teléfono</label>
                      <p className="text-gray-800 font-medium">{client.personalData.phone}</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Dirección</label>
                      <p className="text-gray-800 font-medium">{client.personalData.address}</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Fecha de nacimiento</label>
                      <p className="text-gray-800 font-medium">{new Date(client.personalData.birthDate).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Género</label>
                      <p className="text-gray-800 font-medium">{client.personalData.gender}</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Edad</label>
                      <p className="text-gray-800 font-medium">{client.personalData.age} años</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Peso</label>
                      <p className="text-gray-800 font-medium">{client.personalData.weight} kg</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Altura</label>
                      <p className="text-gray-800 font-medium">{client.personalData.height} cm</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Estado civil</label>
                      <p className="text-gray-800 font-medium">{client.personalData.maritalStatus}</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Nivel educativo</label>
                      <p className="text-gray-800 font-medium">{client.personalData.education || 'No especificado'}</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">Ocupación</label>
                      <p className="text-gray-800 font-medium">{client.personalData.occupation || 'No especificado'}</p>
                    </div>
                  </>
                )}

                {activeTab === 'medical' && (
                  <>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">¿Cuál es tu mayor queja? Por favor enlista todos los síntomas y cuándo comenzaron</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.mainComplaint}</p>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">¿Qué medicamentos estás tomando?</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.medications || 'No especificado'}</p>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">¿Qué suplementos estás tomando? (vitaminas y/o minerales)</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.supplements || 'No especificado'}</p>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">Indica tus condiciones de salud actuales y pasadas (por ejemplo: Diabetes Mellitus, Hipertensión, etc.)</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.currentPastConditions || 'No especificado'}</p>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">¿Hay algo más en tu historial médico que debamos considerar? (incluso de tu niñez)</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.additionalMedicalHistory || 'No especificado'}</p>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">¿Tienes alguna alergia? ¿Cuáles?</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.allergies || 'No especificado'}</p>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">Enlista las cirugías a las que te has sometido</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.surgeries || 'No especificado'}</p>
                    </div>
                  </>
                )}

                {activeTab === 'mental' && (
                  <>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Puedes identificar con facilidad qué emoción estás sintiendo en momentos clave de tu día?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthEmotionIdentification', client.medicalData.mentalHealthEmotionIdentification)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Cómo de intensas suelen ser tus emociones?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthEmotionIntensity', client.medicalData.mentalHealthEmotionIntensity)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Qué haces cuando sientes una emoción incómoda?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthUncomfortableEmotion', client.medicalData.mentalHealthUncomfortableEmotion)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">Cuando algo sale mal, ¿cuál es tu diálogo interno más frecuente?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthInternalDialogue', client.medicalData.mentalHealthInternalDialogue)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">Ante una situación estresante, ¿qué estrategias sueles utilizar?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthStressStrategies', client.medicalData.mentalHealthStressStrategies)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Te resulta difícil decir &quot;no&quot; por miedo a decepcionar a los demás?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthSayingNo', client.medicalData.mentalHealthSayingNo)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">En tus relaciones, ¿sueles sentir que das más de lo que recibes?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthRelationships', client.medicalData.mentalHealthRelationships)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Expresas abiertamente lo que piensas y sientes, incluso cuando es incómodo?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthExpressThoughts', client.medicalData.mentalHealthExpressThoughts)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Alguna relación actual o pasada te genera malestar o dependencia emocional?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthEmotionalDependence', client.medicalData.mentalHealthEmotionalDependence)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Sientes que tienes un propósito o metas que te motivan?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthPurpose', client.medicalData.mentalHealthPurpose)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">Cuando enfrentas un fracaso, ¿cómo reaccionas?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthFailureReaction', client.medicalData.mentalHealthFailureReaction)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700 mb-1">¿Practicas alguna rutina que te ayude a conectar contigo mismo/a (meditación, escritura, naturaleza, etc.)?</label>
                      <p className="text-gray-800 font-medium">
                        {getMentalHealthLabel('mentalHealthSelfConnection', client.medicalData.mentalHealthSelfConnection)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Información
                </button>
                <button 
                  onClick={handleDelete}
                  className="w-full mt-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition duration-200 font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar Cliente
                </button>
              </div>
            </div>
          </div>

          {/* Tarjetas informativas - 70% */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* Tarjeta 1: Resumen de Vida */}
            <div className="bg-yellow-50 rounded-xl shadow-md border border-yellow-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-yellow-700">
                  Resumen de Vida
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100">
                  <h3 className="font-semibold text-yellow-700 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Historial de empleos
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[80px]">
                    {client.medicalData.employmentHistory || 'Información no disponible'}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100">
                  <h3 className="font-semibold text-yellow-700 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Historial de Vivienda
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[80px]">
                    {client.medicalData.housingHistory || 'Información no disponible'}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100 lg:col-span-2">
                  <h3 className="font-semibold text-yellow-700 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hobbies e Intereses
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.hobbies || 'Información no disponible'}
                  </p>
                </div>
              </div>
            </div>
            {/* Tarjeta de Documentos Médicos */}
            <div className="bg-indigo-50 rounded-xl shadow-md border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-indigo-700">
                    Documentos Médicos
                  </h2>
                  <span className="ml-3 bg-indigo-100 text-indigo-800 text-sm px-2 py-1 rounded-full">
                    {client.medicalData.documents?.length || 0} archivos
                  </span>
                </div>
                {/* Botón para agregar documentos */}
                <button
                  onClick={() => setIsDocumentsModalOpen(true)}
                  className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-200 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Documentos
                </button>
              </div>
              
              {client.medicalData.documents && client.medicalData.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.medicalData.documents.map((doc, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-indigo-200 hover:shadow-md transition-shadow relative">
                      {/* Botón de eliminar documento */}
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition duration-200"
                        title="Eliminar documento"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {doc.type.includes('image') ? (
                            <svg className="w-8 h-8 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">
                              {doc.name}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {Math.round(doc.size / 1024)} KB • {doc.type}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsDocumentModalOpen(true);
                          }}
                          className="flex-1 bg-indigo-600 text-white text-center py-2 px-3 rounded-lg hover:bg-indigo-700 transition duration-200 text-sm font-medium"
                        >
                          Ver Documento
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-indigo-200">
                  <svg className="w-12 h-12 text-indigo-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-indigo-500 font-medium mb-2">No hay documentos cargados</p>
                  <button
                    onClick={() => setIsDocumentsModalOpen(true)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Agregar el primer documento
                  </button>
                </div>
              )}
            </div>
            {/* NUEVA TARJETA: Evaluaciones de Salud */}
            <div className="bg-pink-50 rounded-xl shadow-md border border-blue-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-pink-700">
                  Evaluaciones de Salud
                </h2>
              </div>
              
              <div className="space-y-4">
                {Object.entries(evaluationQuestions).map(([key, evaluation]) => {
                  const evaluationData = client.medicalData[key as keyof Client['medicalData']];
                  const answers = getEvaluationAnswers(evaluationData); 
                  const isExpanded = expandedEvaluations[key]
                  
                  return (
                    <div key={key} className="bg-white rounded-lg border border-pink-200 overflow-hidden">
                      <button
                        onClick={() => toggleEvaluation(key)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-pink-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="font-semibold text-pink-700">{evaluation.title}</span>
                          <span className="ml-2 text-sm text-pink-500 bg-pink-100 px-2 py-1 rounded-full">
                            {answers.filter(Boolean).length} de {evaluation.questions.length} positivos
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-pink-500 transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-pink-100 bg-pink-100">
                          <div className="space-y-3">
                            {evaluation.questions.map((question, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-pink-100">
                                <span className="flex-1 text-sm text-gray-700 pr-4">{question}</span>
                                <div className="flex items-center">
                                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                                    answers[index] 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {answers[index] ? 'SÍ' : 'NO'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tarjeta 2: Salud Mental y Emocional */}
            <div className="bg-purple-50 rounded-xl shadow-md border border-purple-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-purple-700">
                  Salud y Bienestar Emocional
                </h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <h3 className="font-semibold text-purple-700 mb-2">Si tuvieras que describir tu relación contigo mismo/a en tres palabras, ¿cuáles serían?</h3>
                  <p className="text-gray-700 text-sm">
                    {client.medicalData.mentalHealthSelfRelationship || 'No especificado'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <h3 className="font-semibold text-purple-700 mb-2">Hay alguna creencia o pensamiento recurrente que sientas que te limita en tu vida actual?</h3>
                  <p className="text-gray-700 text-sm">
                    {client.medicalData.mentalHealthLimitingBeliefs || 'No especificado'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <h3 className="font-semibold text-purple-700 mb-2">Imagina que has alcanzado un equilibrio emocional ideal. ¿Qué cambiaría en tu día a día?</h3>
                  <p className="text-gray-700 text-sm">
                    {client.medicalData.mentalHealthIdealBalance || 'No especificado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Recomendaciones */}
            <div className="bg-green-50 rounded-xl shadow-md border border-green-100 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-700">
                  Recomendaciones de IA
                </h2>
              </div>
              
              <div className="text-center py-4">
                <button
                  onClick={() => setIsAIModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 shadow-lg flex items-center justify-center mx-auto"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Ver Recomendaciones
                </button>
                <p className="text-gray-600 text-sm mt-3">
                  Recomendaciones personalizadas generadas por IA avanzada
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Edición */}
        {isEditModalOpen && client && (
          <EditClientModal 
            client={client}
            onClose={() => setIsEditModalOpen(false)}
            onSave={fetchClient}
          />
        )}
        {/* Modal para Visualización de Documentos */}
        {isDocumentModalOpen && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Header del Modal */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedDocument.name}</h3>
                  <p className="text-sm text-gray-600">
                    {Math.round(selectedDocument.size / 1024)} KB • {selectedDocument.type}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <a
                    href={selectedDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium flex items-center"
                    download
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar
                  </a>
                  <button
                    onClick={() => {
                      setIsDocumentModalOpen(false);
                      setSelectedDocument(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="flex-1 overflow-auto p-6">
                {selectedDocument.type.includes('image') ? (
                  <div className="flex justify-center">
                    <Image
                      src={selectedDocument.url} 
                      alt={selectedDocument.name}
                      width={800}
                      height={600}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : selectedDocument.name.includes('.pdf') ? (
                  <div className="w-full h-full">
                    <iframe
                      src={selectedDocument.url}
                      className="w-full h-[70vh] border-0"
                      title={selectedDocument.name}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Vista previa no disponible</h4>
                    <p className="text-gray-600 mb-6">
                      Este tipo de archivo no se puede previsualizar en el navegador.
                    </p>
                    <a
                      href={selectedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-medium inline-flex items-center"
                      download
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar Archivo
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Modal para cambiar foto de perfil */}
        {isProfilePhotoModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">Cambiar Foto de Perfil</h3>
                <button
                  onClick={() => setIsProfilePhotoModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">Selecciona una nueva imagen para el perfil</p>
                  
                  <label className="block bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-medium cursor-pointer text-center">
                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Seleccionar Archivo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleProfilePhotoChange(file);
                        }
                      }}
                    />
                  </label>
                  
                  <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, GIF, WEBP (Máx. 5MB)</p>
                </div>
                
                {uploading && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Subiendo imagen...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar documentos */}
        {isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">Agregar Documentos Médicos</h3>
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedFiles([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                {/* Área de Drag & Drop */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center hover:border-indigo-400 transition duration-200 mb-6"
                >
                  <svg className="w-12 h-12 text-indigo-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-indigo-600 font-medium mb-2">Arrastra y suelta archivos aquí</p>
                  <p className="text-gray-500 text-sm mb-4">o</p>
                  <label className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200 font-medium cursor-pointer">
                    Seleccionar Archivos
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-3">
                    Formatos: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX (Máx. 5MB por archivo)
                  </p>
                </div>

                {/* Archivos seleccionados */}
                {selectedFiles.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Archivos seleccionados:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({Math.round(file.size / 1024)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeSelectedFile(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedFiles([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadDocuments}
                  disabled={selectedFiles.length === 0 || uploading}
                  className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Subir Documentos ({selectedFiles.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de IA */}
        {isAIModalOpen && clientId && (
          <AIRecommendationsModal
            clientId={clientId}
            clientName={client.personalData.name}
            onClose={() => setIsAIModalOpen(false)}
            onRecommendationsGenerated={fetchClient}
          />
        )}
      </Layout>
    </>
  )
}
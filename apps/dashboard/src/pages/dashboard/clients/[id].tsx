import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../../components/dashboard/Layout'
import Head from 'next/head'

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
    carbohydrateAddiction: string
    leptinResistance: string
    circadianRhythms: string
    sleepHygiene: string
    electrosmogExposure: string
    generalToxicity: string
    microbiotaHealth: string
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
    mentalHealthSelfRelationship: string
    mentalHealthLimitingBeliefs: string
    mentalHealthIdealBalance: string
  }
  contractAccepted: string
  ipAddress: string
  submissionDate: string
}

export default function ClientProfile() {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal')
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    if (id) {
      const fetchClient = async () => {
        try {
          const response = await fetch(`/api/forms/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            setClient(data)
          } else {
            console.error('Error fetching client details')
          }
        } catch (error) {
          console.error('Error fetching client:', error)
        } finally {
          setLoading(false)
        }
      }

      fetchClient()
    }
  }, [id, router])

  // Función para dividir el nombre completo en nombre y apellido
  const getNames = (fullName: string) => {
    const names = fullName.split(' ')
    return {
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || ''
    }
  }

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
        <div className="p-8 flex flex-col lg:flex-row gap-8">
          {/* Información del cliente - 30% */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-semibold text-xl">
                    {firstName.charAt(0)}{lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {firstName} {lastName}
                  </h1>
                  <p className="text-gray-600">Cliente desde {new Date(client.submissionDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Navegación por pestañas */}
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'personal'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setActiveTab('medical')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'medical'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Médico
                  </button>
                  <button
                    onClick={() => setActiveTab('mental')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'mental'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Mental
                  </button>
                </div>
              </div>

              {/* Contenido de las pestañas */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activeTab === 'personal' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-800">{client.personalData.email}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Teléfono</label>
                      <p className="text-gray-800">{client.personalData.phone}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Dirección</label>
                      <p className="text-gray-800">{client.personalData.address}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de nacimiento</label>
                      <p className="text-gray-800">{client.personalData.birthDate}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Género</label>
                      <p className="text-gray-800">{client.personalData.gender}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Edad</label>
                      <p className="text-gray-800">{client.personalData.age} años</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Peso</label>
                      <p className="text-gray-800">{client.personalData.weight} kg</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Altura</label>
                      <p className="text-gray-800">{client.personalData.height} cm</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Estado civil</label>
                      <p className="text-gray-800">{client.personalData.maritalStatus}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Educación</label>
                      <p className="text-gray-800">{client.personalData.education}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Ocupación</label>
                      <p className="text-gray-800">{client.personalData.occupation}</p>
                    </div>
                  </>
                )}

                {activeTab === 'medical' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Motivo principal</label>
                      <p className="text-gray-800">{client.medicalData.mainComplaint}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Medicamentos</label>
                      <p className="text-gray-800">{client.medicalData.medications || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Suplementos</label>
                      <p className="text-gray-800">{client.medicalData.supplements || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Condiciones actuales/pasadas</label>
                      <p className="text-gray-800">{client.medicalData.currentPastConditions || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Historial médico adicional</label>
                      <p className="text-gray-800">{client.medicalData.additionalMedicalHistory || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Alergias</label>
                      <p className="text-gray-800">{client.medicalData.allergies || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Cirugías</label>
                      <p className="text-gray-800">{client.medicalData.surgeries || 'No especificado'}</p>
                    </div>
                  </>
                )}

                {activeTab === 'mental' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Identificación de emociones</label>
                      <p className="text-gray-800">{client.medicalData.mentalHealthEmotionIdentification || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Intensidad emocional</label>
                      <p className="text-gray-800">{client.medicalData.mentalHealthEmotionIntensity || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Emociones incómodas</label>
                      <p className="text-gray-800">{client.medicalData.mentalHealthUncomfortableEmotion || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Diálogo interno</label>
                      <p className="text-gray-800">{client.medicalData.mentalHealthInternalDialogue || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Estrategias de estrés</label>
                      <p className="text-gray-800">{client.medicalData.mentalHealthStressStrategies || 'No especificado'}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium">
                  Editar Información
                </button>
                <button 
                  onClick={() => router.push('/dashboard/clients')}
                  className="w-full mt-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-200 font-medium"
                >
                  Volver a la lista
                </button>
              </div>
            </div>
          </div>

          {/* Tarjetas informativas - 70% */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* Tarjeta 1: Resumen de Salud */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen de Salud</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Estilo de Vida</h3>
                  <p className="text-sm text-gray-600">
                    {client.medicalData.employmentHistory || 'Información no disponible'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">Hobbies</h3>
                  <p className="text-sm text-gray-600">
                    {client.medicalData.hobbies || 'Información no disponible'}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">Historial de Vivienda</h3>
                  <p className="text-sm text-gray-600">
                    {client.medicalData.housingHistory || 'Información no disponible'}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-purple-800 mb-2">Adicción a Carbohidratos</h3>
                  <p className="text-sm text-gray-600">
                    {client.medicalData.carbohydrateAddiction ? 'Evaluación completada' : 'No evaluado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Evaluaciones de Salud */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Evaluaciones de Salud</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Resistencia a la Leptina</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.medicalData.leptinResistance 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.medicalData.leptinResistance ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Ritmos Circadianos</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.medicalData.circadianRhythms 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.medicalData.circadianRhythms ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Higiene del Sueño</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.medicalData.sleepHygiene 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.medicalData.sleepHygiene ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Salud Microbiana</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.medicalData.microbiotaHealth 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.medicalData.microbiotaHealth ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Salud Mental y Emocional */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Salud Mental y Emocional</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Relación consigo mismo</h3>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {client.medicalData.mentalHealthSelfRelationship || 'No especificado'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Creencias limitantes</h3>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {client.medicalData.mentalHealthLimitingBeliefs || 'No especificado'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Balance ideal</h3>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {client.medicalData.mentalHealthIdealBalance || 'No especificado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/dashboard/Layout'
import Head from 'next/head'
import { apiClient } from '@/lib/api';
import Image from 'next/image'

interface Client {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  createdAt: string
  profilePhoto?: {  // ✅ Actualizar para que coincida con el backend
    url: string
    key: string
    name: string
    type: 'profile' | 'document'
    size: number
    uploadedAt?: string
  } | null  // Puede ser null si no hay foto
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchClients = async () => {
      try {
        const result = await apiClient.getClients();
        setClients(result.data);
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [router])

  const handleClientClick = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  // Filtrar clientes basado en la búsqueda
  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  return (
    <>
      <Head>
        <title>Clientes - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-8">
          {/* Encabezado */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-blue-700">
                  Clientes Registrados
                </h1>
                <p className="text-gray-600">Gestiona los formularios de salud de tus clientes</p>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-lg text-gray-700">
                Total: <span className="font-semibold text-blue-600">{clients.length} clientes</span>
              </div>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar clientes por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 text-gray-700 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Grid responsive de clientes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredClients.map((client) => (
              <div
                key={client._id}
                onClick={() => handleClientClick(client._id)}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-blue-100 hover:border-blue-300 p-6 group"
              >
                {/* Foto de perfil o iniciales */}
                {client.profilePhoto ? (
                  <div className="relative mb-4 mx-auto">
                    <div className="w-30 h-30 rounded-full overflow-hidden mx-auto border-2 border-blue-500 group-hover:border-blue-600 transition-colors">
                      <Image 
                        src={client.profilePhoto.url} 
                        alt={`Foto de ${client.firstName} ${client.lastName}`}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4 mx-auto group-hover:bg-blue-600 transition-all">
                    <span className="text-white font-semibold text-lg">
                      {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                
                <h3 className="text-lg font-semibold text-gray-800 text-center mb-2 group-hover:text-blue-700 transition-colors">
                  {client.firstName} {client.lastName}
                </h3>
                <p className="text-gray-600 text-sm text-center truncate mb-3" title={client.email}>
                  {client.email}
                </p>
                <div className="flex items-center justify-center text-gray-500 text-xs">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Registrado: {new Date(client.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {filteredClients.length === 0 && clients.length > 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron clientes</h3>
              <p className="text-gray-500">Intenta con otros términos de búsqueda.</p>
            </div>
          )}

          {clients.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay clientes registrados</h3>
              <p className="text-gray-500">Los formularios enviados aparecerán aquí.</p>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}
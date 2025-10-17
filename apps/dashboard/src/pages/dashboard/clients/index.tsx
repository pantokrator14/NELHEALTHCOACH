import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/dashboard/Layout'
import Head from 'next/head'

interface Client {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  createdAt: string
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/forms', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setClients(data)
        }
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Clientes Registrados</h1>
            <div className="text-lg text-gray-600">
              Total: <span className="font-semibold">{clients.length} clientes</span>
            </div>
          </div>

          {/* Grid responsive de clientes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {clients.map((client) => (
              <div
                key={client._id}
                onClick={() => handleClientClick(client._id)}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 p-6"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
                  <span className="text-blue-600 font-semibold text-lg">
                    {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">
                  {client.firstName} {client.lastName}
                </h3>
                <p className="text-gray-600 text-sm text-center truncate" title={client.email}>
                  {client.email}
                </p>
                <p className="text-gray-500 text-xs text-center mt-2">
                  Registrado: {new Date(client.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

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
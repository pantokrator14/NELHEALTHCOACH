import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/dashboard/Layout'
import Head from 'next/head'

interface Stats {
  clientCount: number
  recipeCount: number
  nearGoalPercentage: number
}

export default function Dashboard() {
  const [coachName, setCoachName] = useState('Manuel')
  const [stats, setStats] = useState<Stats>({ clientCount: 0, recipeCount: 0, nearGoalPercentage: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  return (
    <>
      <Head>
        <title>Dashboard - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-8">
          {/* Tarjeta de bienvenida */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold mb-4">
                ¡Bienvenido, {coachName}!
              </h1>
              <p className="text-xl text-blue-100 mb-6">
                Estamos felices de tenerte de vuelta en tu dashboard de NELHEALTHCOACH.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {loading ? '...' : stats.clientCount}
                  </div>
                  <div className="text-blue-100">Clientes Registrados</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {loading ? '...' : stats.recipeCount}
                  </div>
                  <div className="text-blue-100">Recetas Creadas</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {loading ? '...' : `${stats.nearGoalPercentage}%`}
                  </div>
                  <div className="text-blue-100">Cerca del Objetivo</div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div 
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition duration-200 cursor-pointer"
              onClick={() => router.push('/dashboard/clients')}
            >
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-800">Ver Clientes</h3>
                  <p className="text-gray-600">Gestiona los formularios de salud de tus clientes</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition duration-200 cursor-pointer"
              onClick={() => router.push('/dashboard/recipes')}
            >
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-800">Gestionar Recetas</h3>
                  <p className="text-gray-600">Crea y edita planes nutricionales</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}
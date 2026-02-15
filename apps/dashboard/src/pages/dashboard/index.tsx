import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/dashboard/Layout'
import Head from 'next/head'
import { apiClient } from '@/lib/api';

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
        const result = await apiClient.getStats();
        setStats(result.data);
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
          <div className="bg-blue-600 rounded-2xl shadow-xl p-4 md:p-8 text-white mb-8">
            <div className="max-w-4xl mx-auto">
              {/* Avatar y texto en columna en móvil, fila en desktop */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">
                    ¡Bienvenido, {coachName}!
                  </h1>
                  <p className="text-sm md:text-xl text-blue-100">
                    Estamos felices de tenerte de vuelta en tu dashboard de NELHEALTHCOACH.
                  </p>
                </div>
              </div>

              {/* Tarjetas de estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 md:mt-8">
                <div className="bg-blue-500 rounded-xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
                    {loading ? '...' : stats.clientCount}
                  </div>
                  <div className="text-xs md:text-base text-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Clientes Registrados
                  </div>
                </div>

                <div className="bg-blue-500 rounded-xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
                    {loading ? '...' : stats.recipeCount}
                  </div>
                  <div className="text-xs md:text-base text-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Recetas Creadas
                  </div>
                </div>

                <div className="bg-blue-500 rounded-xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
                    {loading ? '...' : `${stats.nearGoalPercentage}%`}
                  </div>
                  <div className="text-xs md:text-base text-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cerca del Objetivo
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => router.push('/dashboard/clients')}
            >
              <div className="flex items-center">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-700 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Ver Clientes</h3>
                  <p className="text-gray-600">Gestiona los formularios de salud de tus clientes</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => router.push('/dashboard/recipes')}
            >
              <div className="flex items-center">
                <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mr-4 group-hover:bg-green-700 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-green-600 transition-colors">Gestionar Recetas</h3>
                  <p className="text-gray-600">Crea y edita planes nutricionales personalizados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}
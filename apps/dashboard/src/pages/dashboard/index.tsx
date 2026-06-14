import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/dashboard/Layout'
import Head from 'next/head'
import { apiClient } from '@/lib/api';
import Link from 'next/link';

interface Stats {
  clientCount: number
  recipeCount: number
  exerciseCount: number
  recentClients: number
  pendingProposals: number
}

interface ProfileData {
  firstName: string
  lastName: string
  role?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    clientCount: 0,
    recipeCount: 0,
    exerciseCount: 0,
    recentClients: 0,
    pendingProposals: 0,
  })
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        const [statsRes, profileRes, notifRes] = await Promise.allSettled([
          apiClient.getStats(),
          apiClient.getProfile(),
          apiClient.getUnreadNotificationCount(),
        ])

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data)
        }

        if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
          setProfile(profileRes.value.data)
        }

        if (notifRes.status === 'fulfilled' && notifRes.value?.success) {
          setUnreadCount(notifRes.value.count)
        }
      } catch {
        // Silencioso
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const coachName = profile?.firstName || 'Coach'

  // ── Acciones rápidas con clases estáticas (Tailwind no admite clases dinámicas) ──
  type ActionColor = 'blue' | 'green' | 'teal' | 'purple'

  const iconMapping: Record<ActionColor, React.ReactNode> = {
    blue: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    green: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    teal: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    purple: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  interface QuickAction {
    label: string
    desc: string
    path: string
    color: ActionColor
    bgClass: string
    bgHoverClass: string
    textHoverClass: string
    borderClass: string
  }

  const quickActions: QuickAction[] = [
    {
      label: 'Ver Clientes',
      desc: 'Gestiona los formularios de salud de tus clientes',
      path: '/dashboard/clients',
      color: 'blue',
      bgClass: 'bg-blue-600',
      bgHoverClass: 'group-hover:bg-blue-700',
      textHoverClass: 'group-hover:text-blue-600',
      borderClass: 'border-blue-200',
    },
    {
      label: 'Gestionar Recetas',
      desc: 'Crea y edita planes nutricionales personalizados',
      path: '/dashboard/recipes',
      color: 'green',
      bgClass: 'bg-green-600',
      bgHoverClass: 'group-hover:bg-green-700',
      textHoverClass: 'group-hover:text-green-600',
      borderClass: 'border-green-200',
    },
    {
      label: 'Gestionar Ejercicios',
      desc: 'Administra la biblioteca de ejercicios',
      path: '/dashboard/exercises',
      color: 'teal',
      bgClass: 'bg-teal-600',
      bgHoverClass: 'group-hover:bg-teal-700',
      textHoverClass: 'group-hover:text-teal-600',
      borderClass: 'border-teal-200',
    },
    {
      label: 'Ir a Finanzas',
      desc: 'Revisa tus ingresos, suscripciones y retiros',
      path: '/dashboard/finances',
      color: 'purple',
      bgClass: 'bg-purple-600',
      bgHoverClass: 'group-hover:bg-purple-700',
      textHoverClass: 'group-hover:text-purple-600',
      borderClass: 'border-purple-200',
    },
  ]

  const [copied, setCopied] = useState(false)

  const handleCopyRegisterLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/register')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback para navegadores sin Clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = window.location.origin + '/register'
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Si hay propuestas pendientes, mostrar tarjeta adicional
  const showPendingProposals = !loading && stats.pendingProposals > 0

  return (
    <>
      <Head>
        <title>Dashboard - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* ── Bienvenida ── */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-xl p-6 md:p-8 text-white mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto md:mx-0 backdrop-blur-sm">
                <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  ¡Bienvenido, {coachName}!
                </h1>
                <p className="text-sm md:text-base text-blue-200">
                  Resumen general de tu plataforma NELHEALTHCOACH.
                </p>
              </div>
              {unreadCount > 0 && (
                <Link
                  href="/dashboard/clients"
                  className="hidden md:inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
                </Link>
              )}
            </div>
          </div>

          {/* ── Stats ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Clientes */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Clientes
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.clientCount}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {stats.recentClients} nuevos en 30 días
                </div>
              </div>

              {/* Recetas */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Recetas
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.recipeCount}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Planes nutricionales
                </div>
              </div>

              {/* Ejercicios */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-teal-500 hover:shadow-md transition-shadow">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Ejercicios
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.exerciseCount}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Biblioteca de ejercicios
                </div>
              </div>

              {/* Recientes + Notificaciones */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow relative">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Actividad
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.recentClients}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Nuevos clientes (30 días)
                </div>
                {unreadCount > 0 && (
                  <div className="md:hidden mt-2 pt-2 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Alerta de propuestas pendientes ── */}
          {showPendingProposals && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.pendingProposals} propuesta{stats.pendingProposals !== 1 ? 's' : ''} pendiente{stats.pendingProposals !== 1 ? 's' : ''} de revisión
                  </p>
                  <p className="text-xs text-amber-600">
                    Hay contenido nuevo esperando aprobación.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/clients?tab=proposals"
                className="text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Revisar
              </Link>
            </div>
          )}

          {/* ── Acciones Rápidas ── */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acciones rápidas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => router.push(action.path)}
                className={`bg-white border ${action.borderClass} rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group text-left`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${action.bgClass} rounded-xl flex items-center justify-center mr-4 ${action.bgHoverClass} transition-all shrink-0`}>
                    {iconMapping[action.color]}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-base font-semibold text-gray-800 ${action.textHoverClass} transition-colors`}>
                      {action.label}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ── Enlaces inferiores ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 text-sm text-gray-600 hover:text-gray-800 hover:shadow-sm transition-all border border-gray-100"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mi perfil
            </Link>

            {profile?.role === 'admin' && (
              <Link
                href="/dashboard/coaches"
                className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 text-sm text-gray-600 hover:text-gray-800 hover:shadow-sm transition-all border border-gray-100"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Gestionar asesores
              </Link>
            )}
            <button
              onClick={handleCopyRegisterLink}
              className="flex items-center gap-2 bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700 hover:text-emerald-800 hover:shadow-sm transition-all border border-emerald-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {copied ? '¡Copiado!' : 'Enlace de registro'}
            </button>
          </div>
        </div>
      </Layout>
    </>
  )
}

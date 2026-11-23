import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useIsAdmin, useUserRole } from '@/lib/client-hooks'
import Image from 'next/image'
import { apiClient, type ClientPortalData } from '@/lib/api'
import { clearAuthToken } from '@/lib/authSession'
import TrialBanner from './TrialBanner'
import NotificationBell from '@/components/ui/NotificationBell'

interface LayoutProps {
  children: ReactNode
}

interface CoachData {
  firstName: string
  lastName: string
  email: string
  role: string
  profilePhoto?: { url: string } | null
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [coachData, setCoachData] = useState<CoachData | null>(null)
  const [clientPortal, setClientPortal] = useState<ClientPortalData | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  // Roles derivados del token (snapshot de localStorage, sin estado ni efecto)
  const isAdmin = useIsAdmin()
  const userRole = useUserRole()
  const isClient = userRole === 'client'

  // Cargar datos completos del coach o cliente según rol
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !userRole) return

    if (userRole === 'client') {
      apiClient.getClientPortalMe().then(res => {
        if (res?.data) {
          setClientPortal(res.data)
        }
      }).catch(() => { /* ignore */ })
      return
    }

    // Fetch completo del perfil del coach (nombre, foto)
    apiClient.getProfile().then(res => {
      if (res?.data) {
        setCoachData(res.data)
      }
    }).catch(() => { /* ignore */ })

    // Fetch de notificaciones no leídas para el badge del toggle móvil
    apiClient.getUnreadNotificationCount().then(res => {
      if (res?.success) {
        setUnreadCount(res.count)
      }
    }).catch(() => { /* ignore */ })
  }, [userRole])

  // Cerrar sidebar al cambiar de ruta en móviles
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  const handleLogout = () => {
    clearAuthToken()
    router.push('/login')
  }

  const navigateTo = (path: string) => {
    router.push(path)
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }

  const fullName = isClient
    ? (clientPortal?.clientName || clientPortal?.email || 'Mi Cuenta')
    : (coachData ? `${coachData.firstName} ${coachData.lastName}` : 'Coach')
  const photoUrl = isClient ? null : (coachData?.profilePhoto?.url || null)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Botón de toggle para móviles */}
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-blue-600 text-white rounded-xl shadow-lg"
      >
        <div className="relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {!isClient && unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 leading-none shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Overlay para móviles */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Barra lateral - 20% con color plano */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 lg:w-1/5 bg-blue-700 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div
          className="p-6 border-b border-blue-600 cursor-pointer hover:bg-blue-600 transition duration-200"
          onClick={() => navigateTo('/dashboard')}
        >
          <div className="relative w-40 h-12 mx-auto">
            <Image
              src="/logo.png"
              sizes="160px"
              alt="NELHEALTHCOACH Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {isClient ? (
            <div className="space-y-2">
              {/* Mi Portal */}
              <button
                onClick={() => navigateTo('/dashboard')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center group"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="font-medium">Mi Portal</span>
              </button>

              {/* Planes */}
              <button
                onClick={() => navigateTo('/dashboard/plans')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-teal-600 transition-all duration-200 flex items-center group"
              >
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-teal-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium">Planes</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Clientes */}
              <button
                onClick={() => navigateTo('/dashboard/clients')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center group"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="font-medium">Clientes Registrados</span>
              </button>

              {/* Recetas */}
              <button
                onClick={() => navigateTo('/dashboard/recipes')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center group"
              >
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-green-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="font-medium">Recetas</span>
              </button>

              {/* Ejercicios */}
              <button
                onClick={() => navigateTo('/dashboard/exercises')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-teal-600 transition-all duration-200 flex items-center group"
              >
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-teal-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-medium">Ejercicios</span>
              </button>

              {/* Finanzas */}
              <button
                onClick={() => navigateTo('/dashboard/finances')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-200 flex items-center group"
              >
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-purple-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium">Finanzas</span>
              </button>

              {/* Coaches (solo admin) */}
              {isAdmin && (
                <button
                  onClick={() => navigateTo('/dashboard/coaches')}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-600 transition-all duration-200 flex items-center group"
                >
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-orange-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">Asesores</span>
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Notificaciones (solo coach/admin) */}
        {!isClient && (
          <div className="px-4 pb-2">
            <NotificationBell />
          </div>
        )}

        {/* Perfil — acceso único justo encima de la línea divisoria */}
        <div className="p-4">
          <button
            onClick={() =>
              navigateTo(
                isClient
                  ? (clientPortal?.healthFormId ? '/dashboard/my-profile' : '/dashboard')
                  : '/dashboard/profile'
              )
            }
            className="w-full px-4 py-3 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center group text-left"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 overflow-hidden bg-blue-500 group-hover:ring-2 group-hover:ring-white transition-all relative shrink-0">
              {photoUrl ? (
                <Image src={photoUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
              ) : (
                <span className="text-sm font-bold">{fullName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium truncate block">{fullName}</span>
              {isClient && clientPortal?.healthFormId && (
                <span className="text-[11px] text-blue-200 block leading-tight">
                  Ver mi perfil
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-blue-600">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center group"
          >
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Área principal - 80% */}
      <div className="flex-1 lg:w-4/5 bg-blue-50 overflow-hidden">
        <div className="h-full overflow-y-auto pt-14 lg:pt-0">
          {!isClient && <TrialBanner />}
          {children}
        </div>
      </div>
    </div>
  )
}

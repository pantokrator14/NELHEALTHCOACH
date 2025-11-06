import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

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
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navigateTo = (path: string) => {
    router.push(path)
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Botón de toggle para móviles */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
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
              alt="NELHEALTHCOACH Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 overflow-y-auto">
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
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-600">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center group"
          >
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-2 group-hover:bg-white group-hover:text-red-600 transition-colors">
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
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
import { ReactNode } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navigateTo = (path: string) => {
    router.push(path)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Barra lateral - 25% */}
      <div className="w-1/4 bg-blue-800 text-white flex flex-col">
        
        {/* Logo */}
        <div 
          className="p-6 border-b border-blue-700 cursor-pointer hover:bg-blue-750 transition duration-200"
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
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {/* Clientes */}
            <button
              onClick={() => navigateTo('/dashboard/clients')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Clientes Registrados
            </button>

            {/* Recetas */}
            <button
              onClick={() => navigateTo('/dashboard/recipes')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Recetas
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Área principal - 75% */}
      <div className="w-3/4 bg-white">
        {children}
      </div>
    </div>
  )
}
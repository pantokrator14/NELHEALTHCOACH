// apps/dashboard/src/components/dashboard/Layout.tsx
import { ReactNode } from 'react'
import { useRouter } from 'next/router'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                NEL Health Coach - Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hola, Coach</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
// apps/dashboard/src/pages/dashboard/index.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/dashboard/Layout'

export default function DashboardPage() {
  const router = useRouter()

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => router.push('/dashboard/clients')}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Clientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Ver todos los formularios
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
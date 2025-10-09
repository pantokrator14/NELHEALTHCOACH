// apps/dashboard/src/pages/dashboard/clients/index.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/dashboard/Layout'
import HealthFormCard from '../../../components/dashboard/HealthFormCard'

interface FormData {
  _id: string
  personalData: any
  medicalData: any
  contractAccepted: boolean
  ipAddress: string
  submissionDate: string
}

export default function ClientsPage() {
  const [forms, setForms] = useState<FormData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch('/api/forms')
        if (response.ok) {
          const data = await response.json()
          setForms(data.forms)
        } else {
          console.error('Error fetching forms')
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchForms()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">Cargando...</div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="mt-1 text-sm text-gray-600">
              {forms.length} formularios completados
            </p>
          </div>

          {forms.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay formularios</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se han completado formularios aún.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <HealthFormCard key={form._id} form={form} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
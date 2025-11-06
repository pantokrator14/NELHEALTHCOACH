import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/dashboard/Layout'
import Head from 'next/head'

export default function Recipes() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <>
      <Head>
        <title>Recetas - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Recetas y Planes Nutricionales</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              📝 Esta sección estará disponible pronto para que gestiones tus recetas y planes nutricionales.
            </p>
          </div>
        </div>
      </Layout>
    </>
  )
}
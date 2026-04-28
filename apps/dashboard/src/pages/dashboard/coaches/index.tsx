import { useState, useEffect } from 'react';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import { apiClient } from '@/lib/api';
import Image from 'next/image';

interface Coach {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhoto?: { url: string } | null;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getCoaches();
      if (res.success) {
        setCoaches(res.data || []);
      }
    } catch (err) {
      console.error('Error loading coaches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Coaches - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-8">
          {/* Encabezado */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-4 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-orange-700">Coaches Registrados</h1>
                <p className="text-orange-600 mt-1">Administra los coaches del sistema</p>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="text-lg text-gray-700">
                Total: <span className="font-semibold text-orange-600">{coaches.length} coaches</span>
              </div>
            </div>
          </div>

          {/* Grid de coaches */}
          {coaches.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border border-orange-200">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay coaches registrados</h3>
              <p className="text-gray-500">Los coaches aparecerán aquí cuando se registren.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {coaches.map((coach) => (
                <div
                  key={coach.id}
                  onClick={() => setSelectedCoach(coach)}
                  className="bg-white rounded-xl shadow-md border border-orange-100 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-6 flex justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-orange-300 flex items-center justify-center relative">
                      {coach.profilePhoto?.url ? (
                        <Image src={coach.profilePhoto.url} alt={coach.firstName} fill className="object-cover" unoptimized />
                      ) : (
                        <span className="text-white text-3xl font-bold">{coach.firstName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-semibold text-gray-800">{coach.firstName} {coach.lastName}</h3>
                    <p className="text-sm text-gray-500 truncate">{coach.email}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      coach.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {coach.role === 'admin' ? 'Admin' : 'Coach'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de detalle */}
        {selectedCoach && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCoach(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-8 text-center">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg mx-auto mb-4 overflow-hidden bg-orange-300 flex items-center justify-center relative">
                  {selectedCoach.profilePhoto?.url ? (
                    <Image src={selectedCoach.profilePhoto.url} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <span className="text-white text-4xl font-bold">{selectedCoach.firstName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedCoach.firstName} {selectedCoach.lastName}</h2>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCoach.role === 'admin' ? 'bg-purple-200 text-purple-800' : 'bg-white text-orange-700'
                }`}>
                  {selectedCoach.role === 'admin' ? 'Administrador' : 'Coach'}
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center">
                  <span className="text-lg mr-3">📧</span>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-gray-800">{selectedCoach.email}</p>
                  </div>
                </div>
                {selectedCoach.phone && (
                  <div className="flex items-center">
                    <span className="text-lg mr-3">📞</span>
                    <div>
                      <p className="text-xs text-gray-400">Teléfono</p>
                      <p className="text-gray-800">{selectedCoach.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <span className="text-lg mr-3">{selectedCoach.emailVerified ? '✅' : '⚠️'}</span>
                  <div>
                    <p className="text-xs text-gray-400">Verificación</p>
                    <p className="text-gray-800">{selectedCoach.emailVerified ? 'Email verificado' : 'Pendiente de verificación'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-lg mr-3">{selectedCoach.isActive ? '🟢' : '🔴'}</span>
                  <div>
                    <p className="text-xs text-gray-400">Estado</p>
                    <p className="text-gray-800">{selectedCoach.isActive ? 'Activo' : 'Inactivo'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-lg mr-3">📅</span>
                  <div>
                    <p className="text-xs text-gray-400">Registrado</p>
                    <p className="text-gray-800">{new Date(selectedCoach.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={() => setSelectedCoach(null)}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

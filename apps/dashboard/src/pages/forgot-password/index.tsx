import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { apiClient } from '@/lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await apiClient.forgotPassword(email);
      setSuccess(result.message || 'Si el email está registrado, recibirás un enlace de recuperación.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Recuperar Contraseña - NELHEALTHCOACH</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 flex justify-center">
            <div className="relative w-48 h-16">
              <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
            </div>
          </div>
          <div className="px-8 pb-8">
            <h1 className="text-2xl font-bold text-blue-700 text-center mb-2">Recuperar Contraseña</h1>
            <p className="text-gray-500 text-center text-sm mb-6">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                {success}
                <div className="mt-3 text-center">
                  <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Volver al inicio de sesión</a>
                </div>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} placeholder="tu@email.com" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
                <p className="text-center text-sm text-gray-500">
                  <a href="/login" className="text-blue-600 hover:text-blue-800">Volver al inicio de sesión</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

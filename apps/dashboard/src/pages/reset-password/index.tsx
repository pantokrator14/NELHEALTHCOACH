import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { apiClient } from '@/lib/api';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!token || typeof token !== 'string') {
      setError('Token inválido');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.resetPassword(token, password);
      setSuccess(result.message || 'Contraseña restablecida exitosamente.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Nueva Contraseña - NELHEALTHCOACH</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 flex justify-center">
            <div className="relative w-48 h-16">
              <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
            </div>
          </div>
          <div className="px-8 pb-8">
            <h1 className="text-2xl font-bold text-blue-700 text-center mb-6">Nueva Contraseña</h1>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                {success}
                <div className="mt-3 text-center">
                  <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Ir al inicio de sesión</Link>
                </div>
              </div>
            )}

            {!success && token && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                  <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                  {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
                </button>
              </form>
            )}

            {!token && !success && (
              <div className="text-center text-gray-500">
                <p>Token no válido o faltante.</p>
                <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">Solicitar nuevo enlace</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

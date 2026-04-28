import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = router.query;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Si hay token, verificar vía API
  if (typeof window !== 'undefined' && token) {
    fetch(`${API_BASE_URL}/api/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          window.location.href = '/login?verified=true';
        } else {
          document.getElementById('msg')!.textContent = data.message || 'Error verificando email';
        }
      })
      .catch(() => {
        document.getElementById('msg')!.textContent = 'Error de conexión al verificar email.';
      });
  }

  return (
    <>
      <Head>
        <title>Verificar Email - NELHEALTHCOACH</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-center p-8">
          <div className="relative w-48 h-16 mx-auto mb-6">
            <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
          </div>
          <div className="text-4xl mb-4">{token ? '⏳' : '📧'}</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-4">Verificación de Email</h1>
          <p id="msg" className="text-gray-600">
            {token ? 'Verificando tu email...' : 'Revisa tu bandeja de entrada y haz clic en el enlace de verificación.'}
          </p>
          <a href="/login" className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-medium">
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'already_verified' | 'error' | 'token_expired';

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = router.query;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady || !token) return;

    setStatus('verifying');
    setMessage('Verificando tu email...');

    fetch(`${API_BASE_URL}/api/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          if (data.alreadyVerified) {
            setStatus('already_verified');
            setMessage(data.message || 'Tu email ya está verificado.');
          } else {
            setStatus('success');
            setMessage(data.message || 'Email verificado exitosamente.');
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
              window.location.href = '/login?verified=true';
            }, 2000);
          }
        } else {
          if (data.needsResend) {
            setStatus('token_expired');
            setMessage(data.message || 'El enlace ha expirado.');
          } else {
            setStatus('error');
            setMessage(data.message || 'Error verificando email');
          }
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Error de conexión al verificar email. Intenta de nuevo.');
      });
  }, [router.isReady, token, API_BASE_URL]);

  const icon = () => {
    switch (status) {
      case 'verifying': return '⏳';
      case 'success': return '✅';
      case 'already_verified': return '✅';
      case 'token_expired': return '🔗';
      case 'error': return '❌';
      default: return '📧';
    }
  };

  const showResendButton = status === 'token_expired';

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
          <div className="text-4xl mb-4">{icon()}</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-4">Verificación de Email</h1>
          <p id="msg" className="text-gray-600">{message}</p>

          {showResendButton && (
            <Link
              href="/login"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Solicitar nuevo enlace de verificación
            </Link>
          )}

          <Link
            href="/login"
            className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    </>
  );
}

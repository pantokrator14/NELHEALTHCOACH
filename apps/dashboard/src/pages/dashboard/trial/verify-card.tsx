import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';
import Link from 'next/link';

export default function TrialVerifyCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState(t('trial.verifyCard.verifyingMessage'));

  useEffect(() => {
    if (!router.isReady) return;

    const { session_id, coachId } = router.query;

    if (!session_id) {
      setStatus('error');
      setMessage(t('trial.verifyCard.errorMessage'));
      return;
    }

    // El webhook de Stripe ya procesó el pago y activó la cuenta.
    // Solo esperamos un momento y redirigimos al dashboard.
    const timer = setTimeout(() => {
      setStatus('success');
      setMessage(t('trial.verifyCard.successMessage'));
    }, 2000);

    // Redirigir al dashboard después de la verificación
    const redirectTimer = setTimeout(() => {
      router.push('/dashboard');
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(redirectTimer);
    };
  }, [router.isReady, router.query, router]);

  return (
    <>
      <Head>
        <title>{t('trial.verifyCard.pageTitle')}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="relative w-48 h-16 mx-auto mb-6">
            <img src="/logo2.png" alt="NELHEALTHCOACH Logo" style={{ maxWidth: '100%', height: 'auto' }} />
          </div>

          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-emerald-700 mb-2">
                {t('trial.verifyCard.verifying')}
              </h1>
              <p className="text-gray-600 text-sm mb-4">
                {message}
              </p>
              <p className="text-xs text-gray-400">
                {t('trial.verifyCard.refundNote')}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-emerald-700 mb-2">
                {t('trial.verifyCard.success')}
              </h1>
              <p className="text-gray-600 text-sm mb-4">
                {message}
              </p>
              <p className="text-xs text-gray-400 mb-6">
                {t('trial.verifyCard.redirecting')}
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-medium"
              >
                {t('trial.verifyCard.goToDashboard')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-red-700 mb-2">
                {t('trial.verifyCard.error')}
              </h1>
              <p className="text-gray-600 text-sm mb-6">
                {message}
              </p>
              <Link
                href="/register"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {t('trial.verifyCard.tryAgain')}
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';
import Layout from '@/components/dashboard/Layout';

export default function TrialCancelPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<'confirm' | 'loading' | 'done' | 'error'>('confirm');
  const [message, setMessage] = useState('');

  const handleCancel = async () => {
    setStep('loading');
    setMessage(t('trial.cancel.loadingMessage'));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/trial/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al cancelar la cuenta');
      }

      // Limpiar token
      localStorage.removeItem('token');
      setStep('done');
      setMessage(t('trial.cancel.doneMessage'));
    } catch (err: unknown) {
      setStep('error');
      setMessage(err instanceof Error ? err.message : 'Error al cancelar la cuenta');
    }
  };

  return (
    <>
      <Head>
        <title>{t('trial.cancel.pageTitle')}</title>
      </Head>
      <Layout>
        <div className="p-8 max-w-2xl mx-auto">
          {step === 'confirm' && (
            <div className="bg-white rounded-xl shadow-md border border-red-100 p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-center text-red-700 mb-4">
                {t('trial.cancel.confirmTitle')}
              </h1>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">
                  <strong>{t('trial.cancel.warning')}</strong>
                </p>
                <ul className="text-red-600 text-sm mt-2 list-disc list-inside space-y-1">
                  {(t('trial.cancel.warningItems', { returnObjects: true }) as string[]).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  {t('trial.cancel.backToDashboard')}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  {t('trial.cancel.confirmButton')}
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('trial.cancel.loading')}</h2>
              <p className="text-gray-500">{message}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="bg-white rounded-xl shadow-md border border-emerald-100 p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-emerald-700 mb-2">{t('trial.cancel.doneTitle')}</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {t('trial.cancel.registerAgain')}
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="bg-white rounded-xl shadow-md border border-red-100 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-red-700 mb-2">{t('trial.cancel.errorTitle')}</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => setStep('confirm')}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {t('trial.cancel.tryAgain')}
              </button>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

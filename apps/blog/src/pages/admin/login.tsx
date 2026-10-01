import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { apiClient, ApiError } from '@/lib/api';
import '@/lib/i18n';

/**
 * Login del admin del blog.
 * Reutiliza POST /api/auth/login de la API (mismo login que el dashboard)
 * y exige que la cuenta tenga rol 'admin'.
 */
const AdminLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { role } = await apiClient.login(email.trim(), password);
      if (role !== 'admin') {
        apiClient.logout();
        setError(t('admin.notAdmin'));
        return;
      }
      await router.push('/admin');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t('admin.loginError'));
      } else {
        setError(t('admin.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`${t('admin.loginTitle')} | Blog NELHEALTHCOACH`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md border-t-4 border-blue-600">
          <div className="flex justify-center mb-6">
            <div className="relative h-16 w-56">
              <Image src="/images/logo.png" alt="NELHEALTHCOACH" fill sizes="224px" className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-blue-800 text-center mb-1">{t('admin.loginTitle')}</h1>
          <p className="text-gray-500 text-center mb-6">{t('admin.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-900 mb-1">
                {t('admin.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-900 mb-1">
                {t('admin.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? t('common.loading') : t('admin.submit')}
            </button>
          </form>
        </div>
      </main>
    </>
  );
};

export default AdminLoginPage;

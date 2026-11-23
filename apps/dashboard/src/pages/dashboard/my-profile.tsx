// apps/dashboard/src/pages/dashboard/my-profile.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/dashboard/Layout';
import ClientProfileView from '@/components/dashboard/ClientProfileView';
import { apiClient } from '@/lib/api';
import { useClientIdFromToken, useUserRole } from '@/lib/client-hooks';

export default function MyClientProfilePage() {
  const router = useRouter();
  const userRole = useUserRole();
  const tokenClientId = useClientIdFromToken();
  const [fallbackClientId, setFallbackClientId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!userRole) return;
    if (userRole !== 'client') {
      router.replace('/dashboard');
      return;
    }
    if (tokenClientId) return;

    let active = true;
    apiClient
      .getClientPortalMe()
      .then((res) => {
        if (!active) return;
        if (res?.data?.healthFormId) {
          setFallbackClientId(res.data.healthFormId);
        } else {
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        if (active) router.replace('/dashboard');
      });

    return () => {
      active = false;
    };
  }, [userRole, tokenClientId, router]);

  const effectiveClientId = tokenClientId || fallbackClientId;

  if (userRole !== 'client' || !effectiveClientId) {
    return (
      <>
        <Head>
          <title>Mi Perfil - NELHEALTHCOACH</title>
        </Head>
        <Layout>
          <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Cargando tu perfil...</p>
          </div>
        </Layout>
      </>
    );
  }

  return <ClientProfileView clientId={effectiveClientId} mode="client" />;
}

// apps/dashboard/src/pages/dashboard/clients/[id].tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/dashboard/Layout';
import ClientProfileView from '@/components/dashboard/ClientProfileView';
import { useUserRole } from '@/lib/client-hooks';

export default function ClientProfilePage() {
  const router = useRouter();
  const userRole = useUserRole();
  const { id } = router.query;
  const clientId = Array.isArray(id) ? id[0] : id || '';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (userRole === 'client') {
      router.replace('/dashboard');
    }
  }, [userRole, router]);

  if (userRole === 'client' || !clientId) {
    return (
      <>
        <Head>
          <title>Perfil del Cliente - NELHEALTHCOACH</title>
        </Head>
        <Layout>
          <div className="p-8 flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        </Layout>
      </>
    );
  }

  return <ClientProfileView clientId={clientId} mode="coach" />;
}

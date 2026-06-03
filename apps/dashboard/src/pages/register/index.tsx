import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import CoachContractStep from '@/components/CoachContractStep';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RegisterStep = 'contract' | 'checkout' | 'form' | 'success';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('contract');
  const [error, setError] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // ── Detectar cancelación desde Stripe ──

  useEffect(() => {
    if (router.isReady && router.query.canceled === 'true') {
      setCanceled(true);
      setStep('contract');
    }
  }, [router.isReady, router.query.canceled]);

  // ── Paso 1: Aceptar contrato ──

  const handleContractAccept = () => {
    // Limpiar estado de cancelación
    setCanceled(false);
    setError('');

    // Pedir email antes de ir a Stripe
    const userEmail = window.prompt('Ingresa tu email para continuar con el pago:');
    if (!userEmail || !userEmail.includes('@')) {
      setError('Debes ingresar un email válido');
      return;
    }
    setEmail(userEmail);
    setError('');
    setStep('checkout');
    handleProceedToCheckout(userEmail);
  };

  const handleContractReject = () => {
    setCanceled(false);
    setError('');
    window.location.href = '/login';
  };

  // ── Paso 2: Ir a Stripe Checkout ──

  const handleProceedToCheckout = async (userEmail: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-coach-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          contractAccepted: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al iniciar el pago');
      }

      setCheckoutUrl(result.url);
      setPendingToken(result.token);

      // Redirigir a Stripe Checkout
      window.location.href = result.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
      setStep('contract');
    } finally {
      setLoading(false);
    }
  };

  // ── Renderizar según el paso ──

  const renderStep = () => {
    switch (step) {
      case 'contract':
        return (
          <CoachContractStep
            onAccept={handleContractAccept}
            onReject={handleContractReject}
          />
        );

      case 'checkout':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
              <div className="relative w-48 h-16 mx-auto mb-6">
                <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
              </div>
              <h1 className="text-2xl font-bold text-blue-700 mb-4">
                Redirigiendo a Stripe...
              </h1>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">
                Serás redirigido a Stripe para completar el pago de tu suscripción.
              </p>
              {checkoutUrl && (
                <button
                  onClick={() => { window.location.href = checkoutUrl!; }}
                  className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Ir a Stripe
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Registro - NELHEALTHCOACH</title>
      </Head>

      {canceled && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-3 rounded-lg shadow-lg max-w-md text-sm flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">ℹ️</span>
            <div>
              <p className="font-medium">Pago cancelado</p>
              <p className="text-amber-700 mt-1">
                No se realizó ningún cobro. Si deseas intentarlo de nuevo, acepta el contrato para continuar.
              </p>
            </div>
            <button
              onClick={() => setCanceled(false)}
              className="shrink-0 text-amber-400 hover:text-amber-600 transition ml-2"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-lg shadow-lg max-w-md text-sm">
            {error}
          </div>
        </div>
      )}

      {renderStep()}
    </>
  );
}

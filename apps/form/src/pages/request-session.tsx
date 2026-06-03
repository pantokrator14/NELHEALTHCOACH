// apps/form/src/pages/request-session.tsx
// Página para que el cliente solicite una nueva sesión:
// 1. Elige fecha/hora (ClientSessionScheduler)
// 2. Paga con Stripe
// 3. Confirmación

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import ClientSessionScheduler from '@/components/ClientSessionScheduler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AMOUNT = Number(process.env.NEXT_PUBLIC_CLIENT_SESSION_AMOUNT) || 150;

type Step = 'schedule' | 'payment' | 'success' | 'error';

interface ScheduleData {
  scheduledAt: string;
  duration: number;
  timezone: string;
}

export default function RequestSessionPage() {
  const router = useRouter();
  const { pendingSessionId, clientId } = router.query;

  const [step, setStep] = useState<Step>('schedule');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [resultMessage, setResultMessage] = useState('');

  // Si venimos con pendingSessionId (desde email del coach), ir directo al pago
  useEffect(() => {
    if (router.isReady && pendingSessionId && typeof pendingSessionId === 'string') {
      setStep('payment');
    }
  }, [router.isReady, pendingSessionId]);

  // Paso 1: Cliente elige fecha/hora
  const handleSchedule = async (data: ScheduleData) => {
    setScheduleData(data);
    setStep('payment');
  };

  // Paso 2: Ir a Stripe Checkout
  const handleProceedToPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Si tenemos pendingSessionId, usamos la existente
      const effectivePendingId = pendingSessionId;

      if (effectivePendingId && typeof effectivePendingId === 'string') {
        // Pago para sesión ya creada por el coach
        const response = await fetch(`${API_BASE_URL}/api/payments/create-session-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingSessionId: effectivePendingId }),
        });

        const result = await response.json();
        if (!result.success || !result.url) {
          throw new Error(result.message || 'Error al iniciar el pago');
        }

        // Redirigir a Stripe
        window.location.href = result.url;
      } else if (clientId && typeof clientId === 'string') {
        // Cliente existente solicitando nueva sesión (desde recordatorio)
        // Primero creamos la pending session
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Crear pending session
        const sessionResponse = await fetch(`${API_BASE_URL}/api/payments/create-session-payment`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'session_renewal',
            clientId,
          }),
        });

        const sessionResult = await sessionResponse.json();
        if (!sessionResult.success || !sessionResult.url) {
          throw new Error(sessionResult.message || 'Error al iniciar el pago');
        }

        window.location.href = sessionResult.url;
      } else {
        // Nuevo cliente (sin clientId ni pendingSessionId)
        const response = await fetch(`${API_BASE_URL}/api/payments/create-client-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'session_renewal' }),
        });

        const result = await response.json();
        if (!result.success || !result.url) {
          throw new Error(result.message || 'Error al iniciar el pago');
        }

        window.location.href = result.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  // Verificar si volvemos de Stripe
  const checkPaymentResult = () => {
    if (router.query.payment === 'success') {
      setStep('success');
      setResultMessage('Pago confirmado exitosamente.');
    } else if (router.query.payment === 'canceled') {
      setError('El pago fue cancelado. Puedes intentar nuevamente.');
    }
  };

  useEffect(() => {
    if (router.isReady) {
      checkPaymentResult();
    }
  }, [router.isReady, router.query]);

  // ── Render ──

  const sessionAmount = AMOUNT;

  return (
    <>
      <Head>
        <title>Solicitar Sesión - NELHEALTHCOACH</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-16">
              <Image
                src="/logo.png"
                alt="NELHEALTHCOACH"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          )}

          {/* Paso 1: Elegir horario (solo si no hay pendingSessionId) */}
          {step === 'schedule' && !pendingSessionId && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Solicita tu siguiente sesión
                </h1>
                <p className="text-teal-100">
                  Elige el día y la hora para tu videollamada de seguimiento.
                </p>
              </div>
              <ClientSessionScheduler
                clientEmail=""
                clientName=""
                onSchedule={handleSchedule}
                onCancel={() => router.push('/')}
              />
            </div>
          )}

          {/* Paso 2: Pago */}
          {step === 'payment' && (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
                <h1 className="text-2xl font-bold text-teal-800 mb-4">
                  Confirma tu pago
                </h1>

                {!pendingSessionId && scheduleData && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Fecha:</strong>{' '}
                      {new Date(scheduleData.scheduledAt).toLocaleString('es-MX')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Duración:</strong> {scheduleData.duration} minutos
                    </p>
                  </div>
                )}

                <div className="bg-teal-50 rounded-lg p-4 mb-6 border border-teal-200">
                  <p className="text-lg font-bold text-teal-700">
                    Total: ${sessionAmount}.00 USD
                  </p>
                  <p className="text-xs text-teal-500 mt-1">
                    Pago único por sesión
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200 text-sm text-gray-600">
                  <p>🔒 Pago procesado por Stripe de forma segura.</p>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                      Redirigiendo a Stripe...
                    </>
                  ) : (
                    <>
                      💳 Pagar ${sessionAmount}.00 USD con Stripe
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Éxito */}
          {step === 'success' && (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-2xl font-bold text-green-700 mb-4">
                  ¡Pago confirmado!
                </h1>
                <p className="text-gray-600 mb-2">
                  {resultMessage}
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Recibirás un email con los detalles de tu sesión y el enlace
                  para unirte a la videollamada.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition font-medium"
                >
                  Volver al inicio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

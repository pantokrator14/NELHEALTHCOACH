// apps/form/src/components/PaymentStep.tsx
// Paso de pago: el cliente paga $150 antes de continuar con el formulario

import React from 'react';
import Image from 'next/image';

interface PaymentStepProps {
  onPaymentComplete: () => void;
  /** Email del cliente para pre-rellenar en Stripe */
  clientEmail?: string;
  /** Nombre del cliente */
  clientName?: string;
  /** ID del coach referido (se pasa a metadata para notificar al coach del pago) */
  coachId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PaymentStep: React.FC<PaymentStepProps> = ({
  onPaymentComplete,
  coachId,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener solo la base de la URL (sin query params existentes)
      const baseUrl = window.location.origin + window.location.pathname;

      const response = await fetch(`${API_BASE_URL}/api/payments/create-client-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'onboarding',
          returnUrl: baseUrl,
          coachId: coachId || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success || !result.url) {
        throw new Error(result.message || 'Error al iniciar el pago');
      }

      // Guardar que estamos en proceso de pago y el paso actual
      sessionStorage.setItem('nel_payment_pending', 'true');
      sessionStorage.setItem('nel_current_step', '1');

      // Redirigir a Stripe Checkout
      window.location.href = result.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con Stripe');
    } finally {
      setLoading(false);
    }
  };

  const sessionAmount = Number(process.env.NEXT_PUBLIC_CLIENT_SESSION_AMOUNT) || 150;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8">
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

            <h1 className="text-2xl font-bold text-center text-teal-800 mb-6">
              Pago de Sesión
            </h1>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Resumen del pago
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sesión de coaching</span>
                  <span className="font-semibold text-gray-800">
                    ${sessionAmount}.00 USD
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className="text-xl font-bold text-teal-700">
                    ${sessionAmount}.00 USD
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-teal-50 rounded-lg p-4 mb-6 border border-teal-200">
              <div className="flex items-start gap-3">
                <span className="text-lg">🔒</span>
                <div className="text-sm text-teal-800">
                  <p className="font-medium mb-1">Pago 100% seguro</p>
                  <p>
                    Tu pago será procesado por Stripe, la plataforma de pagos
                    más segura del mundo. No almacenamos datos de tu tarjeta.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Pagar ${sessionAmount}.00 USD con Stripe
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Al hacer clic en &quot;Pagar&quot;, serás redirigido a Stripe para
              completar el pago de forma segura. Una vez confirmado, podrás
              continuar con tu registro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStep;

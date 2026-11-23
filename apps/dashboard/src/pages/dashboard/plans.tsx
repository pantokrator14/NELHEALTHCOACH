import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/dashboard/Layout';
import {
  apiClient,
  type ApiClientError,
  type CommercialPlan,
  type CommercialPlanId,
  type ClientPortalData,
} from '@/lib/api';
import { useUserRole, useLocalStorageValue } from '@/lib/client-hooks';
import { useToast } from '@/components/ui/Toast';

export default function ClientPlansPage() {
  const router = useRouter();
  const userRole = useUserRole();
  const pendingPlanFromStorage = useLocalStorageValue('pendingSelectedPlanId');
  const { showToast, ToastComponent } = useToast();

  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [portal, setPortal] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOutPlanId, setCheckingOutPlanId] = useState<CommercialPlanId | null>(null);

  const paymentCancelled = router.isReady && router.query.payment === 'cancelled';

  useEffect(() => {
    if (!userRole) return;
    if (userRole !== 'client') {
      router.replace('/dashboard');
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const [plansRes, portalRes] = await Promise.all([
          apiClient.getPlans(),
          apiClient.getClientPortalMe(),
        ]);
        if (!active) return;
        if (plansRes?.data) setPlans(plansRes.data);
        if (portalRes?.data) setPortal(portalRes.data);
      } catch (err) {
        if (!active) return;
        showToast(err instanceof Error ? err.message : 'Error al cargar los planes', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router, showToast, userRole]);

  const handleCheckout = async (planId: CommercialPlanId) => {
    setCheckingOutPlanId(planId);
    try {
      try {
        window.localStorage.setItem('pendingSelectedPlanId', planId);
      } catch {
        /* ignore */
      }
      const res = await apiClient.createPlanCheckout(planId);
      if (res?.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
      throw new Error('No se recibió el enlace de pago de Stripe.');
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr?.status === 409 || apiErr?.code === 'QUOTA_FULL') {
        apiClient
          .getPlans()
          .then((res) => {
            if (res?.data) setPlans(res.data);
          })
          .catch(() => undefined);
      }
      showToast(err instanceof Error ? err.message : 'Error al iniciar el pago', 'error');
      setCheckingOutPlanId(null);
    }
  };

  const orderedPlans = [...plans].sort((a, b) => a.order - b.order);
  const highlightedPlanId = portal?.selectedPlanId || pendingPlanFromStorage || null;

  const renderPlanCard = (plan: CommercialPlan) => {
    const isPopular = Boolean(plan.badge);
    const isPreselected = highlightedPlanId === plan.id && !portal?.hasPaidPlan;
    const isActive = portal?.activePlanId === plan.id && portal?.hasPaidPlan;
    const isBusy = checkingOutPlanId === plan.id;
    const isUnavailable = plan.availability ? !plan.availability.available : false;

    const ctaText = isUnavailable
      ? 'Cupos no disponibles'
      : plan.id === 'consult_1on1'
      ? plan.ctaLabel
      : isActive
      ? `Renovar este plan — $${plan.launchPriceUsd}`
      : portal?.hasPaidPlan
      ? `Cambiar a este plan — $${plan.launchPriceUsd}`
      : plan.ctaLabel;

    return (
      <div
        key={plan.id}
        className={`relative bg-white rounded-2xl shadow-sm border flex flex-col justify-between p-4 xl:p-5 transition-all hover:shadow-lg h-full w-[82vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none ${
          isUnavailable
            ? 'border-gray-200 opacity-90'
            : isPopular
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : isPreselected
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-200'
        }`}
      >
        <div className="flex flex-col">
          {/* Badges */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 min-h-[1.5rem]">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
              {plan.durationLabel}
            </span>

            {isUnavailable && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                Sin cupos
              </span>
            )}
            {!isUnavailable && plan.badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wide">
                {plan.badge}
              </span>
            )}
            {!isUnavailable && isPreselected && !plan.badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                Tu elección previa
              </span>
            )}
            {isActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Plan activo
              </span>
            )}
          </div>

          <h2 className="text-base xl:text-[17px] font-bold text-gray-900 leading-snug md:min-h-[3.25rem]">
            {plan.name}
          </h2>
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed md:min-h-[4.25rem]">
            {plan.description}
          </p>

          {/* Precios */}
          <div className="mt-4 pb-4 border-b border-gray-100 md:min-h-[5.5rem]">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl xl:text-[26px] font-extrabold text-gray-900">
                ${plan.launchPriceUsd} <span className="text-xs font-semibold text-gray-500">USD</span>
              </span>
              <span className="text-xs line-through text-gray-400">
                ${plan.regularPriceUsd} USD
              </span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-700 mt-1 leading-snug">
              Ahorras ${plan.savingsUsd} USD ({plan.discountPercent}% de descuento)
            </p>
          </div>

          {/* Modalidad */}
          <div className="mt-3.5 bg-blue-50/70 rounded-xl p-2.5 border border-blue-100 md:min-h-[4.75rem]">
            <p className="text-[10px] font-semibold text-blue-900 uppercase tracking-wide">Modalidad</p>
            <p className="text-[11px] text-blue-800 mt-0.5 leading-snug">{plan.modalitySummary}</p>
          </div>

          {/* Ruta (si aplica) */}
          {plan.roadmap && plan.roadmap.length > 0 && (
            <div className="mt-3.5">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Ruta del programa
              </p>
              <ul className="space-y-1">
                {plan.roadmap.map((stepText) => (
                  <li key={stepText} className="text-[11px] text-gray-700 flex items-start gap-1.5 leading-snug">
                    <span className="text-emerald-600 font-bold shrink-0">→</span>
                    <span>{stepText}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Qué incluye */}
          <div className="mt-3.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Incluye
            </p>
            <ul className="space-y-1.5">
              {plan.includes.map((item) => (
                <li key={item} className="text-xs text-gray-700 flex items-start gap-1.5 leading-snug">
                  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 pt-3.5 border-t border-gray-100">
          <button
            type="button"
            disabled={checkingOutPlanId !== null || isUnavailable}
            onClick={() => handleCheckout(plan.id)}
            className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs text-center leading-tight transition-all flex items-center justify-center gap-2 ${
              isUnavailable
                ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                : isPopular
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-60'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60'
            }`}
          >
            {isBusy ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                Conectando con Stripe...
              </>
            ) : (
              ctaText
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Planes y Tarifas de Lanzamiento - NELHEALTHCOACH</title>
      </Head>

      <Layout>
        <div className="p-4 md:p-6 xl:p-8 max-w-[1440px] mx-auto">
          {/* Cintillo superior */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 md:p-6 mb-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider mb-2">
                  🔥 Cupos limitados por mes
                </span>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Elige tu Plan con Manuel Martínez
                </h1>
                <p className="text-sm text-emerald-100 mt-1">
                  Pago único seguro con Stripe. Acceso inmediato a tu portal personalizado.
                </p>
              </div>
              {portal?.hasPaidPlan && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-emerald-800 rounded-xl font-semibold text-sm hover:bg-emerald-50 transition shrink-0"
                >
                  ← Volver a Mi Portal
                </Link>
              )}
            </div>
          </div>

          {portal?.hasPaidPlan && (
            <div
              className={`mb-6 px-5 py-4 rounded-2xl border text-sm ${
                portal.programCompleted
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {portal.programCompleted ? (
                <p>
                  <strong>🏆 ¡Felicidades por completar tu {portal.activePlan?.name || 'programa'}!</strong>{' '}
                  Tu historial médico y evaluaciones siguen guardados. Elige aquí el plan que deseas renovar o el siguiente nivel para continuar tu seguimiento.
                </p>
              ) : (
                <p>
                  <strong>ℹ️ Renovación o cambio de plan:</strong>{' '}
                  Tu cuenta y progreso actuales permanecen activos. Si renuevas tu plan o cambias a uno nuevo, sus meses de evaluación y sesiones de videollamada se sumarán automáticamente a tu cuenta.
                </p>
              )}
            </div>
          )}

          {paymentCancelled && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              El proceso de pago fue cancelado. No se realizó ningún cargo; puedes seleccionar un plan cuando estés listo.
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 h-80 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  Planes y Programas Disponibles
                </h2>
                <span className="text-[11px] font-medium text-gray-400 md:hidden">
                  Desliza →
                </span>
              </div>
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 -mx-4 px-4 items-stretch md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-4 md:overflow-visible">
                {orderedPlans.map(renderPlanCard)}
              </div>
            </div>
          )}
        </div>
      </Layout>

      <ToastComponent />
    </>
  );
}

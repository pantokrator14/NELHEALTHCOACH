'use client';

// apps/landing/src/components/sections/ContactFormSection.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { getLandingPlansCopy, type LandingPlanCard, type PlanId } from '../../lib/plans-data';

interface PlanQuotaAvailability {
  open: boolean;
  limit: number;
  used: number;
  remaining: number;
  available: boolean;
}

type PlanAvailabilityMap = Partial<Record<PlanId, PlanQuotaAvailability>>;

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://app.nelhealthcoach.com' : 'http://localhost:3002');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ContactFormSection: React.FC = () => {
  const { i18n } = useTranslation();
  const copy = getLandingPlansCopy(i18n.language);

  // Importante: iniciar en null para evitar hydration mismatch; se carga en useEffect
  const [availabilityMap, setAvailabilityMap] = useState<PlanAvailabilityMap | null>(null);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultName, setConsultName] = useState('');
  const [consultEmail, setConsultEmail] = useState('');
  const [consultPhone, setConsultPhone] = useState('');
  const [consultObjective, setConsultObjective] = useState('');
  const [consultBusy, setConsultBusy] = useState(false);
  const [consultError, setConsultError] = useState('');

  const fetchAvailability = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/availability`, {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        success?: boolean;
        data?: PlanAvailabilityMap;
      };
      if (payload?.success && payload.data) {
        setAvailabilityMap(payload.data);
      }
    } catch {
      // Silencioso: no bloquear la landing si el backend no responde al consultar disponibilidad
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/plans/availability`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { success?: boolean; data?: PlanAvailabilityMap } | null) => {
        if (active && payload?.success && payload.data) {
          setAvailabilityMap(payload.data);
        }
      })
      .catch(() => {
        // Silencioso: no bloquear la landing si el backend no responde al consultar disponibilidad
      });
    return () => {
      active = false;
    };
  }, []);

  const buildPlanHref = (planId: string) =>
    `${DASHBOARD_URL}/register/client?plan=${encodeURIComponent(planId)}`;

  const handleOpenConsultModal = () => {
    if (availabilityMap?.consult_1on1?.available === false) return;
    setConsultError('');
    setShowConsultModal(true);
  };

  const handleCloseConsultModal = () => {
    if (consultBusy) return;
    setShowConsultModal(false);
    setConsultError('');
  };

  const handleSelectMobilePlan = (index: number) => {
    setActiveMobileIndex(index);
    const targetCard = cardRefs.current[index];
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleCarouselScroll = () => {
    const container = carouselRef.current;
    if (!container) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, idx) => {
      if (!card) return;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = idx;
      }
    });

    if (closestIndex !== activeMobileIndex) {
      setActiveMobileIndex(closestIndex);
    }
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultName.trim() || !consultEmail.trim()) return;
    setConsultBusy(true);
    setConsultError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-consult-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: consultName.trim(),
          email: consultEmail.trim().toLowerCase(),
          ...(consultPhone.trim() ? { phone: consultPhone.trim() } : {}),
          ...(consultObjective.trim() ? { objective: consultObjective.trim() } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        code?: string;
        data?: { url?: string };
      };
      if (response.status === 409 || payload?.code === 'QUOTA_FULL') {
        void fetchAvailability();
        setConsultError(copy.unavailableLabel);
        setConsultBusy(false);
        return;
      }
      if (!response.ok || !payload?.data?.url) {
        throw new Error(payload?.message || copy.consultModal.errorGeneric);
      }
      window.location.assign(payload.data.url);
    } catch (err: unknown) {
      setConsultError(err instanceof Error && err.message ? err.message : copy.consultModal.errorGeneric);
      setConsultBusy(false);
    }
  };

  const renderPlanCard = (plan: LandingPlanCard, index: number) => {
    const isRecommended = Boolean(plan.badge);
    const isConsult = plan.id === 'consult_1on1';
    const isUnavailable = availabilityMap?.[plan.id]?.available === false;

    const ctaClassName = `w-full py-2.5 px-3 rounded-xl font-bold text-xs xl:text-sm text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none whitespace-nowrap ${
      isRecommended
        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-blue-950 hover:from-emerald-300 hover:to-teal-300 focus-visible:ring-emerald-300'
        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus-visible:ring-blue-500'
    }`;

    const unavailableClassName = `w-full py-2.5 px-3 rounded-xl font-bold text-xs xl:text-sm text-center whitespace-nowrap cursor-not-allowed ${
      isRecommended
        ? 'bg-white/20 text-blue-100 border border-white/25'
        : 'bg-gray-200 text-gray-500 border border-gray-300'
    }`;

    return (
      <div
        key={plan.id}
        ref={(el) => {
          cardRefs.current[index] = el;
        }}
        className={`relative flex flex-col justify-between rounded-2xl p-4 xl:p-5 transition-all duration-200 w-[82vw] max-w-[330px] sm:w-[320px] shrink-0 snap-center lg:w-auto lg:max-w-none ${
          isRecommended
            ? 'bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white border-2 border-emerald-400 shadow-2xl lg:-translate-y-1.5'
            : 'bg-white text-gray-800 border border-blue-100 shadow-lg hover:shadow-xl'
        }`}
      >
        {plan.badge && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] xl:text-[11px] font-extrabold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
            ⭐ {plan.badge}
          </div>
        )}

        <div>
          <div className="mb-2">
            <span
              className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${
                isRecommended
                  ? 'bg-white/15 text-emerald-200'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {plan.duration}
            </span>
            <h3
              className={`text-[15px] xl:text-base font-bold leading-snug lg:min-h-[2.6rem] ${
                isRecommended ? 'text-white' : 'text-blue-950'
              }`}
            >
              {plan.name}
            </h3>
          </div>

          {/* Precios de lanzamiento */}
          <div
            className={`my-2.5 pb-2.5 border-b ${
              isRecommended ? 'border-white/15' : 'border-gray-100'
            }`}
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-[11px] line-through ${
                  isRecommended ? 'text-blue-200/80' : 'text-gray-400'
                }`}
              >
                {copy.regularLabel}: ${plan.regularPrice} USD
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-2xl xl:text-3xl font-extrabold tracking-tight ${
                  isRecommended ? 'text-white' : 'text-blue-700'
                }`}
              >
                ${plan.launchPrice}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isRecommended ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                USD
              </span>
            </div>
            <p
              className={`mt-1 inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                isRecommended
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {plan.savingsText}
            </p>
          </div>

          {/* Modalidad */}
          <div
            className={`rounded-xl p-2.5 mb-2.5 text-[11px] leading-snug ${
              isRecommended
                ? 'bg-white/10 text-blue-50'
                : 'bg-blue-50/70 text-blue-900'
            }`}
          >
            <span className="font-bold block mb-0.5">{copy.modalityLabel}:</span>
            <span>{plan.modality}</span>
          </div>

          {/* Ruta de 3 pasos / semanas */}
          {plan.roadmap && plan.roadmap.length > 0 && (
            <div className="mb-2.5">
              <p
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isRecommended ? 'text-emerald-300' : 'text-blue-700'
                }`}
              >
                {copy.roadmapLabel}
              </p>
              <div className="space-y-1">
                {plan.roadmap.map((step, idx) => (
                  <div
                    key={idx}
                    className={`text-[11px] px-2 py-1 rounded-md font-medium leading-tight ${
                      isRecommended
                        ? 'bg-white/10 text-white'
                        : 'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de beneficios */}
          <div className="mb-3">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                isRecommended ? 'text-blue-200' : 'text-gray-500'
              }`}
            >
              {copy.includesLabel}
            </p>
            <ul className="space-y-1.5">
              {plan.includes.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] xl:text-xs leading-snug">
                  <svg
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      isRecommended ? 'text-emerald-300' : 'text-emerald-600'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className={isRecommended ? 'text-blue-50' : 'text-gray-700'}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {isUnavailable ? (
          <button type="button" disabled aria-disabled="true" className={unavailableClassName}>
            {copy.unavailableLabel}
          </button>
        ) : isConsult ? (
          <button type="button" onClick={handleOpenConsultModal} className={ctaClassName}>
            {plan.ctaLabel}
          </button>
        ) : (
          <a href={buildPlanHref(plan.id)} className={ctaClassName}>
            {plan.ctaLabel}
          </a>
        )}
      </div>
    );
  };

  return (
    <section
      id="contacto"
      className="min-h-screen flex items-center pt-16 pb-10 lg:pt-20 lg:pb-8 px-3 sm:px-5 bg-gradient-to-b from-blue-100 via-blue-50 to-white"
    >
      <div id="planes" className="container mx-auto max-w-[1380px] w-full">
        {/* Cintillo superior */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white text-xs sm:text-sm font-bold shadow-md text-center">
            <span>🔥</span>
            <span>{copy.ribbon}</span>
          </div>
        </div>

        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto mb-5 lg:mb-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-blue-950 leading-tight">
            {copy.title}
          </h2>
        </div>

        {/* Selector rápido de planes en móvil y tablet (< lg) */}
        <div className="lg:hidden mb-2 flex items-center gap-2 overflow-x-auto pb-1.5 -mx-3 px-4 sm:-mx-5 sm:px-6">
          {copy.plans.map((plan, idx) => {
            const isActive = activeMobileIndex === idx;
            const shortTitle = plan.name.split(':')[0];
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleSelectMobilePlan(idx)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  isActive
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                    : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
                }`}
              >
                {plan.badge ? '⭐ ' : ''}
                {shortTitle} · ${plan.launchPrice}
              </button>
            );
          })}
        </div>

        {/* Carrusel horizontal con snap en móvil/tablet; 5 columnas en desktop */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="flex lg:grid lg:grid-cols-5 gap-4 lg:gap-3.5 xl:gap-4 items-stretch pt-4 pb-3 lg:pt-2 lg:pb-0 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scroll-smooth -mx-3 px-4 sm:-mx-5 sm:px-6 lg:mx-0 lg:px-0"
        >
          {copy.plans.map((plan, index) => renderPlanCard(plan, index))}
        </div>

        {/* Indicadores de página en móvil/tablet */}
        <div className="lg:hidden flex justify-center gap-1.5 mt-1">
          {copy.plans.map((plan, idx) => (
            <button
              key={plan.id}
              type="button"
              aria-label={plan.name}
              onClick={() => handleSelectMobilePlan(idx)}
              className={`h-2 rounded-full transition-all ${
                activeMobileIndex === idx ? 'w-6 bg-blue-800' : 'w-2 bg-blue-300'
              }`}
            />
          ))}
        </div>

        {/* Acceso directo para usuarios existentes */}
        <div className="mt-5 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            {copy.alreadyHaveAccount}{' '}
            <a
              href={`${DASHBOARD_URL}/login`}
              className="font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2"
            >
              {copy.signInLink}
            </a>
          </p>
        </div>
      </div>

      {/* Modal de Consulta Privada 1 a 1 (Lead -> Stripe -> Calendly, sin cuenta en dashboard) */}
      {showConsultModal && (
        <div
          className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consult-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-blue-100 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleCloseConsultModal}
              disabled={consultBusy}
              aria-label={copy.consultModal.cancelLabel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 mb-2">
              {copy.consultModal.badge}
            </span>
            <h3 id="consult-modal-title" className="text-xl font-extrabold text-blue-950">
              {copy.consultModal.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 mb-4 leading-relaxed">
              {copy.consultModal.subtitle}
            </p>

            {consultError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs">
                {consultError}
              </div>
            )}

            <form onSubmit={handleConsultSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="consult-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  {copy.consultModal.nameLabel}
                </label>
                <input
                  id="consult-name"
                  type="text"
                  required
                  value={consultName}
                  onChange={(e) => setConsultName(e.target.value)}
                  disabled={consultBusy}
                  placeholder={copy.consultModal.namePlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="consult-email" className="block text-xs font-semibold text-gray-700 mb-1">
                  {copy.consultModal.emailLabel}
                </label>
                <input
                  id="consult-email"
                  type="email"
                  required
                  value={consultEmail}
                  onChange={(e) => setConsultEmail(e.target.value)}
                  disabled={consultBusy}
                  placeholder={copy.consultModal.emailPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="consult-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                  {copy.consultModal.phoneLabel}
                </label>
                <input
                  id="consult-phone"
                  type="tel"
                  value={consultPhone}
                  onChange={(e) => setConsultPhone(e.target.value)}
                  disabled={consultBusy}
                  placeholder={copy.consultModal.phonePlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="consult-objective" className="block text-xs font-semibold text-gray-700 mb-1">
                  {copy.consultModal.objectiveLabel}
                </label>
                <textarea
                  id="consult-objective"
                  rows={2}
                  value={consultObjective}
                  onChange={(e) => setConsultObjective(e.target.value)}
                  disabled={consultBusy}
                  placeholder={copy.consultModal.objectivePlaceholder}
                  className="w-full px-3.5 py-2 text-sm text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-[11px] text-gray-500 leading-snug">
                {copy.consultModal.securityNote}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseConsultModal}
                  disabled={consultBusy}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
                >
                  {copy.consultModal.cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={consultBusy}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-60"
                >
                  {consultBusy ? copy.consultModal.submittingLabel : copy.consultModal.submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactFormSection;

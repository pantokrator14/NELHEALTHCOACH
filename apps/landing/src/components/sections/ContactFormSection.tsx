// apps/landing/src/components/sections/ContactFormSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { getVisitorId } from '../../lib/fingerprint';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FunnelStep = 'intro' | 'obstacles' | 'contact';

interface FormData {
  name: string;
  email: string;
  phone: string;
  objective: string;
  otherObjective?: string;
  commitmentLevel: number | null;
  initialCommitmentLevel: number | null;
  commitmentChangesCount: number;
  biggestObstacle: string;
}

const objectives = [
  { value: 'perder-peso', labelKey: 'landing.contact.objective1' },
  { value: 'ganar-musculo', labelKey: 'landing.contact.objective2' },
  { value: 'mas-energia', labelKey: 'landing.contact.objective3' },
  { value: 'mejorar-digestion', labelKey: 'landing.contact.objective4' },
  { value: 'reducir-estres', labelKey: 'landing.contact.objective5' },
  { value: 'dormir-mejor', labelKey: 'landing.contact.objective6' },
  { value: 'otro', labelKey: 'landing.contact.objective7' },
];

const ContactFormSection: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<FunnelStep>('intro');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    objective: 'perder-peso',
    otherObjective: '',
    commitmentLevel: null,
    initialCommitmentLevel: null,
    commitmentChangesCount: 0,
    biggestObstacle: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Disponibilidad de sesiones gratuitas (cupo limitado)
  const [sessionInfo, setSessionInfo] = useState<{ available: boolean; remaining: number } | null>(null);
  // Lista de espera (misma lista unificada del libro, origen 'sessions')
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistWebsite, setWaitlistWebsite] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const sessionsFull = sessionInfo?.available === false;

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setStep('intro');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Disponibilidad de la sesión gratuita
  const refreshAvailability = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/free-sessions/availability`, { cache: 'no-store' });
      const data = (await res.json()) as { success?: boolean; data?: { available: boolean; remaining: number } };
      if (data?.success && data.data) {
        setSessionInfo({ available: data.data.available, remaining: data.data.remaining });
      }
    } catch {
      // Sin datos de disponibilidad: no bloqueamos el formulario
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await refreshAvailability();
    })();
    const intervalId = window.setInterval(() => {
      void refreshAvailability();
    }, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshAvailability();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshAvailability]);

  // Deep link desde el blog (?sesion=1#contacto)
  useEffect(() => {
    if (router.isReady && router.query.sesion === '1') {
      const timer = setTimeout(() => {
        if (sessionsFull) {
          setIsWaitlistOpen(true);
        } else {
          setStep('intro');
          setIsModalOpen(true);
        }
        void router.replace('/#contacto', undefined, { shallow: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [router, router.isReady, router.query.sesion, sessionsFull]);

  // Si se acaban los cupos mientras está abierto el modal
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      if (sessionsFull && isModalOpen) {
        setIsModalOpen(false);
        setStep('intro');
        setIsWaitlistOpen(true);
      }
    })();
  }, [sessionsFull, isModalOpen]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistStatus('sending');
    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail, source: 'sessions', website: waitlistWebsite }),
      });
      if (!res.ok) throw new Error('request failed');
      setWaitlistStatus('sent');
      setWaitlistEmail('');
    } catch {
      setWaitlistStatus('error');
    }
  };

  const openCalendly = () => {
    window.open(
      'https://calendly.com/manueldejesusmartinez66/30min',
      '_blank',
      'noopener,noreferrer,width=800,height=600'
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectCommitment = (num: number) => {
    setFormData(prev => {
      const isFirst = prev.initialCommitmentLevel === null;
      const isChanged = prev.commitmentLevel !== null && prev.commitmentLevel !== num;
      return {
        ...prev,
        commitmentLevel: num,
        initialCommitmentLevel: isFirst ? num : prev.initialCommitmentLevel,
        commitmentChangesCount: isChanged ? prev.commitmentChangesCount + 1 : prev.commitmentChangesCount,
      };
    });
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStep('intro');
    setError('');
  };

  const handleIntroContinue = () => {
    if (formData.objective === 'otro' && !formData.otherObjective?.trim()) {
      setError(t('landing.contact.specifyObjective'));
      return;
    }
    setError('');
    // Si tiene 7 o más, va directo al formulario de contacto
    if (formData.commitmentLevel !== null && formData.commitmentLevel >= 7) {
      setStep('contact');
    } else {
      // Si tiene menos de 7 y decide continuar a través del botón de limitantes
      setStep('obstacles');
    }
  };

  const handleObstaclesContinue = () => {
    const cleanObstacle = formData.biggestObstacle.trim();
    if (cleanObstacle.length < 10) {
      setError(t('landing.contact.obstaclesRequiredError'));
      return;
    }
    setError('');
    setStep('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalObjective = formData.objective === 'otro' && formData.otherObjective
      ? formData.otherObjective
      : formData.objective;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      objective: finalObjective.trim(),
      commitmentLevel: formData.commitmentLevel ?? undefined,
      initialCommitmentLevel: formData.initialCommitmentLevel ?? undefined,
      commitmentChangesCount: formData.commitmentChangesCount,
      biggestObstacle: formData.biggestObstacle.trim() || undefined,
      source: 'free-session',
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const visitorId = getVisitorId();
      if (visitorId) {
        headers['X-Visitor-Id'] = visitorId;
      }

      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('La respuesta del servidor no es válida');
      }

      if (!response.ok) {
        if (response.status === 409) {
          await refreshAvailability();
          handleCloseModal();
          setIsWaitlistOpen(true);
          return;
        }
        throw new Error(data.message || 'Error al enviar');
      }

      // Éxito: el cupo se consumió → refrescar disponibilidad y abrir Calendly
      void refreshAvailability();
      handleCloseModal();
      openCalendly();
    } catch (err: unknown) {
      console.error('❌ Error al procesar solicitud:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacto" className="min-h-screen py-16 px-4 bg-blue-200 flex items-center">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="md:flex">
            {/* Panel izquierdo - Beneficios */}
            <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.contact.title2')}</h2>
              <p className="mb-6 text-xl text-blue-100">
                {t('landing.contact.subtitle2')}
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">{t('landing.contact.benefit1')}</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">{t('landing.contact.benefit2')}</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">{t('landing.contact.benefit3')}</span>
                </li>
              </ul>
            </div>

            {/* Panel derecho - Botón único */}
            <div className="md:w-1/2 p-12 flex flex-col justify-center items-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                {t('landing.contact.schedule')}
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                {t('landing.contact.scheduleSubtitle')}
              </p>

              {sessionsFull ? (
                <>
                  <div className="w-full rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm font-semibold text-center mb-4">
                    {t('landing.contact.sessionsFull')}
                  </div>
                  <button
                    onClick={() => setIsWaitlistOpen(true)}
                    className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">⏳</span>
                    <span>{t('landing.contact.waitlistButton')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setStep('intro');
                      setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">📅</span>
                    <span>{t('landing.contact.viewSchedule')}</span>
                  </button>
                  {sessionInfo && sessionInfo.remaining > 0 && sessionInfo.remaining <= 3 && (
                    <p className="mt-4 text-sm font-semibold text-emerald-600 text-center">
                      ✨ {t('landing.contact.fewLeft')}
                    </p>
                  )}
                </>
              )}

              <div className="mt-8 space-y-4">
                <p className="text-gray-500 text-sm text-center flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  {t('landing.contact.noRegister')}
                </p>
                <p className="text-gray-500 text-sm text-center flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  {t('landing.contact.confirmEmail')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal conversacional y amigable */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl my-8">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label={t('common.close') || 'Cerrar'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* ───── FASE 1: Cuéntame sobre ti (Objetivos y Compromiso) ───── */}
            {step === 'intro' && (
              <div>
                <h3 className="text-2xl font-bold text-blue-800 mb-1.5">
                  {t('landing.contact.tellUsTitle')}
                </h3>
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                  {t('landing.contact.tellUsSubtitle')}
                </p>

                {/* Objetivo */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                    {t('landing.contact.mainObjective')} *
                  </label>
                  <select
                    name="objective"
                    required
                    value={formData.objective}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
                  >
                    {objectives.map(opt => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>

                  {formData.objective === 'otro' && (
                    <div className="mt-2.5">
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        {t('landing.contact.specifyObjective')}
                      </label>
                      <input
                        type="text"
                        name="otherObjective"
                        value={formData.otherObjective}
                        onChange={handleInputChange}
                        placeholder={t('landing.contact.objectivePlaceholder')}
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Nivel de compromiso */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                    {t('landing.contact.commitmentQuestion')} *
                  </label>
                  <p className="text-xs text-gray-500 mb-2.5">
                    Selecciona una puntuación del 1 al 10:
                  </p>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const isSelected = formData.commitmentLevel === num;
                      return (
                        <button
                          type="button"
                          key={`commitment-${num}`}
                          onClick={() => handleSelectCommitment(num)}
                          className={`h-11 rounded-lg border-2 font-bold text-base transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          aria-label={`Nivel ${num}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600 mt-2 px-0.5">
                    <span>{t('landing.contact.commitmentLowLabel')}</span>
                    <span>{t('landing.contact.commitmentHighLabel')}</span>
                  </div>
                </div>

                {/* Feedback según el nivel seleccionado */}
                {formData.commitmentLevel !== null && formData.commitmentLevel >= 7 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium mb-5 flex items-start gap-2.5 animate-fadeIn">
                    <span className="text-lg leading-none shrink-0">✨</span>
                    <span>{t('landing.contact.commitmentQualified')}</span>
                  </div>
                )}

                {formData.commitmentLevel !== null && formData.commitmentLevel < 7 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs space-y-3 mb-5 animate-fadeIn">
                    <p className="leading-relaxed text-gray-700">
                      {t('landing.contact.commitmentLowFeedback')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <a
                        href="https://blog.nelhealthcoach.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-100 font-semibold text-xs transition"
                      >
                        <span>📖</span>
                        <span>{t('landing.contact.exploreBlogAndSocial')} ↗</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setStep('obstacles');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-xs transition shadow-sm"
                      >
                        <span>✍️</span>
                        <span>{t('landing.contact.continueWithObstacles')} →</span>
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="text-red-600 text-xs mb-3 font-medium">{error}</p>}

                {/* Botón principal de la fase 1 */}
                <div className="pt-2">
                  {formData.commitmentLevel === null ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 px-4 bg-gray-200 text-gray-500 font-semibold rounded-xl text-sm cursor-not-allowed"
                    >
                      {t('landing.contact.selectCommitmentError')}
                    </button>
                  ) : formData.commitmentLevel >= 7 ? (
                    <button
                      type="button"
                      onClick={handleIntroContinue}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 shadow-md transition transform hover:scale-[1.01]"
                    >
                      <span>{t('landing.contact.nextButton')}</span>
                      <span>→</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* ───── FASE 2: Limitantes y Obstáculos (Filtro de Fricción Positiva) ───── */}
            {step === 'obstacles' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep('intro');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1 mb-3"
                >
                  ← {t('landing.contact.backButton')}
                </button>

                <h3 className="text-2xl font-bold text-blue-800 mb-1.5">
                  {t('landing.contact.obstaclesTitle')}
                </h3>
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                  {t('landing.contact.obstaclesSubtitle')}
                </p>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                    {t('landing.contact.obstaclesQuestion')}
                  </label>
                  <textarea
                    name="biggestObstacle"
                    rows={4}
                    value={formData.biggestObstacle}
                    onChange={handleInputChange}
                    placeholder="Ej: He probado varias dietas pero siempre tengo efecto rebote y me cuesta mantener la constancia en el gimnasio..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm resize-none shadow-sm"
                  />
                  <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                    <span>Mínimo 10 caracteres</span>
                    <span>{formData.biggestObstacle.trim().length}/500</span>
                  </div>
                </div>

                {error && <p className="text-red-600 text-xs mb-3 font-medium">{error}</p>}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep('intro');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium order-2 sm:order-1 transition"
                  >
                    ← {t('landing.contact.backButton')}
                  </button>
                  <button
                    type="button"
                    onClick={handleObstaclesContinue}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md order-1 sm:order-2 transition"
                  >
                    {t('landing.contact.nextButton')} →
                  </button>
                </div>
              </div>
            )}

            {/* ───── FASE 3: Datos de Contacto y Agendamiento ───── */}
            {step === 'contact' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    // Si vino de obstacles vuelve a obstacles, si no vuelve a intro
                    if (formData.commitmentLevel !== null && formData.commitmentLevel < 7) {
                      setStep('obstacles');
                    } else {
                      setStep('intro');
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1 mb-3"
                >
                  ← {t('landing.contact.backButton')}
                </button>

                <h3 className="text-2xl font-bold text-blue-800 mb-1.5">
                  {t('landing.contact.contactTitle')}
                </h3>
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                  {t('landing.contact.contactSubtitle')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">{t('landing.contact.name')} *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">{t('landing.contact.email')} *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">{t('landing.contact.phone')}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    />
                  </div>

                  {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        if (formData.commitmentLevel !== null && formData.commitmentLevel < 7) {
                          setStep('obstacles');
                        } else {
                          setStep('intro');
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium order-2 sm:order-1 transition"
                    >
                      ← {t('landing.contact.backButton')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-7 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-bold shadow-md order-1 sm:order-2"
                    >
                      {loading ? t('landing.contact.sendingLabel') : t('landing.contact.continueLabel')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de lista de espera (sin cupos) */}
      {isWaitlistOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsWaitlistOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label={t('common.close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-blue-800 mb-4">{t('landing.contact.waitlistTitle')}</h3>
            <p className="text-gray-600 mb-6">{t('landing.contact.waitlistText')}</p>

            {waitlistStatus === 'sent' ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 text-emerald-700 text-sm">
                {t('landing.contact.waitlistSuccess')}
              </div>
            ) : (
              <form onSubmit={(e) => void handleWaitlistSubmit(e)} className="space-y-4">
                {/* Honeypot anti-spam */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="sessions-waitlist-website">Website</label>
                  <input
                    id="sessions-waitlist-website"
                    type="text"
                    value={waitlistWebsite}
                    onChange={(e) => setWaitlistWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder={t('landing.contact.waitlistPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
                <button
                  type="submit"
                  disabled={waitlistStatus === 'sending'}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {waitlistStatus === 'sending' ? t('landing.contact.sendingLabel') : t('landing.contact.waitlistSubmit')}
                </button>
                {waitlistStatus === 'error' && (
                  <p className="text-red-600 text-sm">{t('landing.contact.waitlistError')}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactFormSection;

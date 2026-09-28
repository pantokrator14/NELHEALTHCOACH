// apps/landing/src/components/sections/ContactFormSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { getVisitorId } from '../../lib/fingerprint';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FormData {
  name: string;
  email: string;
  phone: string;
  objective: string;
  otherObjective?: string;
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
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    objective: 'perder-peso',
    otherObjective: '',
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
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Disponibilidad de la sesión gratuita (el coach la abre/cierra desde el dashboard).
  // Se refresca sola: al cargar, cada 30 s, al volver a la pestaña y tras enviar
  // un lead, de modo que el cupo se actualiza sin recargar la página.
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
      await Promise.resolve(); // frontera async (react-hooks/set-state-in-effect)
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

  // Deep link desde el blog (/blog → /?sesion=1#contacto): abre el formulario
  // de la sesión gratuita (o la lista de espera si no hay cupos).
  useEffect(() => {
    if (router.isReady && router.query.sesion === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deep link externo: abrir una sola vez al llegar
      if (sessionsFull) setIsWaitlistOpen(true);
      else setIsModalOpen(true);
      void router.replace('/#contacto', undefined, { shallow: true });
    }
  }, [router, router.isReady, router.query.sesion, sessionsFull]);

  // Si la disponibilidad llega tarde y ya no hay cupos, cambiar al modal de espera
  useEffect(() => {
    void (async () => {
      await Promise.resolve(); // frontera async (react-hooks/set-state-in-effect)
      if (sessionsFull && isModalOpen) {
        setIsModalOpen(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const finalObjective = formData.objective === 'otro' && formData.otherObjective
      ? formData.otherObjective
      : formData.objective;

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      objective: finalObjective,
      // Consume un cupo de sesión gratuita (el API lo descuenta y cierra al llenarse)
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

      // Leer la respuesta como texto primero para depurar
      const text = await response.text();
      console.log('📨 Respuesta del servidor (texto):', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('❌ No se pudo parsear JSON. Respuesta:', text);
        throw new Error('La respuesta del servidor no es válida');
      }

      if (!response.ok) {
        // Cupos agotados (defensa server-side): pasar a la lista de espera
        if (response.status === 409) {
          await refreshAvailability();
          setIsModalOpen(false);
          setIsWaitlistOpen(true);
          return;
        }
        throw new Error(data.message || 'Error al enviar');
      }

      // Éxito: el cupo se consumió → refrescar disponibilidad y abrir Calendly
      void refreshAvailability();
      setIsModalOpen(false);
      openCalendly();
    } catch (err: unknown) {
      console.error('❌ Error en fetch:', err);
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
                    onClick={() => setIsModalOpen(true)}
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

      {/* Modal del formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-blue-800 mb-4">{t('landing.contact.beforeContinue')}</h3>
            <p className="text-gray-600 mb-6">
              {t('landing.contact.tellUs')}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">{t('landing.contact.phone')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">{t('landing.contact.mainObjective')} *</label>
                <select
                  name="objective"
                  required
                  value={formData.objective}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                >
                  {objectives.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>

              {/* Campo adicional si se selecciona "Otro" */}
              {formData.objective === 'otro' && (
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">{t('landing.contact.specifyObjective')}</label>
                  <input
                    type="text"
                    name="otherObjective"
                    value={formData.otherObjective}
                    onChange={handleInputChange}
                    placeholder={t('landing.contact.objectivePlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    required
                  />
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? t('landing.contact.sendingLabel') : t('landing.contact.continueLabel')}
                </button>
              </div>
            </form>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
                {waitlistStatus === 'error' && (
                  <p className="text-red-600 text-sm">{t('landing.contact.waitlistError')}</p>
                )}
                <button
                  type="submit"
                  disabled={waitlistStatus === 'sending'}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {waitlistStatus === 'sending' ? t('common.loading') : t('landing.contact.waitlistSubmit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactFormSection;
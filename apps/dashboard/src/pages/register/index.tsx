import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import CoachContractStep from '@/components/CoachContractStep';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RegisterStep = 'landing' | 'contract' | 'form';

const TIMEZONE_OPTIONS = [
  { value: '', label: 'Seleccionar zona horaria' },
  { value: 'America/New_York', label: 'Nueva York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (PST)' },
  { value: 'America/Anchorage', label: 'Anchorage (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (HST)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'America/Lima', label: 'Lima' },
  { value: 'America/Santiago', label: 'Santiago' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico (AST)' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/London', label: 'Londres (GMT)' },
  { value: 'Europe/Paris', label: 'París' },
  { value: 'Europe/Berlin', label: 'Berlín' },
  { value: 'Europe/Rome', label: 'Roma' },
  { value: 'Europe/Lisbon', label: 'Lisboa' },
];

interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  professionalTitle: string;
  specialties: string;
  yearsOfExperience: string;
  bio: string;
  timezone: string;
}

const emptyForm: FormDataState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  professionalTitle: '',
  specialties: '',
  yearsOfExperience: '',
  bio: '',
  timezone: '',
};

export default function Register() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<RegisterStep>('landing');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormDataState>(emptyForm);
  const [canceled, setCanceled] = useState(false);

  // ── Detectar cancelación desde Stripe ──

  useEffect(() => {
    if (router.isReady && router.query.canceled === 'true') {
      setCanceled(true);
      // Si hay datos guardados, volver al formulario; si no, a la landing
      const saved = sessionStorage.getItem('registerFormData');
      if (saved) {
        try {
          setFormData(JSON.parse(saved));
          setStep('form');
        } catch {
          setStep('landing');
        }
      } else {
        setStep('landing');
      }
    }
  }, [router.isReady, router.query.canceled]);

  // ── Landing → Contract ──

  const handleStartTrial = () => {
    setCanceled(false);
    setError('');
    setStep('contract');
  };

  // ── Contrato: aceptar → formulario directamente ──

  const handleContractAccept = () => {
    setCanceled(false);
    setError('');
    setStep('form');
  };

  const handleContractReject = () => {
    setCanceled(false);
    setError('');
    setStep('landing');
  };

  // ── Manejo de cambios en el formulario ──

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Enviar formulario ──

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const specialties = formData.specialties
      ? formData.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      professionalTitle: formData.professionalTitle,
      specialties,
      yearsOfExperience: Number(formData.yearsOfExperience) || 0,
      bio: formData.bio,
      timezone: formData.timezone,
    };

    // Guardar en sessionStorage por si Stripe cancela
    sessionStorage.setItem('registerFormData', JSON.stringify(formData));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/trial-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.code === 'TRIAL_ALREADY_USED') {
          setError(t('register.errors.trialAlreadyUsed'));
          return;
        }
        throw new Error(result.message || t('register.errors.generic'));
      }

      if (result.data?.checkoutUrl) {
        // Limpiar datos guardados antes de salir
        sessionStorage.removeItem('registerFormData');
        window.location.href = result.data.checkoutUrl;
      } else {
        throw new Error(t('register.errors.generic'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('register.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  // ── Clases reutilizables ──

  const inputClasses = (additional?: string) =>
    `focus:ring-emerald-500 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${additional || ''}`;

  const labelClasses = 'block text-sm font-medium text-emerald-700 mb-1';
  const requiredStar = <span className="text-red-500"> *</span>;

  // ── Renderizar según el paso ──

  const renderStep = () => {
    switch (step) {
      // ────── LANDING ──────
      case 'landing':
        return (
          <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
              <div className="relative w-48 h-16 mx-auto mb-6">
                <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
              </div>
              <h1 className="text-3xl font-bold text-emerald-700 mb-3">
                Prueba NELHEALTHCOACH gratis
              </h1>
              <p className="text-gray-600 mb-2">
                Accede a todas las funciones durante <strong>30 días sin costo</strong>.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Solo necesitas verificar tu tarjeta ($1 reembolsable). Sin compromiso, cancela cuando quieras.
              </p>

              <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left">
                <ul className="space-y-2 text-sm text-emerald-800">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Gestiona tus clientes y su historial de salud</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Crea planes de alimentación y ejercicio con IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Recomendaciones personalizadas para cada cliente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Panel de control profesional e intuitivo</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleStartTrial}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl hover:bg-emerald-700 transition font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Comenzar prueba gratuita →
              </button>

              <p className="text-xs text-gray-400 mt-3">
                Sin cargo hoy. Cancela en cualquier momento.
              </p>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  ¿Ya tienes una cuenta?{' '}
                  <Link href="/login" className="text-emerald-600 hover:text-emerald-800 font-medium">
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        );

      // ────── CONTRATO ──────
      case 'contract':
        return (
          <CoachContractStep
            onAccept={handleContractAccept}
            onReject={handleContractReject}
            isTrial={true}
          />
        );

      // ────── FORMULARIO DE REGISTRO ──────
      case 'form':
        return (
          <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-4 sm:p-8">
              <div className="relative w-48 h-16 mx-auto mb-6">
                <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
              </div>

              <h1 className="text-2xl font-bold text-emerald-700 mb-2 text-center">
                {t('register.form.trialTitle')}
              </h1>
              <p className="text-gray-600 text-sm text-center mb-6">
                {t('register.form.trialSubtitle')}
              </p>

              {canceled && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">
                  El pago fue cancelado. Tus datos están seguros, puedes intentarlo de nuevo.
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className={labelClasses}>
                      {t('register.form.firstName')}{requiredStar}
                    </label>
                    <input
                      id="firstName" name="firstName" type="text" required
                      value={formData.firstName}
                      onChange={handleFormChange}
                      className={inputClasses()}
                      placeholder={t('register.form.firstNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClasses}>
                      {t('register.form.lastName')}{requiredStar}
                    </label>
                    <input
                      id="lastName" name="lastName" type="text" required
                      value={formData.lastName}
                      onChange={handleFormChange}
                      className={inputClasses()}
                      placeholder={t('register.form.lastNamePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClasses}>
                    {t('register.form.email')}{requiredStar}
                  </label>
                  <input
                    id="email" name="email" type="email" required
                    value={formData.email}
                    onChange={handleFormChange}
                    className={inputClasses()}
                    placeholder={t('register.form.emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    {t('register.form.phone')}
                  </label>
                  <input
                    id="phone" name="phone" type="tel"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className={inputClasses()}
                    placeholder={t('register.form.phonePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="password" className={labelClasses}>
                    {t('register.form.password')}{requiredStar}
                  </label>
                  <input
                    id="password" name="password" type="password" required minLength={6}
                    value={formData.password}
                    onChange={handleFormChange}
                    className={inputClasses()}
                    placeholder={t('register.form.passwordPlaceholder')}
                  />
                </div>

                <div className="border-t border-gray-200 pt-4 mt-2">
                  <p className="text-sm font-semibold text-emerald-700 mb-3">
                    {t('register.form.professionalInfo')}
                  </p>

                  <div className="mb-3">
                    <label htmlFor="professionalTitle" className={labelClasses}>
                      {t('register.form.professionalTitle')}
                    </label>
                    <input
                      id="professionalTitle" name="professionalTitle" type="text"
                      value={formData.professionalTitle}
                      onChange={handleFormChange}
                      className={inputClasses()}
                      placeholder={t('register.form.professionalTitlePlaceholder')}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="specialties" className={labelClasses}>
                      {t('register.form.specialties')}
                    </label>
                    <input
                      id="specialties" name="specialties" type="text"
                      value={formData.specialties}
                      onChange={handleFormChange}
                      className={inputClasses()}
                      placeholder={t('register.form.specialtiesPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label htmlFor="yearsOfExperience" className={labelClasses}>
                        {t('register.form.yearsOfExperience')}
                      </label>
                      <input
                        id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" max="100"
                        value={formData.yearsOfExperience}
                        onChange={handleFormChange}
                        className={inputClasses()}
                      />
                    </div>
                    <div>
                      <label htmlFor="timezone" className={labelClasses}>
                        {t('register.form.timezone')}
                      </label>
                      <select
                        id="timezone" name="timezone"
                        value={formData.timezone}
                        onChange={handleFormChange}
                        className={inputClasses('text-sm')}
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="bio" className={labelClasses}>
                      {t('register.form.bio')}
                    </label>
                    <textarea
                      id="bio" name="bio" rows={3} maxLength={500}
                      value={formData.bio}
                      onChange={handleFormChange}
                      className={inputClasses('resize-none text-sm')}
                      placeholder={t('register.form.bioPlaceholder')}
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-emerald-700">
                    <strong>🔒 {t('register.form.securityNote')}</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                      {t('register.form.loading')}
                    </span>
                  ) : (
                    t('register.form.submitTrial')
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep('contract')}
                  className="text-sm text-emerald-600 hover:text-emerald-800"
                >
                  ← {t('register.form.backLink')}
                </button>
              </div>
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
        <title>{t('navigation.register')} - NELHEALTHCOACH</title>
      </Head>

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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { apiClient, type CommercialPlan } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';
import { useToast } from '@/components/ui/Toast';

type ClientRegisterStep = 'credentials' | 'verify-code';

const SPECIAL_CHAR_RE = /[!@#$%^&*()_\-+=\[\]{}|;':",.<>/?`~]/;

const LANDING_URL =
  process.env.NEXT_PUBLIC_WEBSITE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://nelhealthcoach.com' : 'http://localhost:3000');

export default function ClientRegisterPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [step, setStep] = useState<ClientRegisterStep>('credentials');
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordDirty, setPasswordDirty] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // Cargar catálogo público de planes
  useEffect(() => {
    apiClient
      .getPlans()
      .then((res) => {
        if (res?.data) {
          setPlans(res.data);
        }
      })
      .catch(() => {
        // Silencioso: el registro funciona aunque no se cargue la vista previa del plan
      });
  }, []);

  // Capturar ?plan=... de la URL y persistirlo en localStorage
  useEffect(() => {
    if (!router.isReady) return;
    const queryPlan = typeof router.query.plan === 'string' ? router.query.plan.trim() : '';
    void (async () => {
      await Promise.resolve();
      if (queryPlan) {
        setSelectedPlanId(queryPlan);
        try {
          window.localStorage.setItem('pendingSelectedPlanId', queryPlan);
        } catch {
          /* ignore */
        }
      } else {
        try {
          const saved = window.localStorage.getItem('pendingSelectedPlanId');
          if (saved) setSelectedPlanId(saved);
        } catch {
          /* ignore */
        }
      }
    })();
  }, [router.isReady, router.query.plan]);

  // Countdown para reenvío de código OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;
  const isSelectedUnavailable = selectedPlan?.availability ? !selectedPlan.availability.available : false;
  const isConsultOnlyPlan = selectedPlanId === 'consult_1on1';

  const passwordChecks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: SPECIAL_CHAR_RE.test(password),
  };
  const passwordValid =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setPasswordDirty(true);
      setError('Tu contraseña debe cumplir con todos los requisitos de seguridad.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await apiClient.registerClient({
        email: normalizedEmail,
        password,
        ...(selectedPlan ? { planId: selectedPlan.id } : selectedPlanId ? { planId: selectedPlanId } : {}),
      });
      setEmail(normalizedEmail);
      setResendCooldown(60);
      setStep('verify-code');
      showToast('Te enviamos un código de 6 dígitos a tu correo.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear tu cuenta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = otpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Ingresa el código numérico de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.verifyClientCode({
        email: email.trim().toLowerCase(),
        code: cleanCode,
      });
      showToast('¡Correo verificado! Redirigiendo al inicio de sesión...', 'success');
      router.push(`/login?verified=1&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código incorrecto o expirado.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      await apiClient.resendClientCode({ email: email.trim().toLowerCase() });
      setResendCooldown(60);
      showToast('Nuevo código enviado a tu correo.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No pudimos reenviar el código.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const handleChooseProgramInstead = () => {
    setSelectedPlanId('');
    try {
      window.localStorage.removeItem('pendingSelectedPlanId');
    } catch {
      /* ignore */
    }
    router.replace('/register/client', undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>Crear Cuenta de Cliente - NELHEALTHCOACH</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-700 flex items-center justify-center p-4 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
          {/* Header con logo */}
          <div className="pt-6 sm:pt-8 px-5 sm:px-8 pb-4 flex flex-col items-center">
            <div className="relative w-44 sm:w-48 h-12 sm:h-14 mb-4">
              <Image
                src="/logo2.png"
                alt="NELHEALTHCOACH Logo"
                fill
                sizes="192px"
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
              Portal de Clientes — Manuel Martínez
            </span>

            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {isConsultOnlyPlan
                ? 'Consulta Privada 1 a 1'
                : step === 'credentials'
                ? 'Crea tu cuenta'
                : 'Verifica tu correo'}
            </h1>
            <p className="text-sm text-gray-500 text-center mt-1">
              {isConsultOnlyPlan
                ? 'Esta consulta individual se agenda directo sin necesidad de cuenta en el portal.'
                : step === 'credentials'
                ? 'Regístrate en segundos para elegir tu plan y comenzar tu programa.'
                : `Ingresa el código de 6 dígitos que enviamos a ${email}`}
            </p>
          </div>

          <div className="px-5 sm:px-8 pb-6 sm:pb-8">
            {isConsultOnlyPlan ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 space-y-2">
                  <p className="font-bold">Videollamada Privada 1 a 1 ($60 USD)</p>
                  <p className="text-xs leading-relaxed text-blue-800">
                    Para reservar tu Consulta Privada 1 a 1 (45 min) no necesitas crear cuenta ni llenar el historial clínico completo. Paga directo desde la página de planes y elige tu horario al instante.
                  </p>
                </div>

                {isSelectedUnavailable ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed"
                  >
                    Cupos no disponibles
                  </button>
                ) : (
                  <a
                    href={`${LANDING_URL}/#planes`}
                    className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition font-semibold text-sm shadow-sm"
                  >
                    Agendar Consulta 1 a 1 →
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleChooseProgramInstead}
                  className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition text-xs font-semibold"
                >
                  Prefiero crear cuenta para el Reto o un Plan de seguimiento
                </button>
              </div>
            ) : (
              <>
                {/* Banner del plan pre-seleccionado desde la landing */}
                {selectedPlan && (
                  <div
                    className={`mb-5 rounded-xl border p-4 ${
                      isSelectedUnavailable
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            isSelectedUnavailable ? 'text-amber-800' : 'text-emerald-700'
                          }`}
                        >
                          {isSelectedUnavailable ? 'Cupos no disponibles' : 'Plan seleccionado'}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedPlan.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{selectedPlan.durationLabel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs line-through text-gray-400 block">
                          ${selectedPlan.regularPriceUsd} USD
                        </span>
                        <span
                          className={`text-lg font-extrabold ${
                            isSelectedUnavailable ? 'text-gray-600' : 'text-emerald-700'
                          }`}
                        >
                          ${selectedPlan.launchPriceUsd} USD
                        </span>
                      </div>
                    </div>
                    {isSelectedUnavailable && (
                      <p className="text-xs text-amber-800 mt-2 pt-2 border-t border-amber-200">
                        Este plan está temporalmente lleno o cerrado. Puedes crear tu cuenta ahora y elegir otro plan con cupos disponibles dentro del portal.
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {step === 'credentials' ? (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="client-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Correo electrónico
                      </label>
                      <input
                        id="client-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        autoComplete="email"
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="client-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Contraseña
                      </label>
                      <PasswordInput
                        id="client-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (!passwordDirty && e.target.value.length > 0) {
                            setPasswordDirty(true);
                          }
                        }}
                        placeholder="Mínimo 12 caracteres"
                        required
                        disabled={loading}
                        autoComplete="new-password"
                      />

                      {passwordDirty && (
                        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                          <p className="text-xs font-medium text-gray-600 mb-1">Requisitos de contraseña:</p>
                          {[
                            { ok: passwordChecks.length, label: 'Mínimo 12 caracteres' },
                            { ok: passwordChecks.upper, label: 'Al menos 1 letra mayúscula' },
                            { ok: passwordChecks.lower, label: 'Al menos 1 letra minúscula' },
                            { ok: passwordChecks.number, label: 'Al menos 1 número' },
                            { ok: passwordChecks.special, label: 'Al menos 1 carácter especial (!@#$%, etc.)' },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5 text-xs">
                              <span className={item.ok ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                                {item.ok ? '✓' : '○'}
                              </span>
                              <span className={item.ok ? 'text-emerald-700' : 'text-gray-500'}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="client-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Confirmar contraseña
                      </label>
                      <PasswordInput
                        id="client-confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite tu contraseña"
                        required
                        disabled={loading}
                        autoComplete="new-password"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition font-semibold disabled:opacity-50"
                    >
                      {loading ? 'Creando cuenta...' : 'Crear cuenta y enviar código'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifySubmit} className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
                      Revisa tu bandeja de entrada (o carpeta de spam). El código tiene validez de 15 minutos.
                    </div>

                    <div>
                      <label htmlFor="otp-code" className="block text-sm font-medium text-gray-700 mb-2 text-center">
                        Código de verificación de 6 dígitos
                      </label>
                      <input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        autoComplete="one-time-code"
                        disabled={loading}
                        className="w-full px-4 py-3.5 text-center text-2xl font-mono font-bold tracking-[0.5em] text-gray-900 border-2 border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-50"
                    >
                      {loading ? 'Verificando...' : 'Verificar correo y continuar'}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0 || resending}
                        className="text-emerald-700 hover:text-emerald-900 font-medium disabled:text-gray-400"
                      >
                        {resending
                          ? 'Reenviando...'
                          : resendCooldown > 0
                          ? `Reenviar código en ${resendCooldown}s`
                          : 'Reenviar código'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStep('credentials');
                          setOtpCode('');
                          setError('');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Cambiar correo
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div className="mt-6 pt-5 border-t border-gray-200 text-center space-y-2">
              <p className="text-sm text-gray-600">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="text-emerald-700 hover:text-emerald-900 font-semibold">
                  Iniciar sesión
                </Link>
              </p>
              <p className="text-xs text-gray-400">
                ¿Eres profesional de la salud?{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-800 underline">
                  Registro de asesores
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastComponent />
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { apiClient } from '@/lib/api';
import Layout from '@/components/dashboard/Layout';
import PasswordInput from '@/components/PasswordInput';
import { useRouter } from 'next/router';

interface CoachProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhoto?: { url: string } | null;
  role: string;
  emailVerified: boolean;
  stripeConnect?: {
    hasAccount: boolean;
    onboardingComplete: boolean;
    payoutsEnabled: boolean;
    sessionPrice: number;
  };
}

interface AccountInfo {
  isSuspended: boolean;
  isActive: boolean;
  trialStatus?: string;
  subscriptionStatus?: string;
  role: string;
  daysRemaining: number;
  subscriptionLabel: string;
  trialEndDate?: string;
  hasStripeCustomer: boolean;
}

type AcctStep = 'idle' | 'verify-password' | 'options' | 'processing' | 'done' | 'error';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stripe Connect state
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeMsg, setStripeMsg] = useState('');
  const [sessionPriceInput, setSessionPriceInput] = useState('200');
  const [savingPrice, setSavingPrice] = useState(false);

  // Account management state
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [acctStep, setAcctStep] = useState<AcctStep>('idle');
  const [acctPassword, setAcctPassword] = useState('');
  const [acctPasswordError, setAcctPasswordError] = useState('');
  const [acctMessage, setAcctMessage] = useState('');
  const [acctProcessing, setAcctProcessing] = useState(false);

  const isNearRenewal = accountInfo
    ? accountInfo.daysRemaining <= 7 && accountInfo.subscriptionLabel.includes('restante')
    : false;

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detectar ?stripe=success al cargar o al cambiar URL
  useEffect(() => {
    if (router.query.stripe === 'success') {
      setStripeMsg('✅ Stripe conectado exitosamente');
      router.replace('/dashboard/profile', undefined, { shallow: true });
      loadProfile();
    } else if (router.query.stripe === 'canceled') {
      setStripeMsg('⚠️ Configuración cancelada. Puedes intentarlo de nuevo cuando quieras.');
      router.replace('/dashboard/profile', undefined, { shallow: true });
      loadProfile();
    }
  }, [router.query.stripe]);

  const loadProfile = async () => {
    try {
      const res = await apiClient.getProfile();
      if (res?.data) {
        setProfile(res.data);
        setForm({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone || '' });
        if (res.data.stripeConnect?.sessionPrice) {
          setSessionPriceInput(String(res.data.stripeConnect.sessionPrice / 100));
        }
      }
    } catch {
      // handle redirect
    } finally {
      setLoading(false);
    }
  };

  const loadAccountInfo = async () => {
    try {
      const res = await apiClient.getAccountInfo();
      if (res?.data) {
        setAccountInfo(res.data);
      }
    } catch {
      // Silently fail
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await apiClient.updateProfile(form);
      setMessage('Perfil actualizado exitosamente');
      loadProfile();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      setPassMsg('Las contraseñas no coinciden');
      return;
    }
    if (passForm.newPass.length < 6) {
      setPassMsg('Mínimo 6 caracteres');
      return;
    }
    setChangingPass(true);
    setPassMsg('');
    try {
      const res = await apiClient.changePassword(passForm.current, passForm.newPass);
      setPassMsg(res.message || 'Contraseña actualizada');
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (err: unknown) {
      setPassMsg(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setChangingPass(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Error: La foto no debe superar 5MB');
      return;
    }

    setUploadingPhoto(true);
    setMessage('');
    try {
      await apiClient.uploadCoachPhoto(file);
      setMessage('Foto de perfil actualizada exitosamente');
      loadProfile();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Stripe Connect handlers ───

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setStripeMsg('');
    try {
      const res = await apiClient.createConnectAccount();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      setStripeMsg(err instanceof Error ? err.message : 'Error al conectar Stripe');
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleContinueOnboarding = async () => {
    setConnectingStripe(true);
    setStripeMsg('');
    try {
      const res = await apiClient.getConnectOnboardingLink();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      setStripeMsg(err instanceof Error ? err.message : 'Error al obtener enlace');
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleSavePrice = async () => {
    const priceDollars = parseFloat(sessionPriceInput);
    if (isNaN(priceDollars) || priceDollars < 50 || priceDollars > 1000) {
      setStripeMsg('El precio debe ser entre $50 y $1,000 USD');
      return;
    }
    const priceCents = Math.round(priceDollars * 100);
    setSavingPrice(true);
    setStripeMsg('');
    try {
      await apiClient.updateSessionPrice(priceCents);
      setStripeMsg('Precio actualizado exitosamente');
      loadProfile();
    } catch (err: unknown) {
      setStripeMsg(err instanceof Error ? err.message : 'Error al guardar precio');
    } finally {
      setSavingPrice(false);
    }
  };

  // ─── Account Management handlers ───

  const handleStartAccountMgmt = async () => {
    setAcctPassword('');
    setAcctPasswordError('');
    await loadAccountInfo();
    setAcctStep('verify-password');
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcctPasswordError('');

    if (!acctPassword) {
      setAcctPasswordError('Ingresa tu contraseña actual');
      return;
    }

    setAcctProcessing(true);
    try {
      await apiClient.verifyPassword(acctPassword);
      setAcctStep('options');
    } catch (err: unknown) {
      setAcctPasswordError(err instanceof Error ? err.message : 'Contraseña incorrecta');
    } finally {
      setAcctProcessing(false);
    }
  };

  const handleSuspend = async () => {
    setAcctProcessing(true);
    setAcctStep('processing');
    setAcctMessage('Suspendiendo cuenta...');

    try {
      await apiClient.suspendAccount();
      setAcctStep('done');
      setAcctMessage('Tu cuenta ha sido suspendida. Al iniciar sesión nuevamente se reactivará automáticamente.');
    } catch (err: unknown) {
      setAcctStep('error');
      setAcctMessage(err instanceof Error ? err.message : 'Error al suspender la cuenta');
    } finally {
      setAcctProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás completamente seguro? Esta acción eliminará todos tus datos, clientes y contenido. No se puede deshacer.')) {
      return;
    }

    setAcctProcessing(true);
    setAcctStep('processing');
    setAcctMessage('Eliminando cuenta...');

    try {
      await apiClient.deleteAccount(acctPassword);
      localStorage.removeItem('token');
      setAcctStep('done');
      setAcctMessage('Tu cuenta y todos tus datos han sido eliminados exitosamente.');
    } catch (err: unknown) {
      setAcctStep('error');
      setAcctMessage(err instanceof Error ? err.message : 'Error al eliminar la cuenta');
    } finally {
      setAcctProcessing(false);
    }
  };

  const handleRenew = () => {
    router.push('/dashboard/subscription');
  };

  const statusBadge = () => {
    if (!accountInfo) return null;

    if (accountInfo.isSuspended) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Suspendida</span>;
    }
    if (accountInfo.trialStatus === 'active') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Prueba gratuita</span>;
    }
    if (accountInfo.subscriptionStatus === 'active') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Activa</span>;
    }
    if (accountInfo.trialStatus === 'expired') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Vencida</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Mi Perfil - NELHEALTHCOACH</title>
      </Head>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Mi Perfil</h1>
        <p className="text-blue-500 mb-6">Gestiona tu información personal y credenciales de acceso</p>

        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${message.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Foto de perfil */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto de perfil
          </h2>
          <div className="flex items-center">
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-4xl font-bold relative">
                {profile?.profilePhoto?.url ? (
                  <Image src={profile.profilePhoto.url} alt="Foto de perfil" fill sizes="112px" className="object-cover" unoptimized />
                ) : (
                  profile?.firstName?.charAt(0)?.toUpperCase()
                )}
              </div>
              <button
                onClick={handlePhotoClick}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-md border-2 border-white disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="ml-6">
              <h3 className="text-xl font-semibold text-gray-800">{profile?.firstName} {profile?.lastName}</h3>
              <p className="text-blue-600 font-medium">{profile?.email}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {profile?.role === 'admin' ? 'Administrador' : 'Coach'}
              </span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Información personal */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Información personal
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-500 mb-1">Nombre</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-500 mb-1">Apellido</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-500 mb-1">Teléfono</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
            </div>
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 shadow-sm">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        {/* Configuración de pagos — Stripe Connect (solo coaches) */}
        {profile?.role !== 'admin' && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-emerald-600 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Configuración de pagos
          </h2>

          {stripeMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${
              stripeMsg.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' :
              stripeMsg.includes('exitosa') ? 'bg-green-50 border border-green-200 text-green-700' :
              stripeMsg.includes('cancelada') ? 'bg-amber-50 border border-amber-200 text-amber-700' :
              'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {stripeMsg}
            </div>
          )}

          {!profile?.stripeConnect?.hasAccount && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-semibold text-amber-800">Stripe no conectado</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Para recibir pagos de tus clientes necesitas conectar una cuenta de Stripe.
                    Stripe te guiará en un proceso rápido de 2 minutos para registrar tus datos bancarios.
                  </p>
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    className="mt-4 inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm disabled:opacity-50 shadow-sm"
                  >
                    {connectingStripe ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Conectando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Conectar Stripe
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {profile?.stripeConnect?.hasAccount && !profile.stripeConnect.onboardingComplete && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-semibold text-blue-800">Configuración incompleta</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Ya creamos tu cuenta de Stripe, pero falta que completes tus datos bancarios y fiscales.
                    Continúa el proceso en Stripe para empezar a recibir pagos.
                  </p>
                  <button
                    onClick={handleContinueOnboarding}
                    disabled={connectingStripe}
                    className="mt-4 inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 shadow-sm"
                  >
                    {connectingStripe ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Continuar configuración en Stripe
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {profile?.stripeConnect?.hasAccount && profile.stripeConnect.onboardingComplete && (
            <div>
              <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4 mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-semibold text-emerald-800">Stripe conectado</h3>
                    <p className="text-sm text-emerald-700">
                      {profile.stripeConnect.payoutsEnabled
                        ? 'Tu cuenta está verificada y lista para recibir pagos.'
                        : 'Cuenta verificada. Los pagos se habilitarán en breve.'}
                    </p>
                  </div>
                  {profile.stripeConnect.payoutsEnabled && (
                    <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Activo
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por sesión (USD)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      step="5"
                      value={sessionPriceInput}
                      onChange={(e) => setSessionPriceInput(e.target.value)}
                      className="w-32 pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-center"
                    />
                  </div>
                  <span className="text-sm text-gray-500">USD</span>
                  <button
                    onClick={handleSavePrice}
                    disabled={savingPrice}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm disabled:opacity-50 shadow-sm"
                  >
                    {savingPrice ? 'Guardando...' : 'Guardar precio'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Este es el monto que se cobrará a cada cliente por sesión. Mínimo $50, máximo $1,000 USD.
                </p>
              </div>
            </div>
          )}

          {profile?.role === 'admin' && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-2">
              <p className="text-sm text-gray-600">
                Como administrador, el precio fijo por sesión es de <strong>$150 USD</strong>.
                Los coaches pueden configurar su propio precio desde su perfil.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Cambiar contraseña
          </h2>
          {passMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${passMsg.includes('Error') || passMsg.includes('incorrecta') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              {passMsg}
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Contraseña actual</label>
              <PasswordInput value={passForm.current} onChange={(e) => setPassForm({ ...passForm, current: e.target.value })} required autoComplete="current-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Nueva contraseña</label>
              <PasswordInput value={passForm.newPass} onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })} placeholder="Mínimo 6 caracteres" required autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Confirmar nueva contraseña</label>
              <PasswordInput value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} required autoComplete="new-password" />
            </div>
            <button type="submit" disabled={changingPass} className="bg-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 shadow-sm">
              {changingPass ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>

        {/* ─── GESTIÓN DE CUENTA (solo coaches) ─── */}
        {profile?.role !== 'admin' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            Gestión de cuenta
          </h2>

          {acctStep === 'idle' && (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-700">
                  <strong>Zona de peligro:</strong> Aquí puedes suspender temporalmente o eliminar tu cuenta permanentemente.
                </p>
              </div>
              <button
                onClick={handleStartAccountMgmt}
                className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition font-medium shadow-sm"
              >
                Gestionar cuenta
              </button>
            </div>
          )}

          {acctStep === 'verify-password' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Ingresa tu contraseña actual para continuar.
              </p>
              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">Contraseña actual</label>
                  <PasswordInput
                    value={acctPassword}
                    onChange={(e) => { setAcctPassword(e.target.value); setAcctPasswordError(''); }}
                    required
                    autoComplete="current-password"
                  />
                  {acctPasswordError && (
                    <p className="text-red-500 text-sm mt-1">{acctPasswordError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAcctStep('idle')}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={acctProcessing}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                  >
                    {acctProcessing ? 'Verificando...' : 'Verificar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {acctStep === 'options' && accountInfo && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  {isNearRenewal
                    ? 'Tu período está por terminar. ¿Qué deseas hacer?'
                    : `Aún te quedan ${accountInfo.daysRemaining} días. ¿Qué deseas hacer?`}
                </p>
                {statusBadge()}
              </div>

              {isNearRenewal ? (
                <>
                  <button onClick={handleRenew} disabled={acctProcessing}
                    className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-left hover:bg-emerald-100 transition flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-800">Renovar suscripción</h3>
                      <p className="text-sm text-emerald-600 mt-1">Continúa usando NELHEALTHCOACH sin interrupciones.</p>
                    </div>
                  </button>

                  <button onClick={handleDelete} disabled={acctProcessing}
                    className="w-full bg-red-50 border-2 border-red-200 rounded-xl p-4 text-left hover:bg-red-100 transition flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800">Eliminar cuenta permanentemente</h3>
                      <p className="text-sm text-red-600 mt-1">Se eliminarán todos tus datos, clientes y contenido. No se puede deshacer.</p>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setAcctStep('idle')}
                    className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 transition flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800">Seguir usando la cuenta</h3>
                      <p className="text-sm text-blue-600 mt-1">No realizar cambios. Todo sigue normal.</p>
                    </div>
                  </button>

                  <button onClick={handleSuspend} disabled={acctProcessing}
                    className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-800">Suspender temporalmente</h3>
                      <p className="text-sm text-amber-600 mt-1">La cuenta queda en pausa. Al iniciar sesión se reactivará automáticamente.</p>
                    </div>
                  </button>

                  <button onClick={handleDelete} disabled={acctProcessing}
                    className="w-full bg-red-50 border-2 border-red-200 rounded-xl p-4 text-left hover:bg-red-100 transition flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800">Eliminar cuenta permanentemente</h3>
                      <p className="text-sm text-red-600 mt-1">Se eliminarán todos tus datos, clientes y contenido. No se puede deshacer.</p>
                    </div>
                  </button>
                </>
              )}

              <button
                onClick={() => setAcctStep('idle')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver
              </button>
            </div>
          )}

          {acctStep === 'processing' && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-3" />
              <p className="text-gray-600">{acctMessage}</p>
            </div>
          )}

          {acctStep === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4">{acctMessage}</p>
              <button
                onClick={() => {
                  if (acctMessage.includes('eliminados')) {
                    router.push('/login');
                  } else {
                    router.push('/dashboard');
                  }
                }}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                {acctMessage.includes('eliminados') ? 'Ir al inicio de sesión' : 'Ir al dashboard'}
              </button>
            </div>
          )}

          {acctStep === 'error' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4">{acctMessage}</p>
              <button
                onClick={() => setAcctStep('idle')}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Volver
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </Layout>
  );
}

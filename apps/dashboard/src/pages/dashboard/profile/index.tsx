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
  const [stripeLoading, setStripeLoading] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeMsg, setStripeMsg] = useState('');
  const [sessionPriceInput, setSessionPriceInput] = useState('200');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detectar ?stripe=success al cargar o al cambiar URL
  useEffect(() => {
    if (router.query.stripe === 'success') {
      setStripeMsg('✅ Stripe conectado exitosamente');
      // Limpiar query param sin recargar
      router.replace('/dashboard/profile', undefined, { shallow: true });
      // Refrescar perfil para obtener estado actualizado
      loadProfile();
    } else if (router.query.stripe === 'canceled') {
      setStripeMsg('⚠️ Configuración cancelada. Puedes intentarlo de nuevo cuando quieras.');
      // Limpiar query param sin recargar
      router.replace('/dashboard/profile', undefined, { shallow: true });
      // Refrescar perfil por si acaso
      loadProfile();
    }
  }, [router.query.stripe]);

  const loadProfile = async () => {
    try {
      const res = await apiClient.getProfile();
      if (res?.data) {
        setProfile(res.data);
        setForm({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone || '' });
        // Inicializar precio desde el perfil
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
        // Redirigir al onboarding de Stripe
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
                  <Image src={profile.profilePhoto.url} alt="Foto de perfil" fill className="object-cover" unoptimized />
                ) : (
                  profile?.firstName?.charAt(0)?.toUpperCase()
                )}
              </div>
              {/* Botón circular para cambiar foto */}
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

        {/* Configuración de pagos — Stripe Connect */}
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

          {/* Caso 1: No tiene cuenta Connect */}
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

          {/* Caso 2: Tiene cuenta pero no completó onboarding */}
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

          {/* Caso 3: Onboarding completado — mostrar estado y precio */}
          {profile?.stripeConnect?.hasAccount && profile.stripeConnect.onboardingComplete && (
            <div>
              {/* Estado de la cuenta */}
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

              {/* Precio por sesión */}
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

          {/* Para admin: mostrar info si el perfil es de admin */}
          {profile?.role === 'admin' && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-2">
              <p className="text-sm text-gray-600">
                Como administrador, el precio fijo por sesión es de <strong>$150 USD</strong>.
                Los coaches pueden configurar su propio precio desde su perfil.
              </p>
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-xl shadow p-6">
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
              <PasswordInput value={passForm.current} onChange={(e) => setPassForm({ ...passForm, current: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Nueva contraseña</label>
              <PasswordInput value={passForm.newPass} onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Confirmar nueva contraseña</label>
              <PasswordInput value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} required />
            </div>
            <button type="submit" disabled={changingPass} className="bg-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 shadow-sm">
              {changingPass ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

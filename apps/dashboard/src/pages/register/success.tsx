// apps/dashboard/src/pages/register/success.tsx
// Página que aparece después del pago exitoso en Stripe
// El coach completa sus datos aquí

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function RegisterSuccess() {
  const router = useRouter();
  const { token, session_id } = router.query;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoBase64, setProfilePhotoBase64] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5 MB');
      return;
    }

    // Mostrar preview
    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);

    // Convertir a base64 para enviar al API
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Verificar el token al montar
  useEffect(() => {
    if (!router.isReady) return;

    if (!token || typeof token !== 'string') {
      setError('Token de registro inválido. Vuelve a registrarte.');
      setVerifying(false);
      return;
    }

    // Verificar que el pending exista (opcional, podemos hacerlo al submit)
    setVerifying(false);
  }, [router.isReady, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          profilePhoto: profilePhotoBase64 || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al completar el registro');
      }

      setSuccess('Cuenta creada exitosamente. Revisa tu email para verificar tu cuenta.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 mt-4">Verificando pago...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Completar Registro - NELHEALTHCOACH</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 flex justify-center">
            <div className="relative w-48 h-16">
              <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill sizes="192px" style={{ objectFit: 'contain' }} priority />
            </div>
          </div>
          <div className="px-8 pb-8">
            <h1 className="text-2xl font-bold text-blue-700 text-center mb-2">
              Pago Confirmado
            </h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Tu suscripción está activa. Ahora completa tus datos para crear tu cuenta.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                <p className="mb-3">{success}</p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Ir al inicio de sesión
                </button>
              </div>
            )}

              {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Foto de perfil */}
                <div className="flex flex-col items-center mb-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="relative group cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition group-hover:border-blue-400 group-hover:bg-blue-50">
                      {profilePhotoPreview ? (
                        <img
                          src={profilePhotoPreview}
                          alt="Foto de perfil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {profilePhotoPreview ? 'Cambiar foto' : 'Agregar foto'}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-blue-700 mb-1">
                      Nombre
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-blue-700 mb-1">
                      Apellido
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-blue-700 mb-1">
                    Email <span className="text-gray-400">(debe ser el mismo del pago)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-blue-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-blue-700 mb-1">
                    Contraseña
                  </label>
                  <PasswordInput
                    id="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-700 mb-1">
                    Confirmar Contraseña
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

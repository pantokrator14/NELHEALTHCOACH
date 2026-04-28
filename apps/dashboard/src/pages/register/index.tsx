import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La foto no debe superar 5MB');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
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
      await apiClient.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setSuccess('Cuenta creada exitosamente. Revisa tu email para verificar tu cuenta.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
      setLoading(false);
    }
  };

  // Si ya se registró, subir la foto (después de verificar email podrá hacerlo)
  // Por ahora, mostramos el mensaje de éxito y redirigimos al login

  return (
    <>
      <Head>
        <title>Registro de Coach - NELHEALTHCOACH</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 flex justify-center">
            <div className="relative w-48 h-16">
              <Image src="/logo2.png" alt="NELHEALTHCOACH Logo" fill style={{ objectFit: 'contain' }} priority />
            </div>
          </div>
          <div className="px-8 pb-8">
            <h1 className="text-2xl font-bold text-blue-700 text-center mb-6">Registro de Coach</h1>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">📧</span>
                  {success}
                </div>
                <p className="text-sm text-green-600 mb-3">
                  Después de verificar tu email, podrás subir tu foto de perfil desde la sección Mi Perfil.
                </p>
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
                <div className="flex flex-col items-center">
                  <label htmlFor="photo" className="cursor-pointer group">
                    <div className="w-24 h-24 rounded-full bg-blue-100 border-2 border-dashed border-blue-400 flex items-center justify-center overflow-hidden group-hover:border-blue-600 transition">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-blue-500">
                          <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-xs">Foto</span>
                        </div>
                      )}
                    </div>
                  </label>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">Opcional. Máx 5MB</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input id="firstName" type="text" value={form.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input id="lastName" type="text" value={form.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input id="email" type="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input id="phone" type="tel" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading} />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input id="password" type="password" value={form.password} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                  <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
                <p className="text-center text-sm text-gray-500">
                  ¿Ya tienes cuenta?{' '}
                  <a href="/login" className="text-blue-600 hover:text-blue-800">Iniciar sesión</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

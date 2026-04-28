import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { apiClient } from '@/lib/api';
import Layout from '@/components/dashboard/Layout';

interface CoachProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhoto?: { url: string } | null;
  role: string;
  emailVerified: boolean;
}

export default function ProfilePage() {
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiClient.getProfile();
      if (res?.data) {
        setProfile(res.data);
        setForm({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone || '' });
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
              <div className="w-28 h-28 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                {profile?.profilePhoto?.url ? (
                  <img src={profile.profilePhoto.url} alt="" className="w-full h-full object-cover" />
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
              <input type="password" value={passForm.current} onChange={(e) => setPassForm({ ...passForm, current: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Nueva contraseña</label>
              <input type="password" value={passForm.newPass} onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition" required placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-500 mb-1">Confirmar nueva contraseña</label>
              <input type="password" value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition" required />
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

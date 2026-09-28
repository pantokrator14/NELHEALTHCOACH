import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient, type BlogAuthor, type BlogCoverImage } from '@/lib/api';
import { getAuthToken } from '@/lib/authSession';
import '@/lib/i18n';

/**
 * Perfil del autor al estilo del perfil del dashboard:
 * - Tarjeta de foto con avatar circular y botón de lápiz (subida inmediata a S3).
 * - Tarjeta de información con nombre, rol/título y biografía.
 * Esta información aparece en la ficha al final de cada entrada del blog.
 */
const AdminAuthorPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [years, setYears] = useState(0);
  const [photo, setPhoto] = useState<BlogCoverImage | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getAuthToken()) {
      void router.replace('/admin/login');
      return;
    }
    apiClient
      .getAuthor()
      .then((author: BlogAuthor) => {
        setName(author.name ?? '');
        setRole(author.role ?? '');
        setBio(author.bio ?? '');
        setSpecialties(author.specialties ?? []);
        setYears(author.yearsOfExperience ?? 0);
        setPhoto(author.photo);
        setPhotoPreview(author.photo?.url ?? null);
      })
      .catch(() => setError(t('admin.authorError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sube la foto a S3 (URL prefirmada) y la deja lista para guardar. */
  const handlePhotoChange = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploadingPhoto(true);
    try {
      const { uploadURL, fileKey, fileURL } = await apiClient.getAuthorUploadUrl(file.name, file.type, file.size);
      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Error subiendo la foto a S3');

      const img: BlogCoverImage = {
        url: fileURL,
        key: fileKey,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      setPhoto(img);
      setPhotoPreview(img.url);
    } catch {
      setError(t('admin.authorError'));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await apiClient.updateAuthor({
        name,
        role,
        bio,
        specialties,
        yearsOfExperience: years,
        photo,
      });
      setSaved(true);
      setName(updated.name ?? name);
      setRole(updated.role ?? role);
      setBio(updated.bio ?? bio);
    } catch {
      setError(t('admin.authorError'));
    } finally {
      setSaving(false);
    }
  };

  /** Agrega la especialidad escrita (sin duplicados). */
  const addSpecialty = () => {
    const value = specialtyInput.trim();
    if (!value || specialties.includes(value)) return;
    setSpecialties((prev) => [...prev, value]);
    setSpecialtyInput('');
  };

  if (loading) {
    return (
      <AdminLayout active="author">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white';

  return (
    <>
      <Head>
        <title>{`${t('admin.authorTitle')} | Blog NELHEALTHCOACH`}</title>
      </Head>

      <AdminLayout active="author">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{t('admin.authorTitle')}</h1>
          <p className="text-blue-500 mb-6">{t('admin.authorSubtitle')}</p>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm mb-4 bg-red-50 border border-red-200 text-red-700" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="px-4 py-3 rounded-lg text-sm mb-4 bg-green-50 border border-green-200 text-green-700" role="status">
              {t('admin.authorSaved')}
            </div>
          )}

          {/* Foto del autor */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('admin.authorPhoto')}
            </h2>
            <div className="flex flex-col items-center sm:flex-row sm:items-center">
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt={name || t('admin.authorPhoto')} className="w-full h-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase() || 'M'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  aria-label={t('admin.coverChange')}
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-md border-2 border-white disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-6 min-w-0 w-full sm:w-auto text-center sm:text-left">
                <h3 className="text-xl font-semibold text-gray-800 break-words">{name || 'Manuel Martínez'}</h3>
                {role && <p className="text-blue-600 font-medium break-words">{role}</p>}
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {t('admin.authorBadge')}
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => void handlePhotoChange(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <p className="text-xs text-gray-400 mt-4">{t('admin.coverHint')}</p>
          </div>

          {/* Información del autor */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('admin.authorName')}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="author-name" className="block text-sm font-medium text-blue-500 mb-1">
                  {t('admin.authorName')} *
                </label>
                <input
                  id="author-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="author-role" className="block text-sm font-medium text-blue-500 mb-1">
                    {t('admin.authorRole')}
                  </label>
                  <input
                    id="author-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="author-years" className="block text-sm font-medium text-blue-500 mb-1">
                    {t('admin.authorYears')}
                  </label>
                  <input
                    id="author-years"
                    type="number"
                    min={0}
                    max={100}
                    value={years}
                    onChange={(e) => setYears(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="specialty-input" className="block text-sm font-medium text-blue-500 mb-1">
                  {t('admin.authorSpecialties')}
                </label>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {specialties.map((spec) => (
                      <span
                        key={spec}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() => setSpecialties((prev) => prev.filter((s) => s !== spec))}
                          aria-label={`${t('admin.delete')} ${spec}`}
                          className="hover:text-blue-900"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="specialty-input"
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSpecialty();
                      }
                    }}
                    placeholder={t('admin.authorSpecialtiesPlaceholder')}
                    className={`${inputClass} sm:flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addSpecialty}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium text-sm"
                  >
                    {t('admin.authorAdd')}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="author-bio" className="block text-sm font-medium text-blue-500 mb-1">
                  {t('admin.authorBio')}
                </label>
                <textarea
                  id="author-bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-stretch sm:justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || name.trim() === ''}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              {saving ? t('admin.saving') : t('admin.authorSave')}
            </button>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminAuthorPage;

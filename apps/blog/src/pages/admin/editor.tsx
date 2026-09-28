import React, { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient, type BlogPost, type BlogCoverImage } from '@/lib/api';
import { getAuthToken } from '@/lib/authSession';
import '@/lib/i18n';

/**
 * Editor de entradas (nueva o edición vía ?slug=).
 * - Markdown con vista previa en vivo.
 * - Publicar / guardar borrador.
 * - Imagen destacada: se sube a S3 con URL prefirmada (patrón de recetas)
 *   después del primer guardado (se necesita el id de la entrada).
 * - Cada campo tiene su color para diferenciarlos de un vistazo.
 */
const AdminEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const editingSlug = typeof router.query.slug === 'string' ? router.query.slug : null;
  const isEditing = Boolean(editingSlug);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [coverImage, setCoverImage] = useState<BlogCoverImage | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);

  // Cargar la entrada existente (por slug) al editar
  useEffect(() => {
    if (!isEditing || !editingSlug) return;
    if (!getAuthToken()) {
      void router.replace('/admin/login');
      return;
    }
    apiClient
      .getPost(editingSlug)
      .then((post: BlogPost) => {
        setTitle(post.title);
        setExcerpt(post.excerpt ?? '');
        setContent(post.content);
        setCategory(post.category ?? '');
        setTags((post.tags ?? []).join(', '));
        setIsPublished(post.isPublished);
        setCoverImage(post.coverImage);
        if (post.coverImage?.url) setCoverPreview(post.coverImage.url);
      })
      .catch(() => setError(t('admin.errorLoading')))
      .finally(() => setLoading(false));
  }, [isEditing, editingSlug, router, t]);

  const handleFileSelect = (file: File | null) => {
    setCoverFile(file);
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
    } else {
      setCoverPreview(coverImage?.url ?? null);
    }
  };

  /** Sube la imagen destacada a S3 y actualiza la entrada con los datos. */
  const uploadCover = async (postId: string): Promise<BlogCoverImage | null> => {
    if (!coverFile) return coverImage;

    const { uploadURL, fileKey, fileURL } = await apiClient.getUploadUrl(
      postId,
      coverFile.name,
      coverFile.type,
      coverFile.size,
    );

    const uploadRes = await fetch(uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': coverFile.type },
      body: coverFile,
    });
    if (!uploadRes.ok) {
      throw new Error('Error subiendo la imagen a S3');
    }

    const img: BlogCoverImage = {
      url: fileURL,
      key: fileKey,
      name: coverFile.name,
      type: coverFile.type,
      size: coverFile.size,
      uploadedAt: new Date().toISOString(),
    };
    setCoverImage(img);
    return img;
  };

  /** Guarda la entrada (crear o actualizar) y sube la imagen si hay una nueva. */
  const save = async (publish: boolean) => {
    setError(null);
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        category: category.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isPublished: publish,
      };

      let saved: BlogPost;
      if (isEditing) {
        const current = await apiClient.getPost(editingSlug as string);
        saved = await apiClient.updatePost(current.id, input);
      } else {
        saved = await apiClient.createPost(input);
      }

      // Si hay imagen nueva, subirla y asociarla a la entrada
      if (coverFile) {
        const img = await uploadCover(saved.id);
        if (img) {
          saved = await apiClient.updatePost(saved.id, { ...input, coverImage: img });
        }
      }

      await router.push('/admin');
    } catch {
      setError(t('admin.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout active="editor">
        <p className="text-gray-500 text-center py-16">{t('common.loading')}</p>
      </AdminLayout>
    );
  }

  // Cada campo con su propio color (labels diferenciados + inputs a juego)
  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 transition';

  return (
    <>
      <Head>
        <title>{`${isEditing ? t('admin.editorTitleEdit') : t('admin.editorTitleNew')} | Blog NELHEALTHCOACH`}</title>
      </Head>

      <AdminLayout active="editor">
        <div className="max-w-4xl mx-auto">
          {/* Volver al panel (vista anterior) */}
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800 font-semibold text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            {t('admin.backToDashboard')}
          </Link>

          <h1 className="text-xl sm:text-2xl font-bold text-orange-700 mb-6 flex items-center">
            <span className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
            {isEditing ? t('admin.editorTitleEdit') : t('admin.editorTitleNew')}
          </h1>

          {error && (
            <p role="alert" className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void save(true);
            }}
            className="space-y-6 bg-white rounded-2xl shadow-md border border-orange-100 border-t-4 border-t-orange-500 p-4 sm:p-6"
          >
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-blue-700 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" aria-hidden="true" />
                {t('admin.titleLabel')} *
              </label>
              <input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} border-blue-200 focus:ring-blue-500 focus:border-blue-400`}
              />
            </div>

            <div>
              <label htmlFor="excerpt" className="block text-sm font-medium text-violet-700 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-2" aria-hidden="true" />
                {t('admin.excerptLabel')}
              </label>
              <textarea
                id="excerpt"
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className={`${inputClass} border-violet-200 focus:ring-violet-500 focus:border-violet-400`}
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-orange-700 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2" aria-hidden="true" />
                {t('admin.contentLabel')} *
              </label>
              <div className="flex space-x-2 mb-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    !showPreview
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    showPreview
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  {t('admin.preview')}
                </button>
              </div>
              {showPreview ? (
                <div className="blog-content bg-orange-50/40 border border-orange-100 rounded-lg p-5 min-h-64">
                  <Markdown remarkPlugins={[remarkGfm]}>{content || '…'}</Markdown>
                </div>
              ) : (
                <textarea
                  id="content"
                  required
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('admin.contentPlaceholder')}
                  className={`${inputClass} border-orange-300 focus:ring-orange-500 focus:border-orange-400 font-mono text-sm`}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-pink-700 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-pink-500 mr-2" aria-hidden="true" />
                  {t('admin.categoryLabel')}
                </label>
                <input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputClass} border-pink-200 focus:ring-pink-500 focus:border-pink-400`}
                />
              </div>
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-indigo-700 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-2" aria-hidden="true" />
                  {t('admin.tagsLabel')}
                </label>
                <input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className={`${inputClass} border-indigo-200 focus:ring-indigo-500 focus:border-indigo-400`}
                />
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-emerald-700 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" aria-hidden="true" />
                {t('admin.coverImageLabel')}
              </span>

              {/* Zona de subida: clic en cualquier punto para elegir la imagen */}
              <label className="block cursor-pointer group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                {coverPreview ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-emerald-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPreview} alt={t('admin.coverImageLabel')} className="h-52 w-full object-cover" />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-2 text-white font-semibold text-sm bg-emerald-600/90 px-4 py-2 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('admin.coverChange')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/60 py-10 px-4 flex flex-col items-center text-center group-hover:bg-emerald-50 transition-colors">
                    <span className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span className="inline-flex items-center gap-2 bg-emerald-600 group-hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {coverFile ? coverFile.name : t('admin.coverChoose')}
                    </span>
                    <span className="text-xs text-emerald-600 mt-3">{t('admin.coverHint')}</span>
                  </div>
                )}
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-orange-100">
              <label className="flex items-center space-x-2 text-sm font-medium text-green-800">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 accent-green-600"
                />
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                <span>{t('admin.publishLabel')}</span>
              </label>

              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 disabled:opacity-60 transition-colors"
                >
                  {t('admin.draftLabel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-sm disabled:opacity-60 transition-colors"
                >
                  {saving ? t('admin.saving') : t('admin.publishLabel')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminEditorPage;

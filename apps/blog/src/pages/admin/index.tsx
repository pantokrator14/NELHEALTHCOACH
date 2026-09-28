import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient, type BlogPost } from '@/lib/api';
import { getAuthToken } from '@/lib/authSession';
import { formatDate } from '@/lib/utils';
import '@/lib/i18n';

/**
 * Panel del admin: lista todas las entradas (incluidas borradores),
 * con acciones de editar, eliminar y crear.
 */
const AdminDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);
  const [deletedMsg, setDeletedMsg] = useState(false);
  const [views, setViews] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!getAuthToken()) {
      void router.replace('/admin/login');
      return;
    }

    apiClient
      .getPosts()
      .then((data) => setPosts(data))
      .catch(() => setError(t('admin.errorLoading')))
      .finally(() => setLoading(false));
  }, [router, t]);

  // Visitas agregadas por entrada (analytics sin cookies) — no bloquea el panel
  useEffect(() => {
    if (!getAuthToken()) return;
    apiClient
      .getViewStats()
      .then((rows) => {
        const map: Record<string, number> = {};
        for (const row of rows) map[row.slug] = row.total;
        setViews(map);
      })
      .catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await apiClient.deletePost(confirmDelete.id);
      setPosts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setConfirmDelete(null);
      setDeletedMsg(true);
    } catch {
      setError(t('admin.errorDeleting'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>{`${t('admin.dashboardTitle')} | Blog NELHEALTHCOACH`}</title>
      </Head>

      <AdminLayout active="panel">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">{t('admin.dashboardTitle')}</h1>
            <p className="text-gray-500">{t('admin.dashboardSubtitle')}</p>
          </div>
          <Link
            href="/admin/editor"
            className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            + {t('admin.newPost')}
          </Link>
        </div>

        {error && (
          <p role="alert" className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        {deletedMsg && (
          <p role="status" className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
            {t('admin.successDeleted')}
          </p>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-12">{t('common.loading')}</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white/70 rounded-2xl border border-blue-100">
            <p className="text-gray-500 mb-4">{t('admin.emptyAdmin')}</p>
            <Link
              href="/admin/editor"
              className="block sm:inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              + {t('admin.newPost')}
            </Link>
          </div>
        ) : (
          <>
            {/* Tabla (escritorio) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-blue-50 text-blue-900 text-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('admin.titleLabel')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.categoryLabel')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.statusLabel')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.views')}</th>
                    <th className="px-4 py-3 font-semibold">{t('common.publishedOn')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-t border-blue-50 hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{post.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        {post.category ? (
                          <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-3 py-1">
                            {post.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${
                            post.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {post.isPublished ? t('admin.published') : t('admin.draft')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-700 font-semibold">{views[post.slug] ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {formatDate(post.publishedAt ?? post.createdAt, i18n.language)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/editor?slug=${encodeURIComponent(post.slug)}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-4"
                        >
                          {t('admin.edit')}
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(post)}
                          disabled={deletingId === post.id}
                          className="text-red-600 hover:text-red-800 font-semibold text-sm disabled:opacity-50"
                        >
                          {t('admin.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (móvil) */}
            <div className="md:hidden space-y-4">
              {posts.map((post) => (
                <article key={post.id} className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-semibold text-gray-900 leading-snug">{post.title}</h2>
                    <span
                      className={`shrink-0 inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${
                        post.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {post.isPublished ? t('admin.published') : t('admin.draft')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                    {post.category && (
                      <span className="inline-block font-semibold text-blue-700 bg-blue-100 rounded-full px-2.5 py-0.5">
                        {post.category}
                      </span>
                    )}
                    <span>{formatDate(post.publishedAt ?? post.createdAt, i18n.language)}</span>
                    <span>
                      {t('admin.views')}: <span className="text-blue-700 font-semibold">{views[post.slug] ?? 0}</span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-blue-50">
                    <Link
                      href={`/admin/editor?slug=${encodeURIComponent(post.slug)}`}
                      className="w-full sm:w-auto text-center px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold text-sm hover:bg-blue-100 transition-colors"
                    >
                      {t('admin.edit')}
                    </Link>
                    <button
                      onClick={() => setConfirmDelete(post)}
                      disabled={deletingId === post.id}
                      className="w-full sm:w-auto text-center px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold text-sm hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {t('admin.delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </AdminLayout>

      {/* Modal de confirmación de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border-t-4 border-red-500">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('admin.delete')}</h2>
            <p className="text-gray-600 mb-6">{t('admin.deleteConfirm')}</p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deletingId !== null}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {deletingId !== null ? t('common.loading') : t('admin.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboardPage;

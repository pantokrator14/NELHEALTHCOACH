import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient, type BlogComment } from '@/lib/api';
import { getAuthToken } from '@/lib/authSession';
import { formatDate } from '@/lib/utils';
import '@/lib/i18n';

type Scope = 'pending' | 'all';

/**
 * Moderación de comentarios: el admin aprueba, rechaza o elimina.
 * Los comentarios nuevos llegan como PENDIENTES (el público no los ve).
 */
const AdminCommentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('pending');
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAuthToken()) {
      void router.replace('/admin/login');
      return;
    }
    void (async () => {
      await Promise.resolve(); // frontera async (react-hooks/set-state-in-effect)
      setLoading(true);
      try {
        const data = await apiClient.getCommentsAdmin(scope);
        setComments(data);
      } catch {
        setError(t('admin.errorLoading'));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, t, scope]);

  const applyAction = async (id: string, action: 'approved' | 'rejected' | 'delete') => {
    setBusyId(id);
    setError(null);
    try {
      if (action === 'delete') {
        await apiClient.deleteComment(id);
      } else {
        await apiClient.moderateComment(id, action);
      }
      // Actualizar la lista según el scope actual (sin refetch completo)
      if (scope === 'pending') {
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: action === 'delete' ? c.status : action } : c)),
        );
        if (action === 'delete') setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      setError(t('admin.errorLoading'));
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: t('admin.statusPending'),
      approved: t('admin.statusApproved'),
      rejected: t('admin.statusRejected'),
    };
    return (
      <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${styles[status ?? 'pending']}`}>
        {labels[status ?? 'pending']}
      </span>
    );
  };

  const tabClass = (tab: Scope) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      scope === tab ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
    }`;

  return (
    <>
      <Head>
        <title>{`${t('admin.commentsTitle')} | Blog NELHEALTHCOACH`}</title>
      </Head>

      <AdminLayout active="comments">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2">{t('admin.commentsTitle')}</h1>
          <p className="text-blue-500 mb-6">{t('admin.commentsEmpty')}</p>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button type="button" onClick={() => setScope('pending')} className={tabClass('pending')}>
              {t('admin.commentsPending')}
            </button>
            <button type="button" onClick={() => setScope('all')} className={tabClass('all')}>
              {t('admin.commentsAll')}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-gray-500 text-center py-12">{t('common.loading')}</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-center py-12 bg-white rounded-2xl border border-blue-100">
              {t('admin.commentsEmpty')}
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <article key={comment.id} className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                    <span className="font-semibold text-gray-900">{comment.authorName}</span>
                    {statusBadge(comment.status)}
                    <time className="text-xs text-gray-500">{formatDate(comment.createdAt, i18n.language)}</time>
                    <Link
                      href={`/post/${encodeURIComponent(comment.postSlug)}`}
                      className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-full"
                    >
                      /post/{comment.postSlug}
                    </Link>
                  </div>

                  <p className="text-gray-700 whitespace-pre-line mb-3">{comment.content}</p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-blue-50">
                    {comment.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === comment.id}
                        onClick={() => void applyAction(comment.id, 'approved')}
                        className="w-full sm:w-auto px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t('admin.approve')}
                      </button>
                    )}
                    {comment.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busyId === comment.id}
                        onClick={() => void applyAction(comment.id, 'rejected')}
                        className="w-full sm:w-auto px-3 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t('admin.reject')}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === comment.id}
                      onClick={() => void applyAction(comment.id, 'delete')}
                      className="w-full sm:w-auto px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {t('admin.delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminCommentsPage;

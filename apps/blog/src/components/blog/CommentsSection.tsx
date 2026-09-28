import React, { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient, type BlogComment } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import '@/lib/i18n';

interface Props {
  postSlug: string;
  initialComments: BlogComment[];
  lang: string;
}

/**
 * Comentarios públicos de una entrada, con moderación:
 * - Solo se muestran los APROBADOS por el admin.
 * - El formulario crea un comentario PENDIENTE (aviso al usuario).
 * - Anti-spam: rate limit + shield en la API y campo honeypot oculto.
 */
const CommentsSection: React.FC<Props> = ({ postSlug, initialComments, lang }) => {
  const { t } = useTranslation();
  const comments = initialComments;
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: los humanos lo dejan vacío
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitted(false);
    setSubmitting(true);
    try {
      await apiClient.submitComment({
        postSlug,
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        content: content.trim(),
        website,
      });
      setSubmitted(true);
      setAuthorName('');
      setAuthorEmail('');
      setContent('');
    } catch {
      setError(t('comments.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';

  return (
    <section className="mt-12" aria-label={t('comments.title')}>
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        {t('comments.title')} ({comments.length})
      </h2>

      {/* Lista de comentarios aprobados (texto plano: React escapa el HTML) */}
      {comments.length === 0 ? (
        <p className="text-gray-500 mb-8">{t('comments.empty')}</p>
      ) : (
        <ul className="space-y-4 mb-10">
          {comments.map((comment) => (
            <li key={comment.id} className="bg-white rounded-xl border border-blue-100 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                <span className="font-semibold text-gray-900">{comment.authorName}</span>
                <time className="text-xs text-gray-500">{formatDate(comment.createdAt, lang)}</time>
              </div>
              <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Formulario (crea comentario pendiente de moderación) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-100 p-4 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-blue-800">{t('comments.submit')}</h3>

        {/* Honeypot: campo oculto para humanos; los bots lo rellenan */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="comment-website">Website</label>
          <input
            id="comment-website"
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="comment-name" className="block text-sm font-medium text-blue-900 mb-1">
              {t('comments.name')} *
            </label>
            <input
              id="comment-name"
              required
              maxLength={80}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="comment-email" className="block text-sm font-medium text-blue-900 mb-1">
              {t('comments.email')}
            </label>
            <input
              id="comment-email"
              type="email"
              maxLength={200}
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="comment-content" className="block text-sm font-medium text-blue-900 mb-1">
            {t('comments.content')} *
          </label>
          <textarea
            id="comment-content"
            required
            rows={4}
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {submitted && (
          <p role="status" className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {t('comments.pendingNotice')}
          </p>
        )}

        <div className="flex justify-stretch sm:justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {submitting ? t('common.loading') : t('comments.submit')}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CommentsSection;

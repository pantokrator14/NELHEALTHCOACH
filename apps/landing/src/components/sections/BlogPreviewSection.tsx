import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BLOG_URL = (process.env.NEXT_PUBLIC_BLOG_URL || 'http://localhost:3003').replace(/\/+$/, '');

/** Vista previa mínima de la última entrada publicada del blog */
interface BlogPostPreview {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: { url: string } | null;
  publishedAt: string | null;
}

export const BlogPreviewSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [post, setPost] = useState<BlogPostPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lang = i18n.language?.split('-')[0] || 'es';
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/api/blog/posts?limit=1&lang=${encodeURIComponent(lang)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { data?: BlogPostPreview[] }) => {
        setPost(Array.isArray(data?.data) && data.data.length > 0 ? data.data[0] : null);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [i18n.language]);

  const postUrl = post ? `${BLOG_URL}/post/${encodeURIComponent(post.slug)}` : BLOG_URL;

  return (
    <section id="blog" className="relative min-h-screen py-16 md:py-24 px-4 sm:px-6 overflow-hidden bg-white flex items-center">
      {/* Decoración con luces ambientales difusas (igual a la sección del libro) */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-20 w-96 h-96 bg-blue-100/70 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 -right-24 w-[28rem] h-[28rem] bg-sky-100/60 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-1/3 w-80 h-80 bg-amber-50/70 rounded-full blur-3xl pointer-events-none"
      />

      <div className="container mx-auto max-w-6xl w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* ============================================================
              COLUMNA IZQUIERDA: Presentación del Blog como Biblioteca
             ============================================================ */}
          <div className="lg:col-span-6 flex flex-col text-left">
            {/* Badge de sección */}
            <div className="inline-flex items-center gap-2 self-start bg-blue-50 border border-blue-200/80 rounded-full px-3.5 py-1.5 mb-5 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                {t('landing.blogPreview.eyebrow')}
              </span>
            </div>

            {/* Título general del portal */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4">
              {t('landing.blogPreview.title')}
            </h2>

            {/* Mensaje que invita a explorar el blog entero */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal mb-6">
              {t('landing.blogPreview.message')}
            </p>

            {/* Viñetas que muestran la variedad de lo que van a encontrar */}
            <div className="space-y-3.5 mb-7">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-sm shadow-2xs font-bold">
                  🥑
                </span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 font-bold">{t('landing.blogPreview.bullet1Title')}:</strong> {t('landing.blogPreview.bullet1Text')}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-sm shadow-2xs font-bold">
                  ☀️
                </span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 font-bold">{t('landing.blogPreview.bullet2Title')}:</strong> {t('landing.blogPreview.bullet2Text')}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-sm shadow-2xs font-bold">
                  💡
                </span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 font-bold">{t('landing.blogPreview.bullet3Title')}:</strong> {t('landing.blogPreview.bullet3Text')}
                </p>
              </div>
            </div>

            {/* Botón CTA al Blog principal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href={BLOG_URL}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <span>{t('landing.blogPreview.button')}</span>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>{t('landing.blogPreview.freeHint')}</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              COLUMNA DERECHA: Escaparate vivo del Último Artículo
             ============================================================ */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            
            {/* Encabezado del escaparate */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('landing.blogPreview.liveBadge')}
                </span>
              </div>
              <a href={BLOG_URL} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                {t('landing.blogPreview.viewAll')} →
              </a>
            </div>

            {loading ? (
              <div className="animate-pulse bg-blue-50/60 border border-blue-100 rounded-3xl h-96 w-full" />
            ) : post ? (
              <div className="relative group">
                {/* Aura suave trasera */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 bg-gradient-to-tr from-blue-300/20 via-sky-200/30 to-amber-100/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"
                />

                <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-xl group-hover:shadow-2xl group-hover:border-sky-300 transition-all duration-300 overflow-hidden text-left">
                  {/* Imagen de cabecera */}
                  <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900">
                    {post.coverImage?.url ? (
                      <Image
                        src={post.coverImage.url}
                        alt={post.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 600px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-800 via-indigo-900 to-slate-900 flex items-center justify-center">
                        <span className="text-white text-5xl font-black opacity-80">NEL</span>
                      </div>
                    )}

                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/95 text-slate-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                        {t('landing.blogPreview.latest')}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="p-6 sm:p-7">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug mb-3 group-hover:text-blue-700 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6 line-clamp-3">
                      {post.excerpt}
                    </p>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-sky-500 text-white font-bold flex items-center justify-center text-xs">
                          MM
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{t('landing.blogPreview.byAuthor')}</span>
                      </div>

                      <a
                        href={postUrl}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-800 transition-colors"
                      >
                        <span>{t('landing.blogPreview.readArticle')}</span>
                        <span className="transform transition-transform group-hover:translate-x-1">→</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback en caso de que la API esté vacía o en desarrollo */
              <div className="bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 rounded-3xl p-8 text-white text-left shadow-xl border border-blue-800/50">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-400/20 text-sky-300 border border-sky-400/30 mb-4">
                  {t('landing.blogPreview.fallbackBadge')}
                </span>
                <h3 className="text-2xl font-extrabold mb-3">
                  {t('landing.blogPreview.fallbackTitle')}
                </h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  {t('landing.blogPreview.fallbackText')}
                </p>
                <a
                  href={BLOG_URL}
                  className="inline-flex items-center gap-2 font-bold text-sky-400 hover:text-sky-300 text-sm"
                >
                  <span>{t('landing.blogPreview.fallbackCta')}</span>
                  <span>→</span>
                </a>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center mt-3">
              {t('landing.blogPreview.footerHint')}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default BlogPreviewSection;
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/blog/Navbar';
import Footer from '@/components/blog/Footer';
import AuthorCard from '@/components/blog/AuthorCard';
import ShareButtons from '@/components/blog/ShareButtons';
import RelatedPosts from '@/components/blog/RelatedPosts';
import PostCta from '@/components/blog/PostCta';
import PageViewTracker from '@/components/blog/PageViewTracker';
import CommentsSection from '@/components/blog/CommentsSection';
import { apiClient, type BlogPost, type BlogAuthor, type BlogComment } from '@/lib/api';
import { langFromAcceptLanguage, langFromQuery, formatDate } from '@/lib/utils';
import {
  absoluteUrl,
  buildAlternates,
  buildPostJsonLd,
  localizedPath,
  ogLocale,
  serializeJsonLd,
} from '@/lib/seo';
import { readingMinutes } from '@/lib/readingTime';
import '@/lib/i18n';

interface Props {
  post: BlogPost;
  lang: string;
  author: BlogAuthor | null;
  related: BlogPost[];
  comments: BlogComment[];
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req, query }) => {
  // Idioma: primero ?lang=XX (URL localizada para SEO), si no Accept-Language
  const lang = langFromQuery(query.lang) ?? langFromAcceptLanguage(req.headers['accept-language']);
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  if (!slug) return { notFound: true };

  try {
    const [post, author, related, comments] = await Promise.all([
      apiClient.getPost(slug, lang),
      // El perfil del autor nunca debe tumbar la entrada: fallback a null
      apiClient.getAuthor(lang).catch(() => null),
      // Relacionadas: tampoco deben tumbar la entrada; usa solo caché de traducción
      apiClient.getRelated(slug, lang).catch(() => [] as BlogPost[]),
      // Comentarios aprobados (fallback a vacío: nunca tumbar la entrada)
      apiClient.getComments(slug).catch(() => [] as BlogComment[]),
    ]);
    return { props: { post, lang, author, related, comments } };
  } catch {
    // 404 de la API (no existe o es borrador) → página 404 de Next
    return { notFound: true };
  }
};

const BlogPostReadingSkeleton = () => (
  <article className="container mx-auto px-4 max-w-3xl animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-20 mb-6" />
    <div className="h-10 bg-gray-200 rounded w-3/4 mb-4" />
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="h-4 bg-gray-200 rounded w-48" />
    </div>
    <div className="h-6 bg-gray-200 rounded-full w-24 mb-8" />
    <div className="h-64 md:h-96 w-full mb-8 rounded-xl bg-gray-200" />
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-4 bg-gray-200 rounded w-4/6" />
      <div className="h-6 bg-gray-200 rounded w-1/3 my-6" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  </article>
);

const PostPage: React.FC<Props> = ({ post, lang, author, related, comments }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) setIsNavigating(true);
    };
    const handleComplete = () => setIsNavigating(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  const date = post.publishedAt ?? post.createdAt;
  const description = post.excerpt || post.title;
  const postPath = `/post/${post.slug}`;
  const SITE_URL = process.env.NEXT_PUBLIC_BLOG_URL || 'https://blog.nelhealthcoach.com';
  const cleanPath = router.asPath ? router.asPath.split('?')[0] : '';
  const canonical = `${SITE_URL}${cleanPath || localizedPath(postPath, lang)}`;
  const coverUrl = post.coverImage?.url ?? null;
  const alternates = buildAlternates(postPath);
  const minutes = readingMinutes(post.content);

  // Datos estructurados (rich results de Google)
  const jsonLd = buildPostJsonLd({
    title: post.title,
    excerpt: post.excerpt,
    slug: post.slug,
    lang,
    authorName: author?.name || 'Manuel Martínez',
    authorRole: author?.role || undefined,
    category: post.category || undefined,
    coverImageUrl: coverUrl,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  });

  return (
    <>
      <Head>
        <title>{`${post.title} | Blog NELHEALTHCOACH`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        {/* hreflang: una URL por idioma + x-default */}
        {alternates.map((alternate) => (
          <link
            key={alternate.hreflang}
            rel="alternate"
            hrefLang={alternate.hreflang}
            href={alternate.href}
          />
        ))}

        {/* Open Graph (Facebook, WhatsApp, LinkedIn…) */}
        <meta property="og:site_name" content="NELHEALTHCOACH" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content={ogLocale(lang)} />
        {coverUrl && <meta property="og:image" content={coverUrl} />}

        {/* Twitter/X */}
        <meta name="twitter:card" content={coverUrl ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={description} />
        {coverUrl && <meta property="og:image" content={coverUrl} />}

        {/* Artículo */}
        {post.publishedAt && <meta property="article:published_time" content={post.publishedAt} />}
        <meta property="article:modified_time" content={new Date(post.updatedAt).toISOString()} />
        {post.category && <meta property="article:section" content={post.category} />}

        {/* JSON-LD (seguro: serializeJsonLd escapa los <) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Navbar />

        {/* Analytics sin cookies: cuenta la visita solo en producción */}
        <PageViewTracker slug={post.slug} />

        <main className="pt-24 sm:pt-28 pb-16 flex-1">
          {router.isFallback || isNavigating ? (
            <BlogPostReadingSkeleton />
          ) : (
            <article className="container mx-auto px-4 max-w-3xl">
              <Link
                href={localizedPath('/', lang)}
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm mb-6 inline-block"
              >
                ← {t('common.back')}
              </Link>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-800 mb-4">{post.title}</h1>

              <div className="text-gray-500 text-sm mb-4">
                <span>{t('common.publishedOn')} </span>
                <time>{formatDate(date, lang)}</time>
                <span> · {t('post.readingTime', { count: minutes })}</span>
                {post.author && (
                  <span> · {t('common.by')} {post.author}</span>
                )}
              </div>

              {/* Ficha de categoría DEBAJO de la línea de autor/fecha */}
              {post.category && (
                <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-8">
                  {post.category}
                </span>
              )}

              {post.coverImage?.url && (
                <div className="relative h-64 md:h-96 w-full mb-8 rounded-xl overflow-hidden">
                  <Image
                    src={post.coverImage.url}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                    priority
                  />
                </div>
              )}

              <div className="blog-content">
                {/* react-markdown: seguro por defecto (no renderiza HTML crudo) */}
                <Markdown remarkPlugins={[remarkGfm]}>{post.content}</Markdown>
              </div>

              {/* Ficha del autor, siempre al final de cada entrada */}
              <AuthorCard author={author} />

              {/* Comentarios (con moderación) */}
              <CommentsSection postSlug={post.slug} initialComments={comments} lang={lang} />

              {/* Compartir la entrada: WhatsApp, Facebook, X, LinkedIn y copiar enlace */}
              <ShareButtons path={localizedPath(postPath, lang)} title={post.title} />

              {/* Entradas relacionadas (misma categoría / etiquetas) */}
              <RelatedPosts posts={related} lang={lang} />

              {/* CTA de contacto al final */}
              <PostCta />
            </article>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PostPage;

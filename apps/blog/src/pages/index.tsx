import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/blog/Navbar';
import Footer from '@/components/blog/Footer';
import PostCard from '@/components/blog/PostCard';
import { apiClient, type BlogPost, type BlogCategory } from '@/lib/api';
import { langFromAcceptLanguage, langFromQuery } from '@/lib/utils';
import {
  absoluteUrl,
  buildAlternates,
  buildBlogJsonLd,
  localizedPath,
  ogLocale,
  serializeJsonLd,
} from '@/lib/seo';
import '@/lib/i18n';

interface Props {
  posts: BlogPost[];
  categories: BlogCategory[];
  lang: string;
  activeCategory: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, query }) => {
  // Idioma: primero ?lang=XX (URL localizada para SEO), si no Accept-Language
  const lang = langFromQuery(query.lang) ?? langFromAcceptLanguage(req.headers['accept-language']);
  const category = typeof query.categoria === 'string' && query.categoria !== '' ? query.categoria : null;

  const [posts, categories] = await Promise.all([
    apiClient.getPosts(lang, category ?? undefined).catch(() => [] as BlogPost[]),
    apiClient.getCategories().catch(() => [] as BlogCategory[]),
  ]);

  return { props: { posts, categories, lang, activeCategory: category } };
};

const HomePage: React.FC<Props> = ({ posts, categories, lang, activeCategory }) => {
  const { t } = useTranslation();
  const canonical = absoluteUrl(localizedPath('/', lang));
  const description = t('hero.subtitle');
  const alternates = buildAlternates('/');

  const jsonLd = buildBlogJsonLd({
    lang,
    // Nombre constante en los 6 idiomas → sin desajuste de hidratación
    authorName: 'Manuel Martínez',
  });

  return (
    <>
      <Head>
        <title>{`${t('common.allPosts')} | Blog NELHEALTHCOACH`}</title>
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

        {/* RSS */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Blog NELHEALTHCOACH"
          href="/rss.xml"
        />

        <meta property="og:site_name" content="NELHEALTHCOACH" />
        <meta property="og:title" content={`${t('hero.title')} | NELHEALTHCOACH`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content={ogLocale(lang)} />
        <meta property="og:image" content={absoluteUrl('/images/logo.png')} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${t('hero.title')} | NELHEALTHCOACH`} />
        <meta name="twitter:description" content={description} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Navbar />

        {/* Hero con logo blanco (navbar lo detecta por id) */}
        <section id="blog-hero" className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white pt-28 sm:pt-32 md:pt-40 pb-16 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{t('hero.title')}</h1>
            <p className="text-blue-100 text-lg md:text-xl">{t('hero.subtitle')}</p>
          </div>
        </section>

        <main className="container mx-auto px-4 py-10 flex-1">
          {/* Filtro de categorías */}
          {categories.length > 0 && (
            <div id="categorias" className="flex flex-wrap justify-center gap-2 mb-8 scroll-mt-24">
              <Link
                href={localizedPath('/', lang)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {t('categories.all')}
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={localizedPath(`/?categoria=${encodeURIComponent(cat.name)}`, lang)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    activeCategory === cat.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {cat.name} ({cat.count})
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">{t('common.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <PostCard key={post.id} post={post} lang={lang} priority={index === 0} />
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;

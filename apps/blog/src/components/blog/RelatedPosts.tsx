import React from 'react';
import { useTranslation } from 'react-i18next';
import PostCard from './PostCard';
import type { BlogPost } from '@/lib/api';
import '@/lib/i18n';

interface Props {
  posts: BlogPost[];
  lang: string;
}

/**
 * Entradas relacionadas al final de cada post (misma categoría / etiquetas).
 * El backend devuelve solo traducciones cacheadas, sin disparar el LLM.
 */
const RelatedPosts: React.FC<Props> = ({ posts, lang }) => {
  const { t } = useTranslation();

  if (posts.length === 0) return null;

  return (
    <section className="mt-12" aria-label={t('related.title')}>
      <h2 className="text-2xl font-bold text-blue-800 mb-6">{t('related.title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} lang={lang} />
        ))}
      </div>
    </section>
  );
};

export default RelatedPosts;

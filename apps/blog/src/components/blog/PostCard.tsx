import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { localizedPath } from '@/lib/seo';
import type { BlogPost } from '@/lib/api';
import '@/lib/i18n';

interface Props {
  post: BlogPost;
  lang: string;
  /** true para la primera tarjeta visible (mejora el LCP con eager loading) */
  priority?: boolean;
}

/** Tarjeta de entrada para la lista del blog (preserva el idioma en el enlace). */
const PostCard: React.FC<Props> = ({ post, lang, priority = false }) => {
  const { t } = useTranslation();
  const date = post.isPublished && post.publishedAt ? post.publishedAt : post.createdAt;
  const href = localizedPath(`/post/${encodeURIComponent(post.slug)}`, lang);

  return (
    <article className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      <Link href={href} className="block">
        {post.coverImage?.url ? (
          <div className="relative h-48 w-full">
            <Image
              src={post.coverImage.url}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={priority}
            />
          </div>
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center">
            <span className="text-white text-5xl font-bold opacity-80">N</span>
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1">
        {post.category && (
          <span className="inline-block self-start text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-3">
            {post.category}
          </span>
        )}
        <Link href={href}>
          <h2 className="text-xl font-bold text-blue-700 mb-2 hover:text-blue-500 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>
        <p className="text-gray-600 mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center justify-between">
          <time className="text-sm text-gray-500">{formatDate(date, lang)}</time>
          <Link
            href={href}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            {t('common.readMore')} →
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PostCard;

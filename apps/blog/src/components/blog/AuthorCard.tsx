import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import type { BlogAuthor } from '@/lib/api';
import '@/lib/i18n';

// Foto por defecto mientras el coach no configure la suya en su panel
const DEFAULT_PHOTO = '/images/manuel-martinez.jpg';

interface Props {
  author: BlogAuthor | null;
}

/**
 * Ficha del autor al final de cada entrada.
 * Los datos los configura el coach en su panel (/admin/author);
 * si aún no lo hizo, se usan los valores por defecto (i18n + foto local).
 */
const AuthorCard: React.FC<Props> = ({ author }) => {
  const { t } = useTranslation();

  const name = author?.name || t('author.name');
  const role = author?.role || t('author.role');
  const bio = author?.bio || '';
  const photoUrl = author?.photo?.url || DEFAULT_PHOTO;
  const specialties = author?.specialties ?? [];
  const years = author?.yearsOfExperience ?? 0;

  return (
    <aside className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex flex-col sm:flex-row items-start gap-5 bg-blue-50 rounded-2xl p-5 sm:p-6">
        <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden ring-4 ring-white shadow">
          <Image
            src={photoUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="80px"
            loading="lazy"
          />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-lg">{name}</p>
          <p className="text-blue-700 font-medium">{role}</p>
          {years > 0 && (
            <p className="text-gray-500 text-sm mt-1">
              {t('author.experience', { count: years })}
            </p>
          )}
          {bio && <p className="text-gray-600 mt-2">{bio}</p>}
          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="inline-block text-xs font-semibold text-blue-700 bg-white border border-blue-100 rounded-full px-3 py-1"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AuthorCard;

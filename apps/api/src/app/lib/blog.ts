// apps/api/src/app/lib/blog.ts
// Utilidades del blog: slugify, slugs únicos, DTO y ENCRIPTACIÓN.
//
// Las entradas se guardan ENCRIPTADAS con el mismo método que las recetas
// (encrypt/encryptFileObject de lib/encryption): título, extracto, contenido,
// categoría, tags, autor e imagen destacada. Quedan en texto plano los campos
// necesarios para búsquedas y caché: slug, sourceLang, isPublished,
// publishedAt, translatedAt/sourceUpdatedAt de las traducciones y timestamps.
import { ObjectId, type Collection, type Document } from 'mongodb';
import {
  encrypt,
  safeDecrypt,
  encryptFileObject,
  decryptFileObject,
} from './encryption';
import type { BlogTranslationEntry, AuthorTranslationEntry } from './blog-translation';

/** Autor de todas las entradas: el coach (único usuario admin). */
export const BLOG_AUTHOR = 'Manuel Martínez';

/** Normaliza un texto a slug: minúsculas, sin acentos, guiones. */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'entrada';
}

/** Garantiza un slug único en la colección (añade -2, -3… si colisiona). */
export async function ensureUniqueSlug(
  collection: Collection<Document>,
  base: string,
): Promise<string> {
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await collection.findOne({ slug })) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

/** Campos de texto de una entrada (en plano). */
export interface BlogPlainFields {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  coverImage: Record<string, unknown> | null;
}

/** Cifra los campos de texto de una entrada (mismo método que recetas). */
export function encryptBlogContent(fields: BlogPlainFields): Record<string, unknown> {
  return {
    title: encrypt(fields.title),
    excerpt: encrypt(fields.excerpt || ''),
    content: encrypt(fields.content),
    category: encrypt(fields.category || ''),
    tags: (fields.tags ?? []).map((tag: string) => encrypt(tag)),
    author: encrypt(fields.author || BLOG_AUTHOR),
    coverImage: fields.coverImage ? encryptFileObject(fields.coverImage) : null,
  };
}

/** Descifra los campos de texto de una entrada guardada. */
export function decryptBlogContent(doc: Record<string, unknown>): BlogPlainFields {
  return {
    title: safeDecrypt((doc.title as string) ?? ''),
    excerpt: safeDecrypt((doc.excerpt as string) ?? ''),
    content: safeDecrypt((doc.content as string) ?? ''),
    category: safeDecrypt((doc.category as string) ?? ''),
    tags: Array.isArray(doc.tags)
      ? (doc.tags as string[]).map((tag: string) => safeDecrypt(tag))
      : [],
    author: safeDecrypt((doc.author as string) ?? ''),
    coverImage: doc.coverImage
      ? (decryptFileObject(doc.coverImage) as Record<string, unknown>)
      : null,
  };
}

/**
 * Descifra las traducciones cacheadas de un documento (los textos de cada
 * entrada se guardan cifrados; translatedAt/sourceUpdatedAt van en plano).
 */
export function decryptTranslations(
  raw: Record<string, unknown> | undefined | null,
): Record<string, BlogTranslationEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, BlogTranslationEntry> = {};
  for (const [lang, entry] of Object.entries(raw)) {
    const e = entry as Record<string, unknown>;
    if (!e || typeof e !== 'object') continue;
    out[lang] = {
      title: safeDecrypt((e.title as string) ?? ''),
      excerpt: safeDecrypt((e.excerpt as string) ?? ''),
      content: safeDecrypt((e.content as string) ?? ''),
      translatedAt: (e.translatedAt as string) ?? '',
      sourceUpdatedAt: (e.sourceUpdatedAt as string) ?? '',
    };
  }
  return out;
}

/** Cifra las traducciones antes de persistirlas en el documento. */
export function encryptTranslations(
  translations: Record<string, BlogTranslationEntry>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [lang, entry] of Object.entries(translations)) {
    out[lang] = {
      title: encrypt(entry.title),
      excerpt: encrypt(entry.excerpt ?? ''),
      content: encrypt(entry.content),
      translatedAt: entry.translatedAt,
      sourceUpdatedAt: entry.sourceUpdatedAt,
    };
  }
  return out;
}

/** Documento MongoDB de una entrada → DTO plano (descifrado) para la API. */
export function toBlogPostDTO(doc: Document): Record<string, unknown> {
  const _id = doc._id as ObjectId;
  const plain = decryptBlogContent(doc as unknown as Record<string, unknown>);
  return {
    id: _id.toString(),
    slug: doc.slug,
    title: plain.title,
    excerpt: plain.excerpt,
    content: plain.content,
    category: plain.category,
    tags: plain.tags,
    coverImage: plain.coverImage,
    author: plain.author || BLOG_AUTHOR,
    sourceLang: doc.sourceLang ?? 'es',
    isPublished: doc.isPublished ?? false,
    publishedAt: doc.publishedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ── Perfil del autor (singleton editable por el admin) ──────────────────────

export interface AuthorPlainFields {
  name: string;
  role: string;
  bio: string;
  /** Especialidades mostradas como chips en la ficha del autor. */
  specialties: string[];
  /** Años de experiencia (número no sensible, se guarda en claro). */
  yearsOfExperience: number;
  photo: Record<string, unknown> | null;
}

/** Cifra los campos del perfil del autor (mismo método que recetas). */
export function encryptAuthorProfile(fields: AuthorPlainFields): Record<string, unknown> {
  return {
    name: encrypt(fields.name),
    role: encrypt(fields.role || ''),
    bio: encrypt(fields.bio || ''),
    // Cada especialidad se cifra por separado (mismo patrón que los tags)
    specialties: (fields.specialties ?? []).map((specialty) => encrypt(specialty)),
    // Número no sensible: en claro para poder mostrarlo sin descifrar
    yearsOfExperience: fields.yearsOfExperience ?? 0,
    photo: fields.photo ? encryptFileObject(fields.photo) : null,
  };
}

/** Descifra los campos del perfil del autor. */
export function decryptAuthorProfile(doc: Record<string, unknown>): AuthorPlainFields {
  return {
    name: safeDecrypt((doc.name as string) ?? ''),
    role: safeDecrypt((doc.role as string) ?? ''),
    bio: safeDecrypt((doc.bio as string) ?? ''),
    specialties: Array.isArray(doc.specialties)
      ? (doc.specialties as string[]).map((s) => safeDecrypt(s)).filter((s) => s !== '')
      : [],
    yearsOfExperience: typeof doc.yearsOfExperience === 'number' ? doc.yearsOfExperience : 0,
    photo: doc.photo
      ? (decryptFileObject(doc.photo) as Record<string, unknown>)
      : null,
  };
}

/** Cifra las traducciones del perfil del autor antes de persistirlas. */
export function encryptAuthorTranslations(
  translations: Record<string, AuthorTranslationEntry>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [lang, entry] of Object.entries(translations)) {
    out[lang] = {
      role: encrypt(entry.role),
      bio: encrypt(entry.bio ?? ''),
      specialties: (entry.specialties ?? []).map((specialty) => encrypt(specialty)),
      translatedAt: entry.translatedAt,
      sourceUpdatedAt: entry.sourceUpdatedAt,
    };
  }
  return out;
}

/** Descifra las traducciones del perfil del autor. */
export function decryptAuthorTranslations(
  raw: Record<string, unknown> | undefined | null,
): Record<string, AuthorTranslationEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, AuthorTranslationEntry> = {};
  for (const [lang, entry] of Object.entries(raw)) {
    const e = entry as Record<string, unknown>;
    if (!e || typeof e !== 'object') continue;
    out[lang] = {
      role: safeDecrypt((e.role as string) ?? ''),
      bio: safeDecrypt((e.bio as string) ?? ''),
      specialties: Array.isArray(e.specialties)
        ? (e.specialties as string[]).map((s) => safeDecrypt(s)).filter((s) => s !== '')
        : [],
      translatedAt: (e.translatedAt as string) ?? '',
      sourceUpdatedAt: (e.sourceUpdatedAt as string) ?? '',
    };
  }
  return out;
}

/** Overrides localizados del perfil (rol/bio/especialidades en el idioma pedido). */
export interface AuthorDTOOverrides {
  role?: string;
  bio?: string;
  specialties?: string[];
  lang?: string;
}

/** Documento de perfil del autor → DTO plano (descifrado) para la API. */
export function toAuthorDTO(doc: Document | null, overrides: AuthorDTOOverrides = {}): Record<string, unknown> {
  const { role = '', bio = '', lang = 'es' } = overrides;
  if (!doc) {
    return { name: BLOG_AUTHOR, role, bio, specialties: overrides.specialties ?? [], yearsOfExperience: 0, photo: null, lang };
  }
  const plain = decryptAuthorProfile(doc as unknown as Record<string, unknown>);
  return {
    name: plain.name || BLOG_AUTHOR,
    role: role || plain.role,
    bio: bio || plain.bio,
    specialties: overrides.specialties ?? plain.specialties,
    yearsOfExperience: plain.yearsOfExperience,
    photo: plain.photo,
    lang,
  };
}

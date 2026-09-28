// apps/api/src/app/lib/schemas/blog.ts
// Zod schemas para validación de entradas del blog.

import { z } from 'zod';

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const coverImageSchema = z.object({
  url: z.string().max(2000),
  key: z.string().max(500),
  name: z.string().max(500),
  type: z.string().max(100),
  size: z.number().int().min(0),
  uploadedAt: z.string().max(100),
});

/** Schema de la foto (imagen subida a S3), compartido por entradas y autor. */
export const imageFileSchema = coverImageSchema;

const baseFields = {
  title: z.string().min(1, 'El título es requerido').max(200),
  excerpt: z.string().max(5000),
  content: z.string().min(1, 'El contenido es requerido').max(200000),
  category: z.string().max(100),
  tags: z.array(z.string().max(100)).max(50),
  coverImage: coverImageSchema.nullable(),
  isPublished: z.boolean(),
};

/** Schema de CREACIÓN de entrada (con defaults). */
export const blogPostSchema = z.object({
  title: baseFields.title,
  excerpt: baseFields.excerpt.default(''),
  content: baseFields.content,
  category: baseFields.category.default(''),
  tags: baseFields.tags.default([]),
  coverImage: baseFields.coverImage.optional().default(null),
  isPublished: baseFields.isPublished.default(false),
  slug: z.string().regex(SLUG_REGEX, 'El slug solo admite minúsculas, números y guiones').max(200).optional(),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

/**
 * Schema de ACTUALIZACIÓN: todos los campos opcionales.
 * El slug NO es editable (se genera en la creación).
 */
export const blogPostUpdateSchema = z
  .object({
    title: baseFields.title.optional(),
    excerpt: baseFields.excerpt.optional(),
    content: baseFields.content.optional(),
    category: baseFields.category.optional(),
    tags: baseFields.tags.optional(),
    coverImage: baseFields.coverImage.optional(),
    isPublished: baseFields.isPublished.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'No hay campos para actualizar');

export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;

/** Schema del PERFIL DEL AUTOR (singleton editable por el admin). */
export const authorProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  role: z.string().max(500).optional().default(''),
  bio: z.string().max(2000).optional().default(''),
  specialties: z.array(z.string().min(1).max(80)).max(20).optional().default([]),
  yearsOfExperience: z.number().int().min(0).max(100).optional().default(0),
  photo: imageFileSchema.nullable().optional().default(null),
});

export type AuthorProfileInput = z.infer<typeof authorProfileSchema>;

/** Schema del contador de visitas (analytics sin cookies). */
export const blogViewSchema = z.object({
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .max(200)
    .regex(SLUG_REGEX, 'Slug inválido'),
});

export type BlogViewInput = z.infer<typeof blogViewSchema>;

/**
 * Schema de un comentario público. `website` es un HONEYPOT anti-spam:
 * los bots lo rellenan; el backend descarta silenciosamente si no está vacío.
 */
export const blogCommentSchema = z.object({
  postSlug: z.string().min(1, 'La entrada es requerida').max(200).regex(SLUG_REGEX, 'Slug inválido'),
  authorName: z.string().min(1, 'El nombre es requerido').max(80),
  authorEmail: z.union([z.string().email('Email inválido').max(200), z.literal('')]).default(''),
  content: z.string().min(1, 'El comentario no puede estar vacío').max(1000),
  website: z.string().max(200).default(''), // honeypot: debe llegar vacío
});

export type BlogCommentInput = z.infer<typeof blogCommentSchema>;

/** Schema de moderación (solo admin): aprobar o rechazar. */
export const blogCommentModerationSchema = z.object({
  status: z.enum(['approved', 'rejected'], 'Estado de moderación inválido'),
});

export type BlogCommentModerationInput = z.infer<typeof blogCommentModerationSchema>;

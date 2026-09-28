// apps/api/src/app/lib/blog-comments.ts
// Comentarios del blog: cifrado de campos sensibles y DTO.
//
// CIFRADOS (mismo método que las recetas): authorName, authorEmail y content
// (el nombre/email son datos personales del lector y el contenido es del
// usuario). EN TEXTO PLANO: postSlug (búsquedas), status (moderación),
// timestamps.

import type { Document, ObjectId } from 'mongodb';
import { encrypt, safeDecrypt } from './encryption';

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface CommentPlainFields {
  authorName: string;
  authorEmail: string;
  content: string;
}

/** Cifra los campos del comentario antes de persistirlo. */
export function encryptComment(fields: CommentPlainFields): Record<string, unknown> {
  return {
    authorName: encrypt(fields.authorName),
    authorEmail: encrypt(fields.authorEmail || ''),
    content: encrypt(fields.content),
  };
}

/** Descifra los campos de un comentario guardado. */
export function decryptComment(doc: Record<string, unknown>): CommentPlainFields {
  return {
    authorName: safeDecrypt((doc.authorName as string) ?? ''),
    authorEmail: safeDecrypt((doc.authorEmail as string) ?? ''),
    content: safeDecrypt((doc.content as string) ?? ''),
  };
}

/** Documento de comentario → DTO plano (descifrado) para la API. */
export function toCommentDTO(doc: Document): Record<string, unknown> {
  const plain = decryptComment(doc as unknown as Record<string, unknown>);
  return {
    id: (doc._id as ObjectId).toString(),
    postSlug: doc.postSlug as string,
    authorName: plain.authorName,
    content: plain.content,
    status: doc.status as CommentStatus,
    createdAt: doc.createdAt,
  };
}

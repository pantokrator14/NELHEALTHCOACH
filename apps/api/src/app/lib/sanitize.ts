// apps/api/src/app/lib/sanitize.ts
// Funciones para sanitizar datos sensibles antes de loguearlos.
// Evita que emails, tokens y datos personales aparezcan en texto plano en consola.

/**
 * Ofusca un email: "user@example.com" → "u***@example.com"
 * Si no parece email, lo devuelve igual.
 */
export function sanitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.charAt(0);
  return `${visible}***@${domain}`;
}

/**
 * Ofusca un token o string sensible:
 * Muestra primeros 3 y últimos 4 caracteres, el resto como asteriscos.
 * "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ" → "eyJ***fQ"
 */
export function sanitizeToken(token: string): string {
  if (!token || token.length < 12) return token;
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

/**
 * Ofusca un ID: "65f1a2b3c4d5e6f7a8b9c0d1" → "65f1***c0d1"
 */
export function sanitizeId(id: string): string {
  if (!id || id.length < 10) return id;
  return `${id.slice(0, 4)}***${id.slice(-4)}`;
}

/**
 * Sanitiza un mensaje completo: reemplaza emails, tokens e IDs largos
 * con versiones ofuscadas.
 *
 * @param message Mensaje a sanitizar
 * @returns Mensaje sanitizado
 */
export function sanitizeMessage(message: string): string {
  if (!message) return message;

  // Ofuscar emails (pattern: algo@algo.algo)
  let sanitized = message.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (email) => sanitizeEmail(email),
  );

  // Ofuscar JWT tokens (pattern: eyJ... largo)
  sanitized = sanitized.replace(
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    (token) => sanitizeToken(token),
  );

  return sanitized;
}

/**
 * Prepara metadata para logs: sanitiza campos que puedan contener PII.
 */
export function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...meta };

  // Sanitizar emails conocidos
  if (typeof sanitized.actorEmail === 'string') {
    sanitized.actorEmail = sanitizeEmail(sanitized.actorEmail);
  }
  if (typeof sanitized.email === 'string') {
    sanitized.email = sanitizeEmail(sanitized.email);
  }
  // Sanitizar emails dentro de metadata
  const metaData = sanitized.metadata;
  if (metaData && typeof metaData === 'object' && !Array.isArray(metaData)) {
    const metaRecord = metaData as Record<string, unknown>;
    if (typeof metaRecord.email === 'string') {
      metaRecord.email = sanitizeEmail(metaRecord.email);
    }
  }

  // Sanitizar tokens
  if (typeof sanitized.token === 'string' && sanitized.token.length > 20) {
    sanitized.token = sanitizeToken(sanitized.token as string);
  }

  return sanitized;
}

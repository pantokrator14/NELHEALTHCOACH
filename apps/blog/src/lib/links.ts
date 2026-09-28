// apps/blog/src/lib/links.ts
// Enlaces del blog hacia la landing (app externa del monorepo).
// En producción la landing es nelhealthcoach.com; se puede sobreescribir
// con NEXT_PUBLIC_LANDING_URL (p. ej. http://localhost:3000 en desarrollo).

/** Base de la landing, sin slash final. */
export const LANDING_URL = (
  process.env.NEXT_PUBLIC_LANDING_URL || 'https://nelhealthcoach.com'
).replace(/\/+$/, '');

/**
 * URL de la sesión gratuita: sección de contacto de la landing con el
 * formulario abierto automáticamente (?sesion=1) y scroll al ancla.
 */
export function landingContactUrl(base: string = LANDING_URL): string {
  return `${base.replace(/\/+$/, '')}/?sesion=1#contacto`;
}

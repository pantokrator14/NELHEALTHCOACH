/**
 * Gestión de la sesión del admin en el blog (mismo patrón que dashboard).
 *
 * El token se persiste en DOS sitios:
 *  1. localStorage  -> lo usa `getAuthHeaders()` en `lib/api.ts` para el
 *                      header `Authorization: Bearer`.
 *  2. Cookie `token` -> disponible para futuras comprobaciones server-side.
 *
 * Duración = 24h (igual que `expiresIn: '24h'` del JWT en la API).
 */

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 horas, coherente con el JWT

/** Escribe el token en localStorage + cookie. */
export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('token', token);

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; ` +
    `Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Elimina el token de localStorage y de la cookie (logout o sesión vencida). */
export function clearAuthToken() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Token actual del cliente (para decidir si hay sesión iniciada). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

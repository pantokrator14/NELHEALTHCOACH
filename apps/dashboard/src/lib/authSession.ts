/**
 * Gestión de la sesión del coach en el dashboard.
 *
 * El token debe persistirse en DOS sitios:
 *  1. localStorage  -> lo usa `getAuthHeaders()` en `lib/api.ts` para el
 *                      header `Authorization: Bearer` de las llamadas a la API.
 *  2. Cookie `token` -> la lee el middleware de Next.js (`middleware.ts`),
 *                      que decide si deja entrar a `/dashboard` o redirige a
 *                      `/login`. El middleware corre en el servidor (edge) y
 *                      NO tiene acceso a localStorage, así que sin la cookie
 *                      el login "funciona" pero el dashboard rebota al login.
 *
 * Duración de la cookie = 24h (igual que `expiresIn: '24h'` del JWT en la API).
 */

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 horas, coherente con el JWT

/** Escribe el token en localStorage + cookie legible por el middleware de Next. */
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
// apps/dashboard/src/lib/client-hooks.ts
// Hooks para leer valores SÓLO disponibles en el cliente (localStorage) sin
// setState síncrono en efectos (regla react-hooks/set-state-in-effect) y sin
// desajustes de hidratación: useSyncExternalStore usa el snapshot del servidor
// en SSR y re-lectura en el cliente.

import { useSyncExternalStore } from 'react';
import { AUTH_CHANGE_EVENT } from './authSession';

const subscribeAuth = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
};

interface DecodedTokenPayload {
  role?: string;
  clientId?: string | null;
  clientAccountId?: string | null;
  coachId?: string | null;
  email?: string;
}

function readTokenPayload(): DecodedTokenPayload | null {
  try {
    const token = window.localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])) as DecodedTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Rol del JWT guardado en localStorage:
 * 'admin' | 'other' | null (null = SSR o sin token válido).
 * Derivado: no requiere estado ni efecto.
 */
export function useTokenRole(): 'admin' | 'other' | null {
  return useSyncExternalStore(
    subscribeAuth,
    () => {
      const payload = readTokenPayload();
      if (!payload) return null;
      return payload.role === 'admin' ? 'admin' : 'other';
    },
    () => null,
  );
}

/**
 * Rol completo del usuario autenticado:
 * 'admin' | 'coach' | 'client' | null.
 */
export function useUserRole(): 'admin' | 'coach' | 'client' | null {
  return useSyncExternalStore(
    subscribeAuth,
    () => {
      const payload = readTokenPayload();
      if (!payload?.role) return null;
      if (payload.role === 'admin') return 'admin';
      if (payload.role === 'client') return 'client';
      if (payload.role === 'coach') return 'coach';
      return null;
    },
    () => null,
  );
}

/** ID del HealthForm asociado al cliente autoregistrado (o null). */
export function useClientIdFromToken(): string | null {
  return useSyncExternalStore(
    subscribeAuth,
    () => {
      const payload = readTokenPayload();
      if (!payload || payload.role !== 'client') return null;
      return typeof payload.clientId === 'string' && payload.clientId ? payload.clientId : null;
    },
    () => null,
  );
}

/** Email del usuario autenticado extraído del JWT (o null). */
export function useTokenEmail(): string | null {
  return useSyncExternalStore(
    subscribeAuth,
    () => {
      const payload = readTokenPayload();
      return typeof payload?.email === 'string' ? payload.email : null;
    },
    () => null,
  );
}

/** true si el JWT actual corresponde a un coach con rol admin. */
export function useIsAdmin(): boolean {
  return useTokenRole() === 'admin';
}

/** Valor de una clave de localStorage (o null), leído sin efecto ni mismatch. */
export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeAuth,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

// apps/dashboard/src/lib/client-hooks.ts
// Hooks para leer valores SÓLO disponibles en el cliente (localStorage) sin
// setState síncrono en efectos (regla react-hooks/set-state-in-effect) y sin
// desajustes de hidratación: useSyncExternalStore usa el snapshot del servidor
// en SSR y re-lectura en el cliente.

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * Rol del JWT guardado en localStorage:
 * 'admin' | 'other' | null (null = SSR o sin token válido).
 * Derivado: no requiere estado ni efecto.
 */
export function useTokenRole(): 'admin' | 'other' | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        const token = window.localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
        return payload.role === 'admin' ? 'admin' : 'other';
      } catch {
        return null;
      }
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
    noopSubscribe,
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

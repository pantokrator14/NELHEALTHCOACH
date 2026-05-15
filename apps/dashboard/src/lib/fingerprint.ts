// apps/dashboard/src/lib/fingerprint.ts
// FingerprintJS — identificación de dispositivo/browser sin cookies
// Usa la versión opensource (@fingerprintjs/fingerprintjs, AGPL-3.0)
// Se envía como header X-Visitor-Id en cada request API

const STORAGE_KEY = 'nel_fp_visitor_id';

let cachedVisitorId: string | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Inicializa FingerprintJS y obtiene un visitorId único.
 * El resultado se cachea en memoria y en localStorage.
 * Debe llamarse una vez al cargar la app (en _app.tsx).
 */
export async function initFingerprint(): Promise<string> {
  if (cachedVisitorId) {
    return cachedVisitorId;
  }

  // Evitar inicializaciones paralelas
  if (initPromise) {
    await initPromise;
    return cachedVisitorId ?? '';
  }

  initPromise = (async () => {
    try {
      // Intentar recuperar de localStorage primero (rápido)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          cachedVisitorId = stored;
          return;
        }
      }

      // Cargar FingerprintJS y generar ID
      const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
      const fp = await FingerprintJS.load();
      const result = await fp.get();

      cachedVisitorId = result.visitorId;
    } catch (error) {
      console.warn('FingerprintJS: no se pudo inicializar, usando fallback', error);
      // Fallback: ID basado en timestamp + random (no persistente pero funcional)
      cachedVisitorId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Guardar en localStorage para futuras visitas
    if (typeof window !== 'undefined' && cachedVisitorId) {
      try {
        localStorage.setItem(STORAGE_KEY, cachedVisitorId);
      } catch {
        // localStorage puede no estar disponible
      }
    }
  })();

  await initPromise;
  return cachedVisitorId ?? '';
}

/**
 * Retorna el visitorId actual (debe haberse llamado initFingerprint antes).
 * Si no se ha inicializado, retorna undefined.
 */
export function getVisitorId(): string | undefined {
  // Intentar de localStorage si no está en memoria
  if (!cachedVisitorId && typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedVisitorId = stored;
    }
  }
  return cachedVisitorId ?? undefined;
}

/**
 * Reinicia el visitorId (útil para testing o logout).
 */
export function resetFingerprint(): void {
  cachedVisitorId = null;
  initPromise = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }
}

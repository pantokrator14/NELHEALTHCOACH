// apps/form/src/lib/fingerprint.ts
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

  if (initPromise) {
    await initPromise;
    return cachedVisitorId ?? '';
  }

  initPromise = (async () => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          cachedVisitorId = stored;
          return;
        }
      }

      const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
      const fp = await FingerprintJS.load();
      const result = await fp.get();

      cachedVisitorId = result.visitorId;
    } catch (error) {
      console.warn('FingerprintJS: no se pudo inicializar, usando fallback', error);
      cachedVisitorId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

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

export function getVisitorId(): string | undefined {
  if (!cachedVisitorId && typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedVisitorId = stored;
    }
  }
  return cachedVisitorId ?? undefined;
}

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

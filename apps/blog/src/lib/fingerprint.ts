// apps/blog/src/lib/fingerprint.ts
// FingerprintJS — versión opensource (@fingerprintjs/fingerprintjs, AGPL-3.0)
// Cumplimiento RGPD / ePrivacy: Bloqueo de fingerprinting sin consentimiento explícito.

const STORAGE_KEY = 'nel_fp_visitor_id';
const EPHEMERAL_KEY = 'nel_ephemeral_visitor_id';
const CONSENT_ANALYTICS_KEY = 'nhc_consent_analytics';

let cachedVisitorId: string | null = null;
let initPromise: Promise<void> | null = null;

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_ANALYTICS_KEY) === 'granted';
}

export async function initFingerprint(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;
  if (initPromise) {
    await initPromise;
    return cachedVisitorId ?? '';
  }

  initPromise = (async () => {
    if (typeof window === 'undefined') return;

    // RGPD / ePrivacy Check: Solo ejecutar fingerprinting de hardware si se otorgó consentimiento
    const consentGranted = localStorage.getItem(CONSENT_ANALYTICS_KEY) === 'granted';

    if (!consentGranted) {
      // Usar identificador efímero en sessionStorage no rastreable entre sesiones ni basado en hardware
      let ephemeral: string | null = null;
      try {
        ephemeral = sessionStorage.getItem(EPHEMERAL_KEY);
        if (!ephemeral) {
          ephemeral = `ephem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          sessionStorage.setItem(EPHEMERAL_KEY, ephemeral);
        }
      } catch {
        ephemeral = `ephem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      cachedVisitorId = ephemeral;
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        cachedVisitorId = stored;
        return;
      }
      const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cachedVisitorId = result.visitorId;
    } catch (error) {
      console.warn('FingerprintJS: fallback usado', error);
      cachedVisitorId = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    if (cachedVisitorId) {
      try {
        localStorage.setItem(STORAGE_KEY, cachedVisitorId);
      } catch {
        /* noop */
      }
    }
  })();

  await initPromise;
  return cachedVisitorId ?? '';
}

export function getVisitorId(): string | undefined {
  if (cachedVisitorId) return cachedVisitorId;
  if (typeof window !== 'undefined') {
    const consentGranted = localStorage.getItem(CONSENT_ANALYTICS_KEY) === 'granted';
    if (!consentGranted) {
      try {
        return sessionStorage.getItem(EPHEMERAL_KEY) || undefined;
      } catch {
        return undefined;
      }
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedVisitorId = stored;
      return stored;
    }
  }
  return undefined;
}

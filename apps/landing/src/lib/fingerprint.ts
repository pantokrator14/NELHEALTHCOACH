// apps/landing/src/lib/fingerprint.ts
// FingerprintJS — versión opensource (@fingerprintjs/fingerprintjs, AGPL-3.0)

const STORAGE_KEY = 'nel_fp_visitor_id';

let cachedVisitorId: string | null = null;
let initPromise: Promise<void> | null = null;

export async function initFingerprint(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;
  if (initPromise) {
    await initPromise;
    return cachedVisitorId ?? '';
  }

  initPromise = (async () => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) { cachedVisitorId = stored; return; }
      }
      const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cachedVisitorId = result.visitorId;
    } catch (error) {
      console.warn('FingerprintJS: fallback usado', error);
      cachedVisitorId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (typeof window !== 'undefined' && cachedVisitorId) {
      try { localStorage.setItem(STORAGE_KEY, cachedVisitorId); } catch { /* noop */ }
    }
  })();

  await initPromise;
  return cachedVisitorId ?? '';
}

export function getVisitorId(): string | undefined {
  if (!cachedVisitorId && typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) cachedVisitorId = stored;
  }
  return cachedVisitorId ?? undefined;
}

// apps/dashboard/src/pages/video/join.tsx
//
// Página pública para que el cliente se una a una videollamada.
// Accesible vía enlace de email con token temporal:
//   /video/join?token=eyJ...
//
// El token se valida contra la API y, si es válido, se genera
// un token de LiveKit para unirse a la sala correspondiente.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/locale';

// Carga dinámica porque LiveKit solo funciona en el cliente
const VideoCallRoom = dynamic(
  () => import('@/components/dashboard/VideoCallRoom'),
  { ssr: false }
);

// ─────────────────────────────────────────────
// Estados de la página
// ─────────────────────────────────────────────

type PageState =
  | { status: 'loading' }
  | { status: 'validating' }
  | { status: 'ready'; roomName: string; sessionToken: string }
  | { status: 'not_started'; scheduledAt?: string; unlocksAt?: string }
  | { status: 'error'; message: string }
  | { status: 'ended' };

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function ClientVideoJoinPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { token } = router.query as { token?: string };
  const [state, setState] = useState<PageState>({ status: 'loading' });

  // Enlace sin token → error derivado (sin setState síncrono en el effect)
  const missingToken = router.isReady && !token;
  const shownState: PageState = missingToken
    ? { status: 'error', message: t('videoJoin.missingToken') }
    : state;

  // ── Validar token y obtener información de la sala ──

  useEffect(() => {
    if (!router.isReady) return;

    if (!token) return;

    const sessionTokenValue = token; // TypeScript: capture after type narrowing

    async function validateAndJoin(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/api/video/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: '',
            role: 'client',
            sessionToken: sessionTokenValue,
          }),
        });

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            message?: string;
            code?: string;
            scheduledAt?: string;
            unlocksAt?: string;
          };
          const msg = errData.message || t('videoJoin.invalidToken');

          if (response.status === 403 && errData.code === 'SESSION_NOT_YET_STARTED') {
            setState({
              status: 'not_started',
              scheduledAt: errData.scheduledAt,
              unlocksAt: errData.unlocksAt,
            });
          } else if (response.status === 401 || response.status === 404) {
            setState({
              status: 'error',
              message: t('videoJoin.invalidOrEnded'),
            });
          } else {
            setState({ status: 'error', message: msg });
          }
          return;
        }

        const data = (await response.json()) as {
          success: boolean;
          data: { token: string; serverUrl: string };
          roomName?: string;
        };

        const roomName = data.roomName || 'sala-temporal';

        setState({
          status: 'ready',
          roomName,
          sessionToken: sessionTokenValue,
        });
      } catch (err: unknown) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('videoJoin.connectionError'),
        });
      }
    }

    void validateAndJoin();
  }, [router.isReady, t, token]);

  // ── Callback al salir de la videollamada ──

  function handleLeave(): void {
    setState({ status: 'ended' });
  }

  const dateLocale = getDateLocale(i18n.language);

  // ── Render por estado ──

  return (
    <>
      <Head>
        <title>{t('videoJoin.pageTitle')}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {shownState.status === 'loading' || shownState.status === 'validating' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">
              {shownState.status === 'loading' ? t('videoJoin.loading') : t('videoJoin.validating')}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {t('videoJoin.verifyingSession')}
            </p>
          </div>
        </div>
      ) : shownState.status === 'ready' ? (
        <VideoCallRoom
          roomName={shownState.roomName}
          role="client"
          sessionToken={shownState.sessionToken}
          onLeave={handleLeave}
        />
      ) : shownState.status === 'ended' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="text-green-500 text-6xl">✓</div>
            <h1 className="text-2xl font-bold text-gray-800">{t('videoJoin.endedTitle')}</h1>
            <p className="text-gray-600 text-sm">
              {t('videoJoin.endedDesc')}
            </p>
            <p className="text-xs text-gray-400">
              {t('videoJoin.endedContactHint')}
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
              >
                {t('videoJoin.backToSummary')}
              </Link>
            </div>
          </div>
        </div>
      ) : shownState.status === 'not_started' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center space-y-4 border border-amber-200">
            <div className="text-amber-500 text-5xl">🕒</div>
            <h1 className="text-2xl font-bold text-gray-800">{t('videoJoin.notStartedTitle')}</h1>
            <p className="text-gray-600 text-sm">{t('videoJoin.notStartedDesc')}</p>
            {shownState.scheduledAt && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">
                  {t('videoJoin.notStartedScheduled', {
                    date: new Date(shownState.scheduledAt).toLocaleString(dateLocale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })}
                </p>
                {shownState.unlocksAt && (
                  <p>
                    {t('videoJoin.notStartedUnlocks', {
                      date: new Date(shownState.unlocksAt).toLocaleString(dateLocale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }),
                    })}
                  </p>
                )}
              </div>
            )}
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                {t('videoJoin.backToSummary')}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="text-red-500 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800">{t('videoJoin.errorTitle')}</h1>
            <p className="text-gray-600 text-sm">{shownState.message}</p>
            <p className="text-xs text-gray-400">
              {t('videoJoin.errorContactHint')}
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                {t('videoJoin.backToSummary')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

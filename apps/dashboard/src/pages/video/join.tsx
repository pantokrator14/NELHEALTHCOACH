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
  const { token } = router.query as { token?: string };
  const [state, setState] = useState<PageState>({ status: 'loading' });

  // ── Validar token y obtener información de la sala ──

  useEffect(() => {
    if (!router.isReady) return;

    if (!token) {
      setState({ status: 'error', message: 'Enlace inválido: falta el token de acceso.' });
      return;
    }

    const sessionTokenValue = token; // TypeScript: capture after type narrowing

    async function validateAndJoin(): Promise<void> {
      try {
        setState({ status: 'validating' });

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
          const errData = await response.json().catch(() => ({}));
          const msg = (errData as { message?: string }).message || 'Token inválido o expirado';

          if (response.status === 401 || response.status === 404) {
            setState({
              status: 'error',
              message: 'El enlace no es válido o la sesión ya terminó.',
            });
          } else {
            setState({ status: 'error', message: msg });
          }
          return;
        }

        // Si la API respondió con roomName, lo usamos directamente.
        // Si no, necesitamos extraerlo del token decodificado.
        // Por simplicidad, pedimos a la API que devuelva también el roomName.
        const data = (await response.json()) as {
          success: boolean;
          data: { token: string; serverUrl: string };
          roomName?: string;
        };

        // Extraer roomName del token LiveKit (el metadata tiene session info)
        // Por ahora usamos un roomName derivado; la API lo devuelve si está disponible.
        const roomName = data.roomName || 'sala-temporal';

        setState({
          status: 'ready',
          roomName,
          sessionToken: sessionTokenValue,
        });
      } catch (err: unknown) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Error de conexión al servidor',
        });
      }
    }

    validateAndJoin();
  }, [router.isReady, token]);

  // ── Callback al salir de la videollamada ──

  function handleLeave(): void {
    setState({ status: 'ended' });
  }

  // ── Render por estado ──

  return (
    <>
      <Head>
        <title>Videollamada | NELHealthCoach</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {state.status === 'loading' || state.status === 'validating' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">
              {state.status === 'loading' ? 'Cargando...' : 'Validando acceso...'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Verificando tu sesión de videollamada
            </p>
          </div>
        </div>
      ) : state.status === 'ready' ? (
        <VideoCallRoom
          roomName={state.roomName}
          role="client"
          sessionToken={state.sessionToken}
          onLeave={handleLeave}
        />
      ) : state.status === 'ended' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Sesión finalizada</h1>
            <p className="text-gray-600 mb-6">
              La videollamada ha terminado. Tu coach recibirá la transcripción y
              actualizará tus recomendaciones.
            </p>
            <p className="text-sm text-gray-400">
              Si necesitas contactar a tu coach, puedes responder al email de la sesión.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">No se pudo acceder</h1>
            <p className="text-gray-600 mb-6">{state.message}</p>
            <p className="text-sm text-gray-400">
              Si crees que esto es un error, contacta a tu coach para obtener un nuevo enlace.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

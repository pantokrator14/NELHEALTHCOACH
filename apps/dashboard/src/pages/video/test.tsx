// apps/dashboard/src/pages/video/test.tsx
//
// Página de desarrollo para probar videollamadas.
// Mismo layout que VideoCallRoom pero con room name editable
// y sin necesidad de agendar sesiones.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// ── Componentes LiveKit (dinámicos, solo cliente) ──

const LiveKitRoom = dynamic(
  () => import('@livekit/components-react').then((m) => m.LiveKitRoom),
  { ssr: false }
);
const RoomAudioRenderer = dynamic(
  () => import('@livekit/components-react').then((m) => m.RoomAudioRenderer),
  { ssr: false }
);
const ControlBar = dynamic(
  () => import('@livekit/components-react').then((m) => m.ControlBar),
  { ssr: false }
);

// ── LiveKit hooks y valores (import estático) ──

import {
  useRemoteParticipants,
  useDataChannel,
  GridLayout,
  ParticipantTile,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

// ── Self-view PIP (import dinámico — usa hooks de LiveKit) ──

const SelfViewPip = dynamic(
  () => import('@/components/dashboard/SelfViewPip'),
  { ssr: false }
);

// Estilos de LiveKit
import '@livekit/components-styles';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function generateRoomName(): string {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `test_room_${suffix}`;
}

// ─────────────────────────────────────────────
// CSS para corregir espejo del self-view
// ─────────────────────────────────────────────

const SELF_VIEW_STYLES = `
  .self-view-pip video {
    transform: scaleX(1) !important;
  }
  .self-view-pip .lk-participant-media-video {
    transform: scaleX(1) !important;
  }
`;

// ── Grid de video en vivo (solo remotos, sin useTracks) ──

function LiveVideoGrid() {
  const remoteParticipants = useRemoteParticipants();

  // Construimos track refs solo de participantes remotos
  // para evitar cualquier suscripción al track local
  const tracks: TrackReferenceOrPlaceholder[] = remoteParticipants.map(
    (p) => ({
      participant: p,
      source: Track.Source.Camera,
    }),
  );

  return (
    <div className="absolute inset-0 top-14 bottom-20">
      <GridLayout tracks={tracks}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tipos de estado
// ─────────────────────────────────────────────

type PageState =
  | { status: 'form' }
  | { status: 'loading'; role: string }
  | {
      status: 'ready';
      role: string;
      liveKitToken: string;
      serverUrl: string;
    }
  | { status: 'ended'; role: string }
  | { status: 'error'; message: string };

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function TestVideoPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [state, setState] = useState<PageState>({ status: 'form' });
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ── Inicializar room name (post-hidratación) ──
  useEffect(() => {
    if (!router.isReady) return;
    const roomParam = router.query.room as string | undefined;
    if (roomParam && roomParam.trim()) {
      setRoomName(roomParam.trim());
    } else {
      setRoomName(generateRoomName());
    }
    setHydrated(true);
  }, [router.isReady, router.query.room]);

  // ── Copiar enlace de sala ──
  function copyRoomLink() {
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomName)}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    ).catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Unirse a la sala ──

  async function handleJoin(role: 'coach' | 'client') {
    try {
      const roleLabel = role === 'coach' ? 'Coach' : 'Cliente';
      setState({ status: 'loading', role: roleLabel });

      const displayName =
        role === 'coach' ? '🧑‍🏫 Coach (test)' : '👤 Cliente (test)';

      const response = await fetch(
        `${API_BASE_URL}/api/video/test-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, role, displayName }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message ||
            `Error HTTP ${response.status}`
        );
      }

      const data = (await response.json()) as {
        success: boolean;
        data: { token: string; serverUrl: string };
      };

      if (!data.success || !data.data.token) {
        throw new Error('No se pudo obtener el token de LiveKit');
      }

      setState({
        status: 'ready',
        role: roleLabel,
        liveKitToken: data.data.token,
        serverUrl: data.data.serverUrl,
      });
    } catch (err: unknown) {
      setState({
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Error al conectar',
      });
    }
  }

  // ── Salir / Data channel ──

  const endedRef = useRef(false);

  // El hook useDataChannel debe estar aquí (no condicional)
  // El cliente escucha "session_ended" del coach
  const { send: sendData } = useDataChannel('session', (msg) => {
    const text = new TextDecoder().decode(msg.payload);
    if (
      text === 'session_ended' &&
      state.status === 'ready' &&
      state.role === 'client' &&
      !endedRef.current
    ) {
      endedRef.current = true;
      setState({ status: 'ended', role: state.role });
    }
  });

  const handleDisconnect = useCallback(() => {
    if (endedRef.current) {
      if (state.status === 'ready') {
        setState({ status: 'ended', role: state.role });
      }
      return;
    }
    endedRef.current = true;

    if (state.status === 'ready') {
      if (state.role === 'coach') {
        // Avisar al cliente antes de cerrar la sala
        sendData(new TextEncoder().encode('session_ended'), {
          topic: 'session',
          reliable: true,
        }).catch(() => {
          // Si falla el envío, salimos igual
        });
        // Pequeña pausa para dar tiempo a que el mensaje llegue
        setTimeout(() => {
          setState({ status: 'ended', role: state.role });
        }, 300);
      } else {
        setState({ status: 'ended', role: state.role });
      }
    }
  }, [state, sendData]);

  function resetForm() {
    setRoomName(generateRoomName());
    setState({ status: 'form' });
    setConnected(false);
  }

  // ── Manejar error de LiveKit ──

  function handleLiveKitError(error: Error) {
    console.error('🔴 LiveKit error:', error);

    const isPermissionError =
      error.name === 'NotAllowedError' ||
      error.message?.includes('Permission denied');

    if (isPermissionError) {
      setState({
        status: 'error',
        message:
          'Permiso de cámara/micrófono denegado. Haz clic en el candado 🔒 en la barra de direcciones y permite "Cámara" y "Micrófono", luego recarga.',
      });
    } else {
      setState({
        status: 'error',
        message: `Error: ${error.message}`,
      });
    }
  }

  // ════════════════════════════════════════════
  //  RENDER: Formulario inicial
  // ════════════════════════════════════════════

  if (state.status === 'form') {
    return (
      <>
        <Head>
          <title>Test de Videollamada | NELHealthCoach</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800 p-8 max-w-lg w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-green-500/20">
                🎥
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Sala de prueba
              </h1>
              <p className="text-gray-400 text-sm">
                Abre esta página en{' '}
                <strong className="text-white">dos pestañas</strong>:
                una como Coach y otra como Cliente.
              </p>
            </div>

            {/* Room name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Nombre de sala
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => {
                    setRoomName(e.target.value);
                    setCopied(false);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-mono text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  placeholder="test_room_abc123"
                />
                <button
                  onClick={() => {
                    setRoomName(generateRoomName());
                    setCopied(false);
                  }}
                  className="px-4 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-all border border-gray-700 text-sm"
                  title="Generar otro nombre"
                >
                  ↻
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs font-mono text-gray-500 truncate select-all">
                  {hydrated
                    ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomName)}`
                    : 'Cargando...'}
                </div>
                <button
                  onClick={copyRoomLink}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar link'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Copia el link y ábrelo en la otra pestaña para usar la
                misma sala.
              </p>
            </div>

            {/* Botones */}
            <div className="space-y-3">
              <button
                onClick={() => handleJoin('coach')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                🧑‍🏫 Unirse como Coach
              </button>
              <button
                onClick={() => handleJoin('client')}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                👤 Unirse como Cliente de prueba
              </button>
            </div>

            {/* Info */}
            <details className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300 font-medium transition-colors">
                💡 ¿Cómo funciona?
              </summary>
              <div className="mt-3 space-y-2 leading-relaxed">
                <p>Layout adaptativo al número de participantes:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>
                    <strong className="text-gray-300">1 persona</strong> — video
                    a pantalla completa
                  </li>
                  <li>
                    <strong className="text-gray-300">2 personas</strong> — grid
                    lado a lado
                  </li>
                  <li>
                    <strong className="text-gray-300">3+</strong> — grid
                    responsivo
                  </li>
                </ul>
                <p>
                  Tu cámara se muestra SIN espejo en el PIP (te ves como
                  los demás te ven).
                </p>
              </div>
            </details>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════
  //  RENDER: Cargando
  // ════════════════════════════════════════════

  if (state.status === 'loading') {
    return (
      <>
        <Head>
          <title>Conectando... | NELHealthCoach</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-green-500 mx-auto mb-6" />
            <p className="text-xl font-medium">
              Conectando como {state.role}...
            </p>
            <p className="text-sm text-gray-500 mt-2 font-mono">
              Sala: {roomName}
            </p>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════
  //  RENDER: Videollamada activa
  // ════════════════════════════════════════════

  if (state.status === 'ready') {
    return (
      <>
        <Head>
          <title>Videollamada de prueba | NELHealthCoach</title>
          <meta name="robots" content="noindex, nofollow" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
        </Head>
        <div className="fixed inset-0 z-50 bg-gray-950">
          <style>{SELF_VIEW_STYLES}</style>

          <LiveKitRoom
            token={state.liveKitToken}
            serverUrl={state.serverUrl}
            connect={true}
            audio={true}
            video={{
              resolution: { width: 640, height: 480 },
              facingMode: 'user',
            }}
            onDisconnected={handleDisconnect}
            onError={handleLiveKitError}
            onConnected={() => setConnected(true)}
            style={{ height: '100vh' }}
            options={{ adaptiveStream: true, dynacast: true }}
          >
            {/* Header flotante */}
            <div className="absolute top-0 left-0 right-0 z-30 h-14 bg-gradient-to-b from-black/60 to-transparent px-6 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                  N
                </div>
                <span className="font-medium text-white/80 text-sm hidden sm:inline">
                  Sala: {roomName}
                </span>
              </div>
              <div className="flex items-center gap-3 pointer-events-auto">
                {connected ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    En vivo
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    Conectando...
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 text-white/60 font-medium uppercase tracking-wider">
                  {state.role}
                </span>
              </div>
            </div>

            {/* Audio */}
            <RoomAudioRenderer />

            {/* Grid de video en vivo — ocupa entre header y controles */}
            <LiveVideoGrid />

            {/* Self-view overlay */}
            <SelfViewPip />

            {/* ControlBar (sin chat, sin leave) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 h-20 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent flex items-center justify-center">
              <ControlBar
                variation="minimal"
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: true,
                  chat: false,
                  leave: false,
                }}
              />
            </div>

            {/* Botón salir personalizado */}
            <div className="absolute bottom-5 right-6 z-30">
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-red-600/30 flex items-center gap-2 hover:scale-105 active:scale-95 text-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </LiveKitRoom>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════
  //  RENDER: Sesión finalizada
  // ════════════════════════════════════════════

  if (state.status === 'ended') {
    return (
      <>
        <Head>
          <title>Sesión finalizada | NELHealthCoach</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800 p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <div className="text-green-400 text-3xl">✓</div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Sesión finalizada
            </h1>
            <p className="text-gray-400 mb-2">({state.role})</p>
            <p className="text-gray-500 text-sm mb-6">
              La sala <strong className="text-gray-300">{roomName}</strong>{' '}
              sigue disponible para reconectarse.
            </p>
            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
            >
              Nueva sala de prueba
            </button>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════
  //  RENDER: Error
  // ════════════════════════════════════════════

  const isPermissionError =
    state.message?.includes('Permiso') ||
    state.message?.includes('cámara');

  return (
    <>
      <Head>
        <title>Error | NELHealthCoach</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800 p-8 max-w-md w-full mx-4 text-center">
          {isPermissionError ? (
            <div className="text-yellow-400 text-5xl mb-4">🎥</div>
          ) : (
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
          )}
          <h1 className="text-2xl font-bold text-white mb-2">
            {isPermissionError
              ? 'Permiso requerido'
              : 'Error de conexión'}
          </h1>
          <p className="text-gray-400 mb-4">{state.message}</p>

          {isPermissionError && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 text-left text-sm text-gray-300 space-y-2">
              <p className="font-medium text-yellow-300">
                Pasos para permitir cámara y micrófono:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-400">
                <li>
                  Haz clic en el{' '}
                  <strong className="text-gray-200">🔒 candado</strong>{' '}
                  en la barra de direcciones
                </li>
                <li>
                  Busca{' '}
                  <strong className="text-gray-200">Cámara</strong> y{' '}
                  <strong className="text-gray-200">Micrófono</strong>
                </li>
                <li>
                  Cámbialos a{' '}
                  <strong className="text-gray-200">&quot:Permitir&quot;</strong>
                </li>
                <li>Recarga la página</li>
              </ol>
            </div>
          )}

          <button
            onClick={resetForm}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    </>
  );
}

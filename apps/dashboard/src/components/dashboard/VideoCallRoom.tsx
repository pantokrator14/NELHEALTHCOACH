// apps/dashboard/src/components/dashboard/VideoCallRoom.tsx
//
// Videollamada estilo Google Meet:
// - Grid adaptativo (GridLayout) — ocupa toda la altura disponible
// - Un solo ControlBar (sin chat, sin duplicados)
// - Self-view PIP sin espejo
// - Active speaker highlight
// - Sin VideoConference (evita duplicación de controles)
// - Data channel "session_ended" para que el coach cierre la sala
//   y el cliente se desconecte automáticamente.
//
// IMPORTANTE: Toda la lógica que usa hooks de LiveKit (useDataChannel,
// useRemoteParticipants) está en sub-componentes que se renderizan
// DENTRO de <LiveKitRoom> para evitar errores de contexto.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useRemoteParticipants,
  useDataChannel,
  useConnectionState,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';

import SelfViewPip from './SelfViewPip';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface VideoCallRoomProps {
  roomName: string;
  role: 'coach' | 'client';
  sessionToken?: string;
  onLeave: () => void;
  clientId?: string;
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─────────────────────────────────────────────
// Grid de video en vivo (con active speaker)
// ─────────────────────────────────────────────

function LiveVideoGrid() {
  const remoteParticipants = useRemoteParticipants();

  // Construimos track refs solo de participantes remotos
  // (evitamos useTracks para que no haya ninguna suscripción
  // al track de cámara local que pueda interferir en móvil)
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
// Barra de thumbnails de participantes remotos
// ─────────────────────────────────────────────

function RemoteParticipantsBar() {
  const remoteParticipants = useRemoteParticipants();
  if (remoteParticipants.length <= 1) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-sm rounded-full">
      {remoteParticipants.slice(0, 6).map((p) => (
        <div key={p.identity} className="relative">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 bg-gray-700">
            <ParticipantTile
              trackRef={{
                participant: p,
                source: Track.Source.Camera,
              }}
              className="w-full h-full"
            />
          </div>
          {p.isSpeaking && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-gray-900" />
          )}
        </div>
      ))}
      {remoteParticipants.length > 6 && (
        <div className="w-9 h-9 rounded-full bg-gray-700/80 border-2 border-white/20 flex items-center justify-center text-[10px] text-white font-medium">
          +{remoteParticipants.length - 6}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CSS para corregir el espejo de la cámara
// ─────────────────────────────────────────────

// Por defecto LiveKit aplica scaleX(-1) a la cámara local (efecto espejo).
// Para verla como nos ven los demás, anulamos el mirror con scaleX(1).
// Solo afecta al self-view PIP, no a las tiles del grid principal.
const SELF_VIEW_STYLES = `
  .self-view-pip video {
    transform: scaleX(1) !important;
  }
  .self-view-pip .lk-participant-media-video {
    transform: scaleX(1) !important;
  }
`;

// ─────────────────────────────────────────────
// Inner component: se renderiza DENTRO de <LiveKitRoom>
// para que useDataChannel tenga acceso al contexto de la sala.
// ─────────────────────────────────────────────

interface InnerProps {
  role: 'coach' | 'client';
  roomName: string;
  onLeave: () => void;
}

function VideoCallRoomInner({ role, roomName, onLeave }: InnerProps) {
  const connectionState = useConnectionState();
  const connected = connectionState === 'connected';
  const endedRef = useRef(false);

  // ── Data channel para fin de sesión ──
  const { send: sendData } = useDataChannel('session', (msg) => {
    const text = new TextDecoder().decode(msg.payload);
    if (text === 'session_ended' && role === 'client' && !endedRef.current) {
      endedRef.current = true;
      onLeave();
    }
  });

  // ── Manejar desconexión ──
  const handleDisconnect = useCallback(() => {
    if (endedRef.current) {
      onLeave();
      return;
    }
    endedRef.current = true;

    if (role === 'coach') {
      // Avisar al cliente antes de cerrar la sala
      sendData(new TextEncoder().encode('session_ended'), {
        topic: 'session',
        reliable: true,
      }).catch(() => {
        // Si falla el envío, salimos igual
      });
      // Pequeña pausa para dar tiempo a que el mensaje llegue
      setTimeout(() => onLeave(), 300);
    } else {
      onLeave();
    }
  }, [role, onLeave, sendData]);

  return (
    <>
      {/* ── Header flotante ── */}
      <div className="absolute top-0 left-0 right-0 z-30 h-14 bg-gradient-to-b from-black/60 to-transparent px-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
            N
          </div>
          <span className="font-medium text-white/80 text-sm hidden sm:inline">
            NELHealthCoach
          </span>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="text-xs text-gray-400 font-mono hidden sm:inline truncate max-w-[200px]">
            {roomName}
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
            {role === 'coach' ? 'Coach' : 'Cliente'}
          </span>
        </div>
      </div>

      {/* ── Renderizador de audio ── */}
      <RoomAudioRenderer />

      {/* ── Grid de video en vivo ── */}
      <LiveVideoGrid />

      {/* ── Thumbnails de participantes remotos ── */}
      <RemoteParticipantsBar />

      {/* ── Self-view overlay ── */}
      <SelfViewPip />

      {/* ── Barra de controles inferior ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-20 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent flex items-center justify-center">
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-full max-w-md px-2 sm:px-4">
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

          {/* ── Botón salir personalizado (dentro de la barra, a la derecha) ── */}
          <button
            onClick={handleDisconnect}
            className="shrink-0 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-red-600/30 flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 text-xs sm:text-sm"
            aria-label="Finalizar llamada"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-4 sm:w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">Finalizar</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function VideoCallRoom({
  roomName,
  role,
  sessionToken,
  onLeave,
}: VideoCallRoomProps) {
  const [participantToken, setParticipantToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Obtener token de LiveKit ──

  useEffect(() => {
    let cancelled = false;

    async function fetchToken(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (role === 'coach') {
          const storedToken = localStorage.getItem('token');
          if (!storedToken) {
            throw new Error('No autorizado: inicia sesión nuevamente');
          }
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const body: Record<string, unknown> = {
          roomName,
          role,
          displayName: role === 'coach' ? 'Coach' : 'Cliente',
        };

        if (role === 'client' && sessionToken) {
          body.sessionToken = sessionToken;
        }

        const response = await fetch(`${API_BASE_URL}/api/video/token`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            (errData as { message?: string }).message ||
              'Error al obtener token de videollamada'
          );
        }

        const data = (await response.json()) as {
          success: boolean;
          data: { token: string; serverUrl: string };
        };

        if (!cancelled) {
          setParticipantToken(data.data.token);
          setServerUrl(data.data.serverUrl);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Error de conexión'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      cancelled = true;
    };
  }, [roomName, role, sessionToken]);

  // ── Manejar errores (callback estable, sin hooks de LiveKit) ──

  const handleError = useCallback((livekitError: Error) => {
    console.error('VideoCallRoom error:', livekitError);

    const isPermissionError =
      livekitError.name === 'NotAllowedError' ||
      livekitError.message?.includes('Permission denied');

    if (isPermissionError) {
      setError(
        'Permiso de cámara/micrófono denegado. Haz clic en el candado 🔒 en la barra de direcciones y permite "Cámara" y "Micrófono", luego recarga.'
      );
    } else {
      setError(livekitError.message);
    }
  }, []);

  // ── Estados de carga y error ──

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium">
            Conectando a la videollamada...
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Verificando permisos
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Error de conexión
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!participantToken || !serverUrl) {
    return null;
  }

  // ── Videollamada activa ──
  //    LiveKitRoom provee el contexto necesario para los hooks
  //    de LiveKit (useDataChannel, useRemoteParticipants, etc.)
  //    que se usan dentro de VideoCallRoomInner.

  return (
    <div className="fixed inset-0 z-50 bg-gray-950">
      {/* Estilos para corregir espejo del self-view */}
      <style>{SELF_VIEW_STYLES}</style>

      <LiveKitRoom
        token={participantToken}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={{
          resolution: { width: 640, height: 480 },
          facingMode: 'user',
        }}
        onError={handleError}
        style={{ height: '100vh' }}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        <VideoCallRoomInner
          role={role}
          roomName={roomName}
          onLeave={onLeave}
        />
      </LiveKitRoom>
    </div>
  );
}

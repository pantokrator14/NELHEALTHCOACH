// apps/dashboard/src/components/dashboard/VideoCallRoom.tsx
//
// Componente principal de videollamada usando LiveKit React SDK.
// Se renderiza como un modal a pantalla completa.
// Soporta autenticación para coach (JWT del dashboard) y client (token temporal).
// No usa E2EE — el cifrado es DTLS-SRTP (estándar WebRTC).

import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
} from '@livekit/components-react';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface VideoCallRoomProps {
  /** Nombre de la sala en LiveKit */
  roomName: string;
  /** Rol del participante */
  role: 'coach' | 'client';
  /** Token temporal de sesión (solo para cliente) */
  sessionToken?: string;
  /** Callback al cerrar la videollamada */
  onLeave: () => void;
  /** ID del cliente para el contexto */
  clientId?: string;
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─────────────────────────────────────────────
// Componente
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

  // ── Obtener token de LiveKit desde la API ──

  useEffect(() => {
    let cancelled = false;

    async function fetchToken(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Autenticación según rol
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
            (errData as { message?: string }).message || 'Error al obtener token de videollamada'
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
          setError(err instanceof Error ? err.message : 'Error de conexión');
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

  // ── Manejar desconexión ──

  const handleDisconnect = useCallback(() => {
    onLeave();
  }, [onLeave]);

  // ── Manejar errores de LiveKit ──

  const handleError = useCallback((livekitError: Error) => {
    console.error('LiveKit error:', livekitError);
    setError(livekitError.message);
  }, []);

  // ── Estados de carga y error ──

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Conectando a la videollamada...</p>
          <p className="text-sm text-gray-400 mt-2">Verificando permisos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error de conexión</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleDisconnect}
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

  return (
    <div className="fixed inset-0 z-50 bg-gray-900">
      <LiveKitRoom
        token={participantToken}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleDisconnect}
        onError={handleError}
        style={{ height: '100vh' }}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        {/* Encabezado con información de la sala */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-60 text-white px-6 py-3 flex items-center justify-between">
          <div>
            <span className="font-medium">Sesión en curso</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-sm text-gray-300 font-mono">{roomName}</span>
          </div>
        </div>

        {/* Renderizador de audio (necesario para escuchar) */}
        <RoomAudioRenderer />

        {/* Grid de participantes (gestionado automáticamente por LiveKit) */}
        <div className="h-full w-full" />

        {/* Barra de control inferior */}
        <ControlBar
          variation="minimal"
          className="absolute bottom-0 left-0 right-0"
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            chat: false,
            leave: false,
          }}
        />

        {/* Botón de salir personalizado */}
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={handleDisconnect}
            className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Finalizar sesión
          </button>
        </div>
      </LiveKitRoom>
    </div>
  );
}

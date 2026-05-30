// apps/dashboard/src/components/dashboard/SelfViewPip.tsx
//
// Self-view overlay (PIP) para mostrar la propia cámara
// en la esquina inferior derecha.
//
// Escucha el evento 'trackPublished' del LocalParticipant
// para reaccionar cuando la cámara se publique (evita el
// problema de timing: el track puede no estar listo cuando
// el componente se monta).

import { useEffect, useRef, useState } from 'react';
import { Track, LocalVideoTrack } from 'livekit-client';
import { useLocalParticipant, useIsSpeaking } from '@livekit/components-react';

export default function SelfViewPip() {
  const { localParticipant } = useLocalParticipant();
  const isSpeaking = useIsSpeaking(localParticipant);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);

  // ── Obtener el video track cuando se publique ──
  useEffect(() => {
    if (!localParticipant) {
      setVideoTrack(null);
      return;
    }

    const checkTrack = () => {
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack) {
        setVideoTrack(pub.videoTrack as LocalVideoTrack);
      }
    };

    // 1. Verificar si ya existe (cámara ya publicada)
    checkTrack();

    // 2. Escuchar cuando se publique un track local
    //    (la cámara puede publicarse después del mount)
    localParticipant.on('localTrackPublished', checkTrack);

    return () => {
      localParticipant.off('localTrackPublished', checkTrack);
    };
  }, [localParticipant]);

  // ── Adjuntar el video track al elemento <video> ──
  useEffect(() => {
    const el = videoRef.current;
    if (!videoTrack || !el) return;

    videoTrack.attach(el);
    return () => {
      videoTrack.detach(el);
    };
  }, [videoTrack]);

  if (!localParticipant) return null;

  return (
    <div className="absolute bottom-24 right-4 z-20 w-28 h-20 sm:w-44 sm:h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700/60 bg-gray-800 transition-all duration-300 hover:scale-105 group self-view-pip">
      {videoTrack ? (
        /* Video directo — más fiable que ParticipantTile para el PIP */
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        /* Placeholder mientras se publica la cámara */
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-1 rounded-full border-2 border-gray-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[10px] text-gray-500">Cámara</span>
          </div>
        </div>
      )}

      {/* Badge "Tú" */}
      <div className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] text-white rounded-md font-medium">
        Tú
        {isSpeaking && (
          <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

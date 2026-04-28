// apps/api/src/app/api/video/health/route.ts
//
// GET: Health check del subsistema de videollamada.
// Verifica que LiveKit esté configurado y responde con el
// estado de todos los componentes relacionados.

import { NextResponse } from 'next/server';
import { isLiveKitConfigured, getLiveKitUrl } from '@/app/lib/video-service';

export async function GET(): Promise<NextResponse> {
  const livekitConfigured = isLiveKitConfigured();
  const deepgramConfigured = !!(process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY.length > 5);
  const resendConfigured = !!(process.env.RESEND_API_KEY);
  const s3Configured = !!(process.env.AWS_S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID);

  const allReady = livekitConfigured && deepgramConfigured && resendConfigured && s3Configured;

  return NextResponse.json({
    status: allReady ? 'ready' : 'partial',
    components: {
      livekit: {
        configured: livekitConfigured,
        url: livekitConfigured ? getLiveKitUrl() : null,
      },
      deepgram: {
        configured: deepgramConfigured,
        note: deepgramConfigured ? null : 'DEEPGRAM_API_KEY no configurado. La transcripción automática no está disponible.',
      },
      resend: {
        configured: resendConfigured,
      },
      s3: {
        configured: s3Configured,
      },
    },
    endpoints: {
      rooms: '/api/video/rooms',
      token: '/api/video/token',
      webhook: '/api/video/webhook',
      sendInvite: '/api/video/send-invite',
      transcriptionReady: '/api/video/transcription-ready',
    },
  });
}

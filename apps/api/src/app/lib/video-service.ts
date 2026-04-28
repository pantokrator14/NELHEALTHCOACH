// apps/api/src/app/lib/video-service.ts
//
// Servicio para gestión de salas de videollamada en LiveKit.
// Maneja la creación de rooms, generación de tokens de acceso
// y webhooks de eventos de sala (grabación finalizada, sesión terminada).

import { AccessToken } from 'livekit-server-sdk';
import type { VideoGrant } from 'livekit-server-sdk';
import { logger } from './logger';
import { generateToken, verifySessionToken } from './auth';
import { getHealthFormsCollection } from './database';
import { encrypt } from './encryption';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import type { VideoSession, VideoSessionStatus } from '../../../../../packages/types';

// ─────────────────────────────────────────────
// Configuración desde variables de entorno
// ─────────────────────────────────────────────

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

function validateConfig(): void {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    throw new Error(
      'LiveKit configuration incomplete. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL'
    );
  }
}

// ─────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────

interface TokenMetadata {
  clientId: string;
  sessionId: string;
  role: 'coach' | 'client';
  displayName: string;
}

interface CreateRoomResult {
  roomName: string;
  session: VideoSession;
}

interface GenerateTokenParams {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  metadata: TokenMetadata;
  canPublish: boolean;
  tokenTTL?: string;
}

// ─────────────────────────────────────────────
// Funciones de sala
// ─────────────────────────────────────────────

/**
 * Genera un nombre de sala único basado en el cliente y el número de sesión.
 * Formato: nelhc_client_{clientId}_session_{num}
 */
export function generateRoomName(clientId: string, sessionNumber: number): string {
  const shortId = clientId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
  return `nelhc_${shortId}_s${sessionNumber}`;
}

/**
 * Obtiene el siguiente número de sesión para un cliente.
 * Consulta cuántas sesiones de video ya tiene registradas.
 */
export async function getNextSessionNumber(clientId: string): Promise<number> {
  const collection = await getHealthFormsCollection();
  const doc = await collection.findOne(
    { _id: new ObjectId(clientId) },
    { projection: { videoSessions: 1 } }
  );

  const existingSessions = doc?.videoSessions as VideoSession[] | undefined;
  return (existingSessions?.length ?? 0) + 1;
}

/**
 * Crea una nueva sala de videollamada y registra la sesión en MongoDB.
 * La sala en LiveKit se crea automáticamente cuando el primer participante se une.
 */
export async function createVideoSession(
  clientId: string,
  scheduledAt: string,
  durationMinutes: number = 60,
  coachNotes?: string
): Promise<CreateRoomResult> {
  validateConfig();

  const sessionNumber = await getNextSessionNumber(clientId);
  const roomName = generateRoomName(clientId, sessionNumber);
  const sessionId = `vs_${Date.now()}_${uuidv4().slice(0, 8)}`;

  const session: VideoSession = {
    sessionId,
    sessionNumber,
    roomName,
    scheduledAt: new Date(scheduledAt),
    durationMinutes,
    status: 'scheduled',
    coachNotes: coachNotes ? encrypt(coachNotes) : undefined,
  };

  // Guardar sesión en MongoDB
  const collection = await getHealthFormsCollection();
  await collection.updateOne(
    { _id: new ObjectId(clientId) },
    {
      $push: { videoSessions: session as unknown as Record<string, unknown> },
      $set: { updatedAt: new Date() },
    } as Record<string, unknown>
  );

  logger.info('VIDEO', 'Video session created', { clientId, sessionNumber, roomName });

  return { roomName, session };
}

/**
 * Genera un token JWT de LiveKit para un participante (coach o cliente).
 * Incluye metadatos con clientId, sessionId y rol para auditoría.
 */
export async function generateParticipantToken(params: GenerateTokenParams): Promise<string> {
  validateConfig();

  const {
    roomName,
    participantIdentity,
    participantName,
    metadata,
    canPublish,
    tokenTTL = '2h',
  } = params;

  const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
    identity: participantIdentity,
    name: participantName,
    metadata: JSON.stringify(metadata),
    ttl: tokenTTL,
  });

  const videoGrant: VideoGrant = {
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  };

  at.addGrant(videoGrant);

  const token = await at.toJwt();

  logger.debug('VIDEO', 'Participant token generated', {
    identity: participantIdentity,
    roomName,
    role: metadata.role,
  });

  return token;
}

/**
 * Genera un enlace con token temporal para que el cliente se una a la videollamada.
 * Este token JWT de aplicación (no de LiveKit) sirve para autenticar al cliente
 * contra el endpoint /api/video/token, que a su vez devuelve el token de LiveKit.
 */
export function generateClientSessionLink(
  clientId: string,
  sessionId: string,
  clientEmail: string
): { joinLink: string; token: string } {
  const sessionToken = generateToken({
    sub: clientId,
    sessionId,
    email: clientEmail,
    type: 'client-session',
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 días
  });

  const baseUrl = process.env.WEBSITE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const joinLink = `${baseUrl}/video/join?token=${encodeURIComponent(sessionToken)}`;

  return { joinLink, token: sessionToken };
}

/**
 * Verifica que un token temporal de sesión de cliente sea válido.
 * Devuelve los datos decodificados o lanza un error.
 */
export function validateClientSessionToken(token: string): {
  clientId: string;
  sessionId: string;
  email: string;
} {
  const decoded = verifySessionToken(token);

  if (decoded.type !== 'client-session') {
    throw new Error('Tipo de token inválido para sesión de cliente');
  }

  if (!decoded.sub || !decoded.sessionId) {
    throw new Error('Token de sesión incompleto');
  }

  return {
    clientId: decoded.sub,
    sessionId: decoded.sessionId,
    email: decoded.email,
  };
}

/**
 * Actualiza el estado de una sesión de video en MongoDB.
 */
export async function updateVideoSessionStatus(
  clientId: string,
  sessionId: string,
  status: VideoSessionStatus,
  extraFields?: Partial<VideoSession>
): Promise<void> {
  const collection = await getHealthFormsCollection();

  const setFields: Record<string, unknown> = {
    'videoSessions.$[session].status': status,
    updatedAt: new Date(),
  };

  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      setFields[`videoSessions.$[session].${key}`] = value;
    }
  }

  await collection.updateOne(
    { _id: new ObjectId(clientId) },
    { $set: setFields },
    {
      arrayFilters: [{ 'session.sessionId': sessionId }],
    }
  );

  logger.info('VIDEO', `Video session status updated to "${status}"`, { clientId, sessionId });
}

/**
 * Obtiene una sesión de video específica de un cliente.
 */
export async function getVideoSession(
  clientId: string,
  sessionId: string
): Promise<VideoSession | null> {
  const collection = await getHealthFormsCollection();
  const doc = await collection.findOne(
    { _id: new ObjectId(clientId) },
    { projection: { videoSessions: 1 } }
  );

  const sessions = doc?.videoSessions as VideoSession[] | undefined;
  return sessions?.find((s) => s.sessionId === sessionId) ?? null;
}

/**
 * Obtiene todas las sesiones de video de un cliente.
 */
export async function getClientVideoSessions(clientId: string): Promise<VideoSession[]> {
  const collection = await getHealthFormsCollection();
  const doc = await collection.findOne(
    { _id: new ObjectId(clientId) },
    { projection: { videoSessions: 1 } }
  );

  return (doc?.videoSessions as VideoSession[] | undefined) ?? [];
}

/**
 * Valida que la configuración de LiveKit sea correcta (útil para healthchecks).
 */
export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL);
}

export function getLiveKitUrl(): string {
  validateConfig();
  return LIVEKIT_URL!;
}

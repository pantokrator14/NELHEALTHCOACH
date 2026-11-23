// apps/api/src/app/lib/auth.ts
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  logger.error('AUTH', 'JWT_SECRET no definida en las variables de entorno');
  throw new Error('JWT_SECRET no definida');
}

export interface CoachJwtPayload {
  coachId: string;
  email: string;
  role: 'admin' | 'coach';
}

export interface ClientJwtPayload {
  clientAccountId: string;
  clientId?: string | null;
  coachId: string;
  email: string;
  role: 'client';
}

export type AnyAuthPayload = CoachJwtPayload | ClientJwtPayload;

export function verifyAnyToken(token: string): AnyAuthPayload {
  try {
    logger.debug('AUTH', 'Verificando token JWT');
    const decoded = jwt.verify(token, JWT_SECRET) as AnyAuthPayload;
    return decoded;
  } catch (error) {
    logger.error('AUTH', 'Error verificando token JWT', error as Error);
    throw error;
  }
}

export function verifyToken(token: string): CoachJwtPayload {
  const decoded = verifyAnyToken(token);
  if (decoded.role !== 'admin' && decoded.role !== 'coach') {
    throw Object.assign(new Error('Token inválido para asesor'), {
      status: 403,
      message: 'Acceso restringido a asesores',
    });
  }
  return decoded;
}

/**
 * Deprecated: use requireCoachAuth for new code that needs coach data.
 * Kept for backward compatibility with routes that only need token validity.
 */
export function requireAuth(token?: string): void {
  logger.debug('AUTH', 'Verificando autenticación');

  if (!token) {
    logger.warn('AUTH', 'Intento de acceso no autorizado - Token no proporcionado');
    throw new Error('Token de autorización requerido');
  }

  try {
    verifyToken(token);
    logger.debug('AUTH', 'Autenticación exitosa');
  } catch (error) {
    logger.error('AUTH', 'Autenticación fallida', error as Error);
    throw new Error('Token inválido o expirado');
  }
}

/**
 * Verifica el token JWT y devuelve los datos del coach autenticado.
 * Fail-closed: rechaza tokens de tipo 'client' con 403.
 */
export function requireCoachAuth(request: NextRequest): CoachJwtPayload {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    logger.warn('AUTH', 'Intento de acceso no autorizado - Token no proporcionado');
    throw { status: 401, message: 'No autorizado', detail: 'Token de autorización requerido' };
  }

  try {
    const decoded = verifyAnyToken(token);
    if (decoded.role !== 'admin' && decoded.role !== 'coach') {
      logger.warn('AUTH', 'Token de cliente intentó acceder a ruta exclusiva de coach', {
        role: (decoded as { role?: string }).role,
      });
      throw Object.assign(new Error('Token inválido para asesor'), {
        status: 403,
        message: 'Acceso restringido a asesores',
      });
    }
    logger.debug('AUTH', 'Coach autenticado', { coachId: decoded.coachId, role: decoded.role });
    return decoded;
  } catch (error) {
    const structured = error as { status?: number };
    if (structured?.status === 403) {
      throw error;
    }
    logger.error('AUTH', 'Autenticación fallida', error as Error);
    throw { status: 401, message: 'No autorizado', detail: 'Token inválido o expirado' };
  }
}

/**
 * Verifica el token JWT y exige rol 'client'.
 */
export function requireClientAuth(request: NextRequest): ClientJwtPayload {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    logger.warn('AUTH', 'Intento de acceso cliente sin token');
    throw { status: 401, message: 'No autorizado', detail: 'Token de autorización requerido' };
  }

  try {
    const decoded = verifyAnyToken(token);
    if (decoded.role !== 'client' || !decoded.clientAccountId) {
      throw Object.assign(new Error('Token inválido para cliente'), {
        status: 403,
        message: 'Acceso exclusivo para cuentas de cliente',
      });
    }
    return decoded;
  } catch (error) {
    const structured = error as { status?: number };
    if (structured?.status === 403) {
      throw error;
    }
    logger.error('AUTH', 'Autenticación cliente fallida', error as Error);
    throw { status: 401, message: 'No autorizado', detail: 'Token inválido o expirado' };
  }
}

/**
 * Verifica el token JWT aceptando roles 'admin', 'coach' o 'client'.
 */
export function requireAnyAuth(request: NextRequest): AnyAuthPayload {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    throw { status: 401, message: 'No autorizado', detail: 'Token de autorización requerido' };
  }

  try {
    const decoded = verifyAnyToken(token);
    if (decoded.role !== 'admin' && decoded.role !== 'coach' && decoded.role !== 'client') {
      throw { status: 401, message: 'No autorizado' };
    }
    return decoded;
  } catch (error) {
    const structured = error as { status?: number };
    if (structured?.status) {
      throw error;
    }
    throw { status: 401, message: 'No autorizado', detail: 'Token inválido o expirado' };
  }
}

export function generateToken(payload: Record<string, unknown>): string {
  try {
    logger.debug('AUTH', 'Generando nuevo token JWT', {
      coachId: payload.coachId,
      role: payload.role,
    });
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    logger.debug('AUTH', 'Token JWT generado exitosamente');
    return token;
  } catch (error) {
    logger.error('AUTH', 'Error generando token JWT', error as Error, {
      coachId: payload.coachId,
    });
    throw error;
  }
}

// ─────────────────────────────────────────────
// Tokens para sesiones de cliente (videollamada)
// ─────────────────────────────────────────────

interface ClientSessionPayload {
  sub: string;
  sessionId: string;
  email: string;
  type: 'client-session';
  iat: number;
  exp: number;
}

export function generateClientSessionToken(
  clientId: string,
  sessionId: string,
  email: string,
  expiresInSeconds: number = 15 * 60
): string {
  try {
    logger.debug('AUTH', 'Generando token de sesión para cliente', {
      clientId,
      sessionId,
      email,
    });

    const payload: ClientSessionPayload = {
      sub: clientId,
      sessionId,
      email,
      type: 'client-session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };

    const token = jwt.sign(payload, JWT_SECRET);
    logger.debug('AUTH', 'Token de sesión generado exitosamente');
    return token;
  } catch (error) {
    logger.error('AUTH', 'Error generando token de sesión', error as Error);
    throw error;
  }
}

export function verifySessionToken(token: string): ClientSessionPayload {
  try {
    logger.debug('AUTH', 'Verificando token de sesión de cliente');
    const decoded = jwt.verify(token, JWT_SECRET) as ClientSessionPayload;

    if (decoded.type !== 'client-session') {
      throw new Error('El token no es de tipo client-session');
    }

    logger.debug('AUTH', 'Token de sesión verificado exitosamente', {
      clientId: decoded.sub,
      sessionId: decoded.sessionId,
    });

    return decoded;
  } catch (error) {
    logger.error('AUTH', 'Error verificando token de sesión', error as Error);
    throw error;
  }
}

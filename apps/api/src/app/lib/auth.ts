// apps/api/src/app/lib/auth.ts
import jwt from 'jsonwebtoken';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  logger.error('AUTH', 'JWT_SECRET no definida en las variables de entorno');
  throw new Error('JWT_SECRET no definida');
}

export function verifyToken(token: string): any {
  try {
    logger.debug('AUTH', 'Verificando token JWT');
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug('AUTH', 'Token JWT verificado exitosamente', { userId: (decoded as any).userId });
    return decoded;
  } catch (error) {
    logger.error('AUTH', 'Error verificando token JWT', error as Error);
    throw error;
  }
}

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

export function generateToken(payload: any): string {
  try {
    logger.debug('AUTH', 'Generando nuevo token JWT', { userId: payload.userId });
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    logger.debug('AUTH', 'Token JWT generado exitosamente');
    return token;
  } catch (error) {
    logger.error('AUTH', 'Error generando token JWT', error as Error, { userId: payload.userId });
    throw error;
  }
}
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface TokenPayload {
  email: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

// Middleware de autenticación (para usar en rutas protegidas)
export function requireAuth(token: string | undefined): TokenPayload {
  if (!token) {
    throw new Error('Token de autenticación requerido');
  }

  try {
    return verifyToken(token);
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}
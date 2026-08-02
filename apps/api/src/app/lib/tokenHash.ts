// apps/api/src/app/lib/tokenHash.ts
// SEC-15: los tokens de un solo uso (reset de password, verificación de email)
// se guardan en DB como sha256(token), nunca en texto plano. El token plano solo
// viaja por el enlace del email; si la DB se filtra, los tokens no son reutilizables.
import crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

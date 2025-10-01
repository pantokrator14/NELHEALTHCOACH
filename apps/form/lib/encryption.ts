import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY!;

if (!secretKey) {
  throw new Error('ENCRYPTION_KEY is not set');
}

export function encrypt(text: string): { encryptedData: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  cipher.setAAD(Buffer.from(''));
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decrypt(encryptedData: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipher(algorithm, secretKey);
  decipher.setAAD(Buffer.from(''));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
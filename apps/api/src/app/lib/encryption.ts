// apps/api/src/app/lib/encryption.ts
import CryptoJS from 'crypto-js';
import { logger } from './logger';

const secretKey = process.env.ENCRYPTION_KEY!;

if (!secretKey) {
  logger.error('ENCRYPTION', 'ENCRYPTION_KEY no definida en las variables de entorno');
  throw new Error('ENCRYPTION_KEY no definida');
}

export function encrypt(text: string): string {
  try {
    logger.debug('ENCRYPTION', 'Encriptando texto', { textLength: text.length });
    const encrypted = CryptoJS.AES.encrypt(text, secretKey).toString();
    logger.debug('ENCRYPTION', 'Texto encriptado exitosamente', { encryptedLength: encrypted.length });
    return encrypted;
  } catch (error) {
    logger.error('ENCRYPTION', 'Error al encriptar texto', error as Error, { textLength: text.length });
    throw error;
  }
}

export function decrypt(encryptedText: string): string {
  try {
    logger.debug('ENCRYPTION', 'Desencriptando texto', { encryptedLength: encryptedText.length });
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted && encryptedText) {
      logger.warn('ENCRYPTION', 'Intento de desencriptar texto no encriptado', { encryptedText: encryptedText.substring(0, 50) + '...' });
      return encryptedText;
    }
    
    logger.debug('ENCRYPTION', 'Texto desencriptado exitosamente', { decryptedLength: decrypted.length });
    return decrypted;
  } catch (error) {
    logger.error('ENCRYPTION', 'Error al desencriptar texto', error as Error, { 
      encryptedText: encryptedText.substring(0, 50) + '...',
      encryptedLength: encryptedText.length 
    });
    throw error;
  }
}

export function safeDecrypt(encryptedText: string): string {
  try {
    return decrypt(encryptedText);
  } catch (error) {
    logger.warn('ENCRYPTION', 'Desencriptación segura falló, retornando texto original', undefined, {
      encryptedLength: encryptedText.length
    });
    return encryptedText;
  }
}

export function isEncrypted(text: string): boolean {
  try {
    // Si el texto es muy corto, probablemente no esté encriptado
    if (!text || text.length < 16) return false;
    
    // Los textos encriptados con crypto-js tienen características específicas
    // y generalmente son más largos que el texto original
    if (text.startsWith('[') || text.startsWith('{') || text.includes('true') || text.includes('false')) {
      return false;
    }
    
    // Intentar desencriptar sin lanzar error
    const bytes = CryptoJS.AES.decrypt(text, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    return !!decrypted && decrypted.length > 0;
  } catch {
    return false;
  }
}

export function smartDecrypt(text: string): string {
  try {
    if (!text || !isEncrypted(text)) {
      return text;
    }
    
    const bytes = CryptoJS.AES.decrypt(text, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted && text) {
      logger.debug('ENCRYPTION', 'Texto no encriptado detectado en smartDecrypt', {
        originalLength: text.length,
        originalPreview: text.substring(0, 50)
      });
      return text;
    }
    
    return decrypted;
  } catch (error) {
    logger.warn('ENCRYPTION', 'Error en smartDecrypt, retornando texto original', undefined, {
      textLength: text?.length,
      error: (error as Error).message
    });
    return text;
  }
}

export function encryptObject(obj: Record<string, any>): Record<string, any> {
  return logger.time('ENCRYPTION', 'Encriptar objeto', async () => {
    const encrypted: Record<string, any> = {};
    const keys = Object.keys(obj);
    
    logger.debug('ENCRYPTION', 'Encriptando objeto', { keyCount: keys.length, keys });
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim() !== '') {
        encrypted[key] = encrypt(value);
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  });
}
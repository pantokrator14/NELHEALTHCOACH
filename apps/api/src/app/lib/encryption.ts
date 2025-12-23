// apps/api/src/app/lib/encryption.ts
import CryptoJS from 'crypto-js';
import { logger } from './logger';

const secretKey = process.env.ENCRYPTION_KEY!;

if (!secretKey) {
  logger.error('ENCRYPTION', 'ENCRYPTION_KEY no definida en las variables de entorno');
  throw new Error('ENCRYPTION_KEY no definida');
}

// ✅ FUNCIONES BÁSICAS
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
    // ✅ DETECCIÓN MEJORADA: Excluir arrays JSON explícitamente
    if (!encryptedText || 
        typeof encryptedText !== 'string' ||
        !encryptedText.startsWith('U2FsdGVkX1') || 
        encryptedText.length < 24 ||
        // ✅ EXCLUIR arrays JSON explícitamente
        (encryptedText.startsWith('[') && encryptedText.endsWith(']')) ||
        (encryptedText.startsWith('{') && encryptedText.endsWith('}')) ||
        // ✅ EXCLUIR boolean arrays
        encryptedText.includes('true,false') ||
        encryptedText.includes('false,true')) {
      return encryptedText;
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      return encryptedText;
    }
    
    return decrypted;
  } catch (error) {
    // ✅ NO LANZAR ERROR - solo log y devolver original
    logger.warn(
      'ENCRYPTION',
      `Error en decrypt, retornando texto original: ${encryptedText?.substring(0, 50)}...`,
      undefined,
      { duration: encryptedText ? encryptedText.length : 0 }
    );
    return encryptedText;
  }
}
export function safeDecrypt(encryptedText: string): string {
  try {
    return decrypt(encryptedText);
  } catch (error) {
    // Use an allowed meta field (duration) for logging to satisfy the logger's type
    logger.warn('ENCRYPTION', 'Desencriptación segura falló, retornando texto original', undefined, {
      duration: encryptedText.length
    });
    return encryptedText;
  }
}

// ✅ FUNCIONES PARA ARCHIVOS (ENCRIPTAR METADATOS)
export function encryptFileData(fileData: any): string {
  if (!fileData) return '';
  
  if (typeof fileData === 'string') {
    return encrypt(fileData);
  }
  
  try {
    return encrypt(JSON.stringify(fileData));
  } catch (error) {
    logger.error('ENCRYPTION', 'Error encriptando datos de archivo', error as Error);
    return '';
  }
}

export function decryptFileData(encryptedFileData: string): any {
  if (!encryptedFileData) return null;
  
  try {
    const decrypted = decrypt(encryptedFileData);
    
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    logger.error('ENCRYPTION', 'Error desencriptando datos de archivo', error as Error);
    return null;
  }
}

export function encryptFileObject(fileObj: any): any {
  if (!fileObj || typeof fileObj !== 'object') return fileObj;
  
  return {
    url: encrypt(fileObj.url),
    key: encrypt(fileObj.key),
    name: encrypt(fileObj.name),
    type: encrypt(fileObj.type),
    size: fileObj.size,
    uploadedAt: fileObj.uploadedAt
  };
}

export function decryptFileObject(encryptedFileObj: any): any {
  if (!encryptedFileObj) return null;
  
  if (typeof encryptedFileObj === 'string') {
    return decryptFileData(encryptedFileObj);
  }
  
  if (typeof encryptedFileObj === 'object') {
    return {
      url: decrypt(encryptedFileObj.url),
      key: decrypt(encryptedFileObj.key),
      name: decrypt(encryptedFileObj.name),
      type: decrypt(encryptedFileObj.type),
      size: encryptedFileObj.size,
      uploadedAt: encryptedFileObj.uploadedAt
    };
  }
  
  return encryptedFileObj;
}

// ✅ FUNCIONES ADICIONALES (PARA COMPATIBILIDAD)
export function isEncrypted(text: string): boolean {
  try {
    if (!text || text.length < 24) return false;
    
    if (text.startsWith('U2FsdGVkX1')) {
      const bytes = CryptoJS.AES.decrypt(text, secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return !!decrypted && decrypted.length > 0;
    }
    
    return false;
  } catch {
    return false;
  }
}

export function encryptObject(obj: Record<string, any>): Record<string, any> {
  const encrypted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim() !== '') {
      encrypted[key] = encrypt(value);
    } else if (typeof value === 'object' && value !== null) {
      encrypted[key] = encryptObject(value);
    } else {
      encrypted[key] = value;
    }
  }
  
  return encrypted;
}
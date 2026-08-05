// apps/api/src/app/lib/encryption.ts
// Cifrado en dos formatos:
//  - v2 (nuevo): AES-256-GCM autenticado (AEAD) con clave derivada vía HKDF-SHA256.
//    Formato: v2:<ivB64>:<ciphertextB64 + tagB64>
//    La ENCRYPTION_KEY es una clave de 32 bytes de alta entropía (base64), por lo
//    que HKDF sin salt costoso es suficiente (la seguridad recae en la clave).
//  - legacy: CryptoJS AES (EVP_BytesToKey/MD5, CBC sin autenticación) — SOLO lectura.
//    Formato: U2FsdGVkX1... (OpenSSL "Salted__" base64)
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import * as CryptoJS from 'crypto-js';
import { logger } from './logger';

const secretKey = process.env.ENCRYPTION_KEY!;

if (!secretKey) {
  logger.error('ENCRYPTION', 'ENCRYPTION_KEY no definida en las variables de entorno');
  throw new Error('ENCRYPTION_KEY no definida');
}

// ─── Configuración v2 (AES-256-GCM) ───

const V2_PREFIX = 'v2:';
const IV_LENGTH = 12; // tamaño recomendado para GCM
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // AES-256

/** Key de 32 bytes derivada una sola vez (cacheada) vía HKDF-SHA256. */
let derivedKey: Buffer | null = null;
function getDerivedKey(): Buffer {
  if (!derivedKey) {
    derivedKey = Buffer.from(
      hkdfSync('sha256', secretKey, 'nelhealthcoach-enc-v2', 'nelhealthcoach', KEY_LENGTH)
    );
  }
  return derivedKey;
}

/** Encripta con AES-256-GCM (autenticado). Formato: v2:<ivB64>:<ctB64+tagB64> */
function encryptV2(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getDerivedKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, tag]);
  return `${V2_PREFIX}${iv.toString('base64')}:${payload.toString('base64')}`;
}

/**
 * Desencripta formato v2. Lanza error si el tag GCM no autentica
 * (datos corruptos o clave incorrecta).
 */
function decryptV2(payload: string): string {
  const body = payload.slice(V2_PREFIX.length);
  const separatorIndex = body.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error('Formato v2 inválido');
  }
  const iv = Buffer.from(body.slice(0, separatorIndex), 'base64');
  const combined = Buffer.from(body.slice(separatorIndex + 1), 'base64');
  // combined = ciphertext + tag GCM (16 bytes). Se permite combined.length === TAG_LENGTH
  // porque un texto plano VACÍO encriptado produce exactamente 16 bytes (solo el tag).
  // Antes se exigía TAG_LENGTH + 1, lo que hacía fallar la desencriptación de textos
  // vacíos (encrypt('')) y devolvía el prefijo "v2:..." crudo a la UI.
  if (iv.length !== IV_LENGTH || combined.length < TAG_LENGTH) {
    throw new Error('Formato v2 inválido');
  }
  const encrypted = combined.subarray(0, combined.length - TAG_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', getDerivedKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// ✅ FUNCIONES BÁSICAS
export function encrypt(text: string): string {
  try {
    // Protección contra undefined/null — si no es string, convertirlo a string vacío
    const safeText = (typeof text === 'string') ? text : String(text ?? '');
    logger.debug('ENCRYPTION', 'Encriptando texto', { textLength: safeText.length });
    const encrypted = encryptV2(safeText);
    logger.debug('ENCRYPTION', 'Texto encriptado exitosamente', { encryptedLength: encrypted.length });
    return encrypted;
  } catch (error) {
    logger.error('ENCRYPTION', 'Error al encriptar texto', error as Error, { textLength: typeof text === 'string' ? text.length : 0 });
    throw error;
  }
}

export function decrypt(encryptedText: string): string {
  try {
    // ✅ DETECCIÓN MEJORADA: Excluir arrays JSON explícitamente
    if (!encryptedText || 
        typeof encryptedText !== 'string' ||
        // ✅ EXCLUIR arrays JSON explícitamente
        (encryptedText.startsWith('[') && encryptedText.endsWith(']')) ||
        (encryptedText.startsWith('{') && encryptedText.endsWith('}')) ||
        // ✅ EXCLUIR boolean arrays
        encryptedText.includes('true,false') ||
        encryptedText.includes('false,true')) {
      return encryptedText;
    }

    // Formato v2 (AES-256-GCM, autenticado)
    if (encryptedText.startsWith(V2_PREFIX)) {
      return decryptV2(encryptedText);
    }

    // Legacy CryptoJS (U2FsdGVkX1 = "Salted__" en base64)
    if (!encryptedText.startsWith('U2FsdGVkX1') || encryptedText.length < 24) {
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
    // Preserve additional fields that aren't encrypted
    const { url, key, name, type, size, uploadedAt, ...additionalFields } = encryptedFileObj;
    return {
      url: decrypt(url),
      key: decrypt(key),
      name: decrypt(name),
      type: decrypt(type),
      size: size,
      uploadedAt: uploadedAt,
      ...additionalFields, // Keep additional fields
    };
  }
  
  return encryptedFileObj;
}

// ✅ FUNCIONES ADICIONALES (PARA COMPATIBILIDAD)
export function isEncrypted(text: string): boolean {
  try {
    if (!text || text.length < 24) return false;
    
    // Formato v2 siempre está encriptado
    if (text.startsWith(V2_PREFIX)) {
      return true;
    }
    
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

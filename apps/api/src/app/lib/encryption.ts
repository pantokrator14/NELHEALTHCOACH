import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_KEY!;

if (!secretKey) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

export function encrypt(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return CryptoJS.AES.encrypt(text, secretKey).toString();
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // Si el resultado está vacío, podría ser que el texto no estaba encriptado
    if (!decrypted && encryptedText) {
      console.warn('⚠️ Intento de desencriptar texto no encriptado');
      return encryptedText;
    }
    
    return decrypted;
  } catch (error) {
    console.error('❌ Error desencriptando:', error);
    return encryptedText; // Devuelve el texto original si hay error
  }
}

// Función helper para desencriptar datos de forma segura
export const safeDecrypt = (encryptedText: string): string => {
  try {
    if (!encryptedText) return '';
    const decrypted = decrypt(encryptedText);
    if (!decrypted && encryptedText) {
      return encryptedText;
    }
    return decrypted;
  } catch (error) {
    console.warn('⚠️ Error en safeDecrypt, devolviendo texto original:', error);
    return encryptedText;
  }
};

// Función para encriptar objetos completos
export function encryptObject<T extends Record<string, any>>(obj: T): T {
  const encrypted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim() !== '') {
      encrypted[key] = encrypt(value);
    } else {
      encrypted[key] = value;
    }
  }
  return encrypted as T;
}
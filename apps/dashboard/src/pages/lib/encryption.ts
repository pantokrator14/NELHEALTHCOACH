import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
}

export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
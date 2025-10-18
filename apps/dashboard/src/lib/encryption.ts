import CryptoJS from 'crypto-js'

const secretKey = process.env.ENCRYPTION_KEY!

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, secretKey).toString()
}

export function decrypt(encryptedText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    
    // Si el resultado está vacío, podría ser que el texto no estaba encriptado
    if (!decrypted && encryptedText) {
      console.warn('Intento de desencriptar texto no encriptado:', encryptedText)
      return encryptedText
    }
    
    return decrypted
  } catch (error) {
    console.error('Error desencriptando:', error)
    return encryptedText // Devuelve el texto original si hay error
  }
}
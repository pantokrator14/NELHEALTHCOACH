import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not defined')
}

export function decryptData(encryptedData: string): any {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY)
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8)
    
    if (!decryptedData) {
      console.error('Decrypted data is empty')
      return null
    }
    
    return JSON.parse(decryptedData)
  } catch (error) {
    console.error('Error decrypting data:', error)
    return null
  }
}

export function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString()
}
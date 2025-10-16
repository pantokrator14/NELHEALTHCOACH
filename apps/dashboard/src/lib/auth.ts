import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno')
}

export interface AuthUser {
  id: string
  email: string
  name: string
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

// Función para obtener el usuario del token (útil en API routes)
export function getAuthUser(req: any): AuthUser | null {
  try {
    const token = req.cookies['auth-token']
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}
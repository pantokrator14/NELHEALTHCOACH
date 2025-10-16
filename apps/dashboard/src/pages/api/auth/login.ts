import { NextApiRequest, NextApiResponse } from 'next'
import { generateToken } from '../../../lib/auth'

// Credenciales del coach - en producción usa variables de entorno
const VALID_CREDENTIALS = {
  email: process.env.COACH_EMAIL,
  password: process.env.COACH_PASSWORD
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      const token = generateToken({
        id: '1',
        email: email,
        name: 'NEL Health Coach'
      })

      // Configurar cookie segura
      res.setHeader('Set-Cookie', [
        `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; ${process.env.NODE_ENV === 'production' ? 'Secure; SameSite=Strict' : ''}`
      ])

      return res.status(200).json({ 
        success: true, 
        user: { id: '1', email, name: 'NEL Health Coach' } 
      })
    }

    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (error) {
    console.error('Error en login:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
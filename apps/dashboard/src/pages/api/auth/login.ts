import { NextApiRequest, NextApiResponse } from 'next'
import { generateToken } from '../../../lib/auth'

// Credenciales del coach - usando las variables correctas
const VALID_CREDENTIALS = {
  email: process.env.COACH_EMAIL || 'admin@nelhealthcoach.com',
  password: process.env.COACH_PASSWORD || 'password123'
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  const { email, password } = req.body

  // Debug: Mostrar las credenciales esperadas en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('Credenciales esperadas:', {
      email: VALID_CREDENTIALS.email,
      password: VALID_CREDENTIALS.password ? '***' : 'no definida'
    })
    console.log('Credenciales recibidas:', { email, password })
  }

  if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
    const token = generateToken({ email })
    return res.status(200).json({ 
      message: 'Login exitoso',
      token 
    })
  } else {
    return res.status(401).json({ message: 'Credenciales inválidas' })
  }
}
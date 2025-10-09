// apps/dashboard/src/pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { generateToken } from '../../../lib/auth'

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

    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      const token = generateToken({
        id: '1',
        email: email,
        name: 'NEL Health Coach'
      })

      res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`)
      return res.status(200).json({ success: true })
    }

    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Eliminar la cookie
    res.setHeader('Set-Cookie', [
      `auth-token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${process.env.NODE_ENV === 'production' ? 'Secure; SameSite=Strict' : ''}`
    ])

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error en logout:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
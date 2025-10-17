import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../lib/database'
import { decrypt } from '../../../lib/encryption'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  try {
    const db = await connectToDatabase()
    
    if (!db.connection || !db.connection.db) {
      return res.status(500).json({ message: 'Database connection error' })
    }

    const clients = await db.connection.db.collection('healthforms')
      .find({})
      .sort({ submissionDate: -1 })
      .toArray()

    // Desencriptar solo los datos necesarios para la lista
    const clientList = clients.map(client => {
      const decryptedName = decrypt(client.personalData.name)
      const names = decryptedName.split(' ')
      
      return {
        _id: client._id.toString(),
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: decrypt(client.personalData.email),
        phone: decrypt(client.personalData.phone),
        createdAt: client.submissionDate
      }
    })

    res.status(200).json(clientList)
  } catch (error) {
    console.error('Error fetching clients:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}
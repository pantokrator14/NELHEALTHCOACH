import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../lib/database'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  try {
    const db = await connectToDatabase()
    
    // Contar clientes en la colección healthforms
    let clientCount = 0
    if (db.connection && db.connection.db) {
      clientCount = await db.connection.db.collection('healthforms').countDocuments()
    } else {
      throw new Error('La conexión a la base de datos no está disponible')
    }
    
    // Por ahora, recetas será 0 hasta que implementemos esa funcionalidad
    const recipeCount = 0
    
    // Porcentaje de clientes cerca del objetivo (placeholder por ahora)
    const nearGoalPercentage = Math.min(Math.floor((clientCount / 300) * 100), 100)

    res.status(200).json({
      clientCount,
      recipeCount,
      nearGoalPercentage
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}
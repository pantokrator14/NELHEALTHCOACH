// apps/dashboard/src/pages/api/forms/index.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../lib/database'
import { decryptData } from '../../../lib/encryption'
import { verifyToken } from '../../../lib/auth'
import { HealthForm, DecryptedHealthForm } from '../../../lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Verificar autenticación
    const token = req.cookies['auth-token']
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const user = verifyToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    await connectToDatabase()
    // Nota: Necesitarás importar o definir tu modelo de Mongoose aquí
    const forms = await getFormsFromDatabase() // Esta función necesita ser implementada

    const decryptedForms: DecryptedHealthForm[] = forms.map((form: HealthForm) => ({
      _id: form._id.toString(),
      personalData: decryptData(form.personalData),
      medicalData: decryptData(form.medicalData),
      contractAccepted: form.contractAccepted,
      ipAddress: form.ipAddress,
      submissionDate: form.submissionDate
    })).filter(form => form.personalData !== null)

    // Ordenar por nombre
    decryptedForms.sort((a, b) => {
      const nameA = `${a.personalData.firstName} ${a.personalData.lastName}`.toLowerCase()
      const nameB = `${b.personalData.firstName} ${b.personalData.lastName}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return res.status(200).json({ forms: decryptedForms })
  } catch (error) {
    console.error('Error fetching forms:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Función temporal - necesitarás implementar según tu modelo
async function getFormsFromDatabase() {
  // Esto debe ser reemplazado con tu implementación real de MongoDB
  return []
}
import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../lib/database'
import { decrypt } from '../../../lib/encryption'
import { verifyToken } from '../../../lib/auth'
import HealthForm from '../../../models/HealthForm'

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
    const forms = await HealthForm.find({}).sort({ submissionDate: -1 })

    // Desencriptar datos para el dashboard
    const decryptedForms = forms.map(form => {
      const decrypted: any = { ...form.toObject() }
      
      // Desencriptar personalData
      if (form.personalData) {
        decrypted.personalData = {}
        Object.keys(form.personalData).forEach(key => {
          decrypted.personalData[key] = decrypt(form.personalData[key])
        })
      }
      
      // Desencriptar medicalData  
      if (form.medicalData) {
        decrypted.medicalData = {}
        Object.keys(form.medicalData).forEach(key => {
          decrypted.medicalData[key] = decrypt(form.medicalData[key])
        })
      }
      
      // Desencriptar metadata
      decrypted.contractAccepted = decrypt(form.contractAccepted)
      decrypted.ipAddress = decrypt(form.ipAddress)
      
      return decrypted
    })

    // Ordenar por nombre
    decryptedForms.sort((a, b) => {
      const nameA = a.personalData?.name?.toLowerCase() || ''
      const nameB = b.personalData?.name?.toLowerCase() || ''
      return nameA.localeCompare(nameB)
    })

    res.json({ 
      success: true, 
      forms: decryptedForms,
      count: decryptedForms.length 
    })
  } catch (error) {
    console.error('Error fetching forms:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    })
  }
}
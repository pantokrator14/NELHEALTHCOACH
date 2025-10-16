import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../../lib/database'
import HealthForm from '../../../../models/HealthForm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { personalData, medicalData, contractAccepted, ipAddress } = req.body

    await connectToDatabase()

    const newForm = new HealthForm({
      personalData,
      medicalData,
      contractAccepted,
      ipAddress
    })

    await newForm.save()

    res.status(201).json({ 
      success: true, 
      message: 'Formulario guardado exitosamente (backend temporal)',
      id: newForm._id 
    })
  } catch (error) {
    console.error('Error saving form:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Error guardando formulario' 
    })
  }
}
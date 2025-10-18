import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../lib/database'
import { ObjectId } from 'mongodb'
import { decrypt, encrypt } from '../../../lib/encryption'

// Función helper para desencriptar datos de forma segura
const safeDecrypt = (encryptedText: string): string => {
  try {
    if (!encryptedText) return ''
    const decrypted = decrypt(encryptedText)
    if (!decrypted && encryptedText) {
      return encryptedText
    }
    return decrypted
  } catch (error) {
    console.warn('Error desencriptando, devolviendo texto original:', error)
    return encryptedText
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  // Validar que el ID existe y es válido
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID de cliente inválido' })
  }

  // Validar que el ID tiene el formato correcto para ObjectId (24 caracteres hexadecimales)
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID de cliente inválido' })
  }

  const objectId = new ObjectId(id)

  if (req.method === 'GET') {
    try {
      const db = await connectToDatabase()
      
      const client = await db.connection.db.collection('healthforms').findOne({ 
        _id: objectId 
      })

      if (!client) {
        return res.status(404).json({ message: 'Cliente no encontrado' })
      }

      // Desencriptar los datos de forma segura
      const decryptedClient = {
        ...client,
        personalData: {
          name: safeDecrypt(client.personalData.name),
          address: safeDecrypt(client.personalData.address),
          phone: safeDecrypt(client.personalData.phone),
          email: safeDecrypt(client.personalData.email),
          birthDate: safeDecrypt(client.personalData.birthDate),
          gender: safeDecrypt(client.personalData.gender),
          age: safeDecrypt(client.personalData.age),
          weight: safeDecrypt(client.personalData.weight),
          height: safeDecrypt(client.personalData.height),
          maritalStatus: safeDecrypt(client.personalData.maritalStatus),
          education: safeDecrypt(client.personalData.education),
          occupation: safeDecrypt(client.personalData.occupation)
        },
        medicalData: {
          mainComplaint: safeDecrypt(client.medicalData.mainComplaint),
          medications: safeDecrypt(client.medicalData.medications),
          supplements: safeDecrypt(client.medicalData.supplements),
          currentPastConditions: safeDecrypt(client.medicalData.currentPastConditions),
          additionalMedicalHistory: safeDecrypt(client.medicalData.additionalMedicalHistory),
          employmentHistory: safeDecrypt(client.medicalData.employmentHistory),
          hobbies: safeDecrypt(client.medicalData.hobbies),
          allergies: safeDecrypt(client.medicalData.allergies),
          surgeries: safeDecrypt(client.medicalData.surgeries),
          housingHistory: safeDecrypt(client.medicalData.housingHistory),
          carbohydrateAddiction: safeDecrypt(client.medicalData.carbohydrateAddiction),
          leptinResistance: safeDecrypt(client.medicalData.leptinResistance),
          circadianRhythms: safeDecrypt(client.medicalData.circadianRhythms),
          sleepHygiene: safeDecrypt(client.medicalData.sleepHygiene),
          electrosmogExposure: safeDecrypt(client.medicalData.electrosmogExposure),
          generalToxicity: safeDecrypt(client.medicalData.generalToxicity),
          microbiotaHealth: safeDecrypt(client.medicalData.microbiotaHealth),
          mentalHealthEmotionIdentification: safeDecrypt(client.medicalData.mentalHealthEmotionIdentification),
          mentalHealthEmotionIntensity: safeDecrypt(client.medicalData.mentalHealthEmotionIntensity),
          mentalHealthUncomfortableEmotion: safeDecrypt(client.medicalData.mentalHealthUncomfortableEmotion),
          mentalHealthInternalDialogue: safeDecrypt(client.medicalData.mentalHealthInternalDialogue),
          mentalHealthStressStrategies: safeDecrypt(client.medicalData.mentalHealthStressStrategies),
          mentalHealthSayingNo: safeDecrypt(client.medicalData.mentalHealthSayingNo),
          mentalHealthRelationships: safeDecrypt(client.medicalData.mentalHealthRelationships),
          mentalHealthExpressThoughts: safeDecrypt(client.medicalData.mentalHealthExpressThoughts),
          mentalHealthEmotionalDependence: safeDecrypt(client.medicalData.mentalHealthEmotionalDependence),
          mentalHealthPurpose: safeDecrypt(client.medicalData.mentalHealthPurpose),
          mentalHealthFailureReaction: safeDecrypt(client.medicalData.mentalHealthFailureReaction),
          mentalHealthSelfConnection: safeDecrypt(client.medicalData.mentalHealthSelfConnection),
          mentalHealthSelfRelationship: safeDecrypt(client.medicalData.mentalHealthSelfRelationship),
          mentalHealthLimitingBeliefs: safeDecrypt(client.medicalData.mentalHealthLimitingBeliefs),
          mentalHealthIdealBalance: safeDecrypt(client.medicalData.mentalHealthIdealBalance)
        },
        contractAccepted: safeDecrypt(client.contractAccepted),
        ipAddress: safeDecrypt(client.ipAddress),
        submissionDate: client.submissionDate
      }

      return res.status(200).json(decryptedClient)
    } catch (error) {
      console.error('Error fetching client:', error)
      return res.status(500).json({ message: 'Error interno del servidor' })
    }
  } else if (req.method === 'PUT') {
    try {
      const db = await connectToDatabase()
      const updateData = req.body

      // Remover _id del objeto de actualización ya que es inmutable
      const { _id, ...dataToUpdate } = updateData

      // Función helper para encriptar datos
      const encryptData = (data: any) => {
        const encrypted: any = {}
        for (const key in data) {
          if (typeof data[key] === 'string' && data[key].trim() !== '') {
            encrypted[key] = encrypt(data[key])
          } else {
            encrypted[key] = data[key]
          }
        }
        return encrypted
      }

      // Encriptar los datos antes de guardar
      if (dataToUpdate.personalData) {
        dataToUpdate.personalData = encryptData(dataToUpdate.personalData)
      }

      if (dataToUpdate.medicalData) {
        dataToUpdate.medicalData = encryptData(dataToUpdate.medicalData)
      }

      const result = await db.connection.db.collection('healthforms').updateOne(
        { _id: objectId },
        { $set: dataToUpdate }
      )

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Cliente no encontrado' })
      }

      return res.status(200).json({ message: 'Cliente actualizado correctamente' })
    } catch (error) {
      console.error('Error actualizando cliente:', error)
      return res.status(500).json({ message: 'Error interno del servidor' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const db = await connectToDatabase()
      
      const result = await db.connection.db.collection('healthforms').deleteOne({ 
        _id: objectId 
      })

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Cliente no encontrado' })
      }

      return res.status(200).json({ message: 'Cliente eliminado correctamente' })
    } catch (error) {
      console.error('Error eliminando cliente:', error)
      return res.status(500).json({ message: 'Error interno del servidor' })
    }
  } else {
    res.status(405).json({ message: 'Método no permitido' })
  }
}
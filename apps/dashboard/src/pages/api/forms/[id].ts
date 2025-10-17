import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../../../lib/database'
import { ObjectId } from 'mongodb'
import { decrypt } from '../../../lib/encryption'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  const { id } = req.query

  try {
    const db = await connectToDatabase()
    
    let client
    try {
      if (!db.connection || !db.connection.db) {
        return res.status(500).json({ message: 'No se pudo conectar a la base de datos' })
      }
      client = await db.connection.db.collection('healthforms').findOne({ 
        _id: new ObjectId(id as string) 
      })
    } catch (error) {
      return res.status(400).json({ message: 'ID de cliente inválido' })
    }

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' })
    }

    // Desencriptar los datos
    const decryptedClient = {
      ...client,
      personalData: {
        name: decrypt(client.personalData.name),
        address: decrypt(client.personalData.address),
        phone: decrypt(client.personalData.phone),
        email: decrypt(client.personalData.email),
        birthDate: decrypt(client.personalData.birthDate),
        gender: decrypt(client.personalData.gender),
        age: decrypt(client.personalData.age),
        weight: decrypt(client.personalData.weight),
        height: decrypt(client.personalData.height),
        maritalStatus: decrypt(client.personalData.maritalStatus),
        education: decrypt(client.personalData.education),
        occupation: decrypt(client.personalData.occupation)
      },
      medicalData: {
        mainComplaint: decrypt(client.medicalData.mainComplaint),
        medications: decrypt(client.medicalData.medications),
        supplements: decrypt(client.medicalData.supplements),
        currentPastConditions: decrypt(client.medicalData.currentPastConditions),
        additionalMedicalHistory: decrypt(client.medicalData.additionalMedicalHistory),
        employmentHistory: decrypt(client.medicalData.employmentHistory),
        hobbies: decrypt(client.medicalData.hobbies),
        allergies: decrypt(client.medicalData.allergies),
        surgeries: decrypt(client.medicalData.surgeries),
        housingHistory: decrypt(client.medicalData.housingHistory),
        carbohydrateAddiction: decrypt(client.medicalData.carbohydrateAddiction),
        leptinResistance: decrypt(client.medicalData.leptinResistance),
        circadianRhythms: decrypt(client.medicalData.circadianRhythms),
        sleepHygiene: decrypt(client.medicalData.sleepHygiene),
        electrosmogExposure: decrypt(client.medicalData.electrosmogExposure),
        generalToxicity: decrypt(client.medicalData.generalToxicity),
        microbiotaHealth: decrypt(client.medicalData.microbiotaHealth),
        mentalHealthEmotionIdentification: decrypt(client.medicalData.mentalHealthEmotionIdentification),
        mentalHealthEmotionIntensity: decrypt(client.medicalData.mentalHealthEmotionIntensity),
        mentalHealthUncomfortableEmotion: decrypt(client.medicalData.mentalHealthUncomfortableEmotion),
        mentalHealthInternalDialogue: decrypt(client.medicalData.mentalHealthInternalDialogue),
        mentalHealthStressStrategies: decrypt(client.medicalData.mentalHealthStressStrategies),
        mentalHealthSayingNo: decrypt(client.medicalData.mentalHealthSayingNo),
        mentalHealthRelationships: decrypt(client.medicalData.mentalHealthRelationships),
        mentalHealthExpressThoughts: decrypt(client.medicalData.mentalHealthExpressThoughts),
        mentalHealthEmotionalDependence: decrypt(client.medicalData.mentalHealthEmotionalDependence),
        mentalHealthPurpose: decrypt(client.medicalData.mentalHealthPurpose),
        mentalHealthFailureReaction: decrypt(client.medicalData.mentalHealthFailureReaction),
        mentalHealthSelfConnection: decrypt(client.medicalData.mentalHealthSelfConnection),
        mentalHealthSelfRelationship: decrypt(client.medicalData.mentalHealthSelfRelationship),
        mentalHealthLimitingBeliefs: decrypt(client.medicalData.mentalHealthLimitingBeliefs),
        mentalHealthIdealBalance: decrypt(client.medicalData.mentalHealthIdealBalance)
      },
      contractAccepted: decrypt(client.contractAccepted),
      ipAddress: decrypt(client.ipAddress),
      submissionDate: client.submissionDate
    }

    res.status(200).json(decryptedClient)
  } catch (error) {
    console.error('Error fetching client:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}
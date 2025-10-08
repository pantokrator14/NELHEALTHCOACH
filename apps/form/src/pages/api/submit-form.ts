import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import HealthForm, { HealthFormDocument } from '@/models/HealthForm';
import { HealthFormData, MedicalData } from '@/types/healthForm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    await connectDB();

    const data: HealthFormData = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Validar datos básicos
    if (!data.personalData || !data.medicalData) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos'
      });
    }

    // Procesar medicalData con tipos específicos
    const processedMedicalData: MedicalData = { ...data.medicalData };

    // Definir longitudes esperadas
    const expectedLengths: Record<keyof MedicalData, number> = {
      carbohydrateAddiction: 11,
      leptinResistance: 8,
      circadianRhythms: 11,
      sleepHygiene: 11,
      electrosmogExposure: 10,
      generalToxicity: 8,
      microbiotaHealth: 10,
      // Campos de texto (no aplican)
      mainComplaint: 0, medications: 0, supplements: 0, currentPastConditions: 0,
      additionalMedicalHistory: 0, employmentHistory: 0, hobbies: 0, allergies: 0,
      surgeries: 0, housingHistory: 0,
      // Salud mental (no aplican)
      mentalHealthEmotionIdentification: 0, mentalHealthEmotionIntensity: 0,
      mentalHealthUncomfortableEmotion: 0, mentalHealthInternalDialogue: 0,
      mentalHealthStressStrategies: 0, mentalHealthSayingNo: 0,
      mentalHealthRelationships: 0, mentalHealthExpressThoughts: 0,
      mentalHealthEmotionalDependence: 0, mentalHealthPurpose: 0,
      mentalHealthFailureReaction: 0, mentalHealthSelfConnection: 0,
      mentalHealthSelfRelationship: 0, mentalHealthLimitingBeliefs: 0,
      mentalHealthIdealBalance: 0
    };

    // Procesar arrays
    const arrayFields: Array<keyof MedicalData> = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    arrayFields.forEach(field => {
      const arrayData = processedMedicalData[field];
      const expectedLength = expectedLengths[field];
      
      if (!arrayData || !Array.isArray(arrayData)) {
        (processedMedicalData[field] as any) = JSON.stringify([]);
        return;
      }

      const cleanedArray = arrayData.map(value => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return Boolean(value);
      });

      // Asegurar longitud
      if (cleanedArray.length < expectedLength) {
        while (cleanedArray.length < expectedLength) {
          cleanedArray.push(false);
        }
      } else if (cleanedArray.length > expectedLength) {
        cleanedArray.length = expectedLength;
      }

      (processedMedicalData[field] as any) = JSON.stringify(cleanedArray);
    });

    const healthForm: HealthFormDocument = new HealthForm({
      personalData: data.personalData,
      medicalData: processedMedicalData,
      contractAccepted: data.contractAccepted || false,
      ipAddress: clientIP || 'Unknown',
    });

    await healthForm.save();

    res.status(200).json({ 
      success: true,
      message: 'Form submitted successfully', 
      id: healthForm._id 
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
}
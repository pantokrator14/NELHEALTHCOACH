import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import HealthForm from '../../models/HealthForm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    await connectDB();
    console.log('Database connected, processing form submission...');

    const data = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Validar datos básicos
    if (!data.personalData || !data.medicalData) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos'
      });
    }

    console.log('Processing medical data arrays...');

    // Crear una COPIA de medicalData para procesar
    const processedMedicalData = { ...data.medicalData };

    // Procesar arrays existentes (código existente)
    const expectedLengths: { [key: string]: number } = {
      carbohydrateAddiction: 11,
      leptinResistance: 8,
      circadianRhythms: 11,
      sleepHygiene: 11,
      electrosmogExposure: 10,
      generalToxicity: 8,
      microbiotaHealth: 10
    };

    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    arrayFields.forEach(field => {
      const arrayData = processedMedicalData[field];
      
      if (!arrayData || !Array.isArray(arrayData)) {
        processedMedicalData[field] = JSON.stringify([]);
        return;
      }

      const cleanedArray = arrayData.map((value: any) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === true || value === false) return value;
        return false;
      });

      const expectedLength = expectedLengths[field];
      if (expectedLength && cleanedArray.length < expectedLength) {
        while (cleanedArray.length < expectedLength) {
          cleanedArray.push(false);
        }
      }

      if (expectedLength && cleanedArray.length > expectedLength) {
        cleanedArray.length = expectedLength;
      }

      processedMedicalData[field] = JSON.stringify(cleanedArray);
    });

    // Los nuevos campos de salud mental ya vienen como strings individuales
    // No necesitan procesamiento adicional - el modelo los encriptará automáticamente

    console.log('All data processed, creating form document...');

    const healthForm = new HealthForm({
      personalData: data.personalData,
      medicalData: processedMedicalData,
      contractAccepted: data.contractAccepted || false,
      ipAddress: clientIP || 'Unknown',
    });

    await healthForm.save();
    console.log('Form saved successfully with ID:', healthForm._id);

    res.status(200).json({ 
      success: true,
      message: 'Form submitted successfully', 
      id: healthForm._id 
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false,
          message: 'Datos de formulario inválidos'
        });
      }
      
      if (error.name === 'MongoServerError') {
        return res.status(500).json({ 
          success: false,
          message: 'Error de base de datos'
        });
      }
    }

    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
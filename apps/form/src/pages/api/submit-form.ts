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

    // Preparar arrays de booleanos (asegurarse de que sean arrays válidos)
    const booleanSections = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    booleanSections.forEach(section => {
      if (!data.medicalData[section] || !Array.isArray(data.medicalData[section])) {
        data.medicalData[section] = [];
      } else {
        // Limpiar el array - convertir strings a booleanos y manejar valores nulos
        data.medicalData[section] = data.medicalData[section].map((value: any) => {
          if (value === 'true') return true;
          if (value === 'false') return false;
          if (value === true || value === false) return value;
          return null;
        }).filter((value: any) => value !== null);
      }
    });

    const healthForm = new HealthForm({
      personalData: data.personalData,
      medicalData: data.medicalData,
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
          message: 'Datos de formulario inválidos',
          error: error.message 
        });
      }
      
      if (error.name === 'MongoServerError') {
        return res.status(500).json({ 
          success: false,
          message: 'Error de base de datos',
          error: 'Database error' 
        });
      }
    }

    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
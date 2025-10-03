import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import HealthForm from '../../models/HealthForm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    // Obtener el último formulario para verificar encriptación
    const latestForm = await HealthForm.findOne().sort({ submissionDate: -1 });
    
    if (!latestForm) {
      return res.status(404).json({ message: 'No forms found' });
    }

    const formData = latestForm.toObject();
    
    // Verificar qué campos están encriptados
    const encryptionCheck = {
      personalData: {},
      medicalData: {},
      metadata: {
        contractAccepted: typeof formData.contractAccepted,
        ipAddress: typeof formData.ipAddress,
        submissionDate: formData.submissionDate
      }
    };

    // Verificar campos de personalData
    Object.keys(formData.personalData || {}).forEach(key => {
      encryptionCheck.personalData[key] = {
        type: typeof formData.personalData[key],
        value: formData.personalData[key]?.substring(0, 20) + '...', // Mostrar solo parte del valor
        encrypted: formData.personalData[key]?.length > 50 // Asumir que valores largos están encriptados
      };
    });

    // Verificar campos de medicalData
    Object.keys(formData.medicalData || {}).forEach(key => {
      encryptionCheck.medicalData[key] = {
        type: typeof formData.medicalData[key],
        value: formData.medicalData[key]?.substring(0, 20) + '...',
        encrypted: formData.medicalData[key]?.length > 50
      };
    });

    res.status(200).json({
      success: true,
      formId: formData._id,
      encryptionCheck
    });
  } catch (error) {
    console.error('Error checking encryption:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking encryption' 
    });
  }
}
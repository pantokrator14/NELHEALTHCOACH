import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import HealthForm from '../../models/HealthForm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const data = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const healthForm = new HealthForm({
      personalData: data.personalData,
      medicalData: data.medicalData,
      contractAccepted: data.contractAccepted,
      ipAddress: clientIP,
    });

    await healthForm.save();

    res.status(200).json({ 
      message: 'Form submitted successfully', 
      id: healthForm._id 
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
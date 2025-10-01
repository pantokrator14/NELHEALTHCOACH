import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../lib/mongodb';
import HealthForm from '../../../models/HealthForm';
import { encrypt } from '../../../lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const data = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Encriptar datos sensibles
    const encryptedPersonalData = {
      name: encrypt(data.personalData.name),
      address: encrypt(data.personalData.address),
      phone: encrypt(data.personalData.phone),
      email: encrypt(data.personalData.email),
      birthDate: encrypt(data.personalData.birthDate),
      gender: encrypt(data.personalData.gender),
      age: data.personalData.age,
      weight: data.personalData.weight,
      height: data.personalData.height,
      maritalStatus: encrypt(data.personalData.maritalStatus),
      education: encrypt(data.personalData.education),
      occupation: encrypt(data.personalData.occupation),
    };

    const encryptedMedicalData = {
      mainComplaint: encrypt(data.medicalData.mainComplaint),
      medications: encrypt(data.medicalData.medications || ''),
      supplements: encrypt(data.medicalData.supplements || ''),
      currentPastConditions: encrypt(data.medicalData.currentPastConditions || ''),
      additionalMedicalHistory: encrypt(data.medicalData.additionalMedicalHistory || ''),
      employmentHistory: encrypt(data.medicalData.employmentHistory || ''),
      hobbies: encrypt(data.medicalData.hobbies || ''),
      allergies: encrypt(data.medicalData.allergies || ''),
      surgeries: encrypt(data.medicalData.surgeries || ''),
      housingHistory: encrypt(data.medicalData.housingHistory || ''),
      carbohydrateAddiction: data.medicalData.carbohydrateAddiction || [],
      leptinResistance: data.medicalData.leptinResistance || [],
      circadianRhythms: data.medicalData.circadianRhythms || [],
      sleepHygiene: data.medicalData.sleepHygiene || [],
      electrosmogExposure: data.medicalData.electrosmogExposure || [],
      generalToxicity: data.medicalData.generalToxicity || [],
      microbiotaHealth: data.medicalData.microbiotaHealth || [],
    };

    const healthForm = new HealthForm({
      personalData: encryptedPersonalData,
      medicalData: encryptedMedicalData,
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
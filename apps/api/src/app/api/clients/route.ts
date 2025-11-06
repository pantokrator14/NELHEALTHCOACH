import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, encrypt, safeDecrypt } from '@/app/lib/encryption';

interface MedicalData {
  mainComplaint: string;
  medications: string;
  supplements: string;
  currentPastConditions: string;
  additionalMedicalHistory: string;
  employmentHistory: string;
  hobbies: string;
  allergies: string;
  surgeries: string;
  housingHistory: string;
  carbohydrateAddiction: string;
  leptinResistance: string;
  circadianRhythms: string;
  sleepHygiene: string;
  electrosmogExposure: string;
  generalToxicity: string;
  microbiotaHealth: string;
  mentalHealthEmotionIdentification: string;
  mentalHealthEmotionIntensity: string;
  mentalHealthUncomfortableEmotion: string;
  mentalHealthInternalDialogue: string;
  mentalHealthStressStrategies: string;
  mentalHealthSayingNo: string;
  mentalHealthRelationships: string;
  mentalHealthExpressThoughts: string;
  mentalHealthEmotionalDependence: string;
  mentalHealthPurpose: string;
  mentalHealthFailureReaction: string;
  mentalHealthSelfConnection: string;
  mentalHealthSelfRelationship: string;
  mentalHealthLimitingBeliefs: string;
  mentalHealthIdealBalance: string;
}

interface PersonalData {
  name: string;
  address: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  age: string;
  weight: string;
  height: string;
  maritalStatus: string;
  education: string;
  occupation: string;
}

interface ClientFormData {
  personalData: PersonalData;
  medicalData: MedicalData;
  contractAccepted: boolean;
}

// GET: Listar todos los clientes (para dashboard)
export async function GET(request: NextRequest) {
  try {
    const healthForms = await getHealthFormsCollection();
    
    const clients = await healthForms
      .find({})
      .sort({ submissionDate: -1 })
      .toArray();

    // Desencriptar solo los datos necesarios para la lista
    const clientList = clients.map(client => {
      const decryptedName = decrypt(client.personalData.name);
      const names = decryptedName.split(' ');
      
      return {
        _id: client._id.toString(),
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: decrypt(client.personalData.email),
        phone: decrypt(client.personalData.phone),
        createdAt: client.submissionDate
      };
    });

    return NextResponse.json({
      success: true,
      data: clientList
    });
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo cliente (desde formulario)
export async function POST(request: NextRequest) {
  try {
    const data: ClientFormData = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'Unknown';

    // Validar datos básicos
    if (!data.personalData || !data.medicalData) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Datos incompletos: personalData y medicalData son requeridos' 
        },
        { status: 400 }
      );
    }

    const healthForms = await getHealthFormsCollection();

    // Función para encriptar objetos
    const encryptObject = (obj: Record<string, any>): Record<string, any> => {
      const encrypted: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.trim() !== '') {
          encrypted[key] = encrypt(value);
        } else {
          encrypted[key] = value;
        }
      }
      return encrypted;
    };

    // Procesar arrays en medicalData
    const processedMedicalData = { ...data.medicalData };
    
    const expectedLengths: Record<string, number> = {
      carbohydrateAddiction: 11,
      leptinResistance: 8,
      circadianRhythms: 11,
      sleepHygiene: 11,
      electrosmogExposure: 10,
      generalToxicity: 8,
      microbiotaHealth: 10,
    };

    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    arrayFields.forEach(field => {
      const arrayData = (processedMedicalData as any)[field];
      const expectedLength = expectedLengths[field];
      
      if (!arrayData || !Array.isArray(arrayData)) {
        (processedMedicalData as any)[field] = JSON.stringify([]);
        return;
      }

      const cleanedArray = arrayData.map((value: any) => {
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

      (processedMedicalData as any)[field] = JSON.stringify(cleanedArray);
    });

    // Encriptar datos antes de guardar
    const encryptedPersonalData = encryptObject(data.personalData);
    const encryptedMedicalData = encryptObject(processedMedicalData);

    const newClient = {
      personalData: encryptedPersonalData,
      medicalData: encryptedMedicalData,
      contractAccepted: encrypt(data.contractAccepted.toString()),
      ipAddress: encrypt(clientIP),
      submissionDate: new Date()
    };

    const result = await healthForms.insertOne(newClient);

    return NextResponse.json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        id: result.insertedId.toString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor al registrar el cliente' 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection } from '@/app/lib/database';
import { encrypt, decrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';

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
  return logger.time('CLIENTS', 'Obtener lista de clientes', async () => {
    try {
      logger.info('CLIENTS', 'Solicitud GET /api/clients recibida', undefined, {
        endpoint: '/api/clients',
        method: 'GET'
      });

      const healthForms = await getHealthFormsCollection();
      
      const totalCount = await healthForms.countDocuments();
      logger.debug('CLIENTS', `Total documentos en BD: ${totalCount}`);

      const clients = await healthForms
        .find({})
        .sort({ submissionDate: -1 })
        .toArray();

      logger.info('CLIENTS', `Documentos obtenidos: ${clients.length}`, {
        firstClientId: clients[0]?._id?.toString()
      });

      // Procesar y desencriptar clientes
      const clientList = clients.map(client => {
        try {
          const decryptedName = decrypt(client.personalData.name);
          const names = decryptedName.split(' ');
          
          const result = {
            _id: client._id.toString(),
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            email: decrypt(client.personalData.email),
            phone: decrypt(client.personalData.phone),
            createdAt: client.submissionDate
          };

          logger.debug('CLIENTS', `Cliente procesado: ${result.firstName} ${result.lastName}`, {
            clientId: client._id.toString()
          });

          return result;

        } catch (error) {
          logger.error('CLIENTS', `Error procesando cliente ${client._id}`, error as Error, {
            clientId: client._id.toString()
          });
          
          return {
            _id: client._id.toString(),
            firstName: 'Error',
            lastName: 'Desencriptación',
            email: 'error@example.com',
            phone: 'N/A',
            createdAt: client.submissionDate
          };
        }
      });

      logger.info('CLIENTS', `Procesamiento completado: ${clientList.length} clientes`, {
        successCount: clientList.filter(c => c.firstName !== 'Error').length,
        errorCount: clientList.filter(c => c.firstName === 'Error').length
      });

      return NextResponse.json({
        success: true,
        data: clientList,
        metadata: {
          total: clientList.length,
          processed: clientList.length
        }
      });

    } catch (error: any) {
      logger.error('CLIENTS', 'Error obteniendo lista de clientes', error, {
        endpoint: '/api/clients',
        method: 'GET'
      });
      
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/clients' });
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

    console.log('🆕 Insertando nuevo cliente en MongoDB...');
    const result = await healthForms.insertOne(newClient);
    
    console.log('✅ Cliente insertado:', {
      insertedId: result.insertedId,
      insertedIdString: result.insertedId.toString(),
      acknowledged: result.acknowledged
    });

    const responseData = {
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        _id: result.insertedId.toString()
      }
    };

    console.log('📤 Enviando respuesta al frontend:', responseData);
    
    return NextResponse.json(responseData, { status: 201 });

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
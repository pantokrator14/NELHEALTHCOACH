import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection, getLeadsCollection, connectMongoose } from '@/app/lib/database';
import { encrypt, decrypt, decryptFileObject, safeDecrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth } from '@/app/lib/auth';
import Coach from '@/app/models/Coach';
import { EmailService } from '@/app/lib/email-service';
import { inngest } from '@/app/inngest/client';
import {
  generateNewClientClientNotificationHTML,
  generateNewClientCoachNotificationHTML,
} from '@/app/lib/email-templates';

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
  // Nuevos campos
  typicalWeekday?: string;
  typicalWeekend?: string;
  whoCooks?: string;
  currentActivityLevel?: string;
  physicalLimitations?: string;
  gymAccess?: string;
  gymAccessDetails?: string;
  preferredExerciseTypes?: string;
  exerciseTimeAvailability?: string;
  documents?: any[];
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

// GET: Listar clientes (dashboard, filtrado por coach)
export async function GET(request: NextRequest) {
  return logger.time('CLIENTS', 'Obtener lista de clientes', async () => {
    try {
      logger.info('CLIENTS', 'Solicitud GET /api/clients recibida', undefined, {
        endpoint: '/api/clients',
        method: 'GET'
      });

      // Autenticar coach
      let auth;
      try {
        auth = requireCoachAuth(request);
      } catch {
        // Si no hay token, devolver todos (backward compat para form)
        auth = null;
      }

      const healthForms = await getHealthFormsCollection();

      // Construir filtro
      const filter: Record<string, unknown> = {};
      if (auth && auth.role === 'coach') {
        // Coach solo ve sus clientes
        filter.coachId = auth.coachId;
      }
      // Admin ve todos (no filtra)
      // Sin auth también ve todos (backward compat)

      const totalCount = await healthForms.countDocuments(filter);
      logger.debug('CLIENTS', `Total documentos en BD para este filtro: ${totalCount}`);

      const clients = await healthForms
        .find(filter)
        .sort({ submissionDate: -1 })
        .toArray();

      logger.info('CLIENTS', `Documentos obtenidos: ${clients.length}`, {
        firstClientId: clients[0]?._id?.toString()
      });

      // ✅ FUNCIÓN MEJORADA PARA DESENCRIPTAR CAMPOS DE TEXTO
      const decryptTextField = (text: string): string => {
        if (!text) return text;
        
        // Si es texto encriptado (comienza con U2FsdGVkX1), desencriptar
        if (text.startsWith('U2FsdGVkX1')) {
          try {
            const bytes = decrypt(text);
            return bytes;
          } catch (error) {
            logger.warn('CLIENTS', 'Error desencriptando campo de texto', undefined, {
              textPreview: text.substring(0, 30)
            });
            return text;
          }
        }
        
        // Si no está encriptado, devolver tal cual
        return text;
      };

      // Procesar y desencriptar clientes
      const clientList = clients.map(client => {
        try {
          // ✅ USAR decryptTextField EN LUGAR DE smartDecrypt PARA CAMPOS DE TEXTO
          const decryptedName = decryptTextField(client.personalData?.name || '');
          const names = decryptedName.split(' ');
          
          // ✅ PROFILE PHOTO - Desencriptar correctamente
          let decryptedProfilePhoto = null;
          if (client.personalData?.profilePhoto) {
            try {
              decryptedProfilePhoto = decryptFileObject(client.personalData.profilePhoto);
            } catch (error) {
              logger.warn('CLIENTS', `Error desencriptando profilePhoto para cliente ${client._id}`, error as Error);
              decryptedProfilePhoto = null;
            }
          }

          const result = {
            _id: client._id.toString(),
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            email: decryptTextField(client.personalData?.email || ''),
            phone: decryptTextField(client.personalData?.phone || ''),
            createdAt: client.submissionDate,
            profilePhoto: decryptedProfilePhoto
          };

          // ✅ LOG PARA VERIFICAR DESENCRIPTACIÓN
          logger.debug('CLIENTS', 'Cliente procesado', {
            clientId: client._id.toString(),
            nameRaw: client.personalData?.name?.substring(0, 30) || 'N/A',
            nameDecrypted: result.firstName + ' ' + result.lastName,
            emailDecrypted: result.email?.substring(0, 30) || 'N/A',
            wasEncrypted: client.personalData?.name?.startsWith('U2FsdGVkX1')
          });

          return result;
        } catch (error) {
          logger.error('CLIENTS', `Error procesando cliente ${client._id}`, error as Error, {
            clientId: client._id.toString(),
            personalDataKeys: Object.keys(client.personalData || {})
          });
          
          return {
            _id: client._id.toString(),
            firstName: 'Error',
            lastName: 'Desencriptación',
            email: 'error@example.com',
            phone: 'N/A',
            createdAt: client.submissionDate,
            profilePhoto: null
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
    const data = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'Unknown';

    // Extraer coachId del body (enviado por el form)
    const coachId = data.coachId || null;

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
        // Manejar array de documentos de forma especial (no encriptar el array completo)
        if (key === 'documents' && Array.isArray(value)) {
          encrypted[key] = value;
          continue;
        }
        
        if (typeof value === 'string' && value.trim() !== '') {
          encrypted[key] = encrypt(value);
        } else if (typeof value === 'object' && value !== null) {
          // ✅ ENCRIPTAR OBJETOS COMPLETOS como profilePhoto y documents
          if (Array.isArray(value)) {
            // Para arrays como documents, encriptar cada elemento del array
            encrypted[key] = encrypt(JSON.stringify(value.map(item => 
              typeof item === 'object' ? encryptObject(item) : item
            )));
          } else {
            // Para objetos como profilePhoto
            encrypted[key] = encrypt(JSON.stringify(encryptObject(value)));
          }
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

      // ✅ CORREGIDO: Ya no convertimos a booleano, mantenemos los strings originales
      const cleanedArray = arrayData.map((value: any) => {
        // Si ya es string, lo dejamos como está
        if (typeof value === 'string') return value;
        // Si es booleano (por si acaso), lo convertimos a 'si'/'no'
        if (typeof value === 'boolean') return value ? 'si' : 'no';
        // Si es número, lo convertimos a string
        if (typeof value === 'number') return value.toString();
        // Por defecto, string vacío
        return '';
      });

      // Asegurar longitud
      if (cleanedArray.length < expectedLength) {
        while (cleanedArray.length < expectedLength) {
          cleanedArray.push('');
        }
      } else if (cleanedArray.length > expectedLength) {
        cleanedArray.length = expectedLength;
      }

      (processedMedicalData as any)[field] = JSON.stringify(cleanedArray);
    });

    // Inicializar array de documentos vacío
    processedMedicalData.documents = [];

    // Encriptar datos antes de guardar
    const encryptedPersonalData = encryptObject(data.personalData);
    const encryptedMedicalData = encryptObject(processedMedicalData);

    const newClient = {
      personalData: encryptedPersonalData,
      medicalData: encryptedMedicalData,
      contractAccepted: encrypt(data.contractAccepted.toString()),
      ipAddress: encrypt(clientIP),
      coachId: coachId || null,
      submissionDate: new Date()
    };

    console.log('🆕 Insertando nuevo cliente en MongoDB...');
    logger.info('CLIENTS', 'Insertando nuevo cliente en MongoDB');
    const result = await healthForms.insertOne(newClient);
    
    console.log('✅ Cliente insertado:', {
      insertedId: result.insertedId,
      insertedIdString: result.insertedId.toString(),
      acknowledged: result.acknowledged
    });
    logger.info('CLIENTS', 'Cliente insertado exitosamente', {
      insertedId: result.insertedId.toString(),
      acknowledged: result.acknowledged
    });

    // Después de la inserción exitosa
    if (result.acknowledged) {
      // Buscar y eliminar el lead correspondiente por email (sin encriptar)
      try {
        const leadsCollection = await getLeadsCollection();
        const emailToMatch = data.personalData.email; // El email viene en texto plano en la request
        const deleteResult = await leadsCollection.deleteOne({ email: emailToMatch });
        if (deleteResult.deletedCount > 0) {
          console.log(`✅ Lead con email ${emailToMatch} eliminado correctamente.`);
          logger.info('CLIENTS', `Lead con email ${emailToMatch} eliminado correctamente`);
        } else {
          console.log(`ℹ️ No se encontró lead con email ${emailToMatch} para eliminar.`);
          logger.info('CLIENTS', `No se encontró lead con email ${emailToMatch} para eliminar`);
        }
      } catch (leadError) {
        // Solo logueamos el error, no interrumpimos el flujo principal
        console.error('❌ Error al eliminar lead:', leadError);
        logger.error('CLIENTS', 'Error al eliminar lead', leadError);
      }

      // 🔥 Disparar generación automática de recomendaciones IA
      if (result.acknowledged) {
        const newClientId = result.insertedId.toString();
        try {
          const jobId = `recommendations_${newClientId}_1_${Date.now()}`;
          await inngest.send({
            name: 'ai.recommendations.requested',
            id: jobId,
            data: {
              clientId: newClientId,
              monthNumber: 1,
              coachNotes: coachId ? 'Cliente recién registrado. Primera evaluación.' : '',
              maxRevisions: 2,
            },
          });
          logger.info('CLIENTS', 'Evento Inngest enviado para generación automática de IA', {
            clientId: newClientId,
            jobId,
          });
        } catch (inngestError) {
          logger.error('CLIENTS', 'Error enviando evento Inngest', inngestError);
        }
      }

      // Enviar emails de notificación si hay coachId
      if (coachId && result.acknowledged) {
        try {
          await connectMongoose();
          const coach = await Coach.findById(coachId);
          if (coach) {
            const emailService = EmailService.getInstance();
            const appUrl = process.env.APP_URL || 'https://dashboard.nelhealthcoach.com';

            const clientName = decrypt(data.personalData.name || '');
            const clientEmail = data.personalData.email;
            const clientPhone = data.personalData.phone ? decrypt(data.personalData.phone) : '';
            const coachName = `${decrypt(coach.firstName)} ${decrypt(coach.lastName)}`;
            const coachEmail = decrypt(coach.email);
            const coachPhone = coach.phone ? decrypt(coach.phone) : '';
            const coachPhotoUrl = coach.profilePhoto?.url ? decrypt(coach.profilePhoto.url) : null;

            await emailService.sendEmail({
              to: [clientEmail],
              subject: '¡Bienvenido a NELHEALTHCOACH!',
              htmlBody: generateNewClientClientNotificationHTML({
                clientName,
                coachName,
                coachEmail,
                coachPhone,
                coachPhoto: coachPhotoUrl,
              }),
            });

            await emailService.sendEmail({
              to: [coachEmail],
              subject: `Nuevo cliente registrado: ${clientName} | NELHEALTHCOACH`,
              htmlBody: generateNewClientCoachNotificationHTML({
                coachName: decrypt(coach.firstName),
                clientName,
                clientEmail,
                clientPhone: clientPhone || 'No disponible',
                clientId: result.insertedId.toString(),
                dashboardUrl: `${appUrl}/dashboard/clients/${result.insertedId}`,
              }),
            });

            logger.info('CLIENTS', 'Emails de notificación enviados', {
              clientId: result.insertedId.toString(),
              coachId,
            });
          }
        } catch (emailError) {
          // No interrumpir el flujo si falla el email
          logger.error('CLIENTS', 'Error enviando emails de notificación', emailError);
        }
      }
    }

    const responseData = {
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        _id: result.insertedId.toString()
      }
    };

    console.log('📤 Enviando respuesta al frontend:', responseData);
    logger.info('CLIENTS', 'Enviando respuesta al frontend', responseData);
    
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    logger.error('CLIENTS', 'Error creando cliente', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor al registrar el cliente' 
      },
      { status: 500 }
    );
  }
}
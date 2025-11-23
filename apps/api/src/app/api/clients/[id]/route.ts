// apps/api/src/app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, encrypt, safeDecrypt, smartDecrypt } from '@/app/lib/encryption';
import { requireAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';

// GET: Obtener un cliente específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('CLIENTS', 'Obtener cliente específico', async () => {
    try {
      const { id } = await params;
      
      logger.info('CLIENTS', 'Solicitud GET /api/clients/[id] recibida', undefined, {
        endpoint: `/api/clients/${id}`,
        method: 'GET',
        clientId: id
      });

      // Verificar autenticación
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const healthForms = await getHealthFormsCollection();
      
      logger.debug('CLIENTS', 'Buscando cliente en la base de datos', { clientId: id });

      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        logger.warn('CLIENTS', 'Cliente no encontrado', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }
      logger.debug('CLIENTS', 'Estructura del cliente en BD:', {
        clientId: client._id.toString(),
        personalDataKeys: Object.keys(client.personalData || {}),
        medicalDataKeys: Object.keys(client.medicalData || {}),
        hasProfilePhoto: !!client.personalData.profilePhoto,
        profilePhotoType: typeof client.personalData.profilePhoto,
        hasDocuments: !!client.medicalData.documents,
        documentsType: typeof client.medicalData.documents,
        sampleMedicalField: {
          carbohydrateAddiction: {
            value: client.medicalData.carbohydrateAddiction,
            type: typeof client.medicalData.carbohydrateAddiction,
            preview: typeof client.medicalData.carbohydrateAddiction === 'string' ? 
              client.medicalData.carbohydrateAddiction.substring(0, 50) + '...' : 'N/A'
          }
        }
      });
      logger.debug('CLIENTS', 'Cliente encontrado', {
        clientId: client._id.toString(),
        hasPersonalData: !!client.personalData,
        personalDataKeys: Object.keys(client.personalData || {})
      });

      // Función para desencriptar objetos - MEJORADA
      const decryptObject = (obj: Record<string, any>, path: string = ''): Record<string, any> => {
        const decrypted: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          // ✅ DEFINIR campos que NUNCA deben desencriptarse
          const isFileField = (currentPath.includes('profilePhoto.url') || 
                              currentPath.includes('profilePhoto.key') || 
                              currentPath.includes('documents.url') ||
                              currentPath.includes('documents.key') ||
                              (currentPath === 'profilePhoto.type') ||
                              (currentPath === 'documents.type') ||
                              currentPath.includes('uploadedAt'));
          
          if (typeof value === 'string' && value.trim() !== '') {
            if (isFileField) {
              // Para campos de archivos específicos, no desencriptar
              decrypted[key] = value;
            } else {
              // ✅ USAR smartDecrypt para manejar automáticamente textos encriptados y no encriptados
              decrypted[key] = smartDecrypt(value);
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursivamente desencriptar objetos anidados
            decrypted[key] = decryptObject(value, currentPath);
          } else {
            decrypted[key] = value;
          }
        }
        
        return decrypted;
      };

      // Función para desencriptar arrays de objetos (como documents)
      const decryptArray = (encryptedArray: string): any[] => {
        if (!encryptedArray) return [];
        
        try {
          // Primero desencriptar el string completo
          const decryptedString = decrypt(encryptedArray);
          // Luego parsear como JSON
          const parsedArray = JSON.parse(decryptedString);
          
          if (!Array.isArray(parsedArray)) {
            logger.warn('ENCRYPTION', 'El resultado desencriptado no es un array', { 
              decryptedString: decryptedString.substring(0, 100) 
            });
            return [];
          }
          
          // Desencriptar cada objeto en el array
          return parsedArray.map(item => {
            if (typeof item === 'object' && item !== null) {
              const decryptedItem: any = {};
              for (const [key, value] of Object.entries(item)) {
                if (typeof value === 'string') {
                  try {
                    decryptedItem[key] = decrypt(value);
                  } catch (error) {
                    decryptedItem[key] = value; // Mantener original si falla
                    logger.debug('ENCRYPTION', `No se pudo desencriptar campo ${key} en documento`, { value });
                  }
                } else {
                  decryptedItem[key] = value;
                }
              }
              return decryptedItem;
            }
            return item;
          });
        } catch (error) {
          logger.error('ENCRYPTION', 'Error desencriptando array', error as Error, {
            encryptedArray: encryptedArray?.substring(0, 100)
          });
          return [];
        }
      };

      // Desencriptar datos del cliente
      const decryptedClient = {
        _id: client._id.toString(),
        personalData: decryptObject(client.personalData),
        medicalData: decryptObject(client.medicalData),
        contractAccepted: safeDecrypt(client.contractAccepted) === 'true',
        ipAddress: safeDecrypt(client.ipAddress),
        submissionDate: client.submissionDate
      };

      logger.debug('CLIENTS', 'Verificación de datos desencriptados', {
        clientId: id,
        name: decryptedClient.personalData.name ? 'DESENCRIPTADO' : 'FALLO',
        email: decryptedClient.personalData.email ? 'DESENCRIPTADO' : 'FALLO',
        hasProfilePhoto: !!decryptedClient.personalData.profilePhoto,
        profilePhotoUrl: decryptedClient.personalData.profilePhoto?.url ? 'EXISTS' : 'MISSING',
        documentCount: decryptedClient.medicalData.documents?.length || 0
      });

      // Procesar arrays en medicalData
      const arrayFields = [
        'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
        'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
      ];

      arrayFields.forEach(field => {
        const fieldData = (decryptedClient.medicalData as any)[field];
        
        if (!fieldData) {
          (decryptedClient.medicalData as any)[field] = [];
          return;
        }

        if (Array.isArray(fieldData)) {
          // Si ya es array, usarlo directamente
          (decryptedClient.medicalData as any)[field] = fieldData;
        } else if (typeof fieldData === 'string') {
          // ✅ USAR smartDecrypt que maneja automáticamente encriptación
          try {
            const decryptedString = smartDecrypt(fieldData);
            const parsed = JSON.parse(decryptedString);
            
            if (Array.isArray(parsed)) {
              (decryptedClient.medicalData as any)[field] = parsed;
              logger.debug('CLIENTS', `${field} procesado exitosamente`, {
                clientId: id,
                wasEncrypted: fieldData !== decryptedString,
                arrayLength: parsed.length
              });
            } else {
              throw new Error('El resultado no es un array');
            }
          } catch (error) {
            logger.warn('CLIENTS', `Error procesando ${field}, intentando parse directo`, undefined, {
              clientId: id,
              field
            });
            
            // Intentar parsear como JSON directamente (caso no encriptado)
            try {
              const parsed = JSON.parse(fieldData);
              if (Array.isArray(parsed)) {
                (decryptedClient.medicalData as any)[field] = parsed;
                logger.debug('CLIENTS', `${field} procesado como JSON no encriptado`, {
                  clientId: id,
                  arrayLength: parsed.length
                });
              } else {
                throw new Error('No es un array');
              }
            } catch (parseError) {
              logger.error('CLIENTS', `Error procesando ${field} como string`, error as Error, {
                clientId: id,
                field
              });
              (decryptedClient.medicalData as any)[field] = [];
            }
          }
        } else if (typeof fieldData === 'object') {
          // ✅ CRÍTICO: Si es objeto, convertirlo a array
          try {
            // Intentar extraer valores si es un objeto con claves numéricas
            const values = Object.values(fieldData);
            
            // Filtrar solo booleanos y crear array
            const booleanArray = values.filter(val => 
              typeof val === 'boolean' || val === 'true' || val === 'false'
            ).map(val => 
              val === 'true' ? true : val === 'false' ? false : Boolean(val)
            );
            
            if (booleanArray.length > 0) {
              (decryptedClient.medicalData as any)[field] = booleanArray;
              logger.debug('CLIENTS', `${field} convertido de objeto a array`, {
                clientId: id,
                originalKeys: Object.keys(fieldData),
                arrayLength: booleanArray.length
              });
            } else {
              // Si no podemos extraer valores booleanos, usar array por defecto
              throw new Error('No se pudieron extraer valores booleanos del objeto');
            }
          } catch (error) {
            logger.error('CLIENTS', `Error convirtiendo ${field} de objeto a array`, error as Error, {
              clientId: id,
              field,
              fieldData
            });
            
            // Usar array por defecto basado en longitud esperada
            const expectedLengths: Record<string, number> = {
              carbohydrateAddiction: 11,
              leptinResistance: 8,
              circadianRhythms: 11,
              sleepHygiene: 11,
              electrosmogExposure: 10,
              generalToxicity: 8,
              microbiotaHealth: 10,
            };
            
            const expectedLength = expectedLengths[field] || 0;
            (decryptedClient.medicalData as any)[field] = Array(expectedLength).fill(false);
            logger.info('CLIENTS', `${field} recuperado con array por defecto`, { 
              clientId: id,
              length: expectedLength 
            });
          }
        } else {
          (decryptedClient.medicalData as any)[field] = [];
          logger.warn('CLIENTS', `Campo ${field} tiene tipo no manejado, usando array vacío`, {
            clientId: id,
            actualType: typeof fieldData
          });
        }
      });

      // Procesar documents
      if (decryptedClient.medicalData.documents) {
        if (Array.isArray(decryptedClient.medicalData.documents)) {
          logger.debug('CLIENTS', 'Documents ya es un array', {
            clientId: id,
            documentCount: decryptedClient.medicalData.documents.length
          });
        } else if (typeof decryptedClient.medicalData.documents === 'string') {
          try {
            const decryptedString = decrypt(decryptedClient.medicalData.documents);
            const parsed = JSON.parse(decryptedString);
            decryptedClient.medicalData.documents = Array.isArray(parsed) ? parsed : [];
            logger.debug('CLIENTS', 'Documents desencriptado y parseado', {
              clientId: id,
              documentCount: decryptedClient.medicalData.documents.length
            });
          } catch (error) {
            logger.error('CLIENTS', 'Error procesando documents', error as Error, { clientId: id });
            decryptedClient.medicalData.documents = [];
          }
        } else if (typeof decryptedClient.medicalData.documents === 'object') {
          // Si documents es un objeto, convertirlo a array
          try {
            const documentsArray = Object.values(decryptedClient.medicalData.documents);
            decryptedClient.medicalData.documents = documentsArray.filter(doc => 
              doc && typeof doc === 'object' && doc.url
            );
            logger.debug('CLIENTS', 'Documents convertido de objeto a array', {
              clientId: id,
              documentCount: decryptedClient.medicalData.documents.length
            });
          } catch (error) {
            logger.error('CLIENTS', 'Error convirtiendo documents de objeto a array', error as Error, { clientId: id });
            decryptedClient.medicalData.documents = [];
          }
        } else {
          decryptedClient.medicalData.documents = [];
        }
      } else {
        decryptedClient.medicalData.documents = [];
      }

      logger.info('CLIENTS', 'Cliente desencriptado exitosamente', { clientId: id });

      return NextResponse.json({
        success: true,
        data: decryptedClient
      });

      

    } catch (error: any) {
      logger.error('CLIENTS', 'Error obteniendo cliente', error, {
        endpoint: `/api/clients/${(await params).id}`,
        method: 'GET',
        clientId: (await params).id
      });
      
      if (error.message.includes('Token')) {
        return NextResponse.json(
          { success: false, message: 'No autorizado' },
          { status: 401 }
        );
      }

      if (error.message.includes('ObjectId')) {
        return NextResponse.json(
          { success: false, message: 'ID de cliente inválido' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}`, clientId: (await params).id });
}

// PUT: Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('CLIENTS', 'Actualizar cliente', async () => {
    try {
      const { id } = await params;
      
      logger.info('CLIENTS', 'Solicitud PUT /api/clients/[id] recibida', undefined, {
        endpoint: `/api/clients/${id}`,
        method: 'PUT',
        clientId: id
      });

      // === DEFINICIONES CRÍTICAS ===
      const arrayFields = [
        'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
        'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
      ];

      const expectedLengths: Record<string, number> = {
        carbohydrateAddiction: 11,
        leptinResistance: 8,
        circadianRhythms: 11,
        sleepHygiene: 11,
        electrosmogExposure: 10,
        generalToxicity: 8,
        microbiotaHealth: 10,
      };
      // === FIN DEFINICIONES ===

      logger.debug('CLIENTS', 'Definiciones cargadas para actualización', {
        clientId: id,
        arrayFields,
        expectedLengths
      });

      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const data = await request.json();
      
      logger.debug('CLIENTS', 'Datos recibidos para actualización', {
        clientId: id,
        personalDataKeys: Object.keys(data.personalData || {}),
        medicalDataKeys: Object.keys(data.medicalData || {}),
        evaluationFields: arrayFields.map(field => ({
          field,
          value: data.medicalData?.[field],
          type: typeof data.medicalData?.[field],
          isArray: Array.isArray(data.medicalData?.[field])
        }))
      });

      const healthForms = await getHealthFormsCollection();

      // Validar datos
      if (!data.personalData || !data.medicalData) {
        logger.warn('CLIENTS', 'Datos incompletos para actualización', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Datos incompletos' },
          { status: 400 }
        );
      }

      // Función para encriptar objetos - MEJORADA
      const encryptObject = (obj: Record<string, any>): Record<string, any> => {
        const encrypted: Record<string, any> = {};
        const keys = Object.keys(obj);
        
        logger.debug('ENCRYPTION', 'Encriptando objeto', { 
          clientId: id,
          keyCount: keys.length 
        });
        
        for (const [key, value] of Object.entries(obj)) {
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
      
      logger.debug('CLIENTS', 'Procesando arrays médicos para encriptación', {
        clientId: id,
        arrayFields
      });

      arrayFields.forEach(field => {
        const arrayData = (processedMedicalData as any)[field];
        const expectedLength = expectedLengths[field];
        
        if (!arrayData || !Array.isArray(arrayData)) {
          logger.warn('CLIENTS', `Array ${field} no válido, usando array vacío`, undefined, { clientId: id });
          (processedMedicalData as any)[field] = encrypt(JSON.stringify([]));
          return;
        }

        const cleanedArray = arrayData.map((value: any) => {
          if (value === 'true') return true;
          if (value === 'false') return false;
          return Boolean(value);
        });

        // Asegurar longitud
        if (cleanedArray.length < expectedLength) {
          logger.debug('CLIENTS', `Extendiendo array ${field} a longitud esperada`, {
            clientId: id,
            currentLength: cleanedArray.length,
            expectedLength
          });
          while (cleanedArray.length < expectedLength) {
            cleanedArray.push(false);
          }
        } else if (cleanedArray.length > expectedLength) {
          logger.debug('CLIENTS', `Recortando array ${field} a longitud esperada`, {
            clientId: id,
            currentLength: cleanedArray.length,
            expectedLength
          });
          cleanedArray.length = expectedLength;
        }

        // ENCRIPTAR el array como string JSON
        (processedMedicalData as any)[field] = encrypt(JSON.stringify(cleanedArray));
        
        logger.debug('CLIENTS', `Array ${field} procesado y encriptado`, {
          clientId: id,
          finalLength: cleanedArray.length
        });
      });

      // Procesar documents para encriptación
      if (processedMedicalData.documents && Array.isArray(processedMedicalData.documents)) {
        processedMedicalData.documents = encrypt(JSON.stringify(processedMedicalData.documents.map(doc => 
          encryptObject(doc)
        )));
        logger.debug('CLIENTS', 'Documents procesado y encriptado', {
          clientId: id,
          documentCount: data.medicalData.documents.length
        });
      } else {
        processedMedicalData.documents = encrypt(JSON.stringify([]));
      }

      // Procesar profilePhoto para encriptación
      const processedPersonalData = { ...data.personalData };
      if (processedPersonalData.profilePhoto && typeof processedPersonalData.profilePhoto === 'object') {
        processedPersonalData.profilePhoto = encrypt(JSON.stringify(encryptObject(processedPersonalData.profilePhoto)));
        logger.debug('CLIENTS', 'ProfilePhoto procesado y encriptado', { clientId: id });
      }

      // Encriptar datos
      logger.debug('ENCRYPTION', 'Encriptando datos personales y médicos', { clientId: id });
      
      const encryptedPersonalData = encryptObject(processedPersonalData);
      const encryptedMedicalData = encryptObject(processedMedicalData);

      const updateData = {
        personalData: encryptedPersonalData,
        medicalData: encryptedMedicalData,
        contractAccepted: encrypt(data.contractAccepted.toString()),
        updatedAt: new Date()
      };

      // Logs de verificación
      logger.debug('ENCRYPTION', 'Datos encriptados', {
        hasProfilePhoto: !!encryptedPersonalData.profilePhoto,
        profilePhotoEncrypted: typeof encryptedPersonalData.profilePhoto === 'string',
        hasDocuments: !!encryptedMedicalData.documents,
        documentsEncrypted: typeof encryptedMedicalData.documents === 'string'
      });

      logger.debug('CLIENTS', 'Ejecutando actualización en base de datos', { clientId: id });

      const result = await healthForms.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      logger.debug('CLIENTS', 'Resultado de la actualización', {
        clientId: id,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });

      if (result.matchedCount === 0) {
        logger.warn('CLIENTS', 'Cliente no encontrado para actualización', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      logger.info('CLIENTS', 'Cliente actualizado exitosamente', { clientId: id });

      return NextResponse.json({
        success: true,
        message: 'Cliente actualizado exitosamente'
      });

    } catch (error: any) {
      logger.error('CLIENTS', 'Error actualizando cliente', error, {
        endpoint: `/api/clients/${(await params).id}`,
        method: 'PUT',
        clientId: (await params).id
      });
      
      if (error.message.includes('Token')) {
        return NextResponse.json(
          { success: false, message: 'No autorizado' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          message: 'Error interno del servidor',
          ...(process.env.NODE_ENV === 'development' && { 
            error: error.message
          })
        },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}`, clientId: (await params).id });
}

// DELETE: Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('CLIENTS', 'Eliminar cliente', async () => {
    try {
      const { id } = await params;
      
      logger.info('CLIENTS', 'Solicitud DELETE /api/clients/[id] recibida', undefined, {
        endpoint: `/api/clients/${id}`,
        method: 'DELETE',
        clientId: id
      });

      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const healthForms = await getHealthFormsCollection();
      
      logger.debug('CLIENTS', 'Ejecutando eliminación en base de datos', { clientId: id });

      const result = await healthForms.deleteOne({ _id: new ObjectId(id) });

      logger.debug('CLIENTS', 'Resultado de la eliminación', {
        clientId: id,
        deletedCount: result.deletedCount
      });

      if (result.deletedCount === 0) {
        logger.warn('CLIENTS', 'Cliente no encontrado para eliminación', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      logger.info('CLIENTS', 'Cliente eliminado exitosamente', { clientId: id });

      return NextResponse.json({
        success: true,
        message: 'Cliente eliminado exitosamente'
      });

    } catch (error: any) {
      logger.error('CLIENTS', 'Error eliminando cliente', error, {
        endpoint: `/api/clients/${(await params).id}`,
        method: 'DELETE',
        clientId: (await params).id
      });
      
      if (error.message.includes('Token')) {
        return NextResponse.json(
          { success: false, message: 'No autorizado' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}`, clientId: (await params).id });
}
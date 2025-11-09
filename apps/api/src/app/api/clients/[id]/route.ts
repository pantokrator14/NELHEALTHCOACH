// apps/api/src/app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, encrypt, safeDecrypt, encryptObject } from '@/app/lib/encryption';
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

      logger.debug('CLIENTS', 'Cliente encontrado', {
        clientId: client._id.toString(),
        hasPersonalData: !!client.personalData,
        personalDataKeys: Object.keys(client.personalData || {})
      });

      // Función para desencriptar objetos
      const decryptObject = (obj: Record<string, any>): Record<string, any> => {
        const decrypted: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.trim() !== '') {
            try {
              const decryptedValue = decrypt(value);
              decrypted[key] = decryptedValue;
            } catch (error) {
              logger.warn('ENCRYPTION', `No se pudo desencriptar ${key}`, error as Error, { clientId: id });
              decrypted[key] = value;
            }
          } else {
            decrypted[key] = value;
          }
        }
        return decrypted;
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

      // Procesar arrays en medicalData
      const arrayFields = [
        'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
        'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
      ];

      arrayFields.forEach(field => {
        const encryptedFieldData = (decryptedClient.medicalData as any)[field];
        
        if (!encryptedFieldData) {
          (decryptedClient.medicalData as any)[field] = [];
          return;
        }

        if (typeof encryptedFieldData === 'string') {
          try {
            logger.debug('ENCRYPTION', `Desencriptando campo médico: ${field}`, { clientId: id });
            
            const decryptedString = decrypt(encryptedFieldData);
            logger.debug('ENCRYPTION', `${field} desencriptado`, { 
              clientId: id,
              decryptedLength: decryptedString.length 
            });
            
            const parsed = JSON.parse(decryptedString);
            (decryptedClient.medicalData as any)[field] = Array.isArray(parsed) ? parsed : [];
            
            logger.debug('CLIENTS', `${field} parseado como array`, {
              clientId: id,
              arrayLength: (decryptedClient.medicalData as any)[field].length
            });
            
          } catch (error) {
            logger.error('CLIENTS', `Error desencriptando/parseando ${field}`, error as Error, {
              clientId: id,
              field
            });
            
            // Recuperación especial para campos problemáticos
            if (field === 'generalToxicity') {
              logger.debug('CLIENTS', `Aplicando recuperación especial para ${field}`, { clientId: id });
              try {
                const expectedLength = 8;
                (decryptedClient.medicalData as any)[field] = Array(expectedLength).fill(false);
                logger.info('CLIENTS', `${field} recuperado con array por defecto`, { clientId: id });
              } catch (recoveryError) {
                logger.error('CLIENTS', `Recuperación falló para ${field}`, recoveryError as Error, { clientId: id });
                (decryptedClient.medicalData as any)[field] = [];
              }
            } else {
              (decryptedClient.medicalData as any)[field] = [];
            }
          }
        } else if (Array.isArray(encryptedFieldData)) {
          (decryptedClient.medicalData as any)[field] = encryptedFieldData;
        } else {
          (decryptedClient.medicalData as any)[field] = [];
        }
      });

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

      // Función para encriptar objetos
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

      // Encriptar datos
      logger.debug('ENCRYPTION', 'Encriptando datos personales y médicos', { clientId: id });
      
      const encryptedPersonalData = encryptObject(data.personalData);
      const encryptedMedicalData = encryptObject(processedMedicalData);

      const updateData = {
        personalData: encryptedPersonalData,
        medicalData: encryptedMedicalData,
        contractAccepted: encrypt(data.contractAccepted.toString()),
        updatedAt: new Date()
      };

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
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getHealthFormsCollection } from '@/app/lib/database';
import { S3Service, UploadedFile } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { decrypt, encrypt, encryptFileObject, safeDecrypt } from '@/app/lib/encryption';
import { requireCoachAuth, generateToken } from '@/app/lib/auth';
import jwt from 'jsonwebtoken';
import { apiHandler } from '@/app/lib/apiHandler';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Verifica que el coach autenticado sea admin o el coach asignado al cliente.
 * Como fallback, acepta un token de upload temporal (X-Upload-Token) generado
 * durante la creación del cliente para que el formulario pueda subir archivos.
 * Devuelve el cliente si existe, o lanza una respuesta 401/403.
 * NOTA: Los throw usan objetos con {status, message} para que los catch blocks
 * los distingan de errores inesperados (Error sin .status).
 */
async function authorizeCoachForClient(request: NextRequest, clientId: string): Promise<{ auth: any, client: any }> {
  let auth;
  try {
    auth = requireCoachAuth(request);
  } catch {
    // Si no hay auth de coach, intentar con token de upload temporal
    auth = null;
  }

  const healthForms = await getHealthFormsCollection();
  const client = await healthForms.findOne(
    { _id: new ObjectId(clientId) },
    { projection: { coachId: 1 } }
  );
  if (!client) {
    throw { status: 404, message: 'Cliente no encontrado' };
  }

  // Si hay auth de coach, verificar permisos
  if (auth) {
    if (auth.role !== 'admin' && client.coachId !== auth.coachId) {
      throw { status: 403, message: 'No tienes permiso para modificar este cliente' };
    }
    return { auth, client };
  }

  // Fallback: verificar token de upload temporal (cliente recién registrado)
  const uploadToken = request.headers.get('x-upload-token');
  if (!uploadToken) {
    throw { status: 401, message: 'No autorizado' };
  }

  try {
    const decoded = jwt.verify(uploadToken, JWT_SECRET) as { type: string; clientId: string };
    if (decoded.type !== 'client-upload' || decoded.clientId !== clientId) {
      throw { status: 401, message: 'Token de upload inválido' };
    }
    return { auth: null, client };
  } catch (e: any) {
    if (e?.status) throw e;
    throw { status: 401, message: 'Token de upload inválido o expirado' };
  }
}

// GET: Obtener URL firmada de descarga para un documento (requiere auth)
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fileKey: string | null = null;
  try {
    const { id } = await params;
    await authorizeCoachForClient(request, id);

    fileKey = request.nextUrl.searchParams.get('fileKey');
    if (!fileKey) {
      return NextResponse.json({ success: false, message: 'fileKey requerido' }, { status: 400 });
    }

    const s3 = new S3Client({
      region: process.env.AWS_REGION! || 'us-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const bucket = process.env.AWS_S3_BUCKET_NAME! || 'nelhealthcoach-bucket';
    const command = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
    const downloadURL = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return NextResponse.json({ success: true, data: { downloadURL } });
  } catch (error: any) {
    if (error?.status) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    logger.error('UPLOAD', 'Error generando URL de descarga', error as Error, { fileKey });
    return NextResponse.json({ success: false, message: 'Error generando URL' }, { status: 500 });
  }
}

export const GET = apiHandler(getHandler);

// POST: Obtener URLs para upload (requiere auth)
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Generar URL de upload', async () => {
    try {
      const { id } = await params;

      // Verificar autenticación + ownership
      await authorizeCoachForClient(request, id);
      
      console.log('🔑 Solicitando URL de upload para cliente:', id);
      logger.info('UPLOAD', `Solicitando URL de upload para cliente: ${id}`);
      
      // VALIDACIÓN CRÍTICA: Verificar que el clientId es válido
      if (!id || id === 'undefined') {
        logger.warn('UPLOAD', 'Client ID no válido o undefined', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Client ID no válido' },
          { status: 400 }
        );
      }

      const { fileName, fileType, fileSize, fileCategory } = await request.json();

      logger.info('UPLOAD', 'Solicitud de upload recibida', {
        fileName,
        fileType,
        fileSize,
        fileCategory
      }, { clientId: id });

      // Validaciones de tipo de archivo
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedDocumentTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (fileCategory === 'profile' && !allowedImageTypes.includes(fileType)) {
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido para foto de perfil' },
          { status: 400 }
        );
      }

      if (fileCategory === 'document' && !allowedDocumentTypes.includes(fileType)) {
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido para documentos' },
          { status: 400 }
        );
      }

      // Validar tamaño de archivo
      const maxSize = 5 * 1024 * 1024;
      if (fileSize > maxSize) {
        return NextResponse.json(
          { success: false, message: 'El archivo es demasiado grande (máximo 5MB)' },
          { status: 400 }
        );
      }

      console.log('🔧 Llamando a S3Service.generateUploadURL...');
      logger.debug('UPLOAD', 'Llamando a S3Service.generateUploadURL');
      const { uploadURL, fileKey } = await S3Service.generateUploadURL(
        fileName,
        fileType,
        fileSize,
        fileCategory
      );

      logger.info('UPLOAD', 'URL de upload generada exitosamente', {
        fileName,
        fileType,
        fileSize,
        fileCategory,
        s3Key: fileKey
      }, { clientId: id });

      return NextResponse.json({
        success: true,
        data: {
          uploadURL,
          fileKey,
          fileURL: await S3Service.getFileURL(fileKey)
        }
      });

    } catch (error: any) {
      if (error?.status) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status });
      }
      console.error('❌ Error en POST /upload:', error);
      logger.error('UPLOAD', 'Error generando URL de upload', error, undefined, {
        clientId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}/upload`, method: 'POST', clientId: (await params).id });
}

export const POST = apiHandler(postHandler);

// PUT: Confirmar upload y guardar referencia (requiere auth)
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Confirmar upload y guardar referencia', async () => {
    let body: { fileKey?: string; fileName?: string; fileType?: string; fileSize?: number; fileCategory?: string; fileURL?: string } | undefined;
    try {
      const { id } = await params;

      // Verificar autenticación + ownership
      await authorizeCoachForClient(request, id);

      body = await request.json();
      const fileKey = (body?.fileKey || '') as string;
      const fileName = (body?.fileName || '') as string;
      const fileType = (body?.fileType || '') as string;
      const fileSize = (body?.fileSize || 0) as number;
      const fileCategory = (body?.fileCategory || '') as string;
      const fileURL = (body?.fileURL || '') as string;

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      const uploadedFile = {
        url: fileURL,
        key: fileKey,
        name: fileName,
        type: fileType,
        size: fileSize,
        uploadedAt: new Date().toISOString()
      };

      // ✅ ELIMINAR FOTO DE PERFIL ANTERIOR - VERSIÓN MEJORADA
      if (fileCategory === 'profile') {
        try {
          const currentProfilePhoto = client.personalData?.profilePhoto;
          
          if (currentProfilePhoto) {
            let oldFileKey = currentProfilePhoto.key;
            
            // ✅ DESENCRIPTAR LA KEY SI ESTÁ ENCRIPTADA
            if (typeof oldFileKey === 'string' && oldFileKey.startsWith('U2FsdGVkX1')) {
              oldFileKey = decrypt(oldFileKey);
              logger.debug('UPLOAD', 'Key de foto anterior desencriptada', {
                clientId: id,
                encryptedKey: currentProfilePhoto.key.substring(0, 30) + '...',
                decryptedKey: oldFileKey
              });
            }
            
            // ✅ VERIFICAR QUE NO SEA LA MISMA FOTO (por si acaso)
            if (oldFileKey && oldFileKey !== fileKey) {
              logger.info('UPLOAD', '🗑️ Eliminando foto de perfil anterior de S3', {
                clientId: id,
                oldKey: oldFileKey,
                newKey: fileKey
              });
              
              try {
                await S3Service.deleteFile(oldFileKey);
                logger.info('UPLOAD', '✅ Foto anterior eliminada de S3', {
                  clientId: id,
                  oldKey: oldFileKey
                });
              } catch (s3Error) {
                logger.error('UPLOAD', '⚠️ Error eliminando foto anterior de S3', s3Error as Error, {
                  clientId: id,
                  oldKey: oldFileKey
                });
                // No fallar la operación principal
              }
            } else if (oldFileKey === fileKey) {
              logger.debug('UPLOAD', '📸 Misma foto, no es necesario eliminar', {
                clientId: id,
                fileKey
              });
            }
          } else {
            logger.debug('UPLOAD', '📸 No hay foto anterior que eliminar', { clientId: id });
          }
        } catch (error) {
          logger.error('UPLOAD', '❌ Error en proceso de eliminación de foto anterior', error as Error, {
            clientId: id
          });
          // No fallar la operación principal si la eliminación falla
        }
      }

      // ✅ ENCRIPTAR EL NUEVO ARCHIVO
      let encryptedFile = encryptFileObject(uploadedFile);

      let updateData: any = {};

      if (fileCategory === 'profile') {
        updateData = { 
          $set: { 
            'personalData.profilePhoto': encryptedFile,
            updatedAt: new Date()
          } 
        };
      } else {
        let existingDocuments = client.medicalData?.documents;
        let documentsArray: any[] = [];

        if (typeof existingDocuments === 'string') {
          // Desencriptar y parsear string
          try {
            const decryptedString = decrypt(existingDocuments);
            const parsed = JSON.parse(decryptedString);
            if (Array.isArray(parsed)) {
              documentsArray = parsed;
              logger.info('UPLOAD', 'Documentos existentes convertidos de string a array', {
                clientId: id,
                arrayLength: documentsArray.length
              });
            }
          } catch (error) {
            logger.warn('UPLOAD', 'Error parseando documentos existentes como string', error as Error, {
              clientId: id
            });
            // Continuar con array vacío
          }
        } else if (Array.isArray(existingDocuments)) {
          documentsArray = existingDocuments;
        }

        // Agregar nuevo documento al array
        documentsArray.push(encryptedFile);

        updateData = {
          $set: {
            'medicalData.documents': documentsArray,
            updatedAt: new Date()
          }
        };
      }

      const result = await healthForms.updateOne(
        { _id: new ObjectId(id) },
        updateData
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'No se pudo guardar la referencia del archivo' },
          { status: 500 }
        );
      }

      logger.info('UPLOAD', '✅ Archivo guardado exitosamente', {
        clientId: id,
        fileCategory,
        fileName
      });

      return NextResponse.json({
        success: true,
        message: 'Archivo guardado exitosamente',
        data: uploadedFile
      });

    } catch (error: any) {
      if (error?.status) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status });
      }
      const err = error as Error;
      console.error('❌ Error en PUT /upload:', err);
      try {
        logger.error('UPLOAD', 'Error guardando referencia de archivo', err, {
          fileName: body?.fileName || 'unknown',
          fileCategory: body?.fileCategory || 'unknown'
        }, {
          clientId: (await params).id
        });
      } catch {
        logger.error('UPLOAD', 'Error guardando referencia de archivo', err, undefined, {
          clientId: (await params).id
        });
      }
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}/upload`, method: 'PUT', clientId: (await params).id });
}

export const PUT = apiHandler(putHandler);

// DELETE: Eliminar documento (requiere auth)
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Eliminar documento', async () => {
    try {
      const { id } = await params;

      // Verificar autenticación + ownership
      await authorizeCoachForClient(request, id);

      const { fileKey } = await request.json();

      logger.info('UPLOAD', '🗑️ Iniciando eliminación de documento', {
        clientId: id,
        fileKey
      });

      // Validaciones...
      if (!id || id === 'undefined') {
        return NextResponse.json(
          { success: false, message: 'Client ID no válido' },
          { status: 400 }
        );
      }

      if (!fileKey) {
        return NextResponse.json(
          { success: false, message: 'fileKey es requerido' },
          { status: 400 }
        );
      }

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        logger.warn('UPLOAD', 'Cliente no encontrado', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      // ✅ FUNCIÓN MEJORADA PARA ELIMINAR DOCUMENTOS
      const removeDocumentFromArray = async (): Promise<boolean> => {
        try {
          let documents = client.medicalData?.documents;
          
          logger.debug('UPLOAD', '🔍 Estado inicial de documents para eliminación', {
            clientId: id,
            documentsType: typeof documents,
            isArray: Array.isArray(documents),
            arrayLength: Array.isArray(documents) ? documents.length : 0
          });

          // ✅ MANEJO DE LA ESTRUCTURA REAL: Array de objetos con campos encriptados
          if (!Array.isArray(documents)) {
            logger.warn('UPLOAD', 'Documents no es un array para eliminación', undefined, {
              clientId: id,
              documentsType: typeof documents,
              documentsValue: documents
            });
            return false;
          }

          // ✅ BÚSQUEDA EN ARRAY DE OBJETOS ENCRIPTADOS
          let documentIndex = -1;
          let documentToRemove = null;

          for (let i = 0; i < documents.length; i++) {
            try {
              const doc = documents[i];
              
              // Verificar que es un objeto válido
              if (!doc || typeof doc !== 'object') {
                continue;
              }

              // ✅ DESENCRIPTAR EL CAMPO 'key' PARA COMPARAR
              let currentKey = doc.key;
              if (typeof currentKey === 'string' && currentKey.startsWith('U2FsdGVkX1')) {
                currentKey = decrypt(currentKey);
              }

              // ✅ COMPARAR CON EL fileKey BUSCADO
              if (currentKey === fileKey) {
                documentIndex = i;
                documentToRemove = doc;
                
                // ✅ TAMBIÉN DESENCRIPTAR EL NOMBRE PARA LOGS
                let documentName = doc.name;
                if (typeof documentName === 'string' && documentName.startsWith('U2FsdGVkX1')) {
                  documentName = decrypt(documentName);
                }
                
                logger.debug('UPLOAD', 'Documento encontrado para eliminación', {
                  clientId: id,
                  documentIndex: i,
                  documentName,
                  fileKey
                });
                break;
              }
            } catch (error) {
              logger.debug('UPLOAD', 'Error procesando documento durante búsqueda', undefined, {
                clientId: id,
                documentIndex: i,
                error: (error as Error).message
              });
              continue;
            }
          }

          if (documentIndex === -1) {
            logger.warn('UPLOAD', '❌ Documento no encontrado en array para eliminación', undefined, {
              clientId: id,
              fileKey,
              totalDocuments: documents.length,
              availableKeys: documents.map((doc, idx) => {
                try {
                  if (!doc || typeof doc !== 'object') {
                    return { index: idx, error: 'invalid document' };
                  }
                  
                  let key = doc.key;
                  let name = doc.name;
                  
                  // Intentar desencriptar para el log
                  if (typeof key === 'string' && key.startsWith('U2FsdGVkX1')) {
                    try {
                      key = decrypt(key);
                    } catch (e) {
                      key = 'decrypt_error';
                    }
                  }
                  
                  if (typeof name === 'string' && name.startsWith('U2FsdGVkX1')) {
                    try {
                      name = decrypt(name);
                    } catch (e) {
                      name = 'decrypt_error';
                    }
                  }
                  
                  return { 
                    index: idx, 
                    key: key || 'no_key', 
                    name: name || 'no_name' 
                  };
                } catch (error) {
                  return { index: idx, error: 'processing_error' };
                }
              })
            });
            return false;
          }

          // ✅ ELIMINACIÓN DEL ARRAY
          documents.splice(documentIndex, 1);
          logger.debug('UPLOAD', '✅ Documento removido del array', {
            clientId: id,
            documentIndex,
            remainingDocuments: documents.length
          });

          // ✅ ACTUALIZACIÓN DIRECTA DEL ARRAY (sin encriptar el array completo)
          // También limpiar processedDocuments que correspondan a este fileKey
          const updateData: Record<string, unknown> = { 
            $set: { 
              'medicalData.documents': documents as never[],
              updatedAt: new Date()
            } 
          };

          // Limpiar processedDocuments: buscar y remover los que tengan s3Key = fileKey
          const processedDocs: never[] = (client.medicalData?.processedDocuments || []) as never[];
          const remainingProcessed: never[] = processedDocs.filter((pd: Record<string, unknown>) => {
            try {
              const pdS3Key = pd.s3Key ? safeDecrypt(pd.s3Key as string) : '';
              return pdS3Key !== fileKey;
            } catch {
              return true;
            }
          }) as never[];
          if (remainingProcessed.length !== processedDocs.length) {
            (updateData.$set as Record<string, unknown>)['medicalData.processedDocuments'] = remainingProcessed;
            logger.debug('UPLOAD', '🧹 Procesados eliminados con el documento', {
              clientId: id,
              removed: processedDocs.length - remainingProcessed.length,
              fileKey
            });
          }

          const updateResult = await healthForms.updateOne(
            { _id: new ObjectId(id) },
            updateData
          );

          logger.debug('UPLOAD', '📝 Resultado de actualización en BD', {
            clientId: id,
            modifiedCount: updateResult.modifiedCount,
            matchedCount: updateResult.matchedCount
          });

          return updateResult.modifiedCount > 0;

        } catch (error) {
          logger.error('UPLOAD', '❌ Error general eliminando documento del array', error as Error, {
            clientId: id,
            fileKey,
            errorMessage: (error as Error).message,
            errorStack: (error as Error).stack
          });
          return false;
        }
      };

      // ✅ PRIMERO: Eliminar de la base de datos
      logger.debug('UPLOAD', '🗃️ Eliminando de base de datos...', { clientId: id });
      const dbSuccess = await removeDocumentFromArray();

      if (!dbSuccess) {
        logger.error('UPLOAD', '❌ Falló eliminación en base de datos', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'No se pudo eliminar la referencia del documento' },
          { status: 500 }
        );
      }

      logger.info('UPLOAD', '✅ Documento eliminado de base de datos', { clientId: id });

      // ✅ SEGUNDO: Eliminar de S3
      try {
        logger.debug('UPLOAD', '☁️ Eliminando de S3...', { clientId: id, fileKey });
        await S3Service.deleteFile(fileKey);
        logger.info('UPLOAD', '✅ Archivo eliminado de S3', { clientId: id, fileKey });
      } catch (s3Error) {
        logger.error('UPLOAD', '⚠️ Error eliminando de S3, pero BD ya actualizada', s3Error as Error, {
          clientId: id,
          fileKey
        });
        // Continuamos porque la BD ya se actualizó
      }

      logger.info('UPLOAD', '🎉 Documento eliminado exitosamente', { clientId: id, fileKey });

      return NextResponse.json({
        success: true,
        message: 'Documento eliminado exitosamente'
      });

    } catch (error: any) {
      if (error?.status) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status });
      }
      console.error('❌ Error en DELETE /upload:', error);
      logger.error('UPLOAD', '💥 Error eliminando documento', error, undefined, {
        clientId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}/upload`, method: 'DELETE', clientId: (await params).id });
}

export const DELETE = apiHandler(deleteHandler);

async function patchHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar autenticación + ownership
    await authorizeCoachForClient(request, id);

    const { action } = await request.json();
    
    if (action === 'repair_documents') {
      const result = await repairCorruptedDocuments(id);
      
      return NextResponse.json({
        success: true,
        message: `Reparados ${result.repaired} de ${result.total} documentos`,
        data: result
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Acción no válida' },
      { status: 400 }
    );
    
  } catch (error: any) {
    if (error?.status) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    logger.error('REPAIR', 'Error en endpoint de reparación', error as Error);
    return NextResponse.json(
      { success: false, message: 'Error reparando documentos' },
      { status: 500 }
    );
  }
}

export const PATCH = apiHandler(patchHandler);


async function repairCorruptedDocuments(clientId: string) {
  try {
    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ _id: new ObjectId(clientId) });
    
    if (!client || !client.medicalData?.documents) {
      return { repaired: 0, total: 0 };
    }
    
    const documents = client.medicalData.documents;
    const repairedDocs = documents.map((doc: any) => {
      // Si es un string que parece encriptado
      if (typeof doc === 'string' && doc.startsWith('U2FsdGVkX1')) {
        try {
          // Desencriptar
          const decrypted = safeDecrypt(doc);
          const parsed = JSON.parse(decrypted);
          
          // Si el objeto parseado tiene campos encriptados, devolverlo como está
          // (ya es un objeto con campos encriptados, solo estaba "doble-encriptado")
          if (parsed.name && parsed.key) {
            return parsed; // Ya está bien
          }
          
          // Si no tiene estructura, crear objeto con campos encriptados
          return {
            name: encrypt(parsed.name || parsed.originalname || 'documento'),
            key: encrypt(parsed.key || parsed.s3Key || ''),
            type: encrypt(parsed.type || ''),
            size: parsed.size || 0,
            uploadedAt: parsed.uploadedAt || new Date(),
            url: parsed.url || ''
          };
        } catch (error) {
          logger.error('REPAIR', 'Error reparando documento', error as Error, { clientId });
          return doc; // Devolver original si no se puede reparar
        }
      }
      
      // Si ya es objeto, asegurarse de que los campos estén encriptados
      if (typeof doc === 'object' && doc !== null) {
        // Verificar si los campos necesitan encriptación
        const needsEncryption = doc.name && !doc.name.startsWith('U2FsdGVkX1');
        
        if (needsEncryption) {
          return {
            ...doc,
            name: encrypt(doc.name),
            key: encrypt(doc.key || ''),
            type: encrypt(doc.type || ''),
            // size y uploadedAt se mantienen igual
          };
        }
        
        return doc; // Ya está bien
      }
      
      return doc; // No se puede determinar
    });
    
    // Actualizar en BD
    await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: { 'medicalData.documents': repairedDocs } }
    );
    
    return { 
      repaired: repairedDocs.length, 
      total: documents.length,
      documents: repairedDocs 
    };
    
  } catch (error) {
    logger.error('REPAIR', 'Error general reparando documentos', error as Error, { clientId });
    throw error;
  }
}
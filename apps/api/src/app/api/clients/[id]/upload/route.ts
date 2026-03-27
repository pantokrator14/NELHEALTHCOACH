import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { S3Service, UploadedFile } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { decrypt, encrypt, encryptFileObject, safeDecrypt } from '@/app/lib/encryption';
import { TextractService } from '@/app/lib/textract';

// POST: Obtener URLs para upload (ACCESO PÚBLICO COMPLETO - SIN AUTENTICACIÓN)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Generar URL de upload', async () => {
    try {
      const { id } = await params;
      
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

      logger.info('UPLOAD', 'Solicitud de upload recibida (acceso público)', {
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

// PUT: Confirmar upload y guardar referencia (ACCESO PÚBLICO COMPLETO - SIN AUTENTICACIÓN)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Confirmar upload y guardar referencia', async () => {
    try {
      const { id } = await params;
      const { fileKey, fileName, fileType, fileSize, fileCategory, fileURL } = await request.json();

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
        // ✅ PARA DOCUMENTOS: AÑADIR CAMPOS DE TEXTRACT
        const textractAnalysis = {
          extractionStatus: 'pending' as const,
          extractionDate: new Date().toISOString(),
          documentType: TextractService.determineDocumentType(fileName)
        };

        // Añadir análisis de Textract al documento
        encryptedFile = {
          ...encryptedFile,
          textractAnalysis: {
            extractionStatus: 'pending' as const,
            extractionDate: new Date().toISOString(),
            documentType: TextractService.determineDocumentType(fileName)
          }
        };

        // Obtener documentos existentes y manejar diferentes formatos
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

      // ✅ PROCESAR DOCUMENTOS CON TEXTRACT EN SEGUNDO PLANO
      if (fileCategory === 'document') {
        processDocumentWithTextract(id, fileKey, fileName).catch(error => {
          logger.error('UPLOAD', 'Error procesando documento con Textract', error as Error, {
            clientId: id,
            fileKey,
            fileName
          });
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Archivo guardado exitosamente',
        data: uploadedFile
      });

    } catch (error: any) {
      console.error('❌ Error en PUT /upload:', error);
      logger.error('UPLOAD', 'Error guardando referencia de archivo', error, {
        fileName: (await request.json()).fileName,
        fileCategory: (await request.json()).fileCategory
      }, {
        clientId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}/upload`, method: 'PUT', clientId: (await params).id });
}

// DELETE: Eliminar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Eliminar documento', async () => {
    try {
      const { id } = await params;
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
          const updateResult = await healthForms.updateOne(
            { _id: new ObjectId(id) },
            { 
              $set: { 
                'medicalData.documents': documents, // ✅ Guardar el array directamente
                updatedAt: new Date()
              } 
            }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
  } catch (error) {
    logger.error('REPAIR', 'Error en endpoint de reparación', error as Error);
    return NextResponse.json(
      { success: false, message: 'Error reparando documentos' },
      { status: 500 }
    );
  }
}

// ✅ FUNCIÓN PARA PROCESAR DOCUMENTO CON TEXTRACT EN SEGUNDO PLANO
async function processDocumentWithTextract(clientId: string, fileKey: string, fileName: string) {
  try {
    logger.info('TEXTRACT', 'Iniciando procesamiento de documento en estructura separada', {
      clientId,
      fileKey,
      fileName
    });

    // Determinar tipo de documento
    const documentType = TextractService.determineDocumentType(fileName);
    
    // Procesar con Textract
    const analysis = await TextractService.processMedicalDocument(fileKey, documentType);
    
    // Obtener colección de healthforms
    const healthForms = await getHealthFormsCollection();
    
    // Crear objeto de documento procesado (campos encriptados individualmente)
    // Determinar pageCount de forma segura (analysis.extractedData puede ser objeto o string JSON)
    let pageCount = 1;
    try {
      const ed = analysis.extractedData;
      if (ed && typeof ed === 'object' && 'pages' in ed) {
        pageCount = (ed as any).pages || 1;
      } else if (typeof ed === 'string') {
        try {
          const parsed = JSON.parse(ed);
          pageCount = parsed?.pages || 1;
        } catch {
          pageCount = 1;
        }
      }
    } catch {
      pageCount = 1;
    }

    const processedDoc: any = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalName: encrypt(fileName),
      s3Key: encrypt(fileKey),
      title: encrypt(`Análisis de Textract: ${fileName}`),
      content: encrypt(analysis.extractedText || ''),
      processedAt: new Date(),
      processedBy: 'textract',
      confidence: analysis.status === 'completed' ? analysis.confidence : 0,
      metadata: {
        pageCount,
        language: 'es', // Podrías detectar el idioma
        documentType: analysis.documentType,
        extractionStatus: analysis.status,
        extractedData: analysis.extractedData // Puedes almacenar datos estructurados aquí
      }
    };

    // Agregar al array de processedDocuments (o crear si no existe)
    const updateData: any = {
      $set: {
        'medicalData.lastDocumentProcessed': new Date(),
        updatedAt: new Date()
      }
    };

    // Si processedDocuments no existe, crearlo
    const client = await healthForms.findOne({ _id: new ObjectId(clientId) });
    // Asegurarse de que `client` no sea null antes de acceder a sus propiedades
    if (!client || !client.medicalData?.processedDocuments) {
      updateData.$set['medicalData.processedDocuments'] = [processedDoc];
    } else {
      updateData.$push = {
        'medicalData.processedDocuments': processedDoc
      };
    }

    const result = await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      updateData
    );

    if (result.modifiedCount > 0) {
      logger.info('TEXTRACT', '✅ Documento procesado guardado en estructura separada', {
        clientId,
        fileKey,
        confidence: processedDoc.confidence,
        textLength: analysis.extractedText?.length || 0
      });
      
      // ✅ OPCIONAL: También puedes actualizar el documento original con una referencia
      // Pero esto es opcional
      await updateOriginalDocumentWithReference(clientId, fileKey, processedDoc.id);
    }

    return processedDoc;
    
  } catch (error) {
    logger.error('TEXTRACT', 'Error procesando documento en estructura separada', error as Error, {
      clientId,
      fileKey
    });
    
    // ✅ Crear entrada de documento procesado incluso si falla (para tracking)
    await createFailedProcessingRecord(clientId, fileKey, fileName, error);
    
    return null;
  }
}

// ✅ Función opcional para agregar referencia en el documento original
async function updateOriginalDocumentWithReference(clientId: string, fileKey: string, processedDocId: string) {
  try {
    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ _id: new ObjectId(clientId) });
    
    if (!client || !client.medicalData?.documents) return;
    
    const documents = client.medicalData.documents;
    const updatedDocuments = documents.map((doc: any) => {
      let docObj = doc;
      
      // Si es string, desencriptar
      if (typeof doc === 'string') {
        try {
          const decrypted = safeDecrypt(doc);
          docObj = JSON.parse(decrypted);
        } catch {
          return doc; // Si falla, mantener original
        }
      }
      
      // Buscar por key
      let currentKey = docObj.key;
      if (typeof currentKey === 'string' && currentKey.startsWith('U2FsdGVkX1')) {
        currentKey = decrypt(currentKey);
      }
      
      if (currentKey === fileKey) {
        // Agregar referencia al documento procesado
        return {
          ...docObj,
          processedDocumentId: processedDocId,
          lastProcessedAt: new Date().toISOString()
        };
      }
      
      return docObj;
    });
    
    // Convertir de nuevo a strings encriptados si es necesario
    const finalDocuments = updatedDocuments.map((doc: any) => {
      if (doc.name && doc.name.startsWith('U2FsdGVkX1')) {
        // Ya está encriptado
        return doc;
      } else {
        // Encriptar
        return encryptFileObject(doc);
      }
    });
    
    await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: { 'medicalData.documents': finalDocuments } }
    );
    
  } catch (error) {
    logger.error('TEXTRACT', 'Error actualizando referencia en documento original', error as Error);
  }
}

// ✅ Función para registrar procesamientos fallidos
async function createFailedProcessingRecord(clientId: string, fileKey: string, fileName: string, error: any) {
  try {
    const healthForms = await getHealthFormsCollection();
    
    const failedDoc: any = {
      id: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalName: encrypt(fileName),
      s3Key: encrypt(fileKey),
      title: encrypt(`Procesamiento fallido: ${fileName}`),
      content: encrypt(`Error: ${error.message || 'Error desconocido'}`),
      processedAt: new Date(),
      processedBy: 'textract',
      confidence: 0,
      metadata: {
        extractionStatus: 'failed',
        error: error.message,
        errorType: error.constructor.name
      }
    };
    
    await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      {
        $push: { 'medicalData.processedDocuments': failedDoc },
        $set: {
          'medicalData.lastDocumentProcessed': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
  } catch (dbError) {
    logger.error('TEXTRACT', 'Error guardando registro de fallo', dbError as Error);
  }
}

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
            url: parsed.url || '',
            textractAnalysis: parsed.textractAnalysis || null
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
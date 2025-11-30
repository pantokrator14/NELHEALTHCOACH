import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { S3Service, UploadedFile } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';
import { decrypt, encrypt, encryptFileObject, safeDecrypt } from '@/app/lib/encryption';

// POST: Obtener URLs para upload (ACCESO PÚBLICO COMPLETO - SIN AUTENTICACIÓN)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Generar URL de upload', async () => {
    try {
      const { id } = await params;
      
      console.log('🔑 Solicitando URL de upload para cliente:', id);
      
      // VALIDACIÓN CRÍTICA: Verificar que el clientId es válido
      if (!id || id === 'undefined') {
        logger.warn('UPLOAD', 'Client ID no válido o undefined', undefined, { clientId: id });
        return NextResponse.json(
          { success: false, message: 'Client ID no válido' },
          { status: 400 }
        );
      }

      const { fileName, fileType, fileSize, fileCategory } = await request.json();

      logger.upload('UPLOAD', 'Solicitud de upload recibida (acceso público)', {
        fileName,
        fileType,
        fileSize,
        fileCategory
      }, { clientId: id });

      // Validaciones de tipo de archivo
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
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
      const { uploadURL, fileKey } = await S3Service.generateUploadURL(
        fileName,
        fileType,
        fileSize,
        fileCategory
      );

      logger.upload('UPLOAD', 'URL de upload generada exitosamente', {
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
      logger.uploadError('UPLOAD', 'Error generando URL de upload', error, undefined, {
        clientId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}/upload`, clientId: (await params).id });
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
      const encryptedFile = encryptFileObject(uploadedFile);

      let updateData: any = {};

      if (fileCategory === 'profile') {
        updateData = { 
          $set: { 
            'personalData.profilePhoto': encryptedFile,
            updatedAt: new Date()
          } 
        };
      } else {
        updateData = { 
          $push: { 
            'medicalData.documents': encryptedFile 
          },
          $set: {
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
      console.error('❌ Error en PUT /upload:', error);
      logger.uploadError('UPLOAD', 'Error guardando referencia de archivo', error, {
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
  }, { endpoint: `/api/clients/${(await params).id}/upload`, clientId: (await params).id });
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
      logger.uploadError('UPLOAD', '💥 Error eliminando documento', error, undefined, {
        clientId: (await params).id
      });
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { endpoint: `/api/clients/${(await params).id}/upload`, clientId: (await params).id });
}
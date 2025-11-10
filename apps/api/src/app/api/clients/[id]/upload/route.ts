import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { S3Service, UploadedFile } from '@/app/lib/s3';
import { requireAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';

// GET: Obtener URLs para upload
// En el método POST, reemplazar la verificación de autenticación:
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Generar URL de upload', async () => {
    try {
      const { id } = await params;
      const { fileName, fileType, fileSize, fileCategory } = await request.json();

      // Verificar autenticación
       const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        logger.warn('UPLOAD', 'Acceso público a endpoint de upload - permitido para formularios', undefined, {
          clientId: id
        });
        // Continuamos sin lanzar error para permitir acceso público
      } else {
        // Si hay token, verificarlo
        requireAuth(token);
      }

      const user = requireAuth(token);

      logger.upload('UPLOAD', 'Solicitud de upload recibida', {
        fileName,
        fileType,
        fileSize,
        fileCategory
      }, { clientId: id, userId: user.id });

      // Validaciones de tipo de archivo...
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedDocumentTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (fileCategory === 'profile' && !allowedImageTypes.includes(fileType)) {
        logger.warn('UPLOAD', 'Tipo de archivo no permitido para foto de perfil', undefined, {
          clientId: id,
          fileType,
          allowedTypes: allowedImageTypes
        });
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido para foto de perfil' },
          { status: 400 }
        );
      }

      if (fileCategory === 'document' && !allowedDocumentTypes.includes(fileType)) {
        logger.warn('UPLOAD', 'Tipo de archivo no permitido para documentos', undefined, {
          clientId: id,
          fileType,
          allowedTypes: allowedDocumentTypes
        });
        return NextResponse.json(
          { success: false, message: 'Tipo de archivo no permitido para documentos' },
          { status: 400 }
        );
      }

      // Validar tamaño de archivo (5MB máximo)
      const maxSize = 5 * 1024 * 1024;
      if (fileSize > maxSize) {
        logger.warn('UPLOAD', 'Archivo demasiado grande', undefined, {
          clientId: id,
          fileSize,
          maxSize
        });
        return NextResponse.json(
          { success: false, message: 'El archivo es demasiado grande (máximo 5MB)' },
          { status: 400 }
        );
      }

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
      }, { clientId: id, userId: user.id });

      return NextResponse.json({
        success: true,
        data: {
          uploadURL,
          fileKey,
          fileURL: await S3Service.getFileURL(fileKey)
        }
      });

    } catch (error: any) {
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

/// PUT: Confirmar upload y guardar referencia en el cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Confirmar upload y guardar referencia', async () => {
    try {
      const { id } = await params;
      const { fileKey, fileName, fileType, fileSize, fileCategory, fileURL } = await request.json();

      // Verificar autenticación
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        logger.warn('UPLOAD', 'Acceso público a endpoint de upload (PUT) - permitido para formularios', undefined, {
          clientId: id
        });
      } else {
        requireAuth(token);
      }
      const user = requireAuth(token);

      logger.upload('UPLOAD', 'Confirmando upload de archivo', {
        fileName,
        fileType,
        fileSize,
        fileCategory,
        s3Key: fileKey
      }, { clientId: id, userId: user.id });

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        logger.warn('UPLOAD', 'Cliente no encontrado al confirmar upload', undefined, {
          clientId: id,
          fileName,
          fileCategory
        });
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      const uploadedFile: UploadedFile = {
        url: fileURL,
        key: fileKey,
        name: fileName,
        type: fileCategory,
        size: fileSize,
        uploadedAt: new Date().toISOString()
      };

      let updateData: any = {};
      let operationType = '';

      if (fileCategory === 'profile') {
        // Para foto de perfil, reemplazar la existente
        operationType = 'profile photo update';
        updateData = { 
          $set: { 
            'personalData.profilePhoto': uploadedFile,
            updatedAt: new Date()
          } 
        };
        
        // Si había una foto anterior, eliminarla de S3
        if (client.personalData?.profilePhoto?.key) {
          try {
            await S3Service.deleteFile(client.personalData.profilePhoto.key);
            logger.upload('UPLOAD', 'Foto de perfil anterior eliminada de S3', {
              s3Key: client.personalData.profilePhoto.key
            }, { clientId: id });
          } catch (deleteError) {
            logger.uploadError('UPLOAD', 'Error eliminando foto de perfil anterior', deleteError as Error, {
              s3Key: client.personalData.profilePhoto.key
            }, { clientId: id });
          }
        }
      } else {
        // Para documentos, agregar al array
        operationType = 'document upload';
        updateData = { 
          $push: { 
            'medicalData.documents': uploadedFile 
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
        logger.warn('UPLOAD', 'No se pudo actualizar el cliente con el archivo', undefined, {
          clientId: id,
          fileName,
          fileCategory,
          operationType
        });
        return NextResponse.json(
          { success: false, message: 'No se pudo guardar la referencia del archivo' },
          { status: 500 }
        );
      }

      logger.upload('UPLOAD', 'Archivo guardado exitosamente en base de datos', {
        fileName,
        fileCategory,
        operationType,
        s3Key: fileKey
      }, { clientId: id, userId: user.id });

      return NextResponse.json({
        success: true,
        message: 'Archivo guardado exitosamente',
        data: uploadedFile
      });

    } catch (error: any) {
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



// DELETE: Eliminar archivo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('UPLOAD', 'Eliminar archivo', async () => {
    try {
      const { id } = await params;
      const { fileKey, fileCategory, fileName } = await request.json();

      // Verificar autenticación
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      const user = requireAuth(token);

      logger.upload('UPLOAD', 'Solicitud de eliminación de archivo', {
        fileName,
        fileCategory,
        s3Key: fileKey
      }, { clientId: id, userId: user.id });

      const healthForms = await getHealthFormsCollection();

      // Primero obtener el cliente para verificar que existe el archivo
      const client = await healthForms.findOne({ _id: new ObjectId(id) });
      if (!client) {
        logger.warn('UPLOAD', 'Cliente no encontrado al eliminar archivo', undefined, {
          clientId: id,
          fileKey,
          fileCategory
        });
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      // Verificar que el archivo existe antes de eliminarlo
      if (fileCategory === 'profile') {
        if (!client.personalData?.profilePhoto || client.personalData.profilePhoto.key !== fileKey) {
          logger.warn('UPLOAD', 'Foto de perfil no encontrada para eliminar', undefined, {
            clientId: id,
            fileKey,
            existingKey: client.personalData?.profilePhoto?.key
          });
          return NextResponse.json(
            { success: false, message: 'Archivo no encontrado' },
            { status: 404 }
          );
        }
      } else {
        const documentExists = client.medicalData?.documents?.some(doc => doc.key === fileKey);
        if (!documentExists) {
          logger.warn('UPLOAD', 'Documento no encontrado para eliminar', undefined, {
            clientId: id,
            fileKey,
            totalDocuments: client.medicalData?.documents?.length || 0
          });
          return NextResponse.json(
            { success: false, message: 'Archivo no encontrado' },
            { status: 404 }
          );
        }
      }

      // Eliminar archivo de S3
      try {
        await S3Service.deleteFile(fileKey);
        logger.upload('UPLOAD', 'Archivo eliminado exitosamente de S3', {
          fileName,
          fileCategory,
          s3Key: fileKey
        }, { clientId: id });
      } catch (s3Error) {
        logger.uploadError('UPLOAD', 'Error eliminando archivo de S3', s3Error as Error, {
          fileName,
          fileCategory,
          s3Key: fileKey
        }, { clientId: id });
        // Continuamos para eliminar la referencia de la base de datos incluso si falla S3
      }

      // Eliminar referencia de la base de datos
      let updateData: any = {};
      let operationType = '';

      if (fileCategory === 'profile') {
        operationType = 'profile photo deletion';
        updateData = { 
          $unset: { 
            'personalData.profilePhoto': '' 
          },
          $set: {
            updatedAt: new Date()
          }
        };
      } else {
        operationType = 'document deletion';
        updateData = { 
          $pull: { 
            'medicalData.documents': { key: fileKey } 
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
        logger.warn('UPLOAD', 'No se pudo eliminar la referencia del archivo en la base de datos', undefined, {
          clientId: id,
          fileKey,
          fileCategory,
          operationType
        });
        return NextResponse.json(
          { success: false, message: 'No se pudo eliminar la referencia del archivo' },
          { status: 500 }
        );
      }

      logger.upload('UPLOAD', 'Referencia de archivo eliminada exitosamente de la base de datos', {
        fileName,
        fileCategory,
        operationType,
        s3Key: fileKey
      }, { clientId: id, userId: user.id });

      return NextResponse.json({
        success: true,
        message: 'Archivo eliminado exitosamente'
      });

    } catch (error: any) {
      logger.uploadError('UPLOAD', 'Error eliminando archivo', error, {
        fileKey: (await request.json()).fileKey,
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
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { S3Service, UploadedFile } from '@/app/lib/s3';
import { logger } from '@/app/lib/logger';

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

      // Validar clientId
      if (!id || id === 'undefined') {
        return NextResponse.json(
          { success: false, message: 'Client ID no válido' },
          { status: 400 }
        );
      }

      const { fileKey, fileName, fileType, fileSize, fileCategory, fileURL } = await request.json();

      logger.upload('UPLOAD', 'Confirmando upload de archivo (acceso público)', {
        fileName,
        fileType,
        fileSize,
        fileCategory,
        s3Key: fileKey
      }, { clientId: id });

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

      if (fileCategory === 'profile') {
        updateData = { 
          $set: { 
            'personalData.profilePhoto': uploadedFile,
            updatedAt: new Date()
          } 
        };
      } else {
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
          fileCategory
        });
        return NextResponse.json(
          { success: false, message: 'No se pudo guardar la referencia del archivo' },
          { status: 500 }
        );
      }

      logger.upload('UPLOAD', 'Archivo guardado exitosamente en base de datos', {
        fileName,
        fileCategory,
        s3Key: fileKey
      }, { clientId: id });

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
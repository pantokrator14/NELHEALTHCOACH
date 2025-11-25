import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION! || 'us-west-1', // Actualizado a us-west-1
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadedFile {
  url: string;
  key: string;
  name: string;
  type: 'profile' | 'document';
  size: number;
  uploadedAt?: string;
}

export class S3Service {
  static async generateUploadURL(
    fileName: string, 
    fileType: string, 
    fileSize: number,
    fileCategory: 'profile' | 'document' = 'document'
  ): Promise<{ uploadURL: string; fileKey: string }> {
    console.log('🔧 Generando URL de upload para:', {
      fileName,
      fileType, 
      fileSize,
      fileCategory,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION
    });

    const fileKey = `${fileCategory}/${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        'original-name': fileName,
        'uploaded-at': new Date().toISOString(),
      },
    });

    console.log('🔑 Comando S3 creado, generando URL firmada...');

    try {
      const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log('✅ URL firmada generada exitosamente');
      return { uploadURL, fileKey };
    } catch (error) {
      console.error('❌ Error generando URL firmada:', error);
      throw error;
    }
  }

  static async getFileURL(fileKey: string): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET_NAME! || 'nelhealthcoach-bucket';
    const region = process.env.AWS_REGION! || 'us-west-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
  }

  static async deleteFile(fileKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME! || 'nelhealthcoach-bucket',
        Key: fileKey,
      });

      await s3Client.send(command);
      
      console.log('✅ Archivo S3 eliminado exitosamente:', fileKey);
    } catch (error) {
      console.error('❌ Error eliminando archivo S3:', error);
      throw error;
    }
  }
}
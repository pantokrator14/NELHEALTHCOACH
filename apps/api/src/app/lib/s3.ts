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
    const fileKey = `${fileCategory}/${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME! || 'nelhealthcoach-bucket', // Actualizado
      Key: fileKey,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        'original-name': fileName,
        'uploaded-at': new Date().toISOString(),
      },
    });

    const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { uploadURL, fileKey };
  }

  static async getFileURL(fileKey: string): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET_NAME! || 'nelhealthcoach-bucket';
    const region = process.env.AWS_REGION! || 'us-west-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
  }

  static async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME! || 'nelhealthcoach-bucket', // Actualizado
      Key: fileKey,
    });

    await s3Client.send(command);
  }
}
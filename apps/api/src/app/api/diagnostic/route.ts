// apps/api/src/app/api/diagnostic/route.ts - NUEVO ARCHIVO
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Ejecutando diagnóstico de conexión...');
    
    const { db } = await connectToDatabase();
    
    // Probar varias operaciones
    const adminDb = db.admin();
    const buildInfo = await adminDb.buildInfo();
    const serverStatus = await adminDb.serverStatus();
    
    // Listar colecciones
    const collections = await db.listCollections().toArray();
    
    // Probar healthforms específicamente
    const healthForms = db.collection('healthforms');
    const count = await healthForms.countDocuments();
    const sampleDoc = await healthForms.findOne({}, { projection: { _id: 1 } });
    
    return NextResponse.json({
      success: true,
      diagnostic: {
        connection: '✅ Conectado',
        database: db.databaseName,
        buildInfo: {
          version: buildInfo.version,
          gitVersion: buildInfo.gitVersion
        },
        server: {
          host: serverStatus.host,
          version: serverStatus.version,
          connections: serverStatus.connections
        },
        collections: collections.map(c => c.name),
        healthforms: {
          count,
          hasDocuments: count > 0,
          sampleId: sampleDoc?._id
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NODE_VERSION: process.version,
          PLATFORM: process.platform
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error en diagnóstico:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      environment: {
        MONGODB_URI: process.env.MONGODB_URI ? '✅ Definida' : '❌ Faltante',
        MONGODB_DB: process.env.MONGODB_DB,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
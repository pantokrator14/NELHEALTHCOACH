import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  console.log('🧪 Iniciando prueba de diagnóstico de Recipes...');
  
  // 1. Intentar conectar con una configuración MUY básica y sin Mongoose models
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    return NextResponse.json({ success: false, error: 'MONGODB_URI no definida' }, { status: 500 });
  }

  // Usar el driver nativo de MongoDB para eliminar variables (mongoose)
  const { MongoClient } = await import('mongodb');
  
  let client;
  try {
    console.log('🔌 Conectando con MongoClient nativo...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 segundos para conectar
      socketTimeoutMS: 10000,          // 10 segundos para operaciones
    });
    
    await client.connect();
    console.log('✅ Conexión establecida con MongoClient.');
    
    // 2. Obtener la base de datos y colección por nombre (sin modelos)
    const dbName = new URL(MONGODB_URI).pathname.substring(1); // Extrae el nombre de la BD de la URI
    const db = client.db(dbName);
    const collection = db.collection('recipes');
    
    console.log(`📂 Usando BD: "${dbName}", Colección: "recipes"`);
    
    // 3. Prueba CRÍTICA: ¿Podemos LISTAR las colecciones? (permiso de lectura a nivel de BD)
    const collections = await db.listCollections({ name: 'recipes' }).toArray();
    console.log(`📋 Colección "recipes" encontrada en listCollections?: ${collections.length > 0}`);
    
    if (collections.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'La colección "recipes" NO aparece en listCollections. ¿Seguro que está en la BD correcta?',
        dbName
      }, { status: 404 });
    }
    
    // 4. Prueba CRÍTICA: ¿Podemos hacer un COUNT? (permiso de lectura a nivel de colección)
    try {
      const count = await collection.countDocuments({}, { maxTimeMS: 5000 }); // Timeout más corto
      console.log(`✅ COUNTDocuments exitoso. Total documentos: ${count}`);
      return NextResponse.json({ 
        success: true, 
        count,
        message: 'Lectura exitosa. El problema está probablemente en la configuración de Mongoose en tu app principal.'
      });
    } catch (countError: any) {
      console.error('❌ COUNTDocuments FALLÓ:', countError.message);
      // 5. Prueba de "último recurso": ¿Podemos INSERTAR un documento? (permiso de escritura)
      try {
        const testDoc = { 
          _id: new mongoose.Types.ObjectId(), 
          diagnostic: true, 
          createdAt: new Date() 
        };
        await collection.insertOne(testDoc);
        console.log('✅ INSERTOne exitoso (permiso de escritura).');
        await collection.deleteOne({ _id: testDoc._id }); // Limpiar
        console.log('✅ DELETEOne exitoso.');
        
        return NextResponse.json({ 
          success: false, 
          error: `COUNT falló pero INSERT funcionó. Esto SUGIERE UN PROBLEMA DE PERMISOS: El usuario NO tiene permiso de LECTURA (find, count) pero sí de ESCRITURA en "recipes".`,
          countError: countError.message
        }, { status: 403 });
      } catch (insertError: any) {
        console.error('❌ INSERTOne también FALLÓ:', insertError.message);
        return NextResponse.json({ 
          success: false, 
          error: `COUNT e INSERT fallaron. Problema grave de permisos o de red.`,
          countError: countError.message,
          insertError: insertError.message
        }, { status: 403 });
      }
    }
    
  } catch (error: any) {
    console.error('💥 Error general en prueba de diagnóstico:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'Error de conexión o tiempo de espera.',
      detail: error.message
    }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión de diagnóstico cerrada.');
    }
  }
}
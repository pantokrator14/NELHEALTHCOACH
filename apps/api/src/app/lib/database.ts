// apps/api/src/lib/database.ts - CON DIAGNÓSTICO COMPLETO
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || 'healthcoach';

if (!MONGODB_URI) {
  throw new Error('❌ MONGODB_URI no definida en las variables de entorno');
}

// Log seguro (sin contraseña)
const safeMongoURI = MONGODB_URI.replace(
  /mongodb\+srv:\/\/([^:]+):([^@]+)@/,
  'mongodb+srv://$1:****@'
);
console.log('🔧 Configuración MongoDB:', {
  uri: safeMongoURI,
  db: MONGODB_DB,
  nodeEnv: process.env.NODE_ENV
});

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

declare global {
  var mongo: {
    conn: MongoConnection | null;
    promise: Promise<MongoConnection> | null;
  } | undefined;
}

const cached = global.mongo || { conn: null, promise: null };

if (!global.mongo) {
  global.mongo = cached;
}

export async function connectToDatabase(): Promise<MongoConnection> {
  if (cached.conn) {
    console.log('♻️ Usando conexión MongoDB en caché');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('🔌 Intentando conectar a MongoDB...');
    console.log('📝 Entorno:', {
      NODE_ENV: process.env.NODE_ENV,
      PLATFORM: process.platform,
      ARCH: process.arch
    });

    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000, // Aumentado a 15 segundos
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      w: 'majority'
    };

    cached.promise = MongoClient.connect(MONGODB_URI, opts)
      .then((client) => {
        console.log('✅ Conectado a MongoDB exitosamente');
        
        // Probar la conexión
        return client.db().admin().ping().then(() => {
          console.log('🏓 Ping a MongoDB exitoso');
          return {
            client,
            db: client.db(MONGODB_DB),
          };
        });
      })
      .catch((error) => {
        console.error('❌ Error de conexión a MongoDB:', {
          name: error.name,
          message: error.message,
          code: error.code,
          codeName: error.codeName
        });
        
        // Información adicional para diagnóstico
        console.error('🔍 Diagnóstico:', {
          hasMongoURI: !!MONGODB_URI,
          uriLength: MONGODB_URI.length,
          uriStartsWith: MONGODB_URI.substring(0, 20) + '...'
        });
        
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export async function getHealthFormsCollection() {
  try {
    console.log('📂 Obteniendo colección healthforms...');
    const { db } = await connectToDatabase();
    
    // Listar colecciones para verificar
    const collections = await db.listCollections().toArray();
    console.log('📋 Colecciones disponibles:', collections.map(c => c.name));
    
    const collection = db.collection('healthforms');
    
    // Contar documentos para verificar acceso
    const count = await collection.countDocuments();
    console.log(`📊 Documentos en healthforms: ${count}`);
    
    return collection;
  } catch (error) {
    console.error('❌ Error obteniendo colección:', error);
    throw error;
  }
}
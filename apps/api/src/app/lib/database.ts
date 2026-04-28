import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';
import { logger } from './logger';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.DB_NAME || 'nel-healthcoach';
const isDevelopment = process.env.NODE_ENV === 'development';

if (!MONGODB_URI) {
  logger.error('DATABASE', 'MONGODB_URI no definida en las variables de entorno');
  throw new Error('❌ MONGODB_URI no definida en las variables de entorno');
}

// ─── Mongoose connection (para modelos Coach, EditProposal, etc.) ───
let mongooseConnected = false;

export async function connectMongoose(): Promise<void> {
  if (mongooseConnected) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
      tls: true,
      tlsAllowInvalidCertificates: isDevelopment,
      tlsAllowInvalidHostnames: isDevelopment,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    mongooseConnected = true;
    logger.info('DATABASE', '✅ Mongoose conectado exitosamente');
  } catch (error) {
    logger.error('DATABASE', 'Error conectando Mongoose', error as Error);
    throw error;
  }
}

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
  return logger.time('DATABASE', 'Conectar a MongoDB', async () => {
    if (cached.conn) {
      logger.debug('DATABASE', 'Usando conexión caché existente');
      return cached.conn;
    }

    if (!cached.promise) {
      logger.info('DATABASE', '🔌 Intentando conectar a MongoDB...');

      const opts = {
      // Pool configuration
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,

      // Timeout configuration
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,

      // TLS/SSL configuration - DIFERENTE EN DESARROLLO
      tls: true,
      tlsAllowInvalidCertificates: isDevelopment, // Permite certificados inválidos en dev
      tlsAllowInvalidHostnames: isDevelopment,    // Permite hostnames inválidos en dev

      // Retry configuration
      retryWrites: true,
      retryReads: true,
      w: 'majority',

      // DNS configuration
      ...(isDevelopment && {
        // Configuraciones adicionales solo para desarrollo
        monitorCommands: true, // Log de comandos MongoDB
      })
    };

    logger.debug('DATABASE', 'Configuración MongoDB', {
      serverSelectionTimeoutMS: opts.serverSelectionTimeoutMS,
      tlsAllowInvalidCertificates: opts.tlsAllowInvalidCertificates,
      tlsAllowInvalidHostnames: opts.tlsAllowInvalidHostnames,
      environment: process.env.NODE_ENV
    });


    cached.promise = MongoClient.connect(MONGODB_URI, opts as MongoClientOptions)
        .then((client) => {
          logger.info('DATABASE', '✅ Conectado a MongoDB exitosamente');
          return {
            client,
            db: client.db(MONGODB_DB),
          };
        })
        .catch((error) => {
          logger.error('DATABASE', 'Error de conexión a MongoDB', error, {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            hasMongoURI: !!MONGODB_URI,
            isDevelopment
          });

          cached.promise = null;
          throw error;
        });
    }

    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      cached.promise = null;
      throw error;
    }
  });
}

export async function getHealthFormsCollection() {
  const { db } = await connectToDatabase();

  return logger.time('DATABASE', 'Buscar colección healthforms', async () => {
    const possibleCollectionNames = [
      'healthforms', 'healthForms', 'HealthForms',
      'formularios', 'forms'
    ];

    for (const collectionName of possibleCollectionNames) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      if (count > 0) {
        logger.info('DATABASE', `Encontrada colección: "${collectionName}" con ${count} documentos`);
        return collection;
      }

      logger.debug('DATABASE', `Colección "${collectionName}" no encontrada o vacía`);
    }

    logger.warn('DATABASE', 'No se encontraron colecciones con datos, usando "healthforms" por defecto');
    return db.collection('healthforms');
  });
}

export async function getRecipesCollection() {
  const { db } = await connectToDatabase();

  return logger.time('DATABASE', 'Buscar colección recipes', async () => {
    const possibleCollectionNames = [
      'recipes', 'Recipes', 'recetas', 'Recetas'
    ];

    for (const collectionName of possibleCollectionNames) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      if (count > 0) {
        logger.info('DATABASE', `Encontrada colección: "${collectionName}" con ${count} documentos`);
        return collection;
      }

      logger.debug('DATABASE', `Colección "${collectionName}" no encontrada o vacía`);
    }

    logger.info('DATABASE', 'Creando nueva colección "recipes"');
    return db.collection('recipes');
  });
}

export async function getExerciseCollection() {
  const { db } = await connectToDatabase();

  return logger.time('DATABASE', 'Buscar colección exercises', async () => {
    const possibleCollectionNames = [
      'exercises', 'Exercises', 'ejercicios', 'Ejercicios'
    ];

    for (const collectionName of possibleCollectionNames) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      if (count > 0) {
        logger.info('DATABASE', `Encontrada colección: "${collectionName}" con ${count} documentos`);
        return collection;
      }

      logger.debug('DATABASE', `Colección "${collectionName}" no encontrada o vacía`);
    }

    logger.info('DATABASE', 'Creando nueva colección "exercises"');
    return db.collection('exercises');
  });
}

export async function getNutritionCollection() {
  const { db } = await connectToDatabase();
  return db.collection('nutrition_data');
}
export async function getLeadsCollection() {
  const { db } = await connectToDatabase();
  return db.collection('leads');
}

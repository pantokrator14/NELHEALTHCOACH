// apps/api/src/app/lib/database.ts
import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';
import { logger } from './logger';

// Validar variables de entorno al inicio
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'nel-healthcoach';

if (!uri) {
  throw new Error('Por favor define MONGODB_URI en .env.local');
}

// =====================================================
// 1. CLIENTE NATIVO DE MONGODB (EXISTENTE)
// =====================================================
interface CachedMongo {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

const globalWithMongo = global as typeof globalThis & {
  mongo: CachedMongo;
};

if (!globalWithMongo.mongo) {
  globalWithMongo.mongo = {
    client: null,
    db: null,
    promise: null,
  };
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const cached = globalWithMongo.mongo;

  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  if (!cached.promise) {
    logger.info('DATABASE', 'Conectando a MongoDB Atlas (nativo)...', {
      database: dbName,
      hasUri: !!uri
    });

    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = MongoClient.connect(uri as string, options)
      .then((client) => {
        const db = client.db(dbName);
        logger.info('DATABASE', '✅ Conectado a MongoDB Atlas (nativo) exitosamente');
        return { client, db };
      })
      .catch((error) => {
        logger.error('DATABASE', '❌ Error conectando a MongoDB Atlas (nativo)', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    const result = await cached.promise;
    cached.client = result.client;
    cached.db = result.db;
    return result;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

// =====================================================
// 2. MONGOOSE (PARA MODELOS DE COACHES, SESIONES, ETC.)
// =====================================================
interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as typeof globalThis & {
  mongoose: CachedMongoose;
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectMongoose(): Promise<typeof mongoose> {
  const cached = globalWithMongoose.mongoose;

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    logger.info('DATABASE', 'Conectando Mongoose a MongoDB Atlas...', {
      database: dbName,
    });

    cached.promise = mongoose
      .connect(uri as string, {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((mongooseInstance) => {
        logger.info('DATABASE', '✅ Mongoose conectado exitosamente');
        return mongooseInstance;
      })
      .catch((error) => {
        logger.error('DATABASE', '❌ Error conectando Mongoose', error);
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
}

// =====================================================
// 3. COLECCIONES EXISTENTES (CLIENTE NATIVO)
// =====================================================
export async function getHealthFormsCollection() {
  try {
    const { db } = await connectToDatabase();
    return db.collection('healthforms');
  } catch (error) {
    logger.error('DATABASE', 'Error obteniendo colección healthforms', error);
    throw error;
  }
}

export async function getRecipesCollection() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('recipes');
    
    try {
      await collection.createIndex({ title: 'text', description: 'text', ingredients: 'text', tags: 'text' });
      await collection.createIndex({ category: 1 });
      await collection.createIndex({ isPublished: 1 });
    } catch {
      logger.debug('DATABASE', 'Los índices de recipes ya existen');
    }
    
    return collection;
  } catch (error) {
    logger.error('DATABASE', 'Error obteniendo colección recipes', error);
    throw error;
  }
}

export async function getExercisesCollection() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('exercises');
    
    try {
      await collection.createIndex({ 
        name: 'text', 
        description: 'text', 
        category: 'text',
        muscleGroups: 'text',
        tags: 'text' 
      });
      await collection.createIndex({ category: 1 });
      await collection.createIndex({ difficulty: 1 });
      await collection.createIndex({ clientLevel: 1 });
      await collection.createIndex({ isPublished: 1 });
      await collection.createIndex({ progressionOf: 1 });
    } catch {
      logger.debug('DATABASE', 'Los índices de exercises ya existen');
    }
    
    return collection;
  } catch (error) {
    logger.error('DATABASE', 'Error obteniendo colección exercises', error);
    throw error;
  }
}

export const getExerciseCollection = getExercisesCollection;

export async function getNutritionCollection() {
  try {
    const { db } = await connectToDatabase();
    return db.collection('nutrition_data');
  } catch (error) {
    logger.error('DATABASE', 'Error obteniendo colección nutrition_data', error);
    throw error;
  }
}

export async function getLeadsCollection() {
  try {
    const { db } = await connectToDatabase();
    return db.collection('leads');
  } catch (error) {
    logger.error('DATABASE', 'Error obteniendo colección leads', error);
    throw error;
  }
}

// =====================================================
// 4. COLECCIONES DEL BLOG
// =====================================================
export async function getBlogPostsCollection() {
  const { db } = await connectToDatabase();
  const collection = db.collection('blog_posts');
  try {
    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ status: 1, publishedAt: -1 });
    await collection.createIndex({ category: 1, status: 1, publishedAt: -1 });
  } catch {
    // Los índices ya existen — ignorar
  }
  return collection;
}

export async function getBlogAuthorCollection() {
  const { db } = await connectToDatabase();
  return db.collection('blog_author');
}

export async function getBlogCategoriesCollection() {
  const { db } = await connectToDatabase();
  const collection = db.collection('blog_categories');
  try {
    await collection.createIndex({ slug: 1 }, { unique: true });
  } catch {
    // El índice ya existe — ignorar
  }
  return collection;
}

export async function getBlogViewsCollection() {
  const { db } = await connectToDatabase();
  const collection = db.collection('blog_views');
  try {
    await collection.createIndex({ slug: 1, day: 1, visitorHash: 1 }, { unique: true });
    await collection.createIndex({ slug: 1, day: 1 });
    await collection.createIndex({ createdAt: -1 });
  } catch {
    // Los índices ya existen — ignorar
  }
  return collection;
}

export async function getBlogCommentsCollection() {
  const { db } = await connectToDatabase();
  const collection = db.collection('blog_comments');
  try {
    await collection.createIndex({ postSlug: 1, status: 1, createdAt: 1 });
  } catch {
    // El índice ya existe — ignorar
  }
  return collection;
}

/** Documento de la lista de espera (email cifrado + hash para dedupe). */
export interface WaitlistDoc {
  _id: import('mongodb').ObjectId;
  emailHash: string;
  email: string;
  sources: string[];
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Lista de espera ÚNICA (libro + sesiones gratuitas): email CIFRADO +
 * emailHash (HMAC, en claro) para deduplicar sin exponer el correo.
 * `sources` acumula los motivos por los que se apuntó. Índice único por emailHash.
 */
export async function getWaitlistCollection() {
  const { db } = await connectToDatabase();
  const collection = db.collection<WaitlistDoc>('waitlist');
  try {
    await collection.createIndex({ emailHash: 1 }, { unique: true });
  } catch {
    // El índice ya existe — ignorar
  }
  return collection;
}

/** Documento de configuración de sesiones gratuitas (singleton). */
export interface FreeSessionsDoc {
  _id: string;
  open: boolean;
  limit: number;
  used: number;
  updatedAt?: Date;
}

/**
 * Configuración de sesiones gratuitas (singleton { _id: 'config' }):
 * interruptor del coach + cupo + contador. Sin datos personales.
 */
export async function getFreeSessionsCollection() {
  const { db } = await connectToDatabase();
  return db.collection<FreeSessionsDoc>('free_sessions');
}

/** Documento de cupos disponibles por plan comercial (_id = PlanId). */
export interface PlanQuotaDoc {
  _id: string;
  open: boolean;
  limit: number;
  used: number;
  updatedAt?: Date;
}

export async function getPlanQuotasCollection() {
  const { db } = await connectToDatabase();
  return db.collection<PlanQuotaDoc>('plan_quotas');
}

export async function getMedicalDocumentCacheCollection() {
  const { db } = await connectToDatabase();
  return db.collection('medical_document_cache');
}

/** Cola de trabajos de IA (generación de recomendaciones). Ver ai-job-queue.ts. */
export async function getAIJobsCollection() {
  const { db } = await connectToDatabase();
  return db.collection<import('./ai-job-queue').AIJobDoc>('ai_jobs');
}

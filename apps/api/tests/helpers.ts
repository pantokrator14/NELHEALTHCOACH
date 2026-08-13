/**
 * helpers.ts — Infraestructura común para los tests de integración.
 *
 * PRINCIPIOS:
 *  1. Perfiles DESECHABLES: todo coach/cliente/receta/ejercicio que un test
 *     cree lleva un marcador único (`testTag`) y se registra en un registro
 *     de limpieza global. Al terminar el test (éxito O fallo, vía try/finally
 *     o afterAll), se borra TODO lo registrado. NUNCA quedan perfiles de
 *     prueba en la base de datos.
 *  2. Auth real: los tests firman JWTs válidos con el JWT_SECRET real.
 *  3. Cada test usa un coach/email/objectId ÚNICO (evita colisiones y hace
 *     los tests repetibles).
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { encrypt } from '../src/app/lib/encryption';

const URI = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

// ── Registro global de limpieza ─────────────────────────────────────────────

type CleanupEntry =
  | { kind: 'healthforms'; ids: ObjectId[] }
  | { kind: 'coaches'; ids: ObjectId[] }
  | { kind: 'recipes'; ids: ObjectId[] }
  | { kind: 'exercises'; ids: ObjectId[] }
  | { kind: 'ai_jobs'; clientIds: string[] }
  | { kind: 'raw'; collection: string; ids: ObjectId[] };

const cleanupRegistry: Record<string, Set<string>> = {};

/** Registra un documento para borrado automático al final del test. */
export function registerCleanup(collection: string, id: ObjectId | string) {
  const key = collection;
  if (!cleanupRegistry[key]) cleanupRegistry[key] = new Set();
  cleanupRegistry[key].add(id.toString());
}

/** Borra TODO lo registrado. Llamar SIEMPRE en finally (o afterAll). */
export async function runCleanup(): Promise<void> {
  const mongo = new MongoClient(URI);
  await mongo.connect();
  try {
    const db = mongo.db();
    for (const [collection, ids] of Object.entries(cleanupRegistry)) {
      if (!(ids instanceof Set)) continue;
      if (ids.size === 0) continue;
      const objIds = Array.from(ids as Set<string>).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      if (objIds.length === 0) continue;
      const res = await db.collection(collection).deleteMany({ _id: { $in: objIds } });
      console.log(`🧹 Cleanup ${collection}: ${res.deletedCount} borrados`);
    }
    // ai_jobs: borrar por clientId
    if (cleanupRegistry['ai_jobs']?.size) {
      const clientIds = Array.from(cleanupRegistry['ai_jobs'] as Set<string>);
      const res = await db.collection('ai_jobs').deleteMany({ clientId: { $in: clientIds } });
      console.log(`🧹 Cleanup ai_jobs: ${res.deletedCount} borrados`);
    }
  } finally {
    await mongo.close();
    for (const key of Object.keys(cleanupRegistry)) cleanupRegistry[key].clear();
  }
}

/** Registra el clientId para que su job de cola se limpie junto al cliente. */
export function registerClientWithJobs(clientId: string) {
  registerCleanup('healthforms', clientId);
  registerCleanup('ai_jobs', clientId);
}

// ── Factories de perfiles desechables ───────────────────────────────────────

/** Crea un coach desechable en la DB. Devuelve { id, email, password }. */
export async function createDisposableCoach(db: any): Promise<{
  id: ObjectId;
  email: string;
  password: string;
}> {
  const email = `coach_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  const password = 'TestPass123!';
  const coach = {
    email,
    passwordHash: 'dummy-hash', // los tests de auth reales usan register(); esto es para ownership
    name: 'Coach Test',
    role: 'coach',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const res = await db.collection('coaches').insertOne(coach);
  registerCleanup('coaches', res.insertedId);
  return { id: res.insertedId, email, password };
}

/**
 * Crea un cliente desechable con personalData CIFRADA (como en producción).
 * Devuelve el documento completo.
 */
export async function createDisposableClient(db: any, coachId?: ObjectId | string): Promise<any> {
  const client = {
    _id: new ObjectId(),
    coachId: coachId ? coachId.toString() : new ObjectId().toString(),
    name: encrypt(`Test Client ${Date.now()}`),
    personalData: {
      name: encrypt(`Test Client ${Date.now()}`),
      email: encrypt(`client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`),
      gender: encrypt('male'),
      age: encrypt('35'),
      weight: encrypt('75'),
      height: encrypt('178'),
      language: encrypt('es'),
    },
    medicalData: {
      diseases: encrypt('ninguna'),
      medications: encrypt('ninguno'),
      documents: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('healthforms').insertOne(client);
  registerClientWithJobs(client._id.toString());
  return client;
}

/** Crea una receta desechable (cifrada como en producción). */
export async function createDisposableRecipe(db: any): Promise<any> {
  const recipe = {
    _id: new ObjectId(),
    title: encrypt(`Receta Test ${Date.now()}`),
    description: encrypt('Receta de prueba para tests'),
    category: [encrypt('prueba')],
    ingredients: [{ name: encrypt('Ingrediente'), quantity: encrypt('1'), unit: encrypt('unidad') }],
    instructions: [encrypt('Instrucción de prueba')],
    cookTime: encrypt('15'),
    difficulty: encrypt('fácil'),
    isPublished: true,
    author: encrypt('NelHealthCoach'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('recipes').insertOne(recipe);
  registerCleanup('recipes', recipe._id);
  return recipe;
}

/** Crea un ejercicio desechable (cifrado como en producción). */
export async function createDisposableExercise(db: any): Promise<any> {
  const exercise = {
    _id: new ObjectId(),
    name: encrypt(`Ejercicio Test ${Date.now()}`),
    description: encrypt('Ejercicio de prueba para tests'),
    category: [encrypt('fuerza')],
    instructions: [encrypt('Instrucción de prueba')],
    equipment: [encrypt('ninguno')],
    difficulty: encrypt('facil'),
    clientLevel: encrypt('principiante'),
    muscleGroups: [encrypt('pectorales')],
    sets: 3,
    repetitions: encrypt('10'),
    timeUnderTension: encrypt('3-1-1'),
    restBetweenSets: encrypt('60 segundos'),
    progression: encrypt('Progresión de prueba'),
    author: encrypt('NelHealthCoach'),
    isPublished: true,
    tags: [encrypt('test')],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('exercises').insertOne(exercise);
  registerCleanup('exercises', exercise._id);
  return exercise;
}

// ── Auth y requests ─────────────────────────────────────────────────────────

/** Firma un JWT de coach válido (payload real: coachId, email, role). */
export function coachToken(coachId: string, role: 'admin' | 'coach' = 'coach'): string {
  return jwt.sign(
    { coachId, email: `coach_${coachId.slice(0, 6)}@test.local`, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/** Crea un NextRequest con auth Bearer (o sin auth, si token es null). */
export function authedRequest(
  url: string,
  method: string,
  token: string | null,
  body?: unknown
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Utils misc ──────────────────────────────────────────────────────────────

export function uniqueId(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function connectDB() {
  const mongo = new MongoClient(URI);
  await mongo.connect();
  return { mongo, db: mongo.db() };
}

export { URI, JWT_SECRET };

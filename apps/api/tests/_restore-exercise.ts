import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { encrypt } from '../src/app/lib/encryption';
import fs from 'fs';

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();
  const coll = db.collection('exercises');

  // Datos originales desde exercises.json
  const data = JSON.parse(fs.readFileSync('scripts/exercises.json', 'utf-8'));
  const source = data.find((e: any) => e.name === "World's Greatest Stretch");
  if (!source) throw new Error('No encontrado en seed');

  // Cifrar igual que upload-exercises.ts
  const encrypted = {
    name: encrypt(source.name),
    description: encrypt(source.description),
    category: (source.category || []).map((c: string) => encrypt(c)),
    instructions: (source.instructions || []).map((i: string) => encrypt(i)),
    equipment: (source.equipment || []).map((eq: string) => encrypt(eq)),
    difficulty: encrypt(source.difficulty),
    clientLevel: encrypt(source.clientLevel),
    muscleGroups: (source.muscleGroups || []).map((m: string) => encrypt(m)),
    contraindications: (source.contraindications || []).map((c: string) => encrypt(c)),
    sets: source.sets || 3,
    repetitions: encrypt(source.repetitions),
    timeUnderTension: encrypt(source.timeUnderTension || '3-1-1'),
    restBetweenSets: encrypt(source.restBetweenSets || '45-60 segundos'),
    progression: encrypt(source.progression),
    demo: {
      url: encrypt(source.demo?.url || ''),
      key: encrypt(source.demo?.key || ''),
      type: encrypt(source.demo?.type || 'placeholder'),
      name: encrypt(source.demo?.name || ''),
      size: source.demo?.size || 0,
      uploadedAt: encrypt(source.demo?.uploadedAt || new Date().toISOString()),
      videoSearchUrl: source.demo?.videoSearchUrl ? encrypt(source.demo.videoSearchUrl) : '',
    },
    progressionOf: null,
    progressesTo: [],
    author: encrypt(source.author || 'NelHealthCoach'),
    isPublished: source.isPublished !== false,
    tags: (source.tags || []).map((t: string) => encrypt(t)),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const deletedId = '69f9249f0012b9ccb05f1e37';
  const doc = { _id: new ObjectId(deletedId), ...encrypted };
  const res = await coll.insertOne(doc as any);
  console.log('✅ Ejercicio restaurado con _id original:', res.insertedId.toString());

  // Verificación
  const check = await coll.findOne({ _id: new ObjectId(deletedId) });
  console.log('Verificación: existe =', !!check, '| name cifrado =', check?.name?.slice(0, 20));

  await mongo.close();
}
main().catch(e => { console.error('FALLO:', e.message); process.exit(1); });

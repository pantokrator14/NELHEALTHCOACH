import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();

  console.log('=== HEALTHFORMS (posibles perfiles de test) ===');
  const testNames = /test|e2e|pdf|queue|regen|prueba/i;
  const clients = await db.collection('healthforms').find({
    $or: [
      { name: testNames },
      { 'personalData.name': testNames },
    ]
  }).project({ name: 1, coachId: 1, 'personalData.name': 1, 'aiProgress.currentSessionId': 1 }).toArray();
  for (const c of clients) {
    console.log(`- ${c._id} | name=${c.name} | personal=${c.personalData?.name} | coachId=${c.coachId}`);
  }
  console.log(`Total: ${clients.length}`);

  console.log('\n=== AI_JOBS ===');
  const jobs = await db.collection('ai_jobs').find({}).project({ clientId: 1, type: 1, status: 1, attempts: 1, createdAt: 1 }).toArray();
  for (const j of jobs) {
    console.log(`- ${j._id} | client=${j.clientId} | type=${j.type} | status=${j.status} | attempts=${j.attempts} | createdAt=${j.createdAt}`);
  }
  console.log(`Total: ${jobs.length}`);

  console.log('\n=== RECIPES / EXERCISES (posibles de test) ===');
  const recipes = await db.collection('recipes').find({ title: testNames }).project({ title: 1 }).toArray();
  for (const r of recipes) console.log(`- receta: ${r._id} | ${r.title}`);
  const exercises = await db.collection('exercises').find({ name: testNames }).project({ name: 1 }).toArray();
  for (const e of exercises) console.log(`- ejercicio: ${e._id} | ${e.name}`);

  await mongo.close();
}
main().catch(e => { console.error('FALLO:', e.message); process.exit(1); });

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { safeDecrypt } from '../src/app/lib/encryption';

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();

  // 1. Perfiles "Test PDF Client" (marcador: sesión e2e_pdf_test_session)
  const pdfClients = await db.collection('healthforms').find({
    'aiProgress.currentSessionId': 'e2e_pdf_test_session',
  }).toArray();
  console.log(`Eliminando ${pdfClients.length} perfiles Test PDF Client...`);
  for (const c of pdfClients) {
    await db.collection('healthforms').deleteOne({ _id: c._id });
    await db.collection('ai_jobs').deleteMany({ clientId: c._id.toString() });
    console.log(`  - borrado ${c._id}`);
  }

  // 2. Perfiles "Test Queue/Regen" (session_old_regen_test u otros marcadores conocidos)
  const other = await db.collection('healthforms').find({
    $or: [
      { 'aiProgress.currentSessionId': 'session_old_regen_test' },
      { 'aiProgress.sessions.sessionId': /test_e2e_session/ },
    ]
  }).toArray();
  console.log(`Eliminando ${other.length} perfiles Test Queue/Regen...`);
  for (const c of other) {
    await db.collection('healthforms').deleteOne({ _id: c._id });
    await db.collection('ai_jobs').deleteMany({ clientId: c._id.toString() });
    console.log(`  - borrado ${c._id}`);
  }

  // 3. Jobs huérfanos: ai_jobs cuyo clientId no existe en healthforms
  const jobs = await db.collection('ai_jobs').find({}).toArray();
  let orphaned = 0;
  for (const j of jobs) {
    const exists = await db.collection('healthforms').countDocuments({ _id: new (await import('mongodb')).ObjectId(j.clientId) });
    if (!exists) {
      await db.collection('ai_jobs').deleteOne({ _id: j._id });
      console.log(`  - job huérfano borrado: ${j._id} (client=${j.clientId}, status=${j.status})`);
      orphaned++;
    }
  }
  console.log(`Jobs huérfanos eliminados: ${orphaned}`);

  // 4. Recetas/ejercicios de test (nombres descifrables Test PDF...)
  const recipes = await db.collection('recipes').find({}).toArray();
  for (const r of recipes) {
    let title = '';
    try { title = safeDecrypt(r.title) || ''; } catch {}
    if (/test|e2e/i.test(title)) {
      await db.collection('recipes').deleteOne({ _id: r._id });
      console.log(`  - receta de test borrada: ${r._id} "${title}"`);
    }
  }
  const exercises = await db.collection('exercises').find({}).toArray();
  for (const e of exercises) {
    let name = '';
    try { name = safeDecrypt(e.name) || ''; } catch {}
    if (/test|e2e/i.test(name)) {
      await db.collection('exercises').deleteOne({ _id: e._id });
      console.log(`  - ejercicio de test borrado: ${e._id} "${name}"`);
    }
  }

  await mongo.close();
  console.log('✅ Limpieza completada');
}
main().catch(e => { console.error('FALLO:', e.message); process.exit(1); });

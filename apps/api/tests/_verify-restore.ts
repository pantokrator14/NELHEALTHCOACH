import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { decrypt, safeDecrypt } from '../src/app/lib/encryption';

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();

  // 1. Verificar el ejercicio restaurado
  const ex = await db.collection('exercises').findOne({ _id: new ObjectId('69f9249f0012b9ccb05f1e37') });
  if (ex) {
    console.log('✅ Ejercicio restaurado:', safeDecrypt(ex.name));
    console.log('   descripción:', safeDecrypt(ex.description)?.slice(0, 60));
    console.log('   muscleGroups[0]:', safeDecrypt(ex.muscleGroups?.[0]));
  } else {
    console.log('❌ Ejercicio NO existe');
  }

  // 2. Escaneo de seguridad: verificar que NO hay otros ejercicios/recetas con nombres tipo test
  //    (esta vez descifrando TODOS y revisando con regex preciso)
  const suspicious = [];
  const exercises = await db.collection('exercises').find({}, { projection: { name: 1 } }).toArray();
  for (const e of exercises) {
    let name = '';
    try { name = safeDecrypt(e.name) || ''; } catch { continue; }
    // Regex preciso: nombre que EMPIEZA con Test/E2E/Prueba (no substring)
    if (/^(test|e2e|prueba|dummy|mock)[\s_-]/i.test(name)) {
      suspicious.push({ coll: 'exercises', id: e._id.toString(), name });
    }
  }
  const recipes = await db.collection('recipes').find({}, { projection: { title: 1 } }).toArray();
  for (const r of recipes) {
    let title = '';
    try { title = safeDecrypt(r.title) || ''; } catch { continue; }
    if (/^(test|e2e|prueba|dummy|mock)[\s_-]/i.test(title)) {
      suspicious.push({ coll: 'recipes', id: r._id.toString(), name: title });
    }
  }
  if (suspicious.length === 0) {
    console.log('✅ No quedan ejercicios/recetas de test en la DB');
  } else {
    console.log('⚠️ Sospechosos:', suspicious);
  }

  // 3. Verificar que NO quedan perfiles de test en healthforms
  const testClients = await db.collection('healthforms').find({
    $or: [
      { 'aiProgress.currentSessionId': /e2e_|session_old_regen_test|test_e2e/ },
    ]
  }).project({ _id: 1 }).toArray();
  console.log(testClients.length === 0 ? '✅ No quedan perfiles de test' : `⚠️ Quedan ${testClients.length}`);

  await mongo.close();
}
main().catch(e => { console.error('FALLO:', e.message); process.exit(1); });

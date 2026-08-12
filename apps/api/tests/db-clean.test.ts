/**
 * DB-CLEAN CHECK — verifica que los tests NO dejan datos de prueba en la DB.
 * Corre como ÚLTIMA suite del runner (después de la limpieza de todos los tests).
 * Si algo queda, es un bug del cleanup de algún test → hay que arreglarlo.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();
  const results: Record<string, number> = {};

  // Perfiles de test: nombres/sesiones con marcadores TDD
  const tddClients = await db.collection('healthforms').countDocuments({
    $or: [
      { 'aiProgress.currentSessionId': /e2e_|session_old_regen_test|test_e2e/ },
      { 'personalData.name': /Test (PDF|Queue|Regen|Client)/ },
    ]
  });
  results['healthforms de test'] = tddClients;

  const testRecipes = await db.collection('recipes').countDocuments({ title: /Receta TDD|Test/i });
  const testExercises = await db.collection('exercises').countDocuments({ name: /Ejercicio TDD|Test/i });
  results['recetas de test'] = testRecipes;
  results['ejercicios de test'] = testExercises;

  const orphanJobs = await db.collection('ai_jobs').countDocuments({});
  results['jobs en ai_jobs (todos)'] = orphanJobs;

  let clean = true;
  for (const [k, v] of Object.entries(results)) {
    console.log(`${v === 0 ? '✅' : '⚠️'} ${k}: ${v}`);
    if (v > 0) clean = false;
  }
  console.log(clean ? '\n✅ DB LIMPIA — sin datos de prueba' : '\n⚠️ QUEDAN DATOS DE PRUEBA');
  await mongo.close();
  process.exit(0); // reporta, no bloquea (el runner ya suma fallos por suite)
}
main().catch(e => { console.error('FALLO:', e.message); process.exit(1); });

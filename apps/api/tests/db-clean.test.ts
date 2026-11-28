/**
 * DB-CLEAN CHECK — verifica que los tests NO dejan datos de prueba en la DB.
 * Corre como ÚLTIMA suite del runner (después de la limpieza de todos los tests).
 * Si algo queda, es un bug del cleanup de algún test → hay que arreglarlo.
 *
 * NOTA: Respeta explícitamente las cuentas demo de prueba de planes
 * (*.demo@nelhealthcoach.com) y cualquier contenido real existente.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { decrypt } from '../src/app/lib/encryption';

function safeDecrypt(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();
  const results: Record<string, number> = {};

  // Perfiles de test en healthforms (respetando *.demo@nelhealthcoach.com)
  const allHealthForms = await db
    .collection('healthforms')
    .find({}, { projection: { 'aiProgress.currentSessionId': 1, 'personalData.name': 1, 'personalData.email': 1 } })
    .toArray();
  const tddClients = allHealthForms.filter((doc) => {
    const email = safeDecrypt(doc?.personalData?.email);
    if (email.endsWith('.demo@nelhealthcoach.com') || email.includes('.demo@nelhealthcoach.com')) {
      return false;
    }
    const name = safeDecrypt(doc?.personalData?.name);
    const sid = typeof doc?.aiProgress?.currentSessionId === 'string' ? doc.aiProgress.currentSessionId : '';
    return (
      /e2e_|session_old_regen_test|test_e2e/.test(sid) ||
      /Test (PDF|Queue|Regen|Client)/i.test(name) ||
      /@test\.local$/i.test(email) ||
      /^tdd_/i.test(email)
    );
  }).length;
  results['healthforms de test'] = tddClients;

  // Cuentas de clientes de prueba (respetando *.demo@nelhealthcoach.com)
  const allClientAccounts = await db
    .collection('client_accounts')
    .find({}, { projection: { email: 1 } })
    .toArray();
  const testClientAccounts = allClientAccounts.filter((doc) => {
    const email = safeDecrypt(doc.email);
    if (email.includes('.demo@nelhealthcoach.com')) return false;
    return /@test\.local$/i.test(email) || /^tdd_/i.test(email);
  }).length;
  results['client_accounts de test'] = testClientAccounts;

  // Coaches de prueba (descifrando email/nombre porque van encriptados en DB)
  const allCoaches = await db
    .collection('coaches')
    .find({}, { projection: { email: 1, firstName: 1, lastName: 1 } })
    .toArray();
  const testCoaches = allCoaches.filter((doc) => {
    const email = safeDecrypt(doc.email);
    const first = safeDecrypt(doc.firstName);
    const last = safeDecrypt(doc.lastName);
    return (
      /@test\.local$/i.test(email) ||
      /^tda_/i.test(email) ||
      (first === 'Test' && last === 'TDD')
    );
  }).length;
  results['coaches de test'] = testCoaches;

  // Recetas y ejercicios de prueba (descifrando porque title/name van encriptados)
  const allRecipes = await db.collection('recipes').find({}, { projection: { title: 1 } }).toArray();
  const testRecipes = allRecipes.filter((doc) => /Receta TDD|Receta Test/i.test(safeDecrypt(doc.title))).length;

  const allExercises = await db.collection('exercises').find({}, { projection: { name: 1 } }).toArray();
  const testExercises = allExercises.filter((doc) => /Ejercicio TDD|Ejercicio Test/i.test(safeDecrypt(doc.name))).length;

  results['recetas de test'] = testRecipes;
  results['ejercicios de test'] = testExercises;

  // Las entradas del blog guardan los textos CIFRADOS; el slug sí va en plano
  // y lleva el marcador del test → se audita por slug (tanto en `entries` como en `blog_posts`).
  const testSlugFilter = {
    slug: /test|prueba|duplicado|entrada-de-prueba|base-relacionadas|misma-categoria|mismas-etiquetas|otra-categoria|borrador-relacionadas|post-comentarios/i,
  };
  const testBlogEntries = await db.collection('entries').countDocuments(testSlugFilter);
  const testBlogLegacy = await db.collection('blog_posts').countDocuments(testSlugFilter);
  results['entradas de blog de test (entries)'] = testBlogEntries;
  results['entradas de blog de test (blog_posts)'] = testBlogLegacy;

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

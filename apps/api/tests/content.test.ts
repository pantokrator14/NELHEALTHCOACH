/**
 * SUITE DE CONTENIDO (RECIPES + EXERCISES) — CRUD + validación + cifrado + ownership.
 *
 * Cubre: GET lista (publicados para no-admin, todos para admin), POST crear
 * (validación zod, cifrado en DB), GET by id, PUT actualizar (ownership 403),
 * DELETE (ownership), y casos de entrada inválida (400).
 *
 * PERFILES DESECHABLES: recetas/ejercicios creados se registran y se borran en finally.
 */
import 'dotenv/config';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { GET as listRecipes, POST as createRecipe } from '../src/app/api/recipes/route';
import { GET as getRecipe, PUT as updateRecipe, DELETE as deleteRecipe } from '../src/app/api/recipes/[id]/route';
import { GET as listExercises, POST as createExercise } from '../src/app/api/exercises/route';
import { PUT as updateExercise, DELETE as deleteExercise } from '../src/app/api/exercises/route';
import { connectDB, registerCleanup, runCleanup, authedRequest, coachToken, uniqueId } from './helpers';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const base = 'http://localhost:3001/api';

function validRecipeBody() {
  const tag = uniqueId('rec');
  return {
    title: `Receta TDD ${tag}`,
    description: `Descripción de receta TDD ${tag}`,
    category: ['prueba'],
    ingredients: ['2 huevos', '100 g espinacas'],
    instructions: ['Saltear', 'Servir'],
    nutrition: { protein: 20, carbs: 5, fat: 15, calories: 250 },
    cookTime: 15,
    difficulty: 'easy',
    tags: ['test'],
    isPublished: true,
  };
}

function validExerciseBody() {
  const tag = uniqueId('ex');
  return {
    name: `Ejercicio TDD ${tag}`,
    description: `Descripción de ejercicio TDD ${tag}`,
    category: ['fuerza'],
    instructions: ['Ejecutar', 'Descansar'],
    equipment: ['ninguno'],
    difficulty: 'easy',
    clientLevel: 'principiante',
    muscleGroups: ['pectorales'],
    sets: 3,
    repetitions: '10',
    timeUnderTension: '3-1-1',
    restBetweenSets: '60 segundos',
    progression: '',
    isPublished: true,
  };
}

async function main() {
  const { db } = await connectDB();
  const coachId = new ObjectId().toString();
  const token = coachToken(coachId);

  // ═══ 1. RECIPES: validación ═══
  section('1. Recipes — validación de entrada');
  let res = await createRecipe(authedRequest(`${base}/recipes`, 'POST', token, {
    title: '',
    description: '',
    ingredients: [],
    instructions: [],
  }), { params: Promise.resolve({}) });
  check('receta inválida → 400', res.status === 400, `status=${res.status}`);

  res = await createRecipe(new NextRequest(`${base}/recipes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validRecipeBody()) }), { params: Promise.resolve({}) });
  check('receta sin token → 401', res.status === 401, `status=${res.status}`);

  // ═══ 2. RECIPES: crear + cifrado ═══
  section('2. Recipes — crear y cifrado');
  // Admin: la receta se publica directo (los coaches quedan en moderación)
  const adminToken = coachToken(new ObjectId().toString(), 'admin');
  res = await createRecipe(authedRequest(`${base}/recipes`, 'POST', adminToken, validRecipeBody()), { params: Promise.resolve({}) });
  const created = await res.json();
  check('POST receta (admin) → 201/200', res.status === 200 || res.status === 201, `status=${res.status}`);
  const recipeId = created?.data?._id || created?.data?.id || created?._id;
  check('devuelve id', !!recipeId, JSON.stringify(created).slice(0, 120));
  if (recipeId) {
    registerCleanup('recipes', String(recipeId));
    const stored = await db.collection('recipes').findOne({ _id: new ObjectId(String(recipeId)) });
    check('receta persistida', !!stored);
    check('title CIFRADO en DB', !!stored?.title && !stored.title.includes('Receta TDD'), stored?.title?.slice(0, 25));
    check('nutrition NO cifrada (numérica)', typeof stored?.nutrition?.protein === 'number', typeof stored?.nutrition?.protein);
  }

  // Coach no-admin: la receta queda pendiente de moderación (isPublished=false)
  res = await createRecipe(authedRequest(`${base}/recipes`, 'POST', token, validRecipeBody()), { params: Promise.resolve({}) });
  const coachCreated = await res.json();
  const coachRecipeId = coachCreated?.data?._id || coachCreated?.data?.id || coachCreated?._id;
  check('POST receta (coach) → pendiente de aprobación', coachCreated?.data?.pendingApproval === true || coachCreated?.pendingApproval === true, JSON.stringify(coachCreated).slice(0, 120));
  if (coachRecipeId) {
    registerCleanup('recipes', String(coachRecipeId));
    const storedCoach = await db.collection('recipes').findOne({ _id: new ObjectId(String(coachRecipeId)) });
    check('receta de coach NO publicada (isPublished=false)', storedCoach?.isPublished === false, `isPublished=${storedCoach?.isPublished}`);
    // La propuesta de creación también se limpia
    const creationProposal = await db.collection('editproposals').findOne({ targetType: 'recipe', targetId: new ObjectId(String(coachRecipeId)) });
    if (creationProposal?._id) registerCleanup('editproposals', creationProposal._id);
  }

  // ═══ 3. RECIPES: GET by id + lista ═══
  section('3. Recipes — lectura');
  if (recipeId) {
    res = await getRecipe(authedRequest(`${base}/recipes/${recipeId}`, 'GET', token), { params: Promise.resolve({ id: String(recipeId) }) });
    check('GET by id → 200', res.status === 200, `status=${res.status}`);
    const byId = await res.json();
    check('título desencriptado', /Receta TDD/.test(byId?.data?.title || ''), byId?.data?.title?.slice(0, 30));

    // GET sin token: recetas públicas
    res = await getRecipe(new NextRequest(`${base}/recipes/${recipeId}`, { method: 'GET' }), { params: Promise.resolve({ id: String(recipeId) }) });
    check('GET by id sin token → 200 (público)', res.status === 200, `status=${res.status}`);
  }
  res = await listRecipes(new NextRequest(`${base}/recipes`, { method: 'GET' }), { params: Promise.resolve({}) });
  const listBody = await res.json();
  check('GET lista → 200', res.status === 200, `status=${res.status}`);
  const recs = listBody?.data || listBody?.recipes || [];
  check('lista es array', Array.isArray(recs));
  if (Array.isArray(recs) && recipeId) {
    const found = recs.some((r: any) => r.id === recipeId || r._id?.toString?.() === recipeId);
    check('la receta recién creada (publicada) aparece en lista pública', found, `recipeId=${recipeId}`);
  }

  // ═══ 4. RECIPES: update/delete (workflow EditProposal para coaches) ═══
  section('4. Recipes — update/delete + roles');
  if (recipeId) {
    const otherToken = coachToken(new ObjectId().toString());

    // Coach no-admin: el PUT crea una PROPUESTA de edición (workflow), no edita directo
    res = await updateRecipe(authedRequest(`${base}/recipes/${recipeId}`, 'PUT', otherToken, validRecipeBody()), { params: Promise.resolve({ id: String(recipeId) }) });
    check('PUT coach (no-admin) → 200 (crea propuesta)', res.status === 200, `status=${res.status}`);
    const proposal = await db.collection('editproposals').findOne({ targetType: 'recipe', targetId: new ObjectId(String(recipeId)) });
    check('propuesta de edición creada en DB', !!proposal);
    if (proposal?._id) registerCleanup('editproposals', proposal._id);

    // Admin edita directo (adminToken ya definido en sección 2)
    res = await updateRecipe(authedRequest(`${base}/recipes/${recipeId}`, 'PUT', adminToken, { ...validRecipeBody(), title: `Receta TDD Admin ${Date.now()}` }), { params: Promise.resolve({ id: String(recipeId) }) });
    check('PUT admin → 200', res.status === 200, `status=${res.status}`);

    // DELETE solo admin: coach → 403
    res = await deleteRecipe(authedRequest(`${base}/recipes/${recipeId}`, 'DELETE', otherToken), { params: Promise.resolve({ id: String(recipeId) }) });
    check('DELETE coach (no-admin) → 403', res.status === 403, `status=${res.status}`);

    // DELETE admin → 200
    res = await deleteRecipe(authedRequest(`${base}/recipes/${recipeId}`, 'DELETE', adminToken), { params: Promise.resolve({ id: String(recipeId) }) });
    check('DELETE admin → 200', res.status === 200, `status=${res.status}`);
    const after = await db.collection('recipes').findOne({ _id: new ObjectId(String(recipeId)) });
    check('receta borrada de DB', !after);
  }

  // ═══ 5. EXERCISES: crear + validación ═══
  section('5. Exercises — crear y validación');
  res = await createExercise(authedRequest(`${base}/exercises`, 'POST', token, {
    name: '',
    description: '',
    category: [],
    instructions: [],
    muscleGroups: [],
    difficulty: 'easy',
    clientLevel: 'principiante',
  }), { params: Promise.resolve({}) });
  check('ejercicio inválido → 400', res.status === 400, `status=${res.status}`);

  res = await createExercise(authedRequest(`${base}/exercises`, 'POST', token, validExerciseBody()), { params: Promise.resolve({}) });
  const exCreated = await res.json();
  check('POST ejercicio → 201/200', res.status === 200 || res.status === 201, `status=${res.status}`);
  const exerciseId = exCreated?.data?._id || exCreated?.data?.id || exCreated?._id;
  if (exerciseId) {
    registerCleanup('exercises', String(exerciseId));
    const stored = await db.collection('exercises').findOne({ _id: new ObjectId(String(exerciseId)) });
    check('ejercicio persistido', !!stored);
    check('name CIFRADO en DB', !!stored?.name && !stored.name.includes('Ejercicio TDD'), stored?.name?.slice(0, 25));
  }

  // ═══ 6. EXERCISES: update/delete (PUT/DELETE en /api/exercises, id en body) ═══
  section('6. Exercises — update/delete');
  if (exerciseId) {
    res = await updateExercise(authedRequest(`${base}/exercises`, 'PUT', token, { id: String(exerciseId), ...validExerciseBody() }), { params: Promise.resolve({}) });
    check('PUT → 200', res.status === 200, `status=${res.status}`);

    // PUT sin id → 400
    res = await updateExercise(authedRequest(`${base}/exercises`, 'PUT', token, validExerciseBody()), { params: Promise.resolve({}) });
    check('PUT sin id → 400', res.status === 400, `status=${res.status}`);

    // DELETE solo admin: coach → 403
    res = await deleteExercise(authedRequest(`${base}/exercises`, 'DELETE', token, { ids: [String(exerciseId)] }), { params: Promise.resolve({}) });
    check('DELETE coach (no admin) → 403', res.status === 403, `status=${res.status}`);

    // DELETE admin → 200
    const adminToken = coachToken(new ObjectId().toString(), 'admin');
    res = await deleteExercise(authedRequest(`${base}/exercises`, 'DELETE', adminToken, { ids: [String(exerciseId)] }), { params: Promise.resolve({}) });
    check('DELETE admin → 200', res.status === 200, `status=${res.status}`);
    const after = await db.collection('exercises').findOne({ _id: new ObjectId(String(exerciseId)) });
    check('ejercicio borrado de DB', !after);
  }
}

main()
  .catch((e) => { console.error('💥 Content suite falló:', e); failures++; })
  .finally(async () => {
    await runCleanup();
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 CONTENT (recipes+exercises): ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

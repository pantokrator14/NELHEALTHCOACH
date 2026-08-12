/**
 * PRUEBA DEL ROUTE PDF REAL (GET) — sin dependencias externas:
 * - Recetas/ejercicios de PRUEBA creados en la DB (en español, SIN imágenes)
 * - Coach inexistente (evita S3)
 * - Sesión FASE 4 en inglés con translation meta
 * Valida: match por ID, traducción es→en (LLM real), PDF generation real.
 *
 * LIMPIEZA GARANTIZADA: todos los datos de prueba se registran en el registro
 * global de limpieza y se borran en `finally` — aunque el test falle a mitad.
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { encrypt } from '../src/app/lib/encryption';
import { encryptSessionFields } from '../src/app/lib/recommendation-translator';
import { GET } from '../src/app/api/clients/[id]/ai/[sessionId]/pdf/route';
import { connectDB, registerCleanup, registerClientWithJobs, runCleanup } from './helpers';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function main() {
  const { db } = await connectDB();

  // ── Receta y ejercicio de PRUEBA (español, sin imágenes) ──
  const testRecipe = {
    title: encrypt('Huevos al Plato con Espinacas y Queso Feta'),
    ingredients: [
      encrypt('2 huevos'),
      { name: encrypt('Espinacas frescas'), quantity: '100 g', notes: encrypt('Lavadas') },
      encrypt('Sal y pimienta al gusto'),
    ],
    instructions: [encrypt('Precalentar el horno a 180°C.'), encrypt('Saltear las espinacas con aceite.'), encrypt('Hornear 12 minutos.')],
    nutrition: { protein: 20, carbs: 5, fat: 15, calories: 250 },
    cookTime: '20 min',
    difficulty: 'easy',
  };
  const testExercise = {
    name: encrypt('Flexiones de rodillas'),
    description: encrypt('Ejercicio de pecho para principiantes'),
    instructions: [encrypt('Apoyar las rodillas en el suelo.'), encrypt('Bajar el pecho hacia el suelo.'), encrypt('Empujar hacia arriba.')],
    sets: 3,
    repetitions: '10',
    equipment: [encrypt('Ninguno')],
    muscleGroups: [encrypt('Pecho')],
  };
  const rec = await db.collection('recipes').insertOne(testRecipe as any);
  const ex = await db.collection('exercises').insertOne(testExercise as any);
  registerCleanup('recipes', rec.insertedId);
  registerCleanup('exercises', ex.insertedId);
  const recipeId = rec.insertedId.toString();
  const exerciseId = ex.insertedId.toString();
  console.log('Receta/ejercicio de prueba creados (sin imágenes):', recipeId, exerciseId);

  // ── Sesión FASE 4 ya traducida al inglés ──
  const sessionPlain = {
    sessionId: 'e2e_pdf_test_session',
    monthNumber: 1, totalWeeks: 4, status: 'draft',
    summary: 'The patient shows good progress. Recommendations focus on balanced nutrition and moderate exercise.',
    vision: 'Achieve a healthy body composition and sustainable long-term habits.',
    medicalSummary: 'Biomarkers within acceptable ranges.',
    medicalComparativeAnalysis: 'Expected improvement in cholesterol and glucose.',
    labResults: [{ name: 'Cholesterol', value: '190', range: '120-200', status: 'normal' }],
    structuredMedicalAnalysis: {
      exams: [{ intro: 'Complete blood analysis', analysis: 'Normal values overall', table: [{ biomarcador: 'Glucose', valor: '95', rango_normal: '70-100', estado: 'Normal' }] }],
      supplements: [{ name: 'Vitamin D', dosage: '1000 IU', timing: 'In the morning', rationale: 'Supplement mild deficiency' }],
    },
    weeks: [{ weekNumber: 1, nutrition: { focus: '7-day meal plan, 3 meals a day', shoppingList: [{ item: 'Eggs', quantity: '12 units', priority: 'high' }] }, exercise: { focus: 'Weekly strength and cardio routine', equipment: ['Dumbbells', 'Mat'] }, habits: { trackingMethod: 'Habit diary', motivationTip: 'Be consistent with schedules' } }],
    checklist: [
      { id: 'pdf_chk_1', description: 'Monday Breakfast: Baked Eggs with Spinach', category: 'nutrition', completed: false, weekNumber: 1, type: 'desayuno', recipeId, isRecurring: false, details: { recipe: { title: 'Baked Eggs with Spinach', ingredients: [{ name: 'Eggs', quantity: '2' }], preparation: 'Bake for 20 minutes', tips: 'Serve warm' } } },
      { id: 'pdf_chk_2', description: 'Monday: Knee Push-ups', category: 'exercise', completed: false, weekNumber: 1, type: 'ejercicio', recipeId: exerciseId, isRecurring: false },
      { id: 'pdf_chk_3', description: 'Drink 2 liters of water daily', category: 'habit', completed: false, weekNumber: 1, type: 'toAdopt', isRecurring: true },
    ],
  };
  const encryptedSession = encryptSessionFields(sessionPlain, { targetLang: 'en', sourceLang: 'es' });

  // ── Cliente de prueba (coachId inexistente → sin S3) ──
  const testClient = {
    _id: new ObjectId(),
    coachId: new ObjectId(), // inexistente
    name: encrypt('Test PDF Client'),
    personalData: { name: encrypt('Test PDF Client'), gender: encrypt('male'), age: encrypt('30'), weight: encrypt('70'), height: encrypt('175'), language: encrypt('en') },
    aiProgress: { currentSessionId: 'e2e_pdf_test_session', sessions: [encryptedSession] },
  };
  await db.collection('healthforms').insertOne(testClient as any);
  registerClientWithJobs(testClient._id.toString());
  console.log('Healthform creado:', testClient._id.toString());

  // ── Invocar GET (route real) ──
  console.log('\n→ GET /pdf (LLM real para recetas/ejercicios es→en)...');
  const url = `http://localhost:3001/api/clients/${testClient._id.toString()}/ai/e2e_pdf_test_session/pdf`;
  const request = new NextRequest(url, { method: 'GET' });
  const t0 = Date.now();
  const response = await GET(request, { params: Promise.resolve({ id: testClient._id.toString(), sessionId: 'e2e_pdf_test_session' }) });
  console.log(`→ Respuesta en ${((Date.now() - t0) / 1000).toFixed(1)}s, status ${response.status}`);

  check('respuesta 200', response.status === 200, `status=${response.status}`);
  check('Content-Type = application/pdf', (response.headers.get('content-type') || '').includes('application/pdf'));
  check('Content-Disposition = attachment', (response.headers.get('content-disposition') || '').includes('attachment'));
  const buffer = await response.arrayBuffer();
  check(`PDF generado (${(buffer.byteLength / 1024).toFixed(0)} KB)`, buffer.byteLength > 1000, `${buffer.byteLength} bytes`);
  check('marca %PDF', new TextDecoder().decode(buffer.slice(0, 5)) === '%PDF-');
}

main()
  .catch((e) => { console.error('💥 PDF ROUTE REAL falló:', e); failures++; })
  .finally(async () => {
    await runCleanup(); // SIEMPRE limpia, incluso en fallo
    console.log(`\n${failures === 0 ? '🎉 PDF ROUTE REAL: TODOS OK' : `❌ ${failures} fallos`} (${passes} checks)`);
    process.exit(failures === 0 ? 0 : 1);
  });

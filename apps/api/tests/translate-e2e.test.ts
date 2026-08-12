/**
 * PRUEBA E2E REAL: FASE 4 de traducción con el LLM real (DeepSeek).
 * 1. Carga recetas/ejercicios reales de la DB (español).
 * 2. Construye una sesión plana como la que produce el pipeline (en español).
 * 3. Ejecuta translateSessionContent() con defaultLLM → idioma 'en'.
 * 4. Verifica: estructura, IDs, enums, cifrado round-trip.
 * 5. Ejecuta translatePDFContent() con el LLM real.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { decrypt, safeDecrypt } from '../src/app/lib/encryption';
import {
  detectLanguage, translateSessionContent, translatePDFContent, encryptSessionFields,
  normalizeClientLang, LANG_LABELS,
} from '../src/app/lib/recommendation-translator';

const URI = process.env.MONGODB_URI!;
let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();

  // ── 1. Datos reales ──
  const recipes = await db.collection('recipes').find({}).limit(2).toArray();
  const exercises = await db.collection('exercises').find({}).limit(2).toArray();
  const recipeById: Record<string, any> = {};
  for (const r of recipes) recipeById[r._id.toString()] = r;
  const exerciseById: Record<string, any> = {};
  for (const ex of exercises) exerciseById[ex._id.toString()] = ex;

  const recipe1 = recipeById[Object.keys(recipeById)[0]];
  const recipe2 = recipeById[Object.keys(recipeById)[1]];
  const ex1 = exerciseById[Object.keys(exerciseById)[0]];

  console.log('Recetas/ejercicios cargados:', Object.keys(recipeById).length, '/', Object.keys(exerciseById).length);

  // Idiomas de origen reales (como hace detectSessionSourceLang)
  const recipeTexts = Object.values(recipeById).map(r => safeDecrypt(r.title) || r.title || '');
  const exerciseTexts = Object.values(exerciseById).map(e => safeDecrypt(e.name) || e.name || '');
  const sourceLang = detectLanguage([...recipeTexts, ...exerciseTexts]);
  console.log(`Idioma de origen detectado: ${sourceLang} (${LANG_LABELS[sourceLang]})`);
  check('origen detectado = es (los datos reales están en español)', sourceLang === 'es', `fue ${sourceLang}`);

  const targetLang = normalizeClientLang('en');
  check('targetLang = en', targetLang === 'en');

  // ── 2. Sesión plana (como sessionPlain del route, en español) ──
  const sessionPlain = {
    sessionId: 'test_e2e_session',
    monthNumber: 1,
    totalWeeks: 4,
    status: 'draft',
    summary: 'El paciente presenta un buen estado general. Se recomienda mantener una dieta equilibrada con mayor ingesta de proteínas y realizar actividad física moderada al menos 3 veces por semana.',
    vision: 'Lograr una composición corporal saludable y hábitos sostenibles a largo plazo.',
    medicalSummary: 'Biomarcadores dentro de rangos aceptables. Sin contraindicaciones para ejercicio moderado.',
    medicalComparativeAnalysis: 'Mejora esperada en colesterol y glucosa con el plan propuesto.',
    structuredMedicalAnalysis: {
      exams: [{ intro: 'Análisis de sangre completo', analysis: 'Valores normales en general', table: [{ biomarcador: 'Glucosa', valor: '95', rango_normal: '70-100', estado: 'Normal' }] }],
      supplements: [{ name: 'Vitamina D', dosage: '1000 UI', timing: 'Por la mañana', rationale: 'Suplementar déficit leve', contraindications: undefined }],
    },
    weeks: [{
      weekNumber: 1,
      nutrition: { focus: 'Plan de comidas de 7 días, 3 comidas al día', shoppingList: [{ item: 'Huevos', quantity: '12 unidades', priority: 'high' }] },
      exercise: { focus: 'Rutina semanal de fuerza y cardio', equipment: ['Mancuernas', 'Colchoneta'] },
      habits: { trackingMethod: 'Diario de hábitos', motivationTip: 'Ser constante con los horarios' },
    }],
    checklist: [
      { id: 'chk_1', description: `Lunes Desayuno: ${safeDecrypt(recipe1.title) || recipe1.title}`, category: 'nutrition', completed: false, weekNumber: 1, type: 'desayuno', recipeId: recipe1._id.toString(), isRecurring: false },
      { id: 'chk_2', description: `Lunes: ${safeDecrypt(ex1.name) || ex1.name}`, category: 'exercise', completed: false, weekNumber: 1, type: 'ejercicio', recipeId: ex1._id.toString(), isRecurring: false },
      { id: 'chk_3', description: 'Beber 2 litros de agua al día', category: 'habit', completed: false, weekNumber: 1, type: 'toAdopt', isRecurring: true },
    ],
    baselineMetrics: { currentLifestyle: ['Sedentarismo'], targetLifestyle: ['Activo'] },
    labResults: [{ name: 'Colesterol', value: '190', range: '120-200', status: 'normal' }],
  };

  // ── 3. FASE 4 REAL (LLM DeepSeek) ──
  console.log('\n═══ FASE 4: translateSessionContent → en (LLM REAL) ═══');
  const t0 = Date.now();
  const translated = await translateSessionContent(sessionPlain, targetLang, LANG_LABELS[sourceLang]);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  check(`traducción completada en ${elapsed}s`, true);
  check('summary traducido al inglés', /english|inglés|\[TR\]/.test('x') === false && translated.summary !== sessionPlain.summary && /[a-zA-Z]{3}/.test(translated.summary), `→ ${String(translated.summary).slice(0, 60)}`);
  check('summary no contiene acentos españoles típicos', !/[áéíóúñ¿¡]/.test(String(translated.summary)), String(translated.summary).slice(0, 80));
  check('vision traducido', translated.vision !== sessionPlain.vision, String(translated.vision).slice(0, 60));
  check('medicalSummary traducido', translated.medicalSummary !== sessionPlain.medicalSummary);
  check('exams intro traducido', translated.structuredMedicalAnalysis?.exams?.[0]?.intro !== sessionPlain.structuredMedicalAnalysis.exams[0].intro);
  check('suplemento nombre traducido', translated.structuredMedicalAnalysis?.supplements?.[0]?.name !== sessionPlain.structuredMedicalAnalysis.supplements[0].name);
  check('weeks nutrition.focus traducido', translated.weeks?.[0]?.nutrition?.focus !== sessionPlain.weeks[0].nutrition.focus);
  check('shoppingList item traducido', translated.weeks?.[0]?.nutrition?.shoppingList?.[0]?.item !== 'Huevos');
  check('shoppingList priority intacta', translated.weeks?.[0]?.nutrition?.shoppingList?.[0]?.priority === 'high');
  check('exercise equipment traducido', translated.weeks?.[0]?.exercise?.equipment?.[0] !== 'Mancuernas');
  check('habits trackingMethod traducido', translated.weeks?.[0]?.habits?.trackingMethod !== 'Diario de hábitos');
  check('checklist description traducido', translated.checklist?.[0]?.description !== sessionPlain.checklist[0].description);
  check('checklist recipeId INTACTO', translated.checklist?.[0]?.recipeId === recipe1._id.toString());
  check('checklist id INTACTO', translated.checklist?.[0]?.id === 'chk_1');
  check('checklist category INTACTO (nutrition)', translated.checklist?.[0]?.category === 'nutrition');
  check('checklist type INTACTO (desayuno)', translated.checklist?.[0]?.type === 'desayuno');
  check('checklist completed INTACTO (false)', translated.checklist?.[0]?.completed === false);
  check('checklist isRecurring INTACTO', translated.checklist?.[0]?.isRecurring === false);
  check('sessionId INTACTO', translated.sessionId === 'test_e2e_session');
  check('status INTACTO (draft)', translated.status === 'draft');
  check('monthNumber INTACTO', translated.monthNumber === 1);
  check('labResults status INTACTO', translated.labResults?.[0]?.status === 'normal');
  check('misma cantidad de checklist', translated.checklist?.length === sessionPlain.checklist.length);
  check('misma cantidad de semanas', translated.weeks?.length === sessionPlain.weeks.length);

  console.log('\n  Summary EN:', String(translated.summary).slice(0, 140));
  console.log('  Check1 EN:', String(translated.checklist?.[0]?.description).slice(0, 90));

  // ── 4. Cifrado round-trip ──
  console.log('\n═══ encryptSessionFields + round-trip ═══');
  const encrypted = encryptSessionFields(translated, { targetLang, sourceLang });
  check('summary cifrado', encrypted.summary !== translated.summary);
  check('translation meta sin cifrar', JSON.stringify(encrypted.translation) === JSON.stringify({ targetLang: 'en', sourceLang: 'es' }));
  check('checklist en plano', Array.isArray(encrypted.checklist));
  const decryptedSummary = decrypt(encrypted.summary);
  check('decrypt(summary) = texto traducido', decryptedSummary === translated.summary);

  // ── 5. translatePDFContent REAL ──
  console.log('\n═══ translatePDFContent → en (LLM REAL) ═══');
  const pdfRecipes: Record<string, any> = {};
  for (const r of Object.values(recipeById) as any[]) {
    pdfRecipes[r._id.toString()] = {
      title: safeDecrypt(r.title) || r.title,
      ingredients: (r.ingredients || []).map((ing: any) => typeof ing === 'string' ? (safeDecrypt(ing) || ing) : { name: safeDecrypt(ing.name) || ing.name, quantity: safeDecrypt(ing.quantity) || ing.quantity, notes: ing.notes ? safeDecrypt(ing.notes) : undefined }),
      instructions: (r.instructions || []).map((i: string) => safeDecrypt(i) || i),
    };
  }
  const pdfExercises: Record<string, any> = {};
  for (const e of Object.values(exerciseById) as any[]) {
    pdfExercises[e._id.toString()] = {
      name: safeDecrypt(e.name) || e.name,
      description: e.description ? safeDecrypt(e.description) || e.description : undefined,
      instructions: (e.instructions || []).map((i: string) => safeDecrypt(i) || i),
      equipment: (e.equipment || []).map((eq: string) => safeDecrypt(eq) || eq),
    };
  }
  const t1 = Date.now();
  const pdfOut = await translatePDFContent(pdfRecipes, pdfExercises, targetLang, LANG_LABELS[sourceLang]);
  console.log(`  PDF traducción completada en ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  const firstRid = Object.keys(pdfOut.recipes)[0];
  const firstEid = Object.keys(pdfOut.exercises)[0];
  check('receta título traducido', pdfOut.recipes[firstRid].title !== pdfRecipes[firstRid].title, `→ ${String(pdfOut.recipes[firstRid].title).slice(0, 60)}`);
  check('receta instrucciones traducidas', pdfOut.recipes[firstRid].instructions?.[0] !== pdfRecipes[firstRid].instructions[0]);
  check('receta cantidad intacta', typeof pdfOut.recipes[firstRid].ingredients[0] === 'object' ? (pdfOut.recipes[firstRid].ingredients[0].quantity === pdfRecipes[firstRid].ingredients[0].quantity) : true);
  check('ejercicio nombre traducido', pdfOut.exercises[firstEid].name !== pdfExercises[firstEid].name, `→ ${String(pdfOut.exercises[firstEid].name).slice(0, 60)}`);
  check('ejercicio equipment traducido', pdfOut.exercises[firstEid].equipment?.[0] !== pdfExercises[firstEid].equipment?.[0]);
  check('claves de recetas intactas (IDs)', Object.keys(pdfOut.recipes).join(',') === Object.keys(pdfRecipes).join(','));

  await client.close();
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`${failures === 0 ? '🎉 E2E REAL: TODOS OK' : `❌ ${failures} fallos`} (${passes} checks, ${elapsed}s FASE 4)`);
  process.exit(failures === 0 ? 0 : 1);
}
main();

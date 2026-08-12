import 'dotenv/config';
/**
 * Test de la FASE 4 de traducción (recommendation-translator.ts).
 * Usa un LLM MOCKEADO (no hace llamadas reales): el mock "traduce"
 * marcando los textos con [TR] para verificar que la estructura se conserva
 * y que solo los strings se tocan.
 *
 * Correr: cd apps/api && npx tsx scripts/test-translator.tmp.ts
 */
import {
  detectLanguage,
  normalizeClientLang,
  translateJsonBatch,
  translateSessionContent,
  translatePDFContent,
  encryptSessionFields,
  SUPPORTED_LANGS,
  LANG_LABELS,
} from '../src/app/lib/recommendation-translator';

let failures = 0;
let passes = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passes++;
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n═══ ${title} ═══`);
}

// ── Mock LLM: simula a un LLM real obedeciendo el prompt ──
// Traduce strings de texto; deja intactos números, unidades de medida,
// enums, IDs y claves (como exige el system prompt del traductor real).
const ENUM_LIKE = new Set([
  'high', 'medium', 'low', 'normal', 'abnormal', 'nutrition', 'exercise', 'habit',
  'desayuno', 'ejercicio', 'toAdopt', 'toBehavior', 'recurring', 'once', 'daily',
  'pending', 'in_progress', 'completed', 'draft', 'es', 'en', 'fr', 'de', 'it', 'pt',
]);
const UNIT_ONLY = /^\s*[\d\s.,/×x()%-]*\s*(g|kg|mg|µg|ug|ml|l|unidades?|unds?|uds|cucharadas?|cda|cdta|reps|sets?|min|seg|horas?|hrs?|oz|lb|UI|kcal|cm|mm)\s*$/i;
// Un ID de verdad contiene dígitos o símbolos (rec_123, check_1, ObjectId de Mongo, UUID…)
// "Huevos" o "Diario" NO son IDs → se traducen.
const ID_LIKE = /^[a-z0-9_:-]+$/i;
const ID_HAS_MARKER = /[\d_:-]/;

const mockLLM = async (system: string, human: string): Promise<string> => {
  const parsed = JSON.parse(human);
  const translateValue = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const t = v.trim().toLowerCase();
      if (t === '') return v; // vacíos: intactos
      if (ENUM_LIKE.has(t)) return v; // enums/estados: intactos
      if (UNIT_ONLY.test(v)) return v; // cantidades y unidades: intactas
      if (ID_LIKE.test(v) && ID_HAS_MARKER.test(v)) return v; // IDs (rec_123, check_1…): intactos
      return `[TR]${v}`;
    }
    if (Array.isArray(v)) return v.map(translateValue);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>)) out[k] = translateValue((v as Record<string, unknown>)[k]);
      return out;
    }
    return v; // números, booleanos, null: intactos
  };
  // Simula el comportamiento REAL del modelo DeepSeek: devuelve el JSON
  // como STRING escapado ("{\"title\":...}") → el traductor debe hacer doble parse.
  return JSON.stringify(JSON.stringify(translateValue(parsed)));
};

// ═══════════════ 1. detectLanguage ═══════════════
section('1. detectLanguage (heurística sin LLM)');

check(
  'detecta español',
  detectLanguage(['El desayuno incluye avena y frutas frescas con leche']) === 'es'
);
check(
  'detecta inglés',
  detectLanguage(['The breakfast includes oatmeal and fresh fruits with milk']) === 'en'
);
check(
  'detecta italiano',
  detectLanguage(['La colazione include fiocchi d\'avena e frutta fresca con latte']) === 'it'
);
check(
  'detecta portugués',
  detectLanguage(['O café da manhã inclui aveia e frutas frescas com leite']) === 'pt'
);
check(
  'detecta francés',
  detectLanguage(['Le petit-déjeuner comprend des flocons d\'avoine et des fruits frais avec du lait']) === 'fr'
);
check(
  'detecta alemán',
  detectLanguage(['Das Frühstück enthält Haferflocken und frisches Obst mit Milch']) === 'de'
);
check(
  'texto vacío → es (default)',
  detectLanguage(['']) === 'es'
);
check(
  'sin textos → es (default)',
  detectLanguage([]) === 'es'
);

// ═══════════════ 2. normalizeClientLang ═══════════════
section('2. normalizeClientLang');

check('"de" válido', normalizeClientLang('de') === 'de');
check('"fr" válido', normalizeClientLang('fr') === 'fr');
check('"es" válido', normalizeClientLang('es') === 'es');
check('idioma no soportado → es', normalizeClientLang('ja') === 'es');
check('undefined → es (clientes existentes)', normalizeClientLang(undefined) === 'es');
check('null → es', normalizeClientLang(null) === 'es');
check('número → es', normalizeClientLang(42 as any) === 'es');
for (const lang of SUPPORTED_LANGS) {
  check(`"${lang}" pasa el round-trip`, normalizeClientLang(lang) === lang);
}

// ═══════════════ 3. translateJsonBatch (estructura preservada) ═══════════════
section('3. translateJsonBatch (mock LLM)');

const batchInput = {
  title: 'Pollo al horno',
  items: ['Huevos', 'Nata', 3, true],
  nested: { prep: 'Mezclar todo', ratio: 1.5 },
  enums: 'high',
  empty: '',
  numbersOnly: [1, 2, 3],
};

async function main() {
const batchOut = await translateJsonBatch(batchInput, 'de', 'español', mockLLM);

check('strings traducidos (título)', batchOut.title === '[TR]Pollo al horno');
check('strings dentro de arrays', batchOut.items[0] === '[TR]Huevos');
check('números intactos', batchOut.items[2] === 3 && batchOut.nested.ratio === 1.5);
check('booleanos intactos', batchOut.items[3] === true);
check('nested strings traducidos', batchOut.nested.prep === '[TR]Mezclar todo');
check('enums intactos (no se traducen)', batchOut.enums === 'high');
check('string vacío conservado', batchOut.empty === '');
check('arrays numéricos intactos', JSON.stringify(batchOut.numbersOnly) === '[1,2,3]');
check('misma estructura (keys)', JSON.stringify(Object.keys(batchOut)) === JSON.stringify(Object.keys(batchInput)));

// ═══════════════ 4. translateSessionContent ═══════════════
section('4. translateSessionContent (sesión completa)');

const sessionInput = {
  sessionId: 'session_abc',
  monthNumber: 1,
  status: 'draft',
  summary: 'El paciente presenta buena evolución.',
  vision: 'Mejorar hábitos.',
  medicalSummary: 'Biomarcadores estables.',
  medicalComparativeAnalysis: 'Comparativa positiva.',
  structuredMedicalAnalysis: {
    exams: [{ intro: 'Análisis de sangre', analysis: 'Todo normal', table: [{ biomarcador: 'Glucosa', valor: '90', rango_normal: '70-100', estado: 'Normal' }] }],
    supplements: [{ name: 'Vitamina D', dosage: '1000 UI', timing: 'Por la mañana', rationale: 'Para la vitamina', contraindications: undefined }],
  },
  weeks: [{
    weekNumber: 1,
    nutrition: {
      focus: 'Plan de comidas 7 días',
      shoppingList: [{ item: 'Huevos', quantity: '12 unidades', priority: 'high' }],
    },
    exercise: { focus: 'Rutina semanal', equipment: ['Mancuernas'] },
    habits: { trackingMethod: 'Diario', motivationTip: 'Se constante' },
  }],
  checklist: [
    { id: 'check_1', description: 'Lunes Desayuno: Avena', category: 'nutrition', completed: false, weekNumber: 1, type: 'desayuno', recipeId: 'rec_123', isRecurring: false },
    { id: 'check_2', description: 'Lunes: Press banca', category: 'exercise', completed: false, weekNumber: 1, type: 'ejercicio', recipeId: 'ex_456', isRecurring: false },
    { id: 'check_3', description: 'Beber 2L de agua', category: 'habit', completed: false, weekNumber: 1, type: 'toAdopt', isRecurring: true },
  ],
  baselineMetrics: { currentLifestyle: ['Sedentarismo'], targetLifestyle: ['Activo'] },
  labResults: [{ name: 'Colesterol', value: '180', range: '120-200', status: 'normal' }],
};

const translatedSession = await translateSessionContent(sessionInput, 'en', 'español', mockLLM);

check('summary traducido', translatedSession.summary === '[TR]El paciente presenta buena evolución.');
check('vision traducido', translatedSession.vision === '[TR]Mejorar hábitos.');
check('medicalSummary traducido', translatedSession.medicalSummary === '[TR]Biomarcadores estables.');
check('structuredMedicalAnalysis.exams[0].intro traducido', translatedSession.structuredMedicalAnalysis.exams[0].intro === '[TR]Análisis de sangre');
check('structuredMedicalAnalysis.supplements[0].name traducido', translatedSession.structuredMedicalAnalysis.supplements[0].name === '[TR]Vitamina D');
check('weeks nutrition.focus traducido', translatedSession.weeks[0].nutrition.focus === '[TR]Plan de comidas 7 días');
check('shoppingList item traducido', translatedSession.weeks[0].nutrition.shoppingList[0].item === '[TR]Huevos');
check('shoppingList priority intacta (enum)', translatedSession.weeks[0].nutrition.shoppingList[0].priority === 'high');
check('exercise.equipment traducido', translatedSession.weeks[0].exercise.equipment[0] === '[TR]Mancuernas');
check('habits trackingMethod traducido', translatedSession.weeks[0].habits.trackingMethod === '[TR]Diario');
check('checklist description traducido', translatedSession.checklist[0].description === '[TR]Lunes Desayuno: Avena');
check('checklist recipeId intacto', translatedSession.checklist[0].recipeId === 'rec_123');
check('checklist id intacto', translatedSession.checklist[0].id === 'check_1');
check('checklist category intacto (enum)', translatedSession.checklist[0].category === 'nutrition');
check('baselineMetrics traducido', translatedSession.baselineMetrics.currentLifestyle[0] === '[TR]Sedentarismo');
check('labResults name traducido', translatedSession.labResults[0].name === '[TR]Colesterol');
check('labResults status intacto', translatedSession.labResults[0].status === 'normal');
check('sessionId intacto', translatedSession.sessionId === 'session_abc');
check('monthNumber intacto', translatedSession.monthNumber === 1);
check('status intacto', translatedSession.status === 'draft');
check('total items del checklist intactos', translatedSession.checklist.length === sessionInput.checklist.length);
check('total semanas intactas', translatedSession.weeks.length === sessionInput.weeks.length);

// ═══════════════ 5. encryptSessionFields ═══════════════
section('5. encryptSessionFields (cifrado selectivo)');

const encrypted = encryptSessionFields(sessionInput, { targetLang: 'en', sourceLang: 'es' });

check('summary cifrado (distinto del plano)', encrypted.summary !== sessionInput.summary && typeof encrypted.summary === 'string');
check('vision cifrado', encrypted.vision !== sessionInput.vision);
check('translation guardado sin cifrar', JSON.stringify(encrypted.translation) === JSON.stringify({ targetLang: 'en', sourceLang: 'es' }));
check('checklist intacto (en plano)', encrypted.checklist === sessionInput.checklist);
check('weeks[0].nutrition.shoppingList[0].item cifrado', encrypted.weeks[0].nutrition.shoppingList[0].item !== 'Huevos');
check('weeks[0].nutrition.shoppingList[0].priority intacto', encrypted.weeks[0].nutrition.shoppingList[0].priority === 'high');
check('sessionId intacto', encrypted.sessionId === 'session_abc');
check('structuredMedicalAnalysis intacto (en plano)', encrypted.structuredMedicalAnalysis === sessionInput.structuredMedicalAnalysis);
check('labResults intactos (en plano)', encrypted.labResults === sessionInput.labResults);

const encryptedNoTranslation = encryptSessionFields(sessionInput);
check('sin translation → campo ausente', encryptedNoTranslation.translation === undefined);
check('summary igualmente cifrado', encryptedNoTranslation.summary !== sessionInput.summary);

// ═══════════════ 6. translatePDFContent ═══════════════
section('6. translatePDFContent (recetas + ejercicios)');

const pdfRecipes = {
  rec_1: {
    title: 'Pollo al horno con verduras',
    ingredients: [{ name: 'Pechuga de pollo', quantity: '500 g', notes: 'Sin piel' }, 'Aceite de oliva'],
    instructions: ['Precalentar el horno', 'Hornear 40 minutos'],
  },
};
const pdfExercises = {
  'Press banca': {
    name: 'Press banca',
    description: 'Ejercicio de pecho',
    instructions: ['Acostarse en el banco', 'Empujar la barra'],
    equipment: ['Barra', 'Banco'],
  },
};

const pdfOut = await translatePDFContent(pdfRecipes, pdfExercises, 'de', 'español', mockLLM);

const ing0 = pdfOut.recipes.rec_1.ingredients[0] as { name: string; quantity: string };
check('receta título traducido', pdfOut.recipes.rec_1.title === '[TR]Pollo al horno con verduras');
check('receta ingrediente name traducido', ing0.name === '[TR]Pechuga de pollo');
check('receta ingrediente quantity intacto', ing0.quantity === '500 g');
check('receta string ingredient traducido', pdfOut.recipes.rec_1.ingredients[1] === '[TR]Aceite de oliva');
check('receta instructions traducidos', pdfOut.recipes.rec_1.instructions[1] === '[TR]Hornear 40 minutos');
check('ejercicio nombre traducido', pdfOut.exercises['Press banca'].name === '[TR]Press banca');
check('ejercicio descripción traducida', pdfOut.exercises['Press banca'].description === '[TR]Ejercicio de pecho');
check('ejercicio equipment traducido', pdfOut.exercises['Press banca'].equipment?.[0] === '[TR]Barra');

// ═══════════════ 7. Fallback resiliente: LLM que falla ═══════════════
section('7. Resiliencia: LLM falla → devuelve original');

const failingLLM = async (): Promise<string> => {
  throw new Error('API caída');
};

const resilient = await translateJsonBatch({ a: 'texto', b: 2 }, 'de', 'español', failingLLM);
check('traducción fallida devuelve el ORIGINAL (no rompe el flujo)', resilient.a === 'texto' && resilient.b === 2);

// ═══════════════ Resultado ═══════════════
console.log(`\n══════════════════════════════════════════════════════════`);
console.log(`${failures === 0 ? '🎉' : '❌'} ${passes} checks pasaron, ${failures} fallaron`);
console.log(`══════════════════════════════════════════════════════════`);
}

main().then(() => process.exit(failures === 0 ? 0 : 1));

import { inngest } from "../client";
import { generateRecommendations } from "@/app/lib/agents";
import type { RecommendationGraphInput } from "@/app/lib/agents/recommendation-graph";
import { getHealthFormsCollection } from "@/app/lib/database";
import { ObjectId } from "mongodb";
import { decrypt, encrypt } from "@/app/lib/encryption";
import type {
  PersonalData,
  MedicalData,
  AIRecommendationSession,
  AIRecommendationWeek,
  ChecklistItem,
} from "../../../../../../packages/types";
import { logger } from "@/app/lib/logger";

// ─────────────────────────────────────────────
// Type-safe event data schema
// ─────────────────────────────────────────────

interface GenerateRecommendationsEventData {
  clientId: string;
  monthNumber: number;
  coachNotes?: string;
  maxRevisions?: number;
}

// ─────────────────────────────────────────────
// Mapa de salud mental: código de letra → texto legible
// (Los valores vienen del formulario MentalHealthStep.tsx)
// ─────────────────────────────────────────────

const MENTAL_HEALTH_MAP: Record<string, Record<string, string>> = {
  emotionIdentification: { a: "Casi siempre identifico mis emociones", b: "A veces identifico mis emociones", c: "Rara vez identifico mis emociones" },
  emotionIntensity: { a: "Mis emociones son muy intensas y me desbordan", b: "Mis emociones son moderadas y las puedo manejar", c: "Mis emociones son poco intensas, casi no las noto" },
  uncomfortableEmotion: { a: "Evito o reprimo las emociones incómodas", b: "Me dejo llevar sin control por las emociones incómodas", c: "Acepto las emociones incómodas y entiendo su mensaje" },
  internalDialogue: { a: '"Siempre me pasa a mí", "No sirvo"', b: '"Es una oportunidad para aprender"', c: '"No puedo hacer nada"' },
  stressStrategies: { a: "Como, fumo o uso pantallas cuando estoy estresado", b: "Hablo, respiro o hago deporte cuando estoy estresado", c: "Me bloqueo y no hago nada cuando estoy estresado" },
  sayingNo: { a: "Me cuesta mucho decir que no", b: "Solo digo que no en algunas situaciones", c: "Digo que no sin problema, priorizo mis necesidades" },
  relationships: { a: "Sí, con frecuencia doy más de lo que recibo", b: "A veces doy más de lo que recibo", c: "No, hay equilibrio en mis relaciones" },
  expressThoughts: { a: "Casi nunca expreso mis pensamientos abiertamente", b: "Depende de la situación si expreso mis pensamientos", c: "Sí, expreso mis pensamientos de manera asertiva" },
  emotionalDependence: { a: "Sí, tengo dependencia emocional", b: "No estoy seguro si tengo dependencia emocional", c: "No tengo dependencia emocional" },
  purpose: { a: "Sí, tengo propósito y motivación claros", b: "Estoy en proceso de definir mi propósito", c: "No, me siento perdido y sin motivación" },
  failureReaction: { a: "Me hundo y tardo en recuperarme ante el fracaso", b: "Me frustro pero sigo adelante", c: "Veo el fracaso como aprendizaje" },
  selfConnection: { a: "Sí, practico la autoconexión regularmente", b: "Ocasionalmente me conecto conmigo mismo", c: "No practico la autoconexión" },
};

function mapMentalHealthValue(field: string, value: string | undefined): string {
  if (!value) return "";
  const mapping = MENTAL_HEALTH_MAP[field];
  if (mapping && mapping[value]) return mapping[value];
  return value; // Si no hay mapeo, devolver el valor original
}

// ─────────────────────────────────────────────
// Mapa de preguntas para evaluaciones de salud
// (Cada posición del array corresponde a una pregunta específica)
// ─────────────────────────────────────────────

const EVALUATION_QUESTIONS: Record<string, string[]> = {
  carbohydrateAddiction: [
    "¿El primer alimento que consumes en el día es de sabor dulce?",
    "¿Consumes alimentos procesados (los que tienen más de 5 ingredientes)?",
    "En el último año, ¿has comido más azúcar de lo que pretendías?",
    "¿Has dejado de hacer actividades cotidianas por comer alimentos con azúcar?",
    "¿Sientes que deberías reducir tu consumo de azúcar?",
    "¿Has comido alimentos con azúcar para calmar una emoción (fatiga, tristeza, enojo, aburrimiento)?",
    "¿Haces más de 5 comidas al día? ¿Comes cada 3-4 horas?",
    "¿Te da dolor de cabeza si pasas más de 4 horas sin comer?",
    "¿Piensas constantemente en alimentos con azúcar?",
    "¿Crees que debes terminar la comida con un alimento dulce?",
    "¿Sientes que no tienes control en lo que comes?",
  ],
  leptinResistance: [
    "¿Tienes sobrepeso u obesidad?",
    "¿Tienes hambre constantemente?",
    "¿Tienes antojos por carbohidratos, especialmente por las noches?",
    "¿Tienes problemas para dormir (insomnio)?",
    "¿Te sientes sin energía durante el día?",
    "¿Sientes que al despertar no descansaste bien?",
    "¿Te ejercitas menos de 30 minutos al día?",
    "¿Te saltas el desayuno?",
  ],
  circadianRhythms: [
    "¿Lo primero que ves al despertar es tu celular?",
    "¿Estás expuesto a luz artificial después del atardecer? (pantallas, TV, celular, focos)",
    "¿Utilizas tecnología Wifi, 2G/3G/4G/5G o luz artificial durante la noche?",
    "¿Exponerte al sol te hace daño (sufres quemadas)?",
    "¿Utilizas gafas o lentes solares?",
    "¿Utilizas cremas o protectores solares?",
    "¿Comes pocos pescados, moluscos o crustáceos (menos de 1 vez por semana)?",
    "¿Comes cuando ya no hay luz del sol?",
    "¿Tu exposición al sol es de menos de 30 minutos al día?",
    "¿Haces grounding (caminar descalzo sobre hierba, tierra o arena) menos de 30 min al día?",
    "¿Utilizas filtros de luz azul en tus dispositivos electrónicos por la noche?",
  ],
  sleepHygiene: [
    "¿Duermes con el celular encendido cerca de ti?",
    "¿Te despiertas con la alarma del celular?",
    "¿La temperatura de tu habitación es muy caliente o muy fría?",
    "¿Entra luz artificial a tu habitación al momento de dormir?",
    "¿La cabecera de tu cama está pegada a la pared?",
    "¿Duermes con el wifi de tu casa encendido?",
    "¿Te duermes después de las 11 pm?",
    "Cuando te despiertas, ¿ya amaneció?",
    "¿Duermes menos de 4 horas?",
    "¿Haces cenas copiosas?",
    "¿Te acuestas inmediatamente después de cenar?",
    "¿Tu horario de sueño es regular? (misma hora todos los días, incluso fines de semana)",
  ],
  electrosmogExposure: [
    "Al hacer llamadas por celular, ¿te lo pegas a la oreja?",
    "¿Llevas el celular cerca de tu cuerpo (bolsillo del pantalón, etc.)?",
    "¿Vives cerca de líneas de alta tensión?",
    "¿Utilizas el microondas?",
    "¿Presentas cansancio general durante el día o duermes en exceso?",
    "¿Tienes piel sensible o con erupciones?",
    "¿Tienes taquicardia o arritmia?",
    "¿Tienes problemas de presión arterial?",
    "¿Tienes colon irritable?",
    "¿Tienes pérdida auditiva, oyes un zumbido (tinnitus) o te duelen los oídos?",
  ],
  generalToxicity: [
    "¿Bebes agua embotellada?",
    "¿Utilizas protector solar convencional?",
    "¿Algún familiar ha sido diagnosticado con fibromialgia, fatiga crónica o sensibilidades químicas?",
    "¿Tienes historial de disfunción renal?",
    "¿Tienes antecedentes de cáncer (tú o familiar inmediato)?",
    "¿Tienes historial de enfermedad cardíaca, infarto o accidente cerebrovascular?",
    "¿Te han diagnosticado trastorno bipolar, esquizofrenia o depresión?",
    "¿Te han diagnosticado diabetes o tiroiditis?",
    "¿Fumas o consumes vapeador?",
    "¿Consumes alcohol?",
  ],
  microbiotaHealth: [
    "¿Sufres de estreñimiento o diarrea?",
    "¿Sientes distensión, hinchazón o ruidos intestinales después de comer verduras?",
    "¿Tienes gases con olor desagradable frecuentemente?",
    "¿Alguna vez has sido vegano o vegetariano por un período prolongado?",
    "¿Tienes intolerancia a la carne?",
    "¿Has usado antiácidos o inhibidores de bomba de protones?",
    "Cuando consumes alcohol, ¿tienes confusión mental o sensación tóxica incluso con 1 porción?",
    "¿Has tomado antibióticos con frecuencia o por períodos prolongados?",
    "¿Naciste por cesárea?",
    "¿Tomaste leche de fórmula en lugar de ser amamantado?",
    "¿Consumes alimentos fermentados con regularidad (kéfir, chucrut, kombucha, kimchi)?",
    "¿Crees que consumes suficiente fibra de frutas, verduras y legumbres?",
  ],
};

// ─────────────────────────────────────────────
// Helper: Fetch and decrypt client data
// ─────────────────────────────────────────────

interface ClientData {
  personalData: PersonalData;
  medicalData: MedicalData;
  healthAssessment: Record<string, boolean>;
  mentalHealth: Record<string, string>;
  processedDocuments: Array<{
    title: string;
    content: string;
    documentType: string;
    confidence: number;
  }>;
  previousSessions: AIRecommendationSession[];
}

async function fetchClientData(clientId: string): Promise<ClientData> {
  const collection = await getHealthFormsCollection();
  const doc = await collection.findOne({ _id: new ObjectId(clientId) });

  if (!doc) {
    throw new Error(`Client not found: ${clientId}`);
  }

  // Decrypt personal data with type safety
  const rawPersonal = doc.personalData as Record<string, unknown> | undefined;
  const personalData: PersonalData = {
    name: typeof rawPersonal?.name === "string" ? decrypt(rawPersonal.name) : "",
    address: typeof rawPersonal?.address === "string" ? decrypt(rawPersonal.address) : "",
    phone: typeof rawPersonal?.phone === "string" ? decrypt(rawPersonal.phone) : "",
    email: typeof rawPersonal?.email === "string" ? decrypt(rawPersonal.email) : "",
    birthDate: typeof rawPersonal?.birthDate === "string" ? decrypt(rawPersonal.birthDate) : "",
    gender: typeof rawPersonal?.gender === "string" ? decrypt(rawPersonal.gender) : "",
    age: typeof rawPersonal?.age === "string" ? decrypt(rawPersonal.age) : "",
    weight: typeof rawPersonal?.weight === "string" ? decrypt(rawPersonal.weight) : "",
    height: typeof rawPersonal?.height === "string" ? decrypt(rawPersonal.height) : "",
    maritalStatus: typeof rawPersonal?.maritalStatus === "string" ? decrypt(rawPersonal.maritalStatus) : "",
    education: typeof rawPersonal?.education === "string" ? decrypt(rawPersonal.education) : "",
    occupation: typeof rawPersonal?.occupation === "string" ? decrypt(rawPersonal.occupation) : "",
  };

  // Decrypt medical data with type safety
  const rawMedical = doc.medicalData as Record<string, unknown> | undefined;
  const medicalData: MedicalData = {
    mainComplaint: typeof rawMedical?.mainComplaint === "string" ? decrypt(rawMedical.mainComplaint) : "",
    medications: typeof rawMedical?.medications === "string" ? decrypt(rawMedical.medications) : "",
    supplements: typeof rawMedical?.supplements === "string" ? decrypt(rawMedical.supplements) : "",
    currentPastConditions: typeof rawMedical?.currentPastConditions === "string" ? decrypt(rawMedical.currentPastConditions) : "",
    additionalMedicalHistory: typeof rawMedical?.additionalMedicalHistory === "string" ? decrypt(rawMedical.additionalMedicalHistory) : "",
    employmentHistory: typeof rawMedical?.employmentHistory === "string" ? decrypt(rawMedical.employmentHistory) : "",
    hobbies: typeof rawMedical?.hobbies === "string" ? decrypt(rawMedical.hobbies) : "",
    allergies: typeof rawMedical?.allergies === "string" ? decrypt(rawMedical.allergies) : "",
    surgeries: typeof rawMedical?.surgeries === "string" ? decrypt(rawMedical.surgeries) : "",
    housingHistory: typeof rawMedical?.housingHistory === "string" ? decrypt(rawMedical.housingHistory) : "",
    carbohydrateAddiction: typeof rawMedical?.carbohydrateAddiction === "string" ? decrypt(rawMedical.carbohydrateAddiction) : "",
    leptinResistance: typeof rawMedical?.leptinResistance === "string" ? decrypt(rawMedical.leptinResistance) : "",
    circadianRhythms: typeof rawMedical?.circadianRhythms === "string" ? decrypt(rawMedical.circadianRhythms) : "",
    sleepHygiene: typeof rawMedical?.sleepHygiene === "string" ? decrypt(rawMedical.sleepHygiene) : "",
    electrosmogExposure: typeof rawMedical?.electrosmogExposure === "string" ? decrypt(rawMedical.electrosmogExposure) : "",
    generalToxicity: typeof rawMedical?.generalToxicity === "string" ? decrypt(rawMedical.generalToxicity) : "",
    microbiotaHealth: typeof rawMedical?.microbiotaHealth === "string" ? decrypt(rawMedical.microbiotaHealth) : "",
    mentalHealthEmotionIdentification: typeof rawMedical?.mentalHealthEmotionIdentification === "string" ? decrypt(rawMedical.mentalHealthEmotionIdentification) : "",
    mentalHealthEmotionIntensity: typeof rawMedical?.mentalHealthEmotionIntensity === "string" ? decrypt(rawMedical.mentalHealthEmotionIntensity) : "",
    mentalHealthUncomfortableEmotion: typeof rawMedical?.mentalHealthUncomfortableEmotion === "string" ? decrypt(rawMedical.mentalHealthUncomfortableEmotion) : "",
    mentalHealthInternalDialogue: typeof rawMedical?.mentalHealthInternalDialogue === "string" ? decrypt(rawMedical.mentalHealthInternalDialogue) : "",
    mentalHealthStressStrategies: typeof rawMedical?.mentalHealthStressStrategies === "string" ? decrypt(rawMedical.mentalHealthStressStrategies) : "",
    mentalHealthSayingNo: typeof rawMedical?.mentalHealthSayingNo === "string" ? decrypt(rawMedical.mentalHealthSayingNo) : "",
    mentalHealthRelationships: typeof rawMedical?.mentalHealthRelationships === "string" ? decrypt(rawMedical.mentalHealthRelationships) : "",
    mentalHealthExpressThoughts: typeof rawMedical?.mentalHealthExpressThoughts === "string" ? decrypt(rawMedical.mentalHealthExpressThoughts) : "",
    mentalHealthEmotionalDependence: typeof rawMedical?.mentalHealthEmotionalDependence === "string" ? decrypt(rawMedical.mentalHealthEmotionalDependence) : "",
    mentalHealthPurpose: typeof rawMedical?.mentalHealthPurpose === "string" ? decrypt(rawMedical.mentalHealthPurpose) : "",
    mentalHealthFailureReaction: typeof rawMedical?.mentalHealthFailureReaction === "string" ? decrypt(rawMedical.mentalHealthFailureReaction) : "",
    mentalHealthSelfConnection: typeof rawMedical?.mentalHealthSelfConnection === "string" ? decrypt(rawMedical.mentalHealthSelfConnection) : "",
    mentalHealthSelfRelationship: typeof rawMedical?.mentalHealthSelfRelationship === "string" ? decrypt(rawMedical.mentalHealthSelfRelationship) : "",
    mentalHealthLimitingBeliefs: typeof rawMedical?.mentalHealthLimitingBeliefs === "string" ? decrypt(rawMedical.mentalHealthLimitingBeliefs) : "",
    mentalHealthIdealBalance: typeof rawMedical?.mentalHealthIdealBalance === "string" ? decrypt(rawMedical.mentalHealthIdealBalance) : "",
    documents: Array.isArray(rawMedical?.documents)
      ? (rawMedical.documents as Array<NonNullable<PersonalData["profilePhoto"]>>).map((doc) => ({
          ...doc,
          url: typeof doc.url === "string" ? decrypt(doc.url) : doc.url,
          name: typeof doc.name === "string" ? decrypt(doc.name) : doc.name,
          type: typeof doc.type === "string" ? decrypt(doc.type) : doc.type,
          key: typeof doc.key === "string" ? decrypt(doc.key) : doc.key,
        }))
      : undefined,
  };

  // ── Health assessment: extraer ANTES de parsear los arrays de evaluación ──
  // (necesita que medicalData.carbohydrateAddiction etc. sean strings para JSON.parse)
  const evalHasPositive = (val: string | unknown): boolean => {
    if (!val || typeof val !== "string") return false;
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) return arr.some((v: string) => v === "si" || v === "siempre");
    } catch { /* ignore */ }
    return val === "true";
  };
  const healthAssessment: Record<string, boolean> = {
    carbohydrateAddiction: evalHasPositive(medicalData.carbohydrateAddiction),
    leptinResistance: evalHasPositive(medicalData.leptinResistance),
    circadianRhythms: evalHasPositive(medicalData.circadianRhythms),
    sleepHygiene: evalHasPositive(medicalData.sleepHygiene),
    electrosmogExposure: evalHasPositive(medicalData.electrosmogExposure),
    generalToxicity: evalHasPositive(medicalData.generalToxicity),
    microbiotaHealth: evalHasPositive(medicalData.microbiotaHealth),
  };

  // ── Evaluaciones: parsear JSON arrays a {pregunta, respuesta} ──
  // Lo hacemos sobre una copia del medicalData para no mutar el original
  // (el medicalData original se usa en prompts con su estructura correcta)
  const enrichedMedical: Record<string, unknown> = { ...medicalData };
  const evalKeys = [
    "carbohydrateAddiction", "leptinResistance", "circadianRhythms",
    "sleepHygiene", "electrosmogExposure", "generalToxicity", "microbiotaHealth",
  ] as const;
  for (const key of evalKeys) {
    const raw = medicalData[key as keyof MedicalData] as string | undefined;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const questions = EVALUATION_QUESTIONS[key] || [];
          enrichedMedical[key] = parsed.map(
            (v: string, idx: number) => ({
              pregunta: questions[idx] || `Pregunta ${idx + 1}`,
              respuesta: typeof v === "string" ? v.replace(/-/g, " ") : v,
            })
          );
        }
      } catch {
        // Si no es JSON válido, mantener original
      }
    }
  }

  // Extract mental health fields (mapeando códigos a/b/c a texto legible)
  const mentalHealth: Record<string, string> = {
    emotionIdentification: mapMentalHealthValue("emotionIdentification", medicalData.mentalHealthEmotionIdentification),
    emotionIntensity: mapMentalHealthValue("emotionIntensity", medicalData.mentalHealthEmotionIntensity),
    uncomfortableEmotion: mapMentalHealthValue("uncomfortableEmotion", medicalData.mentalHealthUncomfortableEmotion),
    internalDialogue: mapMentalHealthValue("internalDialogue", medicalData.mentalHealthInternalDialogue),
    stressStrategies: mapMentalHealthValue("stressStrategies", medicalData.mentalHealthStressStrategies),
    sayingNo: mapMentalHealthValue("sayingNo", medicalData.mentalHealthSayingNo),
    relationships: mapMentalHealthValue("relationships", medicalData.mentalHealthRelationships),
    expressThoughts: mapMentalHealthValue("expressThoughts", medicalData.mentalHealthExpressThoughts),
    emotionalDependence: mapMentalHealthValue("emotionalDependence", medicalData.mentalHealthEmotionalDependence),
    purpose: mapMentalHealthValue("purpose", medicalData.mentalHealthPurpose),
    failureReaction: mapMentalHealthValue("failureReaction", medicalData.mentalHealthFailureReaction),
    selfConnection: mapMentalHealthValue("selfConnection", medicalData.mentalHealthSelfConnection),
    selfRelationship: medicalData.mentalHealthSelfRelationship ?? "",
    limitingBeliefs: medicalData.mentalHealthLimitingBeliefs ?? "",
    idealBalance: medicalData.mentalHealthIdealBalance ?? "",
  };

  // Process documents — Gemini lee PDFs directamente de S3 sin procesamiento previo
  const rawProcessedDocs: Array<{
    title: string;
    content: string;
    documentType: string;
    confidence: number;
  }> = [];

  // Obtener documentos del cliente (PDFs en S3)
  const clientDocs = medicalData.documents as Array<{
    name: string;
    key: string;
    type?: string;
  }> | undefined;

  if (clientDocs && clientDocs.length > 0) {
    const pdfDocs = clientDocs.filter(
      (doc) => doc.name?.toLowerCase().endsWith('.pdf') || doc.type?.includes('pdf')
    );

    logger.info("AI", `[fetchClientData] ${pdfDocs.length} PDF(s) encontrados para análisis con Gemini`, {
      totalDocs: clientDocs.length,
      pdfCount: pdfDocs.length,
    });

    if (pdfDocs.length > 0) {
      const { analyzeS3PDFWithGemini } = await import('@/app/lib/agents/utils/llm');

      for (let i = 0; i < pdfDocs.length; i++) {
        const pdfDoc = pdfDocs[i];
        try {
          logger.info("AI", `[fetchClientData] Analizando PDF ${i + 1}/${pdfDocs.length}: ${pdfDoc.name}`, {
            s3Key: pdfDoc.key?.substring(0, 30) + '...',
          });

          const result = await analyzeS3PDFWithGemini(
            pdfDoc.key,
            pdfDoc.name,
            'Documento médico del cliente - extraer valores de laboratorio y datos clínicos relevantes'
          );

          rawProcessedDocs.push({
            title: pdfDoc.name,
            content: result.analysis,
            documentType: 'lab_results',
            confidence: 95,
          });

          logger.info("AI", `[fetchClientData] PDF ${i + 1}/${pdfDocs.length} analizado exitosamente: ${pdfDoc.name}`, {
            contentLength: result.analysis.length,
            extractionMethod: result.extractionMethod,
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error("AI", `[fetchClientData] Error analizando PDF ${i + 1}/${pdfDocs.length}: ${pdfDoc.name}`, error instanceof Error ? error : new Error(errMsg), {
            fileName: pdfDoc.name,
            s3Key: pdfDoc.key?.substring(0, 30) + '...',
            errorDetail: errMsg.substring(0, 200),
          });
          // Continuar con los demás PDFs aunque uno falle
        }
      }
    }
  } else {
    logger.info("AI", "[fetchClientData] No hay documentos del cliente para analizar con Gemini");
  }

  const processedDocuments = rawProcessedDocs;

  // Previous sessions
  const rawAIProgress = doc.aiProgress as { sessions?: AIRecommendationSession[] } | undefined;
  const previousSessions: AIRecommendationSession[] = rawAIProgress?.sessions ?? [];

  return {
    personalData,
    medicalData,
    healthAssessment,
    mentalHealth,
    processedDocuments,
    previousSessions,
  };
}

// ─────────────────────────────────────────────
// Helper: Build graph input from client data
// ─────────────────────────────────────────────

function buildGraphInput(
  clientId: string,
  monthNumber: number,
  clientData: ClientData,
  coachNotes: string,
  maxRevisions: number
): RecommendationGraphInput {
  return {
    clientId,
    monthNumber,
    personalData: clientData.personalData,
    medicalData: clientData.medicalData,
    healthAssessment: clientData.healthAssessment,
    mentalHealth: clientData.mentalHealth,
    processedDocuments: clientData.processedDocuments,
    coachNotes,
    previousSessions: clientData.previousSessions,
    maxRevisions,
  };
}

// ─────────────────────────────────────────────
// Helper: Save results to database
// ─────────────────────────────────────────────

interface GraphResult {
  clientInsights: {
    summary: string;
    keyRisks: string[];
    opportunities: string[];
    experienceLevel: string;
    idealWeight: string;
    idealBodyFat: string;
    targetImprovements: string[];
  };
  medicalAnalysisPlan?: Array<{
    weekNumber: number;
    focus: string;
    labResults: Array<{
      marker: string;
      currentValue: string;
      previousValue?: string;
      interpretation: string;
      trend: string;
    }>;
    clinicalFindings: string[];
    recommendedStudies: string[];
    supplementRecommendations: Array<{
      name: string;
      dosage: string;
      timing: string;
      rationale: string;
      contraindications?: string;
      necessary: boolean;
    }>;
    comparativeNotes?: string;
    structuredAnalysis?: {
      exams: Array<{
        intro: string;
        table: Array<{ biomarcador: string; valor: string; rango_normal: string; estado: 'Alto' | 'Bajo' | 'Normal' }>;
        analysis: string;
      }>;
      supplements: Array<{
        name: string;
        dosage: string;
        timing: string;
        rationale: string;
        contraindications?: string;
      }>;
    };
  }>;
  nutritionPlan: Array<{
    weekNumber: number;
    focus: string;
    macros: { protein: string; fat: string; carbs: string; calories: number };
    metabolicPurpose: string;
    shoppingList: Array<{ item: string; quantity: string; priority: string }>;
  }>;
  exercisePlan: Array<{
    weekNumber: number;
    focus: string;
    intro?: string;
    routine: Array<{
      exercise: string;
      sets: number;
      repetitions: string;
      timeUnderTension: string;
      progression: string;
    }>;
    equipment: string[];
    duration: string;
  }>;
  habitPlan: Array<{
    weekNumber: number;
    adoptHabits: Array<{ habit: string; frequency: string; trigger: string }>;
    eliminateHabits: Array<{ habit: string; replacement: string }>;
    trackingMethod: string;
    motivationTip: string;
  }>;
  shoppingList: Array<{ item: string; quantity: string; priority: string }>;
  session: Record<string, unknown>;
  checklist: ChecklistItem[];
  errors: string[];
}

function castWeekNumber(week: number): AIRecommendationWeek["weekNumber"] {
  if (week >= 1 && week <= 12) {
    return week as AIRecommendationWeek["weekNumber"];
  }
  return 1;
}

async function saveRecommendationsToDB(
  clientId: string,
  graphResult: GraphResult,
  monthNumber: number
): Promise<{ sessionId: string }> {
  const collection = await getHealthFormsCollection();

  // Build weeks from nutrition plan
  const weeks: AIRecommendationWeek[] = graphResult.nutritionPlan.map((nutrition) => {
    const exercise = graphResult.exercisePlan.find(
      (ex) => ex.weekNumber === nutrition.weekNumber
    );
    const habits = graphResult.habitPlan.find(
      (h) => h.weekNumber === nutrition.weekNumber
    );
    const medicalAnalysis = graphResult.medicalAnalysisPlan?.find(
      (ma) => ma.weekNumber === nutrition.weekNumber
    );

    return {
      weekNumber: castWeekNumber(nutrition.weekNumber),
      medicalAnalysis: medicalAnalysis ? {
        focus: encrypt(medicalAnalysis.focus),
        labSummary: encrypt(
          medicalAnalysis.labResults.length > 0
            ? medicalAnalysis.labResults.map(lr => `${lr.marker}: ${lr.currentValue} → ${lr.interpretation}`).join(" | ")
            : "Sin resultados de laboratorio"
        ),
      } : undefined,
      nutrition: {
        focus: encrypt(nutrition.focus),
        shoppingList: nutrition.shoppingList.map((item) => ({
          item: encrypt(item.item),
          quantity: encrypt(item.quantity),
          priority: item.priority as "high" | "medium" | "low",
        })),
      },
      exercise: {
        focus: encrypt(exercise?.focus ?? "Entrenamiento progresivo"),
        equipment: exercise?.equipment.map((eq: string) => encrypt(eq)) ?? [],
        intro: exercise?.intro ? encrypt(exercise.intro) : undefined,
      },
      habits: {
        trackingMethod: habits?.trackingMethod
          ? encrypt(habits.trackingMethod)
          : undefined,
        motivationTip: habits?.motivationTip
          ? encrypt(habits.motivationTip)
          : undefined,
      },
      supplements: medicalAnalysis && medicalAnalysis.supplementRecommendations.length > 0 ? {
        focus: encrypt(`Suplementos recomendados para la semana ${nutrition.weekNumber}`),
        recommendations: medicalAnalysis.supplementRecommendations.map(supp => ({
          name: encrypt(supp.name),
          dosage: encrypt(supp.dosage),
          timing: encrypt(supp.timing),
          rationale: encrypt(supp.rationale),
          contraindications: supp.contraindications ? encrypt(supp.contraindications) : undefined,
        })),
      } : undefined,
    };
  });

  // Encrypt checklist descriptions
  let encryptedChecklist: ChecklistItem[] = graphResult.checklist.map((item) => ({
    ...item,
    description: encrypt(item.description),
    details: item.details
      ? {
          ...item.details,
          recipe: item.details.recipe
            ? {
                ...item.details.recipe,
                ingredients: item.details.recipe.ingredients.map((ing) => ({
                  name: encrypt(ing.name),
                  quantity: encrypt(ing.quantity),
                  notes: ing.notes ? encrypt(ing.notes) : undefined,
                })),
                preparation: encrypt(item.details.recipe.preparation),
                tips: item.details.recipe.tips
                  ? encrypt(item.details.recipe.tips)
                  : undefined,
              }
            : undefined,
          frequency: item.details.frequency
            ? encrypt(item.details.frequency)
            : undefined,
          duration: item.details.duration
            ? encrypt(item.details.duration)
            : undefined,
          equipment: item.details.equipment?.map((eq: string) => encrypt(eq)),
          labResults: item.details.labResults?.map(lr => ({
            marker: encrypt(lr.marker),
            currentValue: encrypt(lr.currentValue),
            previousValue: lr.previousValue ? encrypt(lr.previousValue) : undefined,
            interpretation: encrypt(lr.interpretation),
            trend: lr.trend,
          })),
          clinicalFindings: item.details.clinicalFindings?.map((cf: string) => encrypt(cf)),
          recommendedStudies: item.details.recommendedStudies?.map((rs: string) => encrypt(rs)),
          supplementInfo: item.details.supplementInfo ? {
            name: encrypt(item.details.supplementInfo.name),
            dosage: encrypt(item.details.supplementInfo.dosage),
            timing: encrypt(item.details.supplementInfo.timing),
            rationale: encrypt(item.details.supplementInfo.rationale),
            contraindications: item.details.supplementInfo.contraindications ? encrypt(item.details.supplementInfo.contraindications) : undefined,
          } : undefined,
        }
      : undefined,
  }));

  // Add medical analysis checklist items from medicalAnalysisPlan
  if (graphResult.medicalAnalysisPlan) {
    for (const medWeek of graphResult.medicalAnalysisPlan) {
      const weekNum = medWeek.weekNumber;

      // Add clinical findings as checklist items
      medWeek.clinicalFindings.forEach((finding, idx) => {
        encryptedChecklist.push({
          id: `med_finding_${weekNum}_${idx}_${Date.now()}`,
          description: encrypt(`Hallazgo clínico: ${finding}`),
          completed: false,
          weekNumber: weekNum,
          category: 'medical',
          type: 'clinical_finding',
          updatedAt: new Date(),
        } as ChecklistItem);
      });

      // Add recommended studies as checklist items
      medWeek.recommendedStudies.forEach((study, idx) => {
        encryptedChecklist.push({
          id: `med_study_${weekNum}_${idx}_${Date.now()}`,
          description: encrypt(`Estudio recomendado: ${study}`),
          completed: false,
          weekNumber: weekNum,
          category: 'medical',
          type: 'recommended_study',
          updatedAt: new Date(),
        } as ChecklistItem);
      });

      // Add supplement recommendations as checklist items (only if necessary)
      medWeek.supplementRecommendations
        .filter(supp => supp.necessary)
        .forEach((supp, idx) => {
          encryptedChecklist.push({
            id: `med_supp_${weekNum}_${idx}_${Date.now()}`,
            description: encrypt(`${supp.name}: ${supp.dosage} — ${supp.timing}`),
            completed: false,
            weekNumber: weekNum,
            category: 'supplement',
            type: 'supplement',
            details: {
              supplementInfo: {
                name: encrypt(supp.name),
                dosage: encrypt(supp.dosage),
                timing: encrypt(supp.timing),
                rationale: encrypt(supp.rationale),
                contraindications: supp.contraindications ? encrypt(supp.contraindications) : undefined,
              },
            },
            updatedAt: new Date(),
          } as ChecklistItem);
        });
    }
  }

  const sessionId = `session_${Date.now()}_${monthNumber}`;

  const sessionData: AIRecommendationSession = {
    sessionId,
    monthNumber,
    totalWeeks: weeks.length,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "draft",
    summary: encrypt(graphResult.clientInsights.summary),
    vision: encrypt(
      `Plan de ${weeks.length} semanas para optimizar salud metabólica, composición corporal y bienestar emocional`
    ),
    medicalSummary: graphResult.medicalAnalysisPlan
      ? encrypt(
          graphResult.medicalAnalysisPlan
            .map(w => `Semana ${w.weekNumber}: ${w.focus}\n${w.clinicalFindings.join("\n")}`)
            .join("\n\n")
        )
      : undefined,
    medicalComparativeAnalysis: (() => {
      const comparativeNotes = graphResult.medicalAnalysisPlan
        ?.filter(w => w.comparativeNotes)
        .map(w => w.comparativeNotes!)
        .join("\n\n");
      return comparativeNotes ? encrypt(comparativeNotes) : undefined;
    })(),
    labResults: graphResult.medicalAnalysisPlan?.[0]?.labResults?.map(lr => ({
      name: lr.marker,
      value: lr.currentValue,
      range: lr.interpretation,
      status: lr.interpretation.toLowerCase().includes('alto') ? 'alto' : lr.interpretation.toLowerCase().includes('bajo') ? 'bajo' : 'normal' as 'normal' | 'alto' | 'bajo',
    })),
    structuredMedicalAnalysis: graphResult.medicalAnalysisPlan?.[0]?.structuredAnalysis,
    baselineMetrics: {
      currentLifestyle: graphResult.clientInsights.keyRisks,
      targetLifestyle: graphResult.clientInsights.targetImprovements,
    },
    weeks,
    checklist: encryptedChecklist,
    regenerationCount: 0,
    regenerationHistory: [],
  };

  await collection.updateOne(
    { _id: new ObjectId(clientId) },
    {
      $set: {
        updatedAt: new Date(),
        "aiProgress.sessions": [sessionData],
        "aiProgress.currentSessionId": sessionId,
      },
    }
  );

  return { sessionId };
}

// ─────────────────────────────────────────────
// Inngest Function: Generate Recommendations
// ─────────────────────────────────────────────

export const generateRecommendationsFn = inngest.createFunction(
  {
    id: "generate-recommendations",
    name: "Generar Recomendaciones Personalizadas",
    triggers: [{ event: "ai.recommendations.requested" }],
  },
  async (ctx) => {
    const data = ctx.event.data as GenerateRecommendationsEventData;
    const { clientId, monthNumber } = data;
    const coachNotes = data.coachNotes ?? "";
    const maxRevisions = data.maxRevisions ?? 2;

    const log = logger.withContext({
      clientId,
      monthNumber,
      endpoint: "inngest:generate-recommendations",
    });

    log.info("AI", "Starting recommendation generation", {
      model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
      coachNotesProvided: !!coachNotes,
    });

    // Step 1: Fetch client data
    const clientData = await ctx.step.run(
      "fetch-client-data",
      async (): Promise<ClientData> => {
        log.info("AI", "Fetching client data");
        return fetchClientData(clientId);
      }
    );

    // Step 2: Ejecutar LangGraph en un solo step (con robustJsonParse ya no hay error de parseo)
    let graphResult: Record<string, unknown> | null = null;
    let executionError: string | null = null;

    try {
      graphResult = await ctx.step.run(
        "execute-langgraph",
        async () => {
          log.info("AI", "Executing LangGraph recommendation pipeline");

          const input = buildGraphInput(
            clientId,
            monthNumber,
            clientData as unknown as ClientData,
            coachNotes,
            maxRevisions
          );

          return generateRecommendations(input, {
            configurable: { thread_id: clientId },
          });
        }
      ) as unknown as Record<string, unknown>;
    } catch (graphError: unknown) {
      const errorMessage =
        graphError instanceof Error ? graphError.message : "Unknown LangGraph error";
      const errorStack = graphError instanceof Error ? graphError.stack?.substring(0, 500) : undefined;
      log.error("AI", `LangGraph execution failed: ${errorMessage}`, graphError instanceof Error ? graphError : new Error(errorMessage), {
        clientId,
        monthNumber,
        model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
        stack: errorStack,
      });
      executionError = errorMessage;

      await ctx.step.run("save-error-to-db", async () => {
        await saveErrorToDB(clientId, errorMessage, monthNumber);
      });

      await ctx.step.run("notify-dashboard-error", async () => {
        await notifyDashboardError(clientId, errorMessage, monthNumber);
      });

      return {
        success: false,
        clientId,
        sessionId: null,
        monthNumber,
        weekCount: 0,
        errors: [errorMessage],
      };
    }

    // El resto del flujo solo se ejecuta si LangGraph tuvo éxito
    // Step 3: Save to database
    log.info("AI", "LangGraph completado. Guardando resultados...", {
      hasMedicalData: !!(graphResult as Record<string, unknown>).medicalAnalysisPlan,
      nutritionWeeks: ((graphResult as Record<string, unknown>).nutritionPlan as Array<unknown>)?.length || 0,
    });

    const saveResult = await ctx.step.run(
      "save-recommendations",
      async () => {
        log.info("AI", "Saving recommendations to database");
        return saveRecommendationsToDB(
          clientId,
          graphResult as unknown as GraphResult,
          monthNumber
        );
      }
    );

    // Step 4: Log completion
    await ctx.step.run("log-completion", async () => {
      log.info("AI", "Recommendation generation completed", {
        sessionId: saveResult.sessionId,
        errors: graphResult.errors
          ? (graphResult.errors as string[]).length
          : 0,
        hasMedicalAnalysis: !!(graphResult as Record<string, unknown>).medicalAnalysisPlan,
      });
    });

    // Step 5: Notify dashboard via webhook
    await ctx.step.run("notify-dashboard", async () => {
      await notifyDashboardSuccess(
        clientId,
        saveResult.sessionId,
        monthNumber,
        graphResult
      );
    });

    return {
      success: true,
      clientId,
      sessionId: saveResult.sessionId,
      weekCount: graphResult.nutritionPlan
        ? (graphResult.nutritionPlan as Array<unknown>).length
        : 0,
      errors: graphResult.errors
        ? (graphResult.errors as string[])
        : [],
    };
  }
) as unknown as ReturnType<typeof inngest.createFunction<never>>;

// ─────────────────────────────────────────────
// Helpers para guardar y notificar errores
// ─────────────────────────────────────────────

/**
 * Guarda un error de generación en el documento del cliente para que
 * el frontend pueda leerlo vía GET /api/clients/:id/ai y mostrar
 * el mensaje de error al coach.
 */
async function saveErrorToDB(
  clientId: string,
  errorMessage: string,
  monthNumber: number
): Promise<void> {
  try {
    const collection = await getHealthFormsCollection();
    await collection.updateOne(
      { _id: new ObjectId(clientId) },
      {
        $set: {
          "aiProgress.generationError": {
            message: errorMessage,
            monthNumber,
            timestamp: new Date().toISOString(),
          },
        },
      }
    );
    logger.info("AI", `Error de generación guardado en DB para cliente ${clientId}`);
  } catch (dbError) {
    logger.error("AI", `Error guardando error de generación en DB: ${dbError}`);
  }
}

/**
 * Notifica al dashboard que hubo un error en la generación.
 * También crea una notificación in-app para el coach.
 */
async function notifyDashboardError(
  clientId: string,
  errorMessage: string,
  monthNumber: number
): Promise<void> {
  const dashboardUrl =
    process.env.DASHBOARD_WEBHOOK_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://app.nelhealthcoach.com/api/webhooks/inngest"
      : "http://localhost:3002/api/webhooks/inngest");

  // Webhook al dashboard (legacy)
  try {
    await fetch(dashboardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "recommendations_error",
        clientId,
        error: errorMessage,
        monthNumber,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // No failing on webhook errors
  }

  // Notificación in-app para el coach
  try {
    const collection = await getHealthFormsCollection();
    const doc = await collection.findOne(
      { _id: new ObjectId(clientId) },
      { projection: { coachId: 1 } }
    );
    if (doc?.coachId) {
      const { createNotification } = await import('@/app/lib/create-notification');
      await createNotification({
        coachId: doc.coachId.toString(),
        type: 'ai_recommendations_ready',
        title: '⚠️ Error generando recomendaciones',
        message: `Hubo un error al generar las recomendaciones del mes ${monthNumber}: ${errorMessage.substring(0, 100)}. Intenta generarlas de nuevo.`,
        link: `/dashboard/clients/${clientId}`,
      });
    }
  } catch {
    // Silencioso
  }
}

/**
 * Notifica al dashboard que las recomendaciones están listas.
 * También crea una notificación in-app para el coach.
 */
async function notifyDashboardSuccess(
  clientId: string,
  sessionId: string,
  monthNumber: number,
  graphResult: Record<string, unknown>
): Promise<void> {
  const dashboardUrl =
    process.env.DASHBOARD_WEBHOOK_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://app.nelhealthcoach.com/api/webhooks/inngest"
      : "http://localhost:3002/api/webhooks/inngest");

  const weekCount = graphResult.nutritionPlan
    ? (graphResult.nutritionPlan as Array<unknown>).length
    : 0;

  const errors = graphResult.errors
    ? (graphResult.errors as string[])
    : [];

  // Webhook al dashboard (legacy)
  try {
    await fetch(dashboardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "recommendations_ready",
        clientId,
        sessionId,
        monthNumber,
        weekCount,
        errors,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // No failing on webhook errors
  }

  // Notificación in-app para el coach
  try {
    const collection = await getHealthFormsCollection();
    const doc = await collection.findOne(
      { _id: new ObjectId(clientId) },
      { projection: { coachId: 1, personalData: 1 } }
    );
    if (doc?.coachId) {
      const rawPersonal = doc.personalData as Record<string, unknown> | undefined;
      const clientName = rawPersonal?.name
        ? decrypt(rawPersonal.name as string)
        : 'Cliente';
      const { createNotification } = await import('@/app/lib/create-notification');

      await createNotification({
        coachId: doc.coachId.toString(),
        type: 'ai_recommendations_ready',
        title: '🤖 Recomendaciones listas',
        message: `Las recomendaciones del mes ${monthNumber} para ${clientName} (${weekCount} semanas) ya están disponibles.`,
        link: `/dashboard/clients/${clientId}`,
      });
    }
  } catch {
    // Silencioso
  }
}

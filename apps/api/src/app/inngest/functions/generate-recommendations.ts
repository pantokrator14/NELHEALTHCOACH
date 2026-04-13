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
} from "@nelhealthcoach/types";
import { logger } from "@/app/lib/logger";
import type { Handler } from "inngest";

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
      ? (rawMedical.documents as Array<NonNullable<PersonalData["profilePhoto"]>>)
      : undefined,
    processedDocuments: rawMedical?.processedDocuments as MedicalData["processedDocuments"],
    lastDocumentProcessed: rawMedical?.lastDocumentProcessed as MedicalData["lastDocumentProcessed"],
  };

  // Extract health assessment booleans
  const healthAssessment: Record<string, boolean> = {
    carbohydrateAddiction: medicalData.carbohydrateAddiction === "true",
    leptinResistance: medicalData.leptinResistance === "true",
    circadianRhythms: medicalData.circadianRhythms === "true",
    sleepHygiene: medicalData.sleepHygiene === "true",
    electrosmogExposure: medicalData.electrosmogExposure === "true",
    generalToxicity: medicalData.generalToxicity === "true",
    microbiotaHealth: medicalData.microbiotaHealth === "true",
  };

  // Extract mental health fields
  const mentalHealth: Record<string, string> = {
    emotionIdentification: medicalData.mentalHealthEmotionIdentification ?? "",
    emotionIntensity: medicalData.mentalHealthEmotionIntensity ?? "",
    uncomfortableEmotion: medicalData.mentalHealthUncomfortableEmotion ?? "",
    internalDialogue: medicalData.mentalHealthInternalDialogue ?? "",
    stressStrategies: medicalData.mentalHealthStressStrategies ?? "",
    sayingNo: medicalData.mentalHealthSayingNo ?? "",
    relationships: medicalData.mentalHealthRelationships ?? "",
    expressThoughts: medicalData.mentalHealthExpressThoughts ?? "",
    emotionalDependence: medicalData.mentalHealthEmotionalDependence ?? "",
    purpose: medicalData.mentalHealthPurpose ?? "",
    failureReaction: medicalData.mentalHealthFailureReaction ?? "",
    selfConnection: medicalData.mentalHealthSelfConnection ?? "",
    selfRelationship: medicalData.mentalHealthSelfRelationship ?? "",
    limitingBeliefs: medicalData.mentalHealthLimitingBeliefs ?? "",
    idealBalance: medicalData.mentalHealthIdealBalance ?? "",
  };

  // Process documents
  const rawProcessedDocs = rawMedical?.processedDocuments as Array<Record<string, unknown>> | undefined;
  const processedDocuments = (rawProcessedDocs ?? []).map(
    (docItem: Record<string, unknown>) => ({
      title: typeof docItem.title === "string" ? decrypt(docItem.title) : "",
      content: typeof docItem.content === "string" ? decrypt(docItem.content) : "",
      documentType: typeof docItem.metadata === "object" && docItem.metadata !== null
        ? String((docItem.metadata as Record<string, unknown>).documentType ?? "other")
        : "other",
      confidence: typeof docItem.confidence === "number" ? docItem.confidence : 0,
    })
  );

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

    return {
      weekNumber: castWeekNumber(nutrition.weekNumber),
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
      },
      habits: {
        trackingMethod: habits?.trackingMethod
          ? encrypt(habits.trackingMethod)
          : undefined,
        motivationTip: habits?.motivationTip
          ? encrypt(habits.motivationTip)
          : undefined,
      },
    };
  });

  // Encrypt checklist descriptions
  const encryptedChecklist: ChecklistItem[] = graphResult.checklist.map((item) => ({
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
        }
      : undefined,
  }));

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

    log.info("AI", "Starting recommendation generation");

    // Step 1: Fetch client data
    const clientData = await ctx.step.run(
      "fetch-client-data",
      async (): Promise<ClientData> => {
        log.info("AI", "Fetching client data");
        return fetchClientData(clientId);
      }
    );

    // Step 2: Execute LangGraph
    const graphResult = await ctx.step.run(
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
    );

    // Step 3: Save to database
    const saveResult = await ctx.step.run(
      "save-recommendations",
      async () => {
        log.info("AI", "Saving recommendations to database");
        return saveRecommendationsToDB(clientId, graphResult as unknown as GraphResult, monthNumber);
      }
    );

    // Step 4: Log completion
    await ctx.step.run("log-completion", async () => {
      log.info("AI", "Recommendation generation completed", {
        sessionId: saveResult.sessionId,
        errors: (graphResult as Record<string, unknown>).errors
          ? ((graphResult as Record<string, unknown>).errors as string[]).length
          : 0,
      });
    });

    return {
      success: true,
      clientId,
      sessionId: saveResult.sessionId,
      weekCount: (graphResult as Record<string, unknown>).nutritionPlan
        ? ((graphResult as Record<string, unknown>).nutritionPlan as Array<unknown>).length
        : 0,
      errors: (graphResult as Record<string, unknown>).errors
        ? ((graphResult as Record<string, unknown>).errors as string[])
        : [],
    };
  }
) as unknown as ReturnType<typeof inngest.createFunction<never>>;

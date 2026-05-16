import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createDeepSeekJSONLLM } from "../utils/llm";
import { robustJsonParse } from "../utils/llm";
import type { RecommendationStateType } from "../state";
import { logger } from "../../logger";
import { medicalAnalystGuard, applyGuardrails, validateAIResponse } from "../guard";
import { formatFullClientProfile } from "../utils/prompt-builders";

interface MedicalAnalysisWeek {
  weekNumber: number;
  focus: string;
  labResults: Array<{
    marker: string;
    currentValue: string;
    previousValue?: string;
    interpretation: string;
    trend: 'improving' | 'stable' | 'worsening' | 'new';
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
}

/**
 * Medical Analyst Node
 *
 * Analyzes the client's lab results, processed medical documents,
 * and generates:
 * 1. Laboratory marker analysis with tables and interpretation
 * 2. Comparative analysis between sessions (when previous sessions exist)
 * 3. Supplement recommendations only when nutrition alone is insufficient
 *
 * Uses Gemini for PDF document analysis when S3 documents are available.
 */
export async function analyzeMedicalData(
  state: RecommendationStateType,
  _config?: RunnableConfig
): Promise<Partial<RecommendationStateType>> {
  const logCtx = logger.withContext({
    node: "analyzeMedicalData",
    clientId: state.clientId,
    monthNumber: state.monthNumber,
  });

  try {
    if (!state.clientInsights) {
      logCtx.warn("AI", "No client insights available, using fallback medical analysis");
      return {
        errors: ["analyzeMedicalData: clientInsights not available. Run analyzeClient first."],
        medicalAnalysisPlan: generateFallbackMedicalAnalysis(state.monthNumber),
      };
    }

    const totalWeeks = state.monthNumber * 4;
    const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);
    const isFirstSession = !state.previousSessions || state.previousSessions.length === 0;

    logCtx.info("AI", "Starting medical data analysis", {
      isFirstSession,
      hasDocuments: (state.processedDocuments && state.processedDocuments.length > 0) || false,
      documentCount: state.processedDocuments?.length || 0,
      hasPreviousSessions: (state.previousSessions && state.previousSessions.length > 0) || false,
      weekCount: weekNumbers.length,
    });

    const llm = createDeepSeekJSONLLM();

    const systemPrompt = buildMedicalSystemPrompt(state, weekNumbers, isFirstSession);
    const userPrompt = buildMedicalUserPrompt(state, weekNumbers, isFirstSession);

    logCtx.debug("AI", "Invoking LLM for medical analysis", {
      promptLength: systemPrompt.length + userPrompt.length,
      model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
    });

    // Usar guardrails para análisis médico
    const medicalAnalysisPlan = await applyGuardrails(
      medicalAnalystGuard,
      { systemPrompt, userPrompt, clientData: state },
      async (validatedInput) => {
        const llmStartTime = Date.now();
        const response = await llm.invoke([
          new SystemMessage("Eres un médico analista experto en interpretación de laboratorios clínicos, fisiología y metabolismo. Responde SOLO con JSON válido (array de objetos)."),
          new HumanMessage(validatedInput.userPrompt),
        ]);
        const llmDuration = Date.now() - llmStartTime;

        const content = typeof response.content === "string" ? response.content : "";

        logCtx.debug("AI", "LLM response received for medical analysis", {
          duration: llmDuration,
          contentLength: content.length,
        });

        // Validación adicional de la respuesta
        const validation = await validateAIResponse(content);
        if (!validation.isValid) {
          logCtx.warn("GUARDRAILS", "Problemas en análisis médico", {
            issues: validation.issues,
            weekCount: weekNumbers.length,
          });
        }

        const plan = parseMedicalAnalysisResponse(validation.sanitizedResponse || content, weekNumbers);

        // Asegurar disclaimer médico en cada semana
        return plan.map(weekPlan => ({
          ...weekPlan,
          focus: weekPlan.focus + " | ⚠️ Consulte con profesional médico antes de tomar decisiones basadas en este análisis",
          supplementRecommendations: weekPlan.supplementRecommendations.map(supp => ({
            ...supp,
            rationale: supp.rationale + (supp.necessary ? "" : " — Nota: La alimentación y ejercicio recomendados pueden cubrir esta necesidad sin suplementación."),
          })),
        }));
      }
    );

    logCtx.info("AI", "Medical analysis completed", {
      weekCount: medicalAnalysisPlan.length,
      isFirstSession,
    });

    return { medicalAnalysisPlan };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;
    logCtx.error("AI", `Medical analysis failed: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage), {
      clientId: state.clientId,
      operation: "analyzeMedicalData",
      stack: errorStack,
    });

    return {
      errors: [`analyzeMedicalData: ${errorMessage}`],
      medicalAnalysisPlan: generateFallbackMedicalAnalysis(state.monthNumber),
    };
  }
}

function buildMedicalSystemPrompt(
  state: RecommendationStateType,
  _weekNumbers: number[],
  isFirstSession: boolean
): string {
  const hasDocuments = state.processedDocuments && state.processedDocuments.length > 0;

  return `Eres un médico analista experto en interpretación de laboratorios clínicos, fisiología metabólica y cardiovascular. Trabajas en el contexto de un coach de salud integral (NEL Health Coach).

## PRINCIPIOS FUNDAMENTALES:
1. NO diagnosticar enfermedades — el análisis es EDUCATIVO e INFORMATIVO
2. SIEMPRE recomendar consultar con profesional médico licenciado
3. Interpretar resultados en CONTEXTO fisiológico integral (no marcadores aislados)
4. Considerar: metabolismo, función lipídica, respuesta individual, contexto nutricional, genética potencial, fisiología energética y posible riesgo cardiovascular real
5. NO generar miedo ni minimizar hallazgos importantes

## FORMATO DE ANÁLISIS:
Para cada semana, genera un análisis que incluya:

### 1. Tabla de marcadores de laboratorio (labResults)
- Incluye TODOS los marcadores disponibles de los documentos procesados
- Para cada marcador: valor actual, valor previo (si existe), interpretación, tendencia (improving/stable/worsening/new)
${isFirstSession ? '- Primera sesión: análisis NORMAL de valores actuales contra rangos de referencia' : '- Sesiones siguientes: análisis COMPARATIVO con valores de sesiones anteriores'}
- Marcadores típicos a analizar: LDL-C, HDL-C, Triglicéridos, ApoB, LDL-P, Small LDL-P, LDL Size, LP-IR Score, Glucosa, Insulina, HbA1c, hs-CRP, Homocisteína, Lipoproteína(a), TSH, Free T3, Reverse T3, Ferritina, Colesterol Total

### 2. Hallazgos clínicos (clinicalFindings)
- Aspectos positivos del caso
- Aspectos preocupantes que requieren atención
- Posibles explicaciones fisiológicas
- NO concluir automáticamente enfermedad

### 3. Estudios recomendados (recommendedStudies)
- Prioridad alta: Score de calcio coronario (CAC), CIMT, CCTA
- Genéticos si aplica: Panel hipercolesterolemia familiar, ApoE genotype, LDL receptor mutations
- Hierro/Ferritina si está elevada: Saturación de transferrina, Hierro sérico, TIBC
- Hepáticos si aplica: Ultrasound hepático, FibroScan

### 4. Recomendaciones de suplementos (supplementRecommendations)
- SOLO recomendar suplementos si la ALIMENTACIÓN por sí sola NO puede cubrir la necesidad
- Si el plan nutricional recomendado es suficiente, indicar "necessary: false" y explicar que la alimentación cubre el requerimiento
- **CONSIDERA los suplementos que el cliente YA TOMA** (ver "Suplementos actuales" en datos del cliente)
- **NO dupliques** suplementos que el cliente ya está tomando a menos que la dosis actual sea insuficiente
- **Verifica interacciones** entre suplementos recomendados y los que ya toma
- **Ajusta dosis** considerando lo que ya consume
- Para cada suplemento: nombre, dosis, momento del día, razón/justificación, contraindicaciones
- Ejemplos de suplementos a considerar: Omega-3 (si perfil lipídico alterado), Vitamina D3 + K2, Magnesio, CoQ10, Psyllium (fibra soluble), Probióticos específicos${hasDocuments ? '\n\n## DATOS DISPONIBLES:\nSe proporcionarán documentos médicos procesados (resultados de laboratorio, análisis previos, etc.) para tu análisis.' : ''}

Responde SOLO con el array JSON al final.`;
}

function buildMedicalUserPrompt(
  state: RecommendationStateType,
  weekNumbers: number[],
  isFirstSession: boolean
): string {
  const insights = state.clientInsights;
  const personalData = state.personalData;
  const medicalData = state.medicalData;
  const weekList = weekNumbers.join(", ");

  // Perfil completo del cliente
  const fullProfile = formatFullClientProfile({
    personalData: state.personalData as unknown as Parameters<typeof formatFullClientProfile>[0]['personalData'],
    medicalData: state.medicalData as unknown as Parameters<typeof formatFullClientProfile>[0]['medicalData'],
    healthAssessment: state.healthAssessment as unknown as Parameters<typeof formatFullClientProfile>[0]['healthAssessment'],
    mentalHealth: state.mentalHealth as unknown as Parameters<typeof formatFullClientProfile>[0]['mentalHealth'],
    processedDocuments: state.processedDocuments as unknown as Parameters<typeof formatFullClientProfile>[0]['processedDocuments'],
    previousSessions: state.previousSessions as unknown as Parameters<typeof formatFullClientProfile>[0]['previousSessions'],
    coachNotes: state.coachNotes,
  });

  // Formatear documentos procesados
  const documentsInfo = state.processedDocuments && state.processedDocuments.length > 0
    ? state.processedDocuments.map((doc, i) =>
        `**Documento ${i + 1}: ${doc.title}** (Tipo: ${doc.documentType}, Confianza: ${doc.confidence}%)\n${doc.content.substring(0, 3000)}`
      ).join("\n\n---\n\n")
    : "No hay documentos médicos procesados disponibles. Usa los datos del formulario de salud.";

  // Condiciones médicas relevantes
  const medicalConditions = [
    medicalData.currentPastConditions ? `- Condiciones actuales/pasadas: ${medicalData.currentPastConditions}` : null,
    medicalData.medications ? `- Medicamentos: ${medicalData.medications}` : null,
    medicalData.supplements ? `- Suplementos actuales: ${medicalData.supplements}` : null,
    medicalData.allergies ? `- Alergias: ${medicalData.allergies}` : null,
    medicalData.surgeries ? `- Cirugías: ${medicalData.surgeries}` : null,
  ].filter(Boolean).join("\n") || "Sin condiciones médicas reportadas";

  // Historial de sesiones previas para comparativa
  const previousSessionsInfo = state.previousSessions && state.previousSessions.length > 0
    ? state.previousSessions.map((s, i) =>
        `- Sesión ${i + 1} (Mes ${s.monthNumber}): ${s.summary ? s.summary.substring(0, 200) : 'Sin resumen'}`
      ).join("\n")
    : "No hay sesiones previas (primera evaluación)";

  // Información de estilo de vida relevante
  const lifestyleInfo = [
    medicalData.currentActivityLevel ? `- Nivel de actividad: ${medicalData.currentActivityLevel}` : null,
    medicalData.typicalWeekday ? `- Día típico: ${medicalData.typicalWeekday.substring(0, 200)}` : null,
    personalData.occupation ? `- Ocupación: ${personalData.occupation}` : null,
    personalData.weight ? `- Peso: ${personalData.weight} kg` : null,
    personalData.height ? `- Altura: ${personalData.height} cm` : null,
    personalData.age ? `- Edad: ${personalData.age} años` : null,
  ].filter(Boolean).join("\n") || "Sin información de estilo de vida";

  return `${fullProfile}

## PERFIL DEL CLIENTE

**Resumen:** ${insights?.summary ?? "No disponible"}
**Nivel de experiencia:** ${insights?.experienceLevel ?? "principiante"}
**Riesgos clave:** ${insights?.keyRisks?.join(", ") ?? "No identificados"}
**Oportunidades:** ${insights?.opportunities?.join(", ") ?? "No identificadas"}
**Mejoras objetivo:** ${insights?.targetImprovements?.join(", ") ?? "Mejorar salud general"}

## DATOS PERSONALES Y ESTILO DE VIDA
${lifestyleInfo}

## CONDICIONES MÉDICAS
${medicalConditions}

## DOCUMENTOS MÉDICOS PROCESADOS
${documentsInfo}

## HISTORIAL DE SESIONES PREVIAS
${previousSessionsInfo}

## TIPO DE ANÁLISIS REQUERIDO
${isFirstSession
  ? "**PRIMERA SESIÓN**: Realiza un análisis NORMAL de los valores actuales. Interpreta cada marcador contra los rangos de referencia estándar. Identifica patrones, riesgos potenciales y aspectos positivos."
  : "**SESIÓN DE SEGUIMIENTO**: Realiza un análisis COMPARATIVO con las sesiones anteriores. Compara cada marcador contra sus valores previos. Identifica tendencias (mejora, estabilidad, empeoramiento). Evalúa el progreso del plan."}

## TU TAREA
Genera un plan de análisis médico para las semanas: ${weekList}

### Estructura de respuesta (array JSON):
\`\`\`json
[
  {
    "weekNumber": number,
    "focus": "Enfoque del análisis médico para esta semana",
    "labResults": [
      {
        "marker": "Nombre del marcador (ej: LDL-C)",
        "currentValue": "Valor actual con unidades",
        "previousValue": "Valor previo (si existe) o null",
        "interpretation": "Interpretación clínica educativa",
        "trend": "improving|stable|worsening|new"
      }
    ],
    "clinicalFindings": [
      "Hallazgo clínico 1 en texto descriptivo",
      "Hallazgo clínico 2..."
    ],
    "recommendedStudies": [
      "Estudio recomendado 1",
      "Estudio recomendado 2..."
    ],
    "supplementRecommendations": [
      {
        "name": "Nombre del suplemento",
        "dosage": "Dosis recomendada",
        "timing": "Momento del día para tomarlo",
        "rationale": "Justificación basada en los hallazgos",
        "contraindications": "Contraindicaciones o null",
        "necessary": true/false
      }
    ],
    "comparativeNotes": "Notas comparativas (solo para sesiones > 1) o null"
  }
]
\`\`\`

### Reglas importantes:
1. Si NO hay documentos con resultados de laboratorio, enfócate en el análisis clínico basado en los datos del formulario
2. Para suplementos: si la alimentación recomendada + ejercicio cubren la necesidad → necessary: false
3. **NO recomiendes suplementos que el cliente YA TOMA a menos que la dosis necesite ajuste** — revisa "Suplementos actuales" en los datos del cliente
4. NO recomiendes medicamentos — solo suplementos nutricionales
5. Incluye SIEMPRE el disclaimer de consulta médica
6. Si es primera sesión y no hay labs, enfócate en qué estudios sería bueno que el cliente se realice

Responde SOLO con el array JSON, sin texto adicional.`;
}

/**
 * Parses the LLM response into an array of MedicalAnalysisWeek objects.
 */
function parseMedicalAnalysisResponse(
  content: string,
  expectedWeeks: number[]
): MedicalAnalysisWeek[] {
  let jsonStr = content;

  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const parsed: unknown = robustJsonParse<unknown>(jsonStr);

  if (!Array.isArray(parsed)) {
    return generateFallbackMedicalAnalysis(expectedWeeks.length / 4);
  }

  const result: MedicalAnalysisWeek[] = [];

  for (let index = 0; index < parsed.length; index++) {
    const item = parsed[index] as Record<string, unknown>;
    const weekNumber = typeof item.weekNumber === "number"
      ? item.weekNumber
      : expectedWeeks[index] ?? index + 1;

    const labResultsRaw = item.labResults as Array<Record<string, unknown>> | undefined;
    const labResults = Array.isArray(labResultsRaw)
      ? labResultsRaw.map((lr: Record<string, unknown>) => {
          const trendRaw = lr.trend as string | undefined;
          const trend: MedicalAnalysisWeek['labResults'][0]['trend'] =
            trendRaw === 'improving' || trendRaw === 'stable' || trendRaw === 'worsening' || trendRaw === 'new'
              ? trendRaw : 'new';
          return {
            marker: typeof lr.marker === "string" ? lr.marker : "Marcador desconocido",
            currentValue: typeof lr.currentValue === "string" ? lr.currentValue : "N/D",
            previousValue: typeof lr.previousValue === "string" ? lr.previousValue : undefined,
            interpretation: typeof lr.interpretation === "string" ? lr.interpretation : "Sin interpretación",
            trend,
          };
        })
      : [];

    const clinicalFindingsRaw = item.clinicalFindings as Array<unknown> | undefined;
    const clinicalFindings = Array.isArray(clinicalFindingsRaw)
      ? clinicalFindingsRaw.filter((f): f is string => typeof f === "string")
      : [];

    const recommendedStudiesRaw = item.recommendedStudies as Array<unknown> | undefined;
    const recommendedStudies = Array.isArray(recommendedStudiesRaw)
      ? recommendedStudiesRaw.filter((s): s is string => typeof s === "string")
      : [];

    const supplementRecsRaw = item.supplementRecommendations as Array<Record<string, unknown>> | undefined;
    const supplementRecommendations = Array.isArray(supplementRecsRaw)
      ? supplementRecsRaw.map((sr: Record<string, unknown>) => ({
          name: typeof sr.name === "string" ? sr.name : "Suplemento genérico",
          dosage: typeof sr.dosage === "string" ? sr.dosage : "Consultar profesional",
          timing: typeof sr.timing === "string" ? sr.timing : "Con alimentos",
          rationale: typeof sr.rationale === "string" ? sr.rationale : "Basado en hallazgos clínicos",
          contraindications: typeof sr.contraindications === "string" ? sr.contraindications : undefined,
          necessary: typeof sr.necessary === "boolean" ? sr.necessary : false,
        }))
      : [];

    result.push({
      weekNumber,
      focus: typeof item.focus === "string" ? item.focus : "Análisis médico integral",
      labResults,
      clinicalFindings,
      recommendedStudies,
      supplementRecommendations,
      comparativeNotes: typeof item.comparativeNotes === "string" ? item.comparativeNotes : undefined,
    });
  }

  return result.filter((plan) => expectedWeeks.includes(plan.weekNumber));
}

/**
 * Generates a fallback medical analysis plan if the LLM fails.
 */
function generateFallbackMedicalAnalysis(monthNumber: number): MedicalAnalysisWeek[] {
  const totalWeeks = monthNumber * 4;
  const plans: MedicalAnalysisWeek[] = [];

  for (let week = 1; week <= totalWeeks; week++) {
    plans.push({
      weekNumber: week,
      focus: "Monitoreo de salud general",
      labResults: [],
      clinicalFindings: [
        "No se pudieron generar hallazgos clínicos automatizados.",
        "Se recomienda revisión manual por profesional de la salud.",
      ],
      recommendedStudies: [
        "Perfil lipídico completo",
        "Hemograma completo",
        "Panel metabólico básico",
      ],
      supplementRecommendations: [
        {
          name: "Vitamina D3 + K2",
          dosage: "Consultar con profesional",
          timing: "Con comida principal",
          rationale: "Salud ósea e inmunológica general",
          contraindications: "Consultar si toma anticoagulantes",
          necessary: false,
        },
      ],
      comparativeNotes: undefined,
    });
  }

  return plans;
}

import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createDeepSeekJSONLLM } from "../utils/llm";
import { robustJsonParse } from "../utils/llm";
import type { RecommendationStateType, StructuredMedicalAnalysis, MedicalAnalysisPlan, LabBiomarker, SupplementRecommendation } from "../state";
import { logger } from "../../logger";
import { medicalAnalystGuard, applyGuardrails, validateAIResponse } from "../guard";
import { formatFullClientProfile } from "../utils/prompt-builders";

/**
 * Medical Analyst Node
 *
 * Analyzes the client's lab results, processed medical documents,
 * and generates structured medical analysis with:
 * 1. Exams with intro, biomarker tables, and clinical analysis
 * 2. Supplement recommendations based on altered biomarkers
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

    const llm = await createDeepSeekJSONLLM();

    const systemPrompt = buildMedicalSystemPrompt(state, weekNumbers, isFirstSession);
    const userPrompt = buildMedicalUserPrompt(state, weekNumbers, isFirstSession);

    logCtx.debug("AI", "Invoking LLM for medical analysis", {
      promptLength: systemPrompt.length + userPrompt.length,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });

    // Usar guardrails para análisis médico
    const structuredAnalysis = await applyGuardrails(
      medicalAnalystGuard,
      { systemPrompt, userPrompt, clientData: state },
      async (validatedInput) => {
        const llmStartTime = Date.now();
        const response = await llm.invoke([
          new SystemMessage("Eres un médico analista especializado en metabolismo keto y bajo en carbohidratos. Interpretas laboratorios clínicos bajo los estándares del estilo de vida keto (grasas saludables como combustible, No por miedo a las grasas). Responde SOLO con JSON válido (objeto con 'exams' y 'supplements')."),
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
          });
        }

        const parsed = parseStructuredMedicalResponse(validation.sanitizedResponse || content);

        // Asegurar disclaimer médico en cada análisis
        return {
          ...parsed,
          exams: parsed.exams.map(exam => ({
            ...exam,
            analysis: exam.analysis + " | ⚠️ Consulte con profesional médico antes de tomar decisiones basadas en este análisis.",
          })),
          supplements: parsed.supplements.map(supp => ({
            ...supp,
            rationale: supp.rationale,
          })),
        };
      }
    );

    // Convertir análisis estructurado al formato MedicalAnalysisPlan[] para compatibilidad
    const medicalAnalysisPlan = convertStructuredToWeeklyPlan(structuredAnalysis, weekNumbers, state);

    logCtx.info("AI", "Medical analysis completed", {
      weekCount: medicalAnalysisPlan.length,
      examCount: structuredAnalysis.exams.length,
      supplementCount: structuredAnalysis.supplements.length,
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

  return `Eres un médico analista especializado en metabolismo keto y bajo en carbohidratos. Interpretas laboratorios clínicos bajo los estándares del estilo de vida keto (grasas saludables como combustible, No por miedo a las grasas). Trabajas en el contexto de un coach de salud integral (NEL Health Coach).

## PRINCIPIOS FUNDAMENTALES (KETO):
1. NO diagnosticar enfermedades — el análisis es EDUCATIVO e INFORMATIVO
2. SIEMPRE recomendar consultar con profesional médico licenciado
3. Interpretar resultados con ÓPTICA KETO: valora los marcadores según los rangos y expectativas propios de una persona adaptada a keto (ej. LDL puede estar más alto fisiológicamente, triglicéridos deben estar bajos, HDL debe estar óptimo, glucosa e insulina en ayuno deben ser bajos)
4. NO patologices valores que son esperables en keto: LDL elevado no es necesariamente malo si el resto del perfil lipídico es bueno (triglicéridos bajos, HDL alto, ratio triglicéridos/HDL bajo)
5. Considera: metabolismo lipídico, sensibilidad insulínica, inflamación, función tiroidea adaptada a baja carbohidratos, estado de cetosis nutricional
6. NO generar miedo ni minimizar hallazgos importantes — pero contextualiza siempre bajo la óptica keto

## REGLAS ESTRICTAS ANTI-ALUCINACIÓN:
- Extrae estrictamente los valores clínicos presentes en los documentos.
- IGNORA cualquier texto administrativo, descargos de responsabilidad o menciones de "visitas programadas con el proveedor" presentes en el documento.
- Limítate a analizar los valores sin suponer condiciones genéticas (como Hipercolesterolemia Familiar) a menos que el contexto explícito del paciente lo indique.
- Ofrece alternativas, no diagnósticos concluyentes.
- NO inventes valores de laboratorio que no estén en los documentos.
- Si un valor no tiene rango de referencia en el documento, usa rangos estándar clínicos pero contextualiza con los rangos óptimos keto.

## FORMATO DE RESPUESTA REQUERIDO:
Debes devolver un objeto JSON con DOS secciones principales:

### 1. "exams" — Array de exámenes/paneles médicos
Cada examen representa un panel de laboratorio distinto (ej: panel de lípidos, panel metabólico, panel tiroideo, etc.).
Cada examen debe tener:
- "intro": Texto introductorio contextual (ej. "El panel de lípidos de [nombre del paciente], recogido el [fecha]...")
- "table": Array de objetos con: biomarcador, valor, rango_normal, estado ("Alto", "Bajo", "Normal")
- "analysis": Análisis clínico derivado EXCLUSIVAMENTE de los valores de la tabla. Incluye interpretación bajo óptica keto cuando aplique.

### 2. "supplements" — Array de suplementos recomendados
Evalúa ACTIVAMENTE los biomarcadores alterados de TODAS las tablas generadas y propone suplementación específica.
- SOLO recomendar suplementos si la ALIMENTACIÓN por sí sola NO puede cubrir la necesidad
- Para cada suplemento: nombre, dosis, momento del día, razón/justificación (basada en biomarcadores específicos alterados), contraindicaciones
- Ejemplos: Omega-3 (si triglicéridos altos), Vitamina D3 (si vitamina D baja), Magnesio (si magnesio bajo o estrés), CoQ10 (si colesterol alto y estatina), Psyllium (si colesterol alto en contexto no-keto), Probióticos (si problemas digestivos), Electrolitos (sodio, potasio, magnesio — cruciales en keto)
- Si NO hay biomarcadores alterados que requieran suplementación, devuelve un array vacío []

${hasDocuments ? '\n## DATOS DISPONIBLES:\nSe proporcionarán documentos médicos procesados (resultados de laboratorio, análisis previos, etc.) para tu análisis.' : ''}

Responde SOLO con el objeto JSON al final.`;
}

function buildMedicalUserPrompt(
  state: RecommendationStateType,
  _weekNumbers: number[],
  isFirstSession: boolean
): string {
  const insights = state.clientInsights;
  const personalData = state.personalData;
  const medicalData = state.medicalData;

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
        `**Documento ${i + 1}: ${doc.title}** (Tipo: ${doc.documentType}, Confianza: ${doc.confidence}%)\n${doc.content.substring(0, 5000)}`
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

  return `${fullProfile}

## PERFIL DEL CLIENTE

**Resumen:** ${insights?.summary ?? "No disponible"}
**Nivel de experiencia:** ${insights?.experienceLevel ?? "principiante"}
**Riesgos clave:** ${insights?.keyRisks?.join(", ") ?? "No identificados"}
**Oportunidades:** ${insights?.opportunities?.join(", ") ?? "No identificadas"}
**Mejoras objetivo:** ${insights?.targetImprovements?.join(", ") ?? "Mejorar salud general"}

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
Genera un análisis médico estructurado bajo el enfoque KETO, basado en los documentos y datos del cliente.

### Estructura de respuesta (objeto JSON):
\`\`\`json
{
  "exams": [
    {
      "intro": "El panel de lípidos de [nombre del paciente], recogido el [fecha], muestra los siguientes resultados...",
      "table": [
        {
          "biomarcador": "Colesterol Total",
          "valor": "245 mg/dL",
          "rango_normal": "125-200 mg/dL",
          "estado": "Alto"
        },
        {
          "biomarcador": "LDL-C",
          "valor": "165 mg/dL",
          "rango_normal": "<100 mg/dL",
          "estado": "Alto"
        },
        {
          "biomarcador": "Triglicéridos",
          "valor": "65 mg/dL",
          "rango_normal": "<150 mg/dL",
          "estado": "Normal"
        },
        {
          "biomarcador": "HDL-C",
          "valor": "65 mg/dL",
          "rango_normal": ">40 mg/dL",
          "estado": "Normal"
        }
      ],
      "analysis": "El colesterol total y LDL se encuentran elevados, pero en contexto keto esto es fisiológicamente esperable. Los triglicéridos bajos (65 mg/dL) y HDL óptimo (65 mg/dL) indican un perfil lipídico favorable, con ratio triglicéridos/HDL de 1.0 (riesgo cardiovascular bajo). | ⚠️ Consulte con profesional médico antes de tomar decisiones basadas en este análisis."
    }
  ],
  "supplements": [
    {
      "name": "Omega-3 (EPA/DHA)",
      "dosage": "2000 mg/día",
      "timing": "Con el almuerzo",
      "rationale": "Para optimizar perfil lipídico y apoyar la salud cardiovascular en contexto keto.",
      "contraindications": "Precaución si toma anticoagulantes"
    },
    {
      "name": "Electrolitos (Sodio, Potasio, Magnesio)",
      "dosage": "Según necesidad",
      "timing": "Distribuido durante el día",
      "rationale": "Cruciales en keto para evitar la 'gripe keto' y mantener balance electrolítico.",
      "contraindications": "Hipertensión no controlada — consultar con médico"
    }
  ]
}
\`\`\`

### Reglas importantes (KETO):
1. Agrupa los biomarcadores por panel/examen (lípidos, metabólico, tiroideo, etc.) — NO mezcles todos en una sola tabla
2. Para cada examen: genera un "intro" contextual, una "table" con los biomarcadores, y un "analysis" clínico con interpretación keto
3. Para suplementos: evalúa TODOS los biomarcadores alterados de todas las tablas y propone suplementos específicos
4. **NO recomiendes suplementos que el cliente YA TOMA** a menos que la dosis necesite ajuste — revisa "Suplementos actuales"
5. NO recomiendes medicamentos — solo suplementos nutricionales
6. Incluye SIEMPRE el disclaimer de consulta médica en el analysis
7. Si NO hay documentos con resultados de laboratorio, enfócate en el análisis clínico basado en los datos del formulario
8. Si es primera sesión y no hay labs, enfócate en qué estudios sería bueno que el cliente se realice
9. **Interpreta los marcadores con óptica keto**: LDL alto no es necesariamente malo si triglicéridos son bajos y HDL alto; la glucosa en ayuno suele ser más baja en keto (70-85 mg/dL es óptimo); la hemoglobina glicosilada (HbA1c) debe estar en rango bajo-normal; los cuerpos cetónicos pueden estar elevados (esperable en cetosis nutricional)

Responde SOLO con el objeto JSON, sin texto adicional.`;
}

/**
 * Parses the LLM response into a StructuredMedicalAnalysis object.
 * Expected format: { exams: [{ intro, table: [{ biomarcador, valor, rango_normal, estado }], analysis }], supplements: [...] }
 */
function parseStructuredMedicalResponse(content: string): StructuredMedicalAnalysis {
  let jsonStr = content;

  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  try {
    const parsed: Record<string, unknown> = robustJsonParse<Record<string, unknown>>(jsonStr);

    // Validate exams array
    const examsRaw = parsed.exams as Array<Record<string, unknown>> | undefined;
    const exams: StructuredMedicalAnalysis['exams'] = Array.isArray(examsRaw)
      ? examsRaw.map((exam: Record<string, unknown>) => {
          const tableRaw = exam.table as Array<Record<string, unknown>> | undefined;
          const table: LabBiomarker[] = Array.isArray(tableRaw)
            ? tableRaw.map((row: Record<string, unknown>) => {
                const estadoRaw = typeof row.estado === 'string' ? row.estado : 'Normal';
                const estado: LabBiomarker['estado'] =
                  estadoRaw === 'Alto' || estadoRaw === 'Bajo' || estadoRaw === 'Normal'
                    ? estadoRaw : 'Normal';
                return {
                  biomarcador: typeof row.biomarcador === 'string' ? row.biomarcador : 'Marcador desconocido',
                  valor: typeof row.valor === 'string' ? row.valor : 'N/D',
                  rango_normal: typeof row.rango_normal === 'string' ? row.rango_normal : 'N/A',
                  estado,
                };
              })
            : [];

          return {
            intro: typeof exam.intro === 'string' ? exam.intro : 'Análisis de resultados de laboratorio.',
            table,
            analysis: typeof exam.analysis === 'string' ? exam.analysis : 'Sin análisis disponible.',
          };
        })
      : [];

    // Validate supplements array
    const supplementsRaw = parsed.supplements as Array<Record<string, unknown>> | undefined;
    const supplements: SupplementRecommendation[] = Array.isArray(supplementsRaw)
      ? supplementsRaw.map((sr: Record<string, unknown>) => ({
          name: typeof sr.name === 'string' ? sr.name : 'Suplemento genérico',
          dosage: typeof sr.dosage === 'string' ? sr.dosage : 'Consultar profesional',
          timing: typeof sr.timing === 'string' ? sr.timing : 'Con alimentos',
          rationale: typeof sr.rationale === 'string' ? sr.rationale : 'Basado en hallazgos clínicos',
          contraindications: typeof sr.contraindications === 'string' ? sr.contraindications : undefined,
        }))
      : [];

    return { exams, supplements };
  } catch {
    return { exams: [], supplements: [] };
  }
}

/**
 * Converts a StructuredMedicalAnalysis into the weekly MedicalAnalysisPlan[] format
 * for backward compatibility with the rest of the system.
 */
function convertStructuredToWeeklyPlan(
  structured: StructuredMedicalAnalysis,
  weekNumbers: number[],
  state: RecommendationStateType
): MedicalAnalysisPlan[] {
  // Flatten all biomarkers from all exams into labResults format
  const allLabResults: MedicalAnalysisPlan['labResults'] = [];
  for (const exam of structured.exams) {
    for (const row of exam.table) {
      const trend: MedicalAnalysisPlan['labResults'][0]['trend'] =
        row.estado === 'Normal' ? 'stable' : 'new';
      allLabResults.push({
        marker: row.biomarcador,
        currentValue: row.valor,
        interpretation: `${row.estado} — ${row.rango_normal}`,
        trend,
      });
    }
  }

  // Convert supplements to the old format with 'necessary' flag
  const supplementRecs: MedicalAnalysisPlan['supplementRecommendations'] = structured.supplements.map(s => ({
    name: s.name,
    dosage: s.dosage,
    timing: s.timing,
    rationale: s.rationale,
    contraindications: s.contraindications,
    necessary: true, // If the LLM recommended it, it's necessary
  }));

  // Clinical findings from exam analyses
  const clinicalFindings = structured.exams.map(e => e.analysis);

  // Generate one plan per week, all sharing the same structured analysis
  return weekNumbers.map(weekNumber => ({
    weekNumber,
    focus: structured.exams.length > 0
      ? `Análisis de ${structured.exams.length} panel(es) de laboratorio`
      : 'Monitoreo de salud general',
    labResults: allLabResults,
    clinicalFindings,
    recommendedStudies: [],
    supplementRecommendations: supplementRecs,
    structuredAnalysis: structured,
  }));
}

/**
 * Generates a fallback medical analysis plan if the LLM fails.
 */
function generateFallbackMedicalAnalysis(monthNumber: number): MedicalAnalysisPlan[] {
  const totalWeeks = monthNumber * 4;
  const plans: MedicalAnalysisPlan[] = [];

  const fallbackStructured: StructuredMedicalAnalysis = {
    exams: [],
    supplements: [],
  };

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
      supplementRecommendations: [],
      structuredAnalysis: fallbackStructured,
    });
  }

  return plans;
}

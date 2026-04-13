import type {
  PersonalData,
  MedicalData,
} from "@nelhealthcoach/types";

// ─────────────────────────────────────────────
// Client Analyzer Prompt
// ─────────────────────────────────────────────

interface ClientAnalysisInput {
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
  previousSessions: Array<{
    monthNumber: number;
    status: string;
    summary: string;
  }>;
  coachNotes: string;
}

export function buildClientAnalysisPrompt(input: ClientAnalysisInput): string {
  const personalInfo = formatPersonalData(input.personalData);
  const medicalInfo = formatMedicalData(input.medicalData);
  const healthAssessmentInfo = formatHealthAssessment(input.healthAssessment);
  const mentalHealthInfo = formatMentalHealth(input.mentalHealth);
  const documentsInfo = formatDocuments(input.processedDocuments);
  const historyInfo = formatPreviousSessions(input.previousSessions);
  const coachNotesInfo = input.coachNotes
    ? `\n📝 **Notas del Coach:**\n${input.coachNotes}`
    : "";

  return `Eres un experto analista de salud integral. Tu tarea es analizar el perfil completo de un cliente y generar insights accionables para el equipo de planificación.

---

## 👤 DATOS DEL CLIENTE

${personalInfo}

## 🏥 DATOS MÉDICOS

${medicalInfo}

## 📊 EVALUACIÓN DE SALUD

${healthAssessmentInfo}

## 🧠 SALUD MENTAL Y EMOCIONAL

${mentalHealthInfo}

## 📄 DOCUMENTOS MÉDICOS PROCESADOS

${documentsInfo}

## 📜 HISTORIAL DE SESIONES ANTERIORES

${historyInfo}
${coachNotesInfo}

---

## 🎯 TU TAREA

Analiza TODA la información proporcionada y genera un JSON con la siguiente estructura EXACTA:

\`\`\`json
{
  "summary": "Resumen conciso de la situación actual del cliente (2-3 frases)",
  "keyRisks": ["Lista de riesgos principales identificados (máximo 5)"],
  "opportunities": ["Lista de oportunidades de mejora (máximo 5)"],
  "experienceLevel": "principiante | intermedio | avanzado",
  "idealWeight": "Peso ideal estimado en kg con rango",
  "idealBodyFat": "Porcentaje de grasa corporal ideal estimado con rango",
  "targetImprovements": ["Lista de 3-5 mejoras objetivo priorizadas"]
}
\`\`\`

### Reglas para determinar experienceLevel:
- **principiante**: Sin experiencia previa en dieta keto o ejercicio estructurado
- **intermedio**: Alguna experiencia previa, ha completado 1-2 sesiones
- **avanzado**: Experiencia consolidada, ha completado 3+ sesiones

### Reglas para keyRisks:
- Prioriza riesgos cardiovasculares (LDL alto, ApoB alto)
- Incluye condiciones médicas relevantes
- Considera factores de salud mental que afecten adherencia

### Reglas para targetImprovements:
- Deben ser específicas, medibles y accionables
- Priorizar: composición corporal, salud metabólica, energía, estabilidad emocional

Responde SOLO con el JSON, sin texto adicional.`;
}

// ─────────────────────────────────────────────
// Nutrition Planner Prompt
// ─────────────────────────────────────────────

interface NutritionPlannerInput {
  clientInsights: {
    summary: string;
    keyRisks: string[];
    opportunities: string[];
    experienceLevel: string;
    idealWeight: string;
    idealBodyFat: string;
    targetImprovements: string[];
  };
  personalData: PersonalData;
  medicalData: MedicalData;
  weekNumbers: number[];
}

export function buildNutritionPrompt(input: NutritionPlannerInput): string {
  const weekList = input.weekNumbers.join(", ");

  return `Eres un nutricionista experto en dieta cetogénica terapéutica. Tu tarea es diseñar un plan de alimentación personalizado y progresivo.

---

## 📊 PERFIL DEL CLIENTE

**Resumen:** ${input.clientInsights.summary}
**Nivel de experiencia:** ${input.clientInsights.experienceLevel}
**Peso ideal objetivo:** ${input.clientInsights.idealWeight}
**Grasa corporal ideal:** ${input.clientInsights.idealBodyFat}
**Riesgos clave:** ${input.clientInsights.keyRisks.join(", ")}
**Mejoras objetivo:** ${input.clientInsights.targetImprovements.join(", ")}

## 👤 DATOS PERSONALES

- Nombre: ${input.personalData.name}
- Edad: ${input.personalData.age} años
- Peso actual: ${input.personalData.weight} kg
- Altura: ${input.personalData.height} cm
- Ocupación: ${input.personalData.occupation}

## 🏥 CONDICIONES MÉDICAS RELEVANTES

- Alergias: ${input.medicalData.allergies || "Ninguna reportada"}
- Condiciones: ${input.medicalData.currentPastConditions || "Ninguna reportada"}
- Medicamentos: ${input.medicalData.medications || "Ninguno reportado"}

---

## 🎯 TU TAREA

Diseña un plan de nutrición cetogénica para las semanas: ${weekList}

### Reglas de la dieta:
1. **Cero**: azúcar, alcohol, gluten, almidones, procesados, ultra-procesados
2. **Prioridad**: alimentos orgánicos, de pastoreo, alta calidad nutricional
3. **Estructura**: 3 comidas diarias
4. **Proteínas**: altas (preservar masa muscular)
5. **Grasas**: moderadas a bajas (forzar quema de grasa corporal)
6. **Carbohidratos**: <25g netos diarios
7. **Déficit calórico**: progresivo y controlado (0.5 kg/semana)

### Para cada semana genera:

\`\`\`json
{
  "weekNumber": number,
  "focus": "Enfoque nutricional de la semana (1-2 frases)",
  "macros": {
    "protein": "cantidad en gramos",
    "fat": "cantidad en gramos",
    "carbs": "cantidad en gramos (<25g)",
    "calories": number
  },
  "metabolicPurpose": "Explicación breve del propósito metabólico",
  "shoppingList": [
    { "item": "nombre", "quantity": "cantidad", "priority": "high|medium|low" }
  ]
}
\`\`\`

### Progresión esperada:
- Semanas 1-4: ~1600 kcal, adaptación cetogénica
- Semanas 5-8: ~1450 kcal, aumento proteína
- Semanas 9-12: ~1350 kcal, máxima quema de grasa

Responde SOLO con un array JSON de objetos con la estructura especificada, sin texto adicional.`;
}

// ─────────────────────────────────────────────
// Exercise Planner Prompt
// ─────────────────────────────────────────────

interface ExercisePlannerInput {
  clientInsights: {
    summary: string;
    experienceLevel: string;
    targetImprovements: string[];
  };
  personalData: PersonalData;
  medicalData: MedicalData;
  weekNumbers: number[];
}

export function buildExercisePrompt(input: ExercisePlannerInput): string {
  const weekList = input.weekNumbers.join(", ");

  return `Eres un entrenador personal certificado especializado en fuerza funcional, movilidad y longevidad. Tu tarea es diseñar un programa de ejercicio progresivo y seguro.

---

## 📊 PERFIL DEL CLIENTE

**Resumen:** ${input.clientInsights.summary}
**Nivel de experiencia:** ${input.clientInsights.experienceLevel}
**Mejoras objetivo:** ${input.clientInsights.targetImprovements.join(", ")}
**Edad:** ${input.personalData.age} años
**Peso:** ${input.personalData.weight} kg
**Altura:** ${input.personalData.height} cm

## 🏥 LIMITACIONES MÉDICAS

- Condiciones: ${input.medicalData.currentPastConditions || "Ninguna"}
- Cirugías previas: ${input.medicalData.surgeries || "Ninguna"}
- Alergias: ${input.medicalData.allergies || "Ninguna"}

---

## 🎯 TU TAREA

Diseña un plan de entrenamiento para las semanas: ${weekList}

### Estructura semanal:
- **Días de entrenamiento**: miércoles, sábado, domingo
- **Duración**: 30-45 minutos por sesión
- **Caminatas**: todos los días excepto miércoles (30-45 min)

### Para cada semana genera:

\`\`\`json
{
  "weekNumber": number,
  "focus": "Enfoque del entrenamiento (1-2 frases)",
  "routine": [
    {
      "exercise": "nombre del ejercicio",
      "sets": number,
      "repetitions": "rango o número",
      "timeUnderTension": "tempo (ej: 3-1-1)",
      "progression": "cómo progresar respecto a la semana anterior"
    }
  ],
  "equipment": ["lista de equipo necesario"],
  "duration": "duración total estimada"
}
\`\`\`

### Principios de progresión:
1. **Semanas 1-4 (Base)**: Aprender patrones de movimiento, 3 series, 12 reps
2. **Semanas 5-8 (Volumen)**: Aumentar series a 4, añadir complejidad
3. **Semanas 9-12 (Intensidad)**: Aumentar carga, reducir reps, mayor desafío

### Enfoque en:
- Fuerza funcional
- Movilidad articular
- Prevención de lesiones
- Longevidad

Responde SOLO con un array JSON de objetos con la estructura especificada, sin texto adicional.`;
}

// ─────────────────────────────────────────────
// Habit Designer Prompt
// ─────────────────────────────────────────────

interface HabitDesignerInput {
  clientInsights: {
    summary: string;
    opportunities: string[];
    keyRisks: string[];
  };
  healthAssessment: Record<string, boolean>;
  mentalHealth: Record<string, string>;
  weekNumbers: number[];
}

export function buildHabitPrompt(input: HabitDesignerInput): string {
  const weekList = input.weekNumbers.join(", ");
  const healthFlags = Object.entries(input.healthAssessment)
    .filter(([, value]) => value === true)
    .map(([key]) => `- ${key}`)
    .join("\n") || "Ninguna evaluación positiva";

  return `Eres un experto en psicología del comportamiento y formación de hábitos. Tu tarea es diseñar un sistema de mejora continua basado en pequeños cambios acumulativos.

---

## 📊 PERFIL DEL CLIENTE

**Resumen:** ${input.clientInsights.summary}
**Oportunidades de mejora:** ${input.clientInsights.opportunities.join(", ")}
**Riesgos a mitigar:** ${input.clientInsights.keyRisks.join(", ")}

## 🧠 INDICADORES DE SALUD EMOCIONAL

**Evaluaciones positivas:**
${healthFlags}

## 🎯 TU TAREA

Diseña un plan de hábitos para las semanas: ${weekList}

### Principios:
1. **Micro-hábitos**: cambios pequeños pero efectivos
2. **Acumulativos**: cada hábito construye sobre el anterior
3. **Sostenibles**: protocolos a largo plazo
4. **Prácticos**: ejemplos concretos y accionables

### Para cada semana genera:

\`\`\`json
{
  "weekNumber": number,
  "adoptHabits": [
    {
      "habit": "descripción del hábito a adoptar",
      "frequency": "frecuencia (ej: diario, 3x/semana)",
      "trigger": "disparador/contexto (ej: al despertar, después de X)"
    }
  ],
  "eliminateHabits": [
    {
      "habit": "hábito a eliminar",
      "replacement": "hábito de reemplazo"
    }
  ],
  "trackingMethod": "método para trackear el progreso",
  "motivationTip": "consejo de motivación para esta semana"
}
\`\`\`

### Ejemplos de hábitos a considerar:
- Exposición solar matutina (<30 min al despertar)
- Respiración 4-7-8 antes de dormir
- Sin teléfono 1h antes de dormir
- Escribir 1 emoción + 1 acción diaria
- Reducir notificaciones del celular
- Caminata después de comer
- Preparar comidas del día siguiente

### Progresión esperada:
- **Semanas 1-4**: Fundamentos de regulación y consciencia
- **Semanas 5-8**: Reestructuración y cambio de patrones
- **Semanas 9-12**: Sostenibilidad y conexión con el propósito

Responde SOLO con un array JSON de objetos con la estructura especificada, sin texto adicional.`;
}

// ─────────────────────────────────────────────
// Quality Validator Prompt
// ─────────────────────────────────────────────

interface QualityValidatorInput {
  clientInsights: {
    summary: string;
    keyRisks: string[];
    experienceLevel: string;
  };
  nutritionPlan: Array<Record<string, unknown>>;
  exercisePlan: Array<Record<string, unknown>>;
  habitPlan: Array<Record<string, unknown>>;
}

export function buildValidationPrompt(input: QualityValidatorInput): string {
  return `Eres un auditor de calidad en planes de salud integral. Tu tarea es revisar y validar que un plan de 12 semanas sea personalizado, seguro y efectivo.

---

## 📊 PERFIL DEL CLIENTE

**Resumen:** ${input.clientInsights.summary}
**Riesgos clave:** ${input.clientInsights.keyRisks.join(", ")}
**Nivel:** ${input.clientInsights.experienceLevel}

## 📋 PLAN GENERADO

### Plan de Nutrición:
${JSON.stringify(input.nutritionPlan, null, 2)}

### Plan de Ejercicio:
${JSON.stringify(input.exercisePlan, null, 2)}

### Plan de Hábitos:
${JSON.stringify(input.habitPlan, null, 2)}

---

## 🎯 TU TAREA

Evalúa el plan y genera un JSON de validación con la siguiente estructura:

\`\`\`json
{
  "nutrition": {
    "passed": boolean,
    "issues": ["lista de problemas encontrados"]
  },
  "exercise": {
    "passed": boolean,
    "issues": ["lista de problemas encontrados"]
  },
  "habits": {
    "passed": boolean,
    "issues": ["lista de problemas encontrados"]
  },
  "overall": {
    "passed": boolean,
    "needsRevision": boolean
  }
}
\`\`\`

### Criterios de validación:

**Nutrición:**
- ¿Macros son apropiados para el nivel del cliente?
- ¿Calorías en déficit progresivo?
- ¿Lista de compras es completa y relevante?
- ¿Se consideran las condiciones médicas?

**Ejercicio:**
- ¿Rutinas son seguras para el perfil médico?
- ¿Progresión es adecuada al nivel?
- ¿Equipo requerido es accesible?

**Hábitos:**
- ¿Hábitos son realistas y acumulativos?
- ¿Se aborda la salud emocional?
- ¿Tracking method es práctico?

**General:**
- ¿El plan es personalizado o genérico?
- ¿Se abordaron los riesgos clave del cliente?

Responde SOLO con el JSON de validación, sin texto adicional.`;
}

// ─────────────────────────────────────────────
// Helper formatting functions
// ─────────────────────────────────────────────

function formatPersonalData(data: PersonalData): string {
  return [
    `- **Nombre:** ${data.name}`,
    `- **Edad:** ${data.age} años`,
    `- **Peso:** ${data.weight} kg`,
    `- **Altura:** ${data.height} cm`,
    `- **Ocupación:** ${data.occupation}`,
    `- **Estado civil:** ${data.maritalStatus}`,
    `- **Educación:** ${data.education}`,
  ].join("\n");
}

function formatMedicalData(data: MedicalData): string {
  const sections: string[] = [];

  if (data.mainComplaint)
    sections.push(`- **Motivo de consulta:** ${data.mainComplaint}`);
  if (data.allergies) sections.push(`- **Alergias:** ${data.allergies}`);
  if (data.currentPastConditions)
    sections.push(`- **Condiciones:** ${data.currentPastConditions}`);
  if (data.medications)
    sections.push(`- **Medicamentos:** ${data.medications}`);
  if (data.supplements)
    sections.push(`- **Suplementos:** ${data.supplements}`);
  if (data.surgeries) sections.push(`- **Cirugías:** ${data.surgeries}`);

  return sections.length > 0
    ? sections.join("\n")
    : "- Sin datos médicos disponibles";
}

function formatHealthAssessment(
  assessment: Record<string, boolean>
): string {
  const entries = Object.entries(assessment);
  if (entries.length === 0)
    return "- Sin evaluaciones de salud disponibles";

  return entries
    .map(([key, value]) => `- ${key}: ${value ? "✅ Positivo" : "⚠️ Requiere atención"}`)
    .join("\n");
}

function formatMentalHealth(mentalHealth: Record<string, string>): string {
  const entries = Object.entries(mentalHealth);
  if (entries.length === 0)
    return "- Sin datos de salud mental disponibles";

  return entries
    .filter(([, value]) => value && value.length > 0)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n") || "- Sin datos de salud mental disponibles";
}

function formatDocuments(
  documents: Array<{
    title: string;
    content: string;
    documentType: string;
    confidence: number;
  }>
): string {
  if (documents.length === 0)
    return "- Sin documentos procesados";

  return documents
    .map(
      (doc, index) =>
        `**${index + 1}. ${doc.title}** (Tipo: ${doc.documentType}, Confianza: ${doc.confidence}%)\n${doc.content.substring(0, 200)}...`
    )
    .join("\n\n");
}

function formatPreviousSessions(
  sessions: Array<{
    monthNumber: number;
    status: string;
    summary: string;
  }>
): string {
  if (sessions.length === 0)
    return "- Sin sesiones anteriores (primera vez del cliente)";

  return sessions
    .map(
      (s) =>
        `- **Mes ${s.monthNumber}**: ${s.status} - ${s.summary.substring(0, 150)}...`
    )
    .join("\n");
}

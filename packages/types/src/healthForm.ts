export interface ProcessedDocument {
  id: string;
  originalDocumentId?: string; // Referencia al documento original si existe
  originalName: string; // Nombre del archivo original (encriptado)
  s3Key: string; // Key de S3 (encriptado)
  title: string; // Título/descripción (encriptado)
  content: string; // Contenido extraído (encriptado)
  processedAt: Date;
  processedBy: 'textract' | 'manual' | 'other';
  confidence: number; // 0-100
  metadata?: {
    pageCount?: number;
    language?: string;
    documentType?: string;
    extractionStatus: 'completed' | 'failed' | 'pending';
    [key: string]: unknown;
  };
}

export interface TextractAnalysis {
  extractedText?: string;        // Texto extraído (encriptado)
  extractedData?: string;        // Datos estructurados (encriptados)
  extractionDate?: string;
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  confidence?: number;
  documentType?: 'lab_results' | 'prescription' | 'medical_history' | 'other';
  error?: string;
}

export interface ChecklistItem {
  id: string;
  groupId?: string;           // ← nuevo: identifica ítems del mismo concepto
  description: string;
  completed: boolean;
  completedDate?: Date;
  notes?: string;
  weekNumber: number;
  category: 'nutrition' | 'exercise' | 'habit';
  type?: string;
  details?: {
    recipe?: {
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    };
    frequency?: string;
    duration?: string;
    equipment?: string[];
    // New fields for AI-generated plans
    macros?: {
      protein?: string;
      fat?: string;
      carbs?: string;
      ratio?: string;
    };
    calories?: number;
    metabolicPurpose?: string;
    sets?: number;
    repetitions?: string;
    timeUnderTension?: string;
    progression?: string;
  };
  recipeId?: string;
  frequency?: number;
  updatedAt?: Date;
  isRecurring?: boolean;      // ← nuevo: indica si se repite en semanas siguientes
}

export interface UploadedFile {
  url: string;
  key: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;

  // ✅ Nuevos campos para Textract
  extractedText?: string;        // Texto extraído (encriptado)
  extractionDate?: string;       // Fecha de extracción
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: {              // Datos estructurados (encriptados)
    rawText?: string;
    tables?: unknown[];
    forms?: Record<string, string>;
  };

  textractAnalysis?: TextractAnalysis;
}

export interface PersonalData {
  name: string;
  address: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  age: string;
  weight: string;
  height: string;
  maritalStatus: string;
  education: string;
  occupation: string;
  profilePhoto?: UploadedFile; // ✅ Añadido para foto de perfil
}

export interface MedicalData {
  mainComplaint: string;
  medications: string;
  supplements: string;
  currentPastConditions: string;
  additionalMedicalHistory: string;
  employmentHistory: string;
  hobbies: string;
  allergies: string;
  surgeries: string;
  housingHistory: string;
  
  // Estilo de vida
  typicalWeekday?: string;
  typicalWeekend?: string;
  currentActivityLevel?: string;
  whoCooks?: string;
  physicalLimitations?: string;
  dislikedFoodsActivities?: string;
  // Nuevos campos para acceso a equipos de ejercicio
  gymAccess?: string;
  gymAccessDetails?: string;
  preferredExerciseTypes?: string;
  exerciseTimeAvailability?: string;
  
  // ✅ Evaluaciones como strings (encriptados en BD)
  carbohydrateAddiction: string;
  leptinResistance: string;
  circadianRhythms: string;
  sleepHygiene: string;
  electrosmogExposure: string;
  generalToxicity: string;
  microbiotaHealth: string;
  
  // Salud mental
  mentalHealthEmotionIdentification: string;
  mentalHealthEmotionIntensity: string;
  mentalHealthUncomfortableEmotion: string;
  mentalHealthInternalDialogue: string;
  mentalHealthStressStrategies: string;
  mentalHealthSayingNo: string;
  mentalHealthRelationships: string;
  mentalHealthExpressThoughts: string;
  mentalHealthEmotionalDependence: string;
  mentalHealthPurpose: string;
  mentalHealthFailureReaction: string;
  mentalHealthSelfConnection: string;
  mentalHealthSelfRelationship: string;
  mentalHealthLimitingBeliefs: string;
  mentalHealthIdealBalance: string;
  
  // ✅ Documentos como array de objetos encriptados
  documents?: UploadedFile[];
  processedDocuments?: ProcessedDocument[]; // Documentos procesados
  lastDocumentProcessed?: Date;
}

export interface HealthFormData {
  personalData: PersonalData;
  medicalData: MedicalData;
  contractAccepted: boolean;
}

export interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  profilePhoto?: UploadedFile; // ✅ Añadido para lista de clientes
}

export interface ClientDetails extends HealthFormData {
  _id: string;
  ipAddress: string;
  submissionDate: string;
  updatedAt?: string;
  
  // ✅ Nuevo campo para IA
  aiProgress?: ClientAIProgress;

  // ✅ Campos para Textract
  textractAnalysis?: TextractAnalysis;
}

export interface AIRecommendationWeek {
  weekNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  nutrition: {
    focus: string;
    shoppingList: Array<{item: string; quantity: string; priority: 'high' | 'medium' | 'low'}>;
  };
  exercise: {
    focus: string;
    equipment?: string[];
  };
  habits: {
    trackingMethod?: string;
    motivationTip?: string;
  };
}


export interface AIRecommendationSession {
  sessionId: string;
  monthNumber: number;
  totalWeeks?: number; // Número total de semanas en el plan (4 para 1 mes, 12 para 3 meses)
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'approved' | 'sent' | 'completed';
  summary: string; // encriptado - Análisis de situación actual y resumen
  vision: string; // encriptado - Visión a largo plazo (12 semanas)
  baselineMetrics: {
    currentLifestyle: string[];
    targetLifestyle: string[];
  };
  weeks: AIRecommendationWeek[];
  checklist: ChecklistItem[];
  
  // Nuevos campos para regeneración
  regenerationCount?: number;
  regenerationHistory?: Array<{
    timestamp: Date;
    previousSessionId: string;
    coachNotes?: string;
    triggeredBy: 'coach' | 'system';
  }>;
  coachNotes?: string;
  lastCoachNotes?: string;
  regeneratedAt?: Date;
  approvedAt?: Date;
  sentAt?: Date;
  completedAt?: Date;
  emailSent?: boolean;
  emailError?: string;
}

export interface ClientAIProgress {
  clientId: string;
  currentSessionId?: string;
  sessions: AIRecommendationSession[];
  overallProgress: number; // 0-100%
  lastEvaluation?: Date;
  nextEvaluation?: Date;
  
  // Estadísticas
  metrics: {
    nutritionAdherence: number;
    exerciseConsistency: number;
    habitFormation: number;
    weightProgress?: number;
    energyLevel?: number;
    sleepQuality?: number;
  };
}

// ─────────────────────────────────────────────
// Tipos para videollamadas y sesiones de coach
// ─────────────────────────────────────────────

export type VideoSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface VideoSession {
  /** ID único de la sesión de video */
  sessionId: string;
  /** Número de sesión (1, 2, 3...) */
  sessionNumber: number;
  /** Nombre de la sala en LiveKit */
  roomName: string;
  /** Fecha y hora programada para la sesión */
  scheduledAt: Date;
  /** Duración estimada en minutos */
  durationMinutes: number;
  /** Estado actual de la sesión */
  status: VideoSessionStatus;
  /** Enlace para que el cliente se una (token temporal incluido) */
  clientJoinLink?: string;
  /** Fecha real en que comenzó la sesión */
  startedAt?: Date;
  /** Fecha real en que terminó la sesión */
  endedAt?: Date;
  /** S3 key del archivo de grabación (audio/video) */
  recordingS3Key?: string;
  /** Notas del coach sobre la sesión */
  coachNotes?: string;
  /** Si se envió recordatorio al coach */
  coachRemindedAt?: Date;
  /** Si se envió recordatorio al cliente */
  clientRemindedAt?: Date;
}

export interface Transcription {
  /** ID único de la transcripción */
  transcriptionId: string;
  /** Sesión de video a la que pertenece */
  sessionId: string;
  /** Número de sesión para el nombre del archivo */
  sessionNumber: number;
  /** Contenido de texto completo de la transcripción (encriptado) */
  fullText: string;
  /** Resumen de puntos clave generado por DeepSeek (encriptado) */
  summary: string;
  /** Acuerdos y cambios en objetivos extraídos (encriptado) */
  agreements: string;
  /** Fecha de la transcripción */
  createdAt: Date;
  /** S3 key del archivo .txt de la transcripción */
  txtFileS3Key: string;
  /** Confianza de la transcripción (Deepgram) */
  confidence: number;
  /** Duración del audio transcrito en segundos */
  audioDurationSeconds: number;
  /** Resultado del Textract (si se aplicó) */
  textractResult?: string;
}

export interface ClientProgressForm {
  /** ID único del formulario de progreso */
  formId: string;
  /** Sesión a la que corresponde */
  sessionId: string;
  /** Fecha en que el cliente completó el formulario */
  submittedAt: Date;
  /** Cumplimiento de cada recomendación (itemId -> boolean) */
  compliance: Record<string, boolean>;
  /** Avances reportados por el cliente (texto, encriptado) */
  progressNotes: string;
  /** Peso actual reportado */
  currentWeight?: string;
  /** Nivel de energía (1-10) */
  energyLevel?: number;
  /** Calidad del sueño (1-10) */
  sleepQuality?: number;
  /** Observaciones adicionales */
  additionalNotes?: string;
}
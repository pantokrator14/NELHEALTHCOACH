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
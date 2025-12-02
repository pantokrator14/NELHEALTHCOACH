export interface TextractAnalysis {
  extractedText?: string;        // Texto extraído (encriptado)
  extractedData?: string;        // Datos estructurados (encriptados)
  extractionDate?: string;
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  confidence?: number;
  documentType?: 'lab_results' | 'prescription' | 'medical_history' | 'other';
  error?: string;
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
    tables?: any[];
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
  weekNumber: 1 | 2 | 3 | 4;
  nutrition: {
    focus: string;
    meals: string[];
    recipes: Array<{
      name: string;
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    }>;
    shoppingList: Array<{ item: string; quantity: string; priority: 'high' | 'medium' | 'low' }>;
  };
  exercise: {
    routine: string;
    frequency: string;
    duration: string;
    adaptations: string[];
    equipment?: string[];
  };
  habits: {
    toAdopt: string[];
    toEliminate: string[];
    trackingMethod: string;
    motivationTip?: string;
  };
}

export interface AIRecommendationSession {
  sessionId: string;
  monthNumber: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'approved' | 'sent';
  
  // Análisis inicial
  summary: string;          // Resumen general del estado
  vision: string;          // Visión a 1 año
  
  // Datos base
  baselineMetrics: {
    currentWeight?: number;
    targetWeight?: number;
    currentLifestyle: string[];
    targetLifestyle: string[];
  };
  
  // Recomendaciones
  weeks: AIRecommendationWeek[];
  
  // Seguimiento
  checklist?: Array<{
    weekNumber: number;
    category: 'nutrition' | 'exercise' | 'habit';
    item: string;
    completed: boolean;
    completedDate?: Date;
    notes?: string;
  }>;
  
  // Metadatos del coach
  coachNotes?: string;
  approvedAt?: Date;
  sentAt?: Date;
  
  // Para historial
  previousSessionId?: string;
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
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
  updatedAt?: string; // ✅ Añadido para tracking de actualizaciones
}
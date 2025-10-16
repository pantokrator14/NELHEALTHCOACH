// Tipos para datos personales
export interface PersonalData {
  name: string;
  address: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  age: number;
  weight: number;
  height: number;
  maritalStatus: string;
  education: string;
  occupation: string;
}

// Tipos para datos médicos
export interface MedicalData {
  // Campos de texto
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
  
  // Secciones SÍ/NO
  carbohydrateAddiction: (boolean | null)[];
  leptinResistance: (boolean | null)[];
  circadianRhythms: (boolean | null)[];
  sleepHygiene: (boolean | null)[];
  electrosmogExposure: (boolean | null)[];
  generalToxicity: (boolean | null)[];
  microbiotaHealth: (boolean | null)[];
  
  // Salud mental - opción múltiple
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
  
  // Salud mental - texto abierto
  mentalHealthSelfRelationship: string;
  mentalHealthLimitingBeliefs: string;
  mentalHealthIdealBalance: string;
}

// Tipo completo del formulario
export interface HealthFormData {
  personalData: PersonalData;
  medicalData: MedicalData;
  contractAccepted: boolean;
}

// Tipo para el estado del formulario en React
export interface FormState {
  step: number;
  formData: Partial<HealthFormData>;
  error: string | null;
  loading: boolean;
}

// Tipo para las preguntas SÍ/NO
export interface YesNoQuestionSection {
  section: keyof MedicalData;
  title: string;
  questions: string[];
}

// Tipo para las preguntas de opción múltiple
export interface MultipleChoiceQuestion {
  field: keyof MedicalData;
  question: string;
  options: {
    value: string;
    label: string;
  }[];
}

// Tipo para las preguntas abiertas
export interface OpenEndedQuestion {
  field: keyof MedicalData;
  question: string;
  placeholder: string;
}
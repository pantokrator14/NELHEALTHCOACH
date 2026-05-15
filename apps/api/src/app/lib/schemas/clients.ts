// apps/api/src/app/lib/schemas/clients.ts
// Zod schemas para validación de datos de clientes (formulario de salud)
// Nota: age/weight/height aceptan string o number porque el frontend
// envía inputs type="number" que se serializan como números en JSON.
// Las evaluaciones médicas (carbohydrateAddiction, etc.) se envían como
// arrays porque el frontend usa checkboxes; el route handler las stringifica.

import { z } from 'zod';

// ─── Medical Data ───

const evaluationArrayField = () =>
  z.union([z.array(z.string()), z.string()]).default([]);

const medicalDataSchema = z.object({
  mainComplaint: z.string().max(5000).default(''),
  medications: z.string().max(5000).default(''),
  supplements: z.string().max(5000).default(''),
  currentPastConditions: z.string().max(10000).default(''),
  additionalMedicalHistory: z.string().max(10000).default(''),
  employmentHistory: z.string().max(5000).default(''),
  hobbies: z.string().max(5000).default(''),
  allergies: z.string().max(5000).default(''),
  surgeries: z.string().max(5000).default(''),
  housingHistory: z.string().max(5000).default(''),
  // Evaluaciones médicas: el frontend envía arrays (checkboxes),
  // el route handler los stringifica
  carbohydrateAddiction: evaluationArrayField(),
  leptinResistance: evaluationArrayField(),
  circadianRhythms: evaluationArrayField(),
  sleepHygiene: evaluationArrayField(),
  electrosmogExposure: evaluationArrayField(),
  generalToxicity: evaluationArrayField(),
  microbiotaHealth: evaluationArrayField(),
  mentalHealthEmotionIdentification: z.string().max(5000).default(''),
  mentalHealthEmotionIntensity: z.string().max(5000).default(''),
  mentalHealthUncomfortableEmotion: z.string().max(5000).default(''),
  mentalHealthInternalDialogue: z.string().max(5000).default(''),
  mentalHealthStressStrategies: z.string().max(5000).default(''),
  mentalHealthSayingNo: z.string().max(5000).default(''),
  mentalHealthRelationships: z.string().max(5000).default(''),
  mentalHealthExpressThoughts: z.string().max(5000).default(''),
  mentalHealthEmotionalDependence: z.string().max(5000).default(''),
  mentalHealthPurpose: z.string().max(5000).default(''),
  mentalHealthFailureReaction: z.string().max(5000).default(''),
  mentalHealthSelfConnection: z.string().max(5000).default(''),
  mentalHealthSelfRelationship: z.string().max(5000).default(''),
  mentalHealthLimitingBeliefs: z.string().max(5000).default(''),
  mentalHealthIdealBalance: z.string().max(5000).default(''),
  typicalWeekday: z.string().max(5000).optional().default(''),
  typicalWeekend: z.string().max(5000).optional().default(''),
  whoCooks: z.string().max(500).optional().default(''),
  currentActivityLevel: z.string().max(500).optional().default(''),
  physicalLimitations: z.string().max(2000).optional().default(''),
  gymAccess: z.string().max(500).optional().default(''),
  gymAccessDetails: z.string().max(1000).optional().default(''),
  preferredExerciseTypes: z.string().max(2000).optional().default(''),
  exerciseTimeAvailability: z.string().max(500).optional().default(''),
  documents: z.array(z.unknown()).optional().default([]),
});

export type MedicalDataInput = z.infer<typeof medicalDataSchema>;

// ─── Personal Data ───
// age/weight/height: el frontend usa <input type="number">,
// que JSON serializa como número. Aceptamos ambos tipos.

const numericOrStringField = () =>
  z.union([z.string(), z.number()]).default('');

const personalDataSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  address: z.string().max(500).default(''),
  phone: z.string().max(50).default(''),
  email: z.string().email('Email inválido').max(200),
  birthDate: z.string().max(50).default(''),
  gender: z.string().max(50).default(''),
  age: numericOrStringField(),
  weight: numericOrStringField(),
  height: numericOrStringField(),
  maritalStatus: z.string().max(50).default(''),
  education: z.string().max(200).default(''),
  occupation: z.string().max(200).default(''),
  profilePhoto: z.unknown().optional(),
});

export type PersonalDataInput = z.infer<typeof personalDataSchema>;

// ─── Full Client Form ───

export const clientFormSchema = z.object({
  personalData: personalDataSchema,
  medicalData: medicalDataSchema,
  contractAccepted: z.boolean().default(false),
  coachId: z.string().optional(),
});

export type ClientFormInput = z.infer<typeof clientFormSchema>;

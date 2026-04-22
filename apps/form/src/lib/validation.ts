// apps/form/src/lib/validation.ts
import * as yup from 'yup';

type FileInput = File | string;

const fileSchema = yup.mixed<FileInput>()
  .test('fileSize', 'El archivo es demasiado grande (máximo 5MB)', (value) => {
    if (!value || typeof value === 'string') return true;
    if (value instanceof File) return value.size <= 5 * 1024 * 1024;
    return true;
  });

const imageFileSchema = fileSchema
  .test('fileType', 'Formato de imagen no válido', (value) => {
    if (!value || typeof value === 'string') return true;
    if (value instanceof File) {
      return ['image/jpeg', 'image/png', 'image/webp'].includes(value.type);
    }
    return true;
  })
  .required('La foto de rostro es requerida');

const documentFileSchema = fileSchema
  .test('fileType', 'Formato de documento no válido', (value) => {
    if (!value || typeof value === 'string') return true;
    if (value instanceof File) {
      return [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ].includes(value.type);
    }
    return true;
  });

export const personalDataSchema = yup.object({
  name: yup.string().required('El nombre es requerido'),
  email: yup.string().email('Email inválido').required('El email es requerido'),
  phone: yup.string().required('El teléfono es requerido'),
  address: yup.string().required('La dirección es requerida'),
  birthDate: yup.string().required('La fecha de nacimiento es requerida'),
  gender: yup.string().required('El género es requerido'),
  age: yup.number().positive('La edad debe ser positiva').integer('La edad debe ser un número entero').required('La edad es requerida'),
  weight: yup.number().positive('El peso debe ser positivo').required('El peso es requerido'),
  height: yup.number().positive('La altura debe ser positiva').required('La altura es requerida'),
  maritalStatus: yup.string().required('El estado civil es requerido'),
  education: yup.string().required('La educación es requerida'),
  occupation: yup.string().required('La ocupación es requerida'),
  profilePhoto: imageFileSchema,
  // Nuevos campos
  bodyFatPercentage: yup.string().optional(),
  weightVariation: yup.string().oneOf(['estable', 'bajo', 'subido'], 'Selecciona una opción').optional(),
  dislikedFoodsActivities: yup.string().optional(),
});

export const medicalDataSchema = yup.object({
  mainComplaint: yup.string().required('La queja principal es requerida'),
  mainComplaintIntensity: yup.number().min(1).max(10).optional(),
  mainComplaintImpact: yup.string().optional(),
  medications: yup.string(),
  supplements: yup.string(),
  currentPastConditions: yup.string(),
  additionalMedicalHistory: yup.string(),
  employmentHistory: yup.string(), // Ahora más específica
  hobbies: yup.string(),
  allergies: yup.string(),
  surgeries: yup.string(),
  housingHistory: yup.string(),
  appetiteChanges: yup.string().oneOf(['mucho-hambre', 'mucha-sed', 'no']).optional(), // Nueva

  // Evaluaciones - ahora serán arrays de strings (frecuencias)
  carbohydrateAddiction: yup.array().of(yup.string()).optional(),
  leptinResistance: yup.array().of(yup.string()).optional(),
  circadianRhythms: yup.array().of(yup.string()).optional(),
  sleepHygiene: yup.array().of(yup.string()).optional(),
  electrosmogExposure: yup.array().of(yup.string()).optional(),
  generalToxicity: yup.array().of(yup.string()).optional(),
  microbiotaHealth: yup.array().of(yup.string()).optional(),

  // Salud mental - opción múltiple (letras)
  mentalHealthEmotionIdentification: yup.string(),
  mentalHealthEmotionIntensity: yup.string(),
  mentalHealthUncomfortableEmotion: yup.string(),
  mentalHealthInternalDialogue: yup.string(),
  mentalHealthStressStrategies: yup.string(),
  mentalHealthSayingNo: yup.string(),
  mentalHealthRelationships: yup.string(),
  mentalHealthExpressThoughts: yup.string(),
  mentalHealthEmotionalDependence: yup.string(),
  mentalHealthPurpose: yup.string(),
  mentalHealthFailureReaction: yup.string(),
  mentalHealthSelfConnection: yup.string(),
  // Nuevas preguntas de salud mental
  mentalHealthSupportNetwork: yup.string().oneOf(['si-tengo', 'algunas', 'no']).optional(),
  mentalHealthDailyStress: yup.string().oneOf(['bajo', 'moderado', 'alto', 'muy-alto']).optional(),

  // Salud mental - texto abierto
  mentalHealthSelfRelationship: yup.string(),
  mentalHealthLimitingBeliefs: yup.string(),
  mentalHealthIdealBalance: yup.string(),

  // NUEVOS CAMPOS - PASO 0 (Objetivos)
  motivation: yup.array().of(yup.string()).optional(),
  commitmentLevel: yup.number().min(1).max(10).optional(),
  previousCoachExperience: yup.boolean().optional(),
  previousCoachExperienceDetails: yup.string().optional(),
  targetDate: yup.string().optional(),

  // NUEVOS CAMPOS - PASO 5 (Contexto)
  typicalWeekday: yup.string().optional(),
  typicalWeekend: yup.string().optional(),
  whoCooks: yup.string().optional(),
  currentActivityLevel: yup.string().optional(),
  physicalLimitations: yup.string().optional(),
  // Nuevos campos para acceso a equipos de ejercicio
  gymAccess: yup.string().oneOf(['si-gimnasio', 'si-parque', 'no-acceso', 'equipos-casa', 'peso-corporal']).optional(),
  gymAccessDetails: yup.string().optional(),
  equipmentAvailable: yup.string().optional(),
  preferredExerciseTypes: yup.string().optional(),
  exerciseTimeAvailability: yup.string().optional(),

  documents: yup.array().of(documentFileSchema),
});

export const contractSchema = yup.object({
  contractAccepted: yup.boolean().oneOf([true], 'Debe aceptar los términos y condiciones'),
});

export const documentsSchema = yup.object({
  documents: yup.array().of(documentFileSchema),
});

export type PersonalDataFormValues = yup.InferType<typeof personalDataSchema>;
export type MedicalDataFormValues = yup.InferType<typeof medicalDataSchema>;
export type ContractFormValues = yup.InferType<typeof contractSchema>;
export type DocumentsFormValues = yup.InferType<typeof documentsSchema>;
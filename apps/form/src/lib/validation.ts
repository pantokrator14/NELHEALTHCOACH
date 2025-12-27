// apps/form/src/lib/validation.ts
import * as yup from 'yup';

// ✅ Definir tipos para archivos que pueden venir como File o como string (en preview)
type FileInput = File | string;

// ✅ Esquema para validar archivos CON TIPADO
const fileSchema = yup.mixed<FileInput>()
  .test('fileSize', 'El archivo es demasiado grande (máximo 5MB)', (value) => {
    if (!value || typeof value === 'string') return true; // Si es string (preview URL), es válido
    if (value instanceof File) {
      return value.size <= 5 * 1024 * 1024;
    }
    return true;
  });

const imageFileSchema = fileSchema
  .test('fileType', 'Formato de imagen no válido', (value) => {
    if (!value || typeof value === 'string') return true; // Si es string (preview URL), es válido
    if (value instanceof File) {
      return ['image/jpeg', 'image/png', 'image/webp'].includes(value.type);
    }
    return true;
  })
  .required('La foto de rostro es requerida');

const documentFileSchema = fileSchema
  .test('fileType', 'Formato de documento no válido', (value) => {
    if (!value || typeof value === 'string') return true; // Si es string (preview URL), es válido
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

// ✅ Esquemas principales
export const personalDataSchema = yup.object({
  name: yup.string().required('El nombre es requerido'),
  email: yup.string().email('Email inválido').required('El email es requerido'),
  phone: yup.string().required('El teléfono es requerido'),
  address: yup.string().required('La dirección es requerida'),
  birthDate: yup.string().required('La fecha de nacimiento es requerida'),
  gender: yup.string().required('El género es requerido'),
  age: yup.string().required('La edad es requerida'),
  weight: yup.string().required('El peso es requerido'),
  height: yup.string().required('La altura es requerida'),
  maritalStatus: yup.string().required('El estado civil es requerido'),
  education: yup.string().required('La educación es requerida'),
  occupation: yup.string().required('La ocupación es requerida'),
  profilePhoto: imageFileSchema,
});

export const medicalDataSchema = yup.object({
  mainComplaint: yup.string().required('La queja principal es requerida'),
  medications: yup.string(),
  supplements: yup.string(),
  currentPastConditions: yup.string(),
  additionalMedicalHistory: yup.string(),
  employmentHistory: yup.string(),
  hobbies: yup.string(),
  allergies: yup.string(),
  surgeries: yup.string(),
  housingHistory: yup.string(),
  carbohydrateAddiction: yup.mixed(),
  leptinResistance: yup.mixed(),
  circadianRhythms: yup.mixed(),
  sleepHygiene: yup.mixed(),
  electrosmogExposure: yup.mixed(),
  generalToxicity: yup.mixed(),
  microbiotaHealth: yup.mixed(),
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
  mentalHealthSelfRelationship: yup.string(),
  mentalHealthLimitingBeliefs: yup.string(),
  mentalHealthIdealBalance: yup.string(),
  documents: yup.array().of(documentFileSchema),
});

export const contractSchema = yup.object({
  contractAccepted: yup.boolean().oneOf([true], 'Debe aceptar los términos y condiciones'),
});

export const documentsSchema = yup.object({
  documents: yup.array().of(documentFileSchema),
});

// ✅ Tipos inferidos para usar en los componentes
export type PersonalDataFormValues = yup.InferType<typeof personalDataSchema>;
export type MedicalDataFormValues = yup.InferType<typeof medicalDataSchema>;
export type ContractFormValues = yup.InferType<typeof contractSchema>;
export type DocumentsFormValues = yup.InferType<typeof documentsSchema>;
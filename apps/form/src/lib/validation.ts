import * as yup from 'yup';

export const personalDataSchema = yup.object().shape({
  name: yup.string().required('El nombre es obligatorio'),
  address: yup.string().required('La dirección es obligatoria'),
  phone: yup.string().required('El teléfono es obligatorio'),
  email: yup.string().email('Email inválido').required('El email es obligatorio'),
  birthDate: yup.date().required('La fecha de nacimiento es obligatoria'),
  gender: yup.string().required('El género es obligatorio'),
  age: yup.number().required('La edad es obligatoria').positive().integer().min(1).max(120),
  weight: yup.number().required('El peso es obligatorio').positive().min(1).max(500),
  height: yup.number().required('La talla es obligatoria').positive().min(50).max(250),
  maritalStatus: yup.string().required('El estado civil es obligatorio'),
  education: yup.string().required('La educación es obligatoria'),
  occupation: yup.string().required('La ocupación es obligatoria'),
});

export const medicalDataSchema = yup.object().shape({
  mainComplaint: yup.string().required('Este campo es obligatorio'),
  medications: yup.string(),
  supplements: yup.string(),
  currentPastConditions: yup.string(),
  additionalMedicalHistory: yup.string(),
  employmentHistory: yup.string(),
  hobbies: yup.string(),
  allergies: yup.string(),
  surgeries: yup.string(),
  housingHistory: yup.string(),

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
  
  // Secciones de preguntas SÍ/NO - arrays de strings ('true'/'false')
  carbohydrateAddiction: yup.array().of(yup.string().oneOf(['true', 'false'])),
  leptinResistance: yup.array().of(yup.string().oneOf(['true', 'false'])),
  circadianRhythms: yup.array().of(yup.string().oneOf(['true', 'false'])),
  sleepHygiene: yup.array().of(yup.string().oneOf(['true', 'false'])),
  electrosmogExposure: yup.array().of(yup.string().oneOf(['true', 'false'])),
  generalToxicity: yup.array().of(yup.string().oneOf(['true', 'false'])),
  microbiotaHealth: yup.array().of(yup.string().oneOf(['true', 'false'])),
});
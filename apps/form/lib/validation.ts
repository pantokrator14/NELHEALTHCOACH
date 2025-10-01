import * as yup from 'yup';

export const personalDataSchema = yup.object().shape({
  name: yup.string().required('El nombre es obligatorio'),
  address: yup.string().required('La dirección es obligatoria'),
  phone: yup.string().required('El teléfono es obligatorio'),
  email: yup.string().email('Email inválido').required('El email es obligatorio'),
  birthDate: yup.date().required('La fecha de nacimiento es obligatoria'),
  gender: yup.string().required('El género es obligatorio'),
  age: yup.number().required('La edad es obligatoria').positive().integer(),
  weight: yup.number().required('El peso es obligatorio').positive(),
  height: yup.number().required('La talla es obligatoria').positive(),
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
  
  // Secciones de preguntas SÍ/NO
  carbohydrateAddiction: yup.array().of(yup.boolean()),
  leptinResistance: yup.array().of(yup.boolean()),
  circadianRhythms: yup.array().of(yup.boolean()),
  sleepHygiene: yup.array().of(yup.boolean()),
  electrosmogExposure: yup.array().of(yup.boolean()),
  generalToxicity: yup.array().of(yup.boolean()),
  microbiotaHealth: yup.array().of(yup.boolean()),
});
import mongoose from 'mongoose';
import { PersonalData, MedicalData } from '@/lib/types';

// Interfaz para el documento de MongoDB
export interface HealthFormDocument extends mongoose.Document {
  personalData: {
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
  };
  medicalData: {
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
    carbohydrateAddiction: string;
    leptinResistance: string;
    circadianRhythms: string;
    sleepHygiene: string;
    electrosmogExposure: string;
    generalToxicity: string;
    microbiotaHealth: string;
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
  };
  contractAccepted: string;
  ipAddress: string;
  submissionDate: Date;
}

// Definición del esquema
const HealthFormSchema = new mongoose.Schema<HealthFormDocument>({
  // Datos personales
  personalData: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    birthDate: { type: String, required: true },
    gender: { type: String, required: true },
    age: { type: String, required: true },
    weight: { type: String, required: true },
    height: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    education: { type: String, required: true },
    occupation: { type: String, required: true }
  },

  // Datos médicos - TODOS como strings
  medicalData: {
    // Campos de texto
    mainComplaint: { type: String, required: true },
    medications: { type: String, default: '' },
    supplements: { type: String, default: '' },
    currentPastConditions: { type: String, default: '' },
    additionalMedicalHistory: { type: String, default: '' },
    employmentHistory: { type: String, default: '' },
    hobbies: { type: String, default: '' },
    allergies: { type: String, default: '' },
    surgeries: { type: String, default: '' },
    housingHistory: { type: String, default: '' },

    // preguntas de salud mental - opción múltiple (a, b, c)
    mentalHealthEmotionIdentification: { type: String, default: '' },
    mentalHealthEmotionIntensity: { type: String, default: '' },
    mentalHealthUncomfortableEmotion: { type: String, default: '' },
    mentalHealthInternalDialogue: { type: String, default: '' },
    mentalHealthStressStrategies: { type: String, default: '' },
    mentalHealthSayingNo: { type: String, default: '' },
    mentalHealthRelationships: { type: String, default: '' },
    mentalHealthExpressThoughts: { type: String, default: '' },
    mentalHealthEmotionalDependence: { type: String, default: '' },
    mentalHealthPurpose: { type: String, default: '' },
    mentalHealthFailureReaction: { type: String, default: '' },
    mentalHealthSelfConnection: { type: String, default: '' },

    // preguntas de salud mental - texto abierto
    mentalHealthSelfRelationship: { type: String, default: '' },
    mentalHealthLimitingBeliefs: { type: String, default: '' },
    mentalHealthIdealBalance: { type: String, default: '' },

    // Secciones de evaluación - strings JSON
    carbohydrateAddiction: { type: String, default: '[]' },
    leptinResistance: { type: String, default: '[]' },
    circadianRhythms: { type: String, default: '[]' },
    sleepHygiene: { type: String, default: '[]' },
    electrosmogExposure: { type: String, default: '[]' },
    generalToxicity: { type: String, default: '[]' },
    microbiotaHealth: { type: String, default: '[]' }
  },

  // Metadatos
  contractAccepted: { type: String, required: true },
  ipAddress: { type: String, required: true },
  submissionDate: { type: Date, default: Date.now }
});

// Pre-save hook con tipos específicos
HealthFormSchema.pre('save', async function(next) {
  try {
    const { encrypt } = await import('../../lib/encryption');
    const doc = this as HealthFormDocument;
    
    // Encriptar personalData con tipos específicos
    if (doc.personalData) {
      const personalDataFields: Array<keyof HealthFormDocument['personalData']> = [
        'name', 'address', 'phone', 'email', 'birthDate', 'gender', 
        'age', 'weight', 'height', 'maritalStatus', 'education', 'occupation'
      ];
      
      personalDataFields.forEach(field => {
        const value = doc.personalData[field];
        if (value !== undefined && value !== null) {
          doc.personalData[field] = encrypt(String(value));
        }
      });
    }

    // Encriptar medicalData con tipos específicos
    if (doc.medicalData) {
      // Campos de texto
      const medicalTextFields: Array<keyof HealthFormDocument['medicalData']> = [
        'mainComplaint', 'medications', 'supplements', 'currentPastConditions',
        'additionalMedicalHistory', 'employmentHistory', 'hobbies', 'allergies',
        'surgeries', 'housingHistory'
      ];
      
      medicalTextFields.forEach(field => {
        const value = doc.medicalData[field];
        if (value !== undefined && value !== null) {
          doc.medicalData[field] = encrypt(String(value));
        }
      });

      // Arrays - ya convertidos a JSON strings en el API route
      const arrayFields: Array<keyof HealthFormDocument['medicalData']> = [
        'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
        'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
      ];
      
      arrayFields.forEach(field => {
        const value = doc.medicalData[field];
        if (value !== undefined && value !== null) {
          doc.medicalData[field] = encrypt(value);
        } else {
          doc.medicalData[field] = encrypt('[]');
        }
      });

      // Salud mental - opción múltiple
      const mentalHealthMultipleChoice: Array<keyof HealthFormDocument['medicalData']> = [
        'mentalHealthEmotionIdentification', 'mentalHealthEmotionIntensity',
        'mentalHealthUncomfortableEmotion', 'mentalHealthInternalDialogue',
        'mentalHealthStressStrategies', 'mentalHealthSayingNo',
        'mentalHealthRelationships', 'mentalHealthExpressThoughts',
        'mentalHealthEmotionalDependence', 'mentalHealthPurpose',
        'mentalHealthFailureReaction', 'mentalHealthSelfConnection'
      ];
      
      mentalHealthMultipleChoice.forEach(field => {
        const value = doc.medicalData[field];
        if (value !== undefined && value !== null) {
          doc.medicalData[field] = encrypt(String(value));
        } else {
          doc.medicalData[field] = encrypt('');
        }
      });

      // Salud mental - texto abierto
      const mentalHealthOpenEnded: Array<keyof HealthFormDocument['medicalData']> = [
        'mentalHealthSelfRelationship', 'mentalHealthLimitingBeliefs',
        'mentalHealthIdealBalance'
      ];
      
      mentalHealthOpenEnded.forEach(field => {
        const value = doc.medicalData[field];
        if (value !== undefined && value !== null) {
          doc.medicalData[field] = encrypt(String(value));
        } else {
          doc.medicalData[field] = encrypt('');
        }
      });
    }

    // Encriptar metadatos
    if (doc.contractAccepted !== undefined && doc.contractAccepted !== null) {
      doc.contractAccepted = encrypt(String(doc.contractAccepted));
    }
    
    if (doc.ipAddress) {
      doc.ipAddress = encrypt(String(doc.ipAddress));
    }

    next();
  } catch (error) {
    console.error('Error encriptando datos:', error);
    next(error as mongoose.CallbackError);
  }
});

export default mongoose.models.HealthForm as mongoose.Model<HealthFormDocument> || 
  mongoose.model<HealthFormDocument>('HealthForm', HealthFormSchema);
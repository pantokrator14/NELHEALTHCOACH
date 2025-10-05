import mongoose from 'mongoose';

const HealthFormSchema = new mongoose.Schema({
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

// Pre-save hook SOLO para encriptar campos de texto
HealthFormSchema.pre('save', async function(next) {
  try {
    const { encrypt } = await import('../lib/encryption');
    
    // Encriptar personalData
    if (this.personalData) {
      const personalData = this.personalData as any;
      Object.keys(personalData).forEach(key => {
        if (personalData[key] !== undefined && personalData[key] !== null) {
          personalData[key] = encrypt(String(personalData[key]));
        }
      });
    }

    // Encriptar medicalData - solo campos de texto, los arrays ya son JSON strings
    if (this.medicalData) {
      const medicalData = this.medicalData as any;
      
      // Solo encriptar campos de texto (no los arrays que ya son JSON strings)
      const textFields = [
        'mainComplaint', 'medications', 'supplements', 'currentPastConditions',
        'additionalMedicalHistory', 'employmentHistory', 'hobbies', 'allergies',
        'surgeries', 'housingHistory'
      ];
      
      textFields.forEach(field => {
        if (medicalData[field] !== undefined && medicalData[field] !== null) {
          medicalData[field] = encrypt(String(medicalData[field]));
        }
      });

      // Los arrays YA son JSON strings del API route, solo encriptarlos
      const arrayFields = [
        'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
        'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
      ];
      
      arrayFields.forEach(field => {
        if (medicalData[field] !== undefined && medicalData[field] !== null) {
          medicalData[field] = encrypt(medicalData[field]);
        } else {
          medicalData[field] = encrypt('[]');
        }
      });
    }

    // Encriptar metadatos
    if (this.contractAccepted !== undefined && this.contractAccepted !== null) {
      this.contractAccepted = encrypt(String(this.contractAccepted));
    }
    
    if (this.ipAddress) {
      this.ipAddress = encrypt(String(this.ipAddress));
    }

    next();
  } catch (error) {
    console.error('Error encriptando datos:', error);
    next(error as mongoose.CallbackError);
  }
});

export default mongoose.models.HealthForm || mongoose.model('HealthForm', HealthFormSchema);
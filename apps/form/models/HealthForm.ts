import mongoose from 'mongoose';

const HealthFormSchema = new mongoose.Schema({
  // Datos personales (encriptados)
  personalData: {
    name: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    address: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    phone: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    email: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    birthDate: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    gender: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    age: Number,
    weight: Number,
    height: Number,
    maritalStatus: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    education: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    occupation: {
      encryptedData: String,
      iv: String,
      authTag: String
    }
  },

  // Datos médicos (encriptados)
  medicalData: {
    mainComplaint: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    medications: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    supplements: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    currentPastConditions: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    additionalMedicalHistory: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    employmentHistory: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    hobbies: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    allergies: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    surgeries: {
      encryptedData: String,
      iv: String,
      authTag: String
    },
    housingHistory: {
      encryptedData: String,
      iv: String,
      authTag: String
    },

    // Secciones de evaluación
    carbohydrateAddiction: [Boolean],
    leptinResistance: [Boolean],
    circadianRhythms: [Boolean],
    sleepHygiene: [Boolean],
    electrosmogExposure: [Boolean],
    generalToxicity: [Boolean],
    microbiotaHealth: [Boolean]
  },

  // Metadatos
  contractAccepted: Boolean,
  submissionDate: {
    type: Date,
    default: Date.now
  },
  ipAddress: String
});

export default mongoose.models.HealthForm || mongoose.model('HealthForm', HealthFormSchema);
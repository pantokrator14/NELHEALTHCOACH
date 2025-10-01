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
    age: { type: Number, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    maritalStatus: { type: String, required: true },
    education: { type: String, required: true },
    occupation: { type: String, required: true }
  },

  // Datos médicos
  medicalData: {
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

    // Secciones de evaluación
    carbohydrateAddiction: [{ type: Boolean }],
    leptinResistance: [{ type: Boolean }],
    circadianRhythms: [{ type: Boolean }],
    sleepHygiene: [{ type: Boolean }],
    electrosmogExposure: [{ type: Boolean }],
    generalToxicity: [{ type: Boolean }],
    microbiotaHealth: [{ type: Boolean }]
  },

  // Metadatos
  contractAccepted: { type: Boolean, required: true },
  submissionDate: { type: Date, default: Date.now },
  ipAddress: String
});

// Pre-save hook para encriptar datos sensibles
HealthFormSchema.pre('save', async function(next) {
  if (this.isModified('personalData') || this.isNew) {
    const { encrypt } = await import('../lib/encryption');
    
    // Encriptar campos sensibles de personalData
    const personalData = this.personalData as any;
    personalData.name = encrypt(personalData.name);
    personalData.address = encrypt(personalData.address);
    personalData.phone = encrypt(personalData.phone);
    personalData.email = encrypt(personalData.email);
    personalData.birthDate = encrypt(personalData.birthDate);
    personalData.gender = encrypt(personalData.gender);
    personalData.maritalStatus = encrypt(personalData.maritalStatus);
    personalData.education = encrypt(personalData.education);
    personalData.occupation = encrypt(personalData.occupation);
  }

  if (this.isModified('medicalData') || this.isNew) {
    const { encrypt } = await import('../lib/encryption');
    
    // Encriptar campos sensibles de medicalData
    const medicalData = this.medicalData as any;
    medicalData.mainComplaint = encrypt(medicalData.mainComplaint);
    medicalData.medications = encrypt(medicalData.medications);
    medicalData.supplements = encrypt(medicalData.supplements);
    medicalData.currentPastConditions = encrypt(medicalData.currentPastConditions);
    medicalData.additionalMedicalHistory = encrypt(medicalData.additionalMedicalHistory);
    medicalData.employmentHistory = encrypt(medicalData.employmentHistory);
    medicalData.hobbies = encrypt(medicalData.hobbies);
    medicalData.allergies = encrypt(medicalData.allergies);
    medicalData.surgeries = encrypt(medicalData.surgeries);
    medicalData.housingHistory = encrypt(medicalData.housingHistory);
  }

  next();
});

export default mongoose.models.HealthForm || mongoose.model('HealthForm', HealthFormSchema);
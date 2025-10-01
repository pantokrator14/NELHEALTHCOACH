import mongoose from 'mongoose';

const HealthFormSchema = new mongoose.Schema({
  // Datos personales (encriptados)
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

  // Datos médicos (encriptados)
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
    this.personalData.name = encrypt(this.personalData.name);
    this.personalData.address = encrypt(this.personalData.address);
    this.personalData.phone = encrypt(this.personalData.phone);
    this.personalData.email = encrypt(this.personalData.email);
    this.personalData.birthDate = encrypt(this.personalData.birthDate);
    this.personalData.gender = encrypt(this.personalData.gender);
    this.personalData.maritalStatus = encrypt(this.personalData.maritalStatus);
    this.personalData.education = encrypt(this.personalData.education);
    this.personalData.occupation = encrypt(this.personalData.occupation);
  }

  if (this.isModified('medicalData') || this.isNew) {
    const { encrypt } = await import('../lib/encryption');
    
    // Encriptar campos sensibles de medicalData
    this.medicalData.mainComplaint = encrypt(this.medicalData.mainComplaint);
    this.medicalData.medications = encrypt(this.medicalData.medications);
    this.medicalData.supplements = encrypt(this.medicalData.supplements);
    this.medicalData.currentPastConditions = encrypt(this.medicalData.currentPastConditions);
    this.medicalData.additionalMedicalHistory = encrypt(this.medicalData.additionalMedicalHistory);
    this.medicalData.employmentHistory = encrypt(this.medicalData.employmentHistory);
    this.medicalData.hobbies = encrypt(this.medicalData.hobbies);
    this.medicalData.allergies = encrypt(this.medicalData.allergies);
    this.medicalData.surgeries = encrypt(this.medicalData.surgeries);
    this.medicalData.housingHistory = encrypt(this.medicalData.housingHistory);
  }

  next();
});

export default mongoose.models.HealthForm || mongoose.model('HealthForm', HealthFormSchema);
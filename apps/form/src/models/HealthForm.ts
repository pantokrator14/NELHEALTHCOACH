import mongoose from 'mongoose';

const HealthFormSchema = new mongoose.Schema({
  // Todos los datos personales encriptados
  personalData: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    birthDate: { type: String, required: true },
    gender: { type: String, required: true },
    age: { type: String, required: true }, // Cambiado a String para encriptar
    weight: { type: String, required: true }, // Cambiado a String para encriptar
    height: { type: String, required: true }, // Cambiado a String para encriptar
    maritalStatus: { type: String, required: true },
    education: { type: String, required: true },
    occupation: { type: String, required: true }
  },

  // Todos los datos médicos encriptados
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

    // Secciones de evaluación - ahora encriptadas como JSON strings
    carbohydrateAddiction: { type: String, default: '[]' },
    leptinResistance: { type: String, default: '[]' },
    circadianRhythms: { type: String, default: '[]' },
    sleepHygiene: { type: String, default: '[]' },
    electrosmogExposure: { type: String, default: '[]' },
    generalToxicity: { type: String, default: '[]' },
    microbiotaHealth: { type: String, default: '[]' }
  },

  // Metadatos también encriptados
  contractAccepted: { type: String, required: true }, // Cambiado a String
  ipAddress: { type: String, required: true },
  submissionDate: { type: Date, default: Date.now }
});

// Pre-save hook para encriptar TODOS los datos sensibles
HealthFormSchema.pre('save', async function(next) {
  try {
    const { encrypt } = await import('../lib/encryption');
    
    // Encriptar todos los campos de personalData
    if (this.personalData) {
      const personalData = this.personalData as any;
      const personalFields = [
        'name', 'address', 'phone', 'email', 'birthDate', 'gender', 
        'age', 'weight', 'height', 'maritalStatus', 'education', 'occupation'
      ];
      
      personalFields.forEach(field => {
        if (personalData[field] !== undefined && personalData[field] !== null) {
          // Convertir números a string antes de encriptar
          const value = typeof personalData[field] === 'number' 
            ? personalData[field].toString() 
            : personalData[field];
          personalData[field] = encrypt(value);
        }
      });
    }

    // Encriptar todos los campos de medicalData
    if (this.medicalData) {
      const medicalData = this.medicalData as any;
      const medicalTextFields = [
        'mainComplaint', 'medications', 'supplements', 'currentPastConditions',
        'additionalMedicalHistory', 'employmentHistory', 'hobbies', 'allergies',
        'surgeries', 'housingHistory'
      ];
      
      // Encriptar campos de texto
      medicalTextFields.forEach(field => {
        if (medicalData[field] !== undefined && medicalData[field] !== null) {
          medicalData[field] = encrypt(medicalData[field]);
        }
      });

      // Encriptar arrays de booleanos (convertir a JSON string y luego encriptar)
      const booleanArrays = [
        'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
        'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
      ];
      
      booleanArrays.forEach(field => {
        if (medicalData[field] && Array.isArray(medicalData[field])) {
          const jsonString = JSON.stringify(medicalData[field]);
          medicalData[field] = encrypt(jsonString);
        }
      });
    }

    // Encriptar metadatos
    if (this.contractAccepted !== undefined && this.contractAccepted !== null) {
      this.contractAccepted = encrypt(this.contractAccepted.toString());
    }
    
    if (this.ipAddress) {
      this.ipAddress = encrypt(this.ipAddress);
    }

    next();
  } catch (error) {
    console.error('Error encriptando datos:', error);
    next(error as mongoose.CallbackError);
  }
});

// Método estático para desencriptar un formulario completo
HealthFormSchema.statics.decryptForm = async function(formId: string) {
  const { decrypt } = await import('../lib/encryption');
  const form = await this.findById(formId);
  
  if (!form) return null;

  const decryptedForm = form.toObject();
  
  // Desencriptar personalData
  if (decryptedForm.personalData) {
    const personalFields = [
      'name', 'address', 'phone', 'email', 'birthDate', 'gender', 
      'age', 'weight', 'height', 'maritalStatus', 'education', 'occupation'
    ];
    
    personalFields.forEach(field => {
      if (decryptedForm.personalData[field]) {
        decryptedForm.personalData[field] = decrypt(decryptedForm.personalData[field]);
        
        // Convertir de vuelta a número si es necesario
        if (['age', 'weight', 'height'].includes(field)) {
          decryptedForm.personalData[field] = parseFloat(decryptedForm.personalData[field]);
        }
      }
    });
  }

  // Desencriptar medicalData
  if (decryptedForm.medicalData) {
    const medicalTextFields = [
      'mainComplaint', 'medications', 'supplements', 'currentPastConditions',
      'additionalMedicalHistory', 'employmentHistory', 'hobbies', 'allergies',
      'surgeries', 'housingHistory'
    ];
    
    medicalTextFields.forEach(field => {
      if (decryptedForm.medicalData[field]) {
        decryptedForm.medicalData[field] = decrypt(decryptedForm.medicalData[field]);
      }
    });

    // Desencriptar arrays de booleanos
    const booleanArrays = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];
    
    booleanArrays.forEach(field => {
      if (decryptedForm.medicalData[field]) {
        const decryptedJson = decrypt(decryptedForm.medicalData[field]);
        decryptedForm.medicalData[field] = JSON.parse(decryptedJson);
      }
    });
  }

  // Desencriptar metadatos
  if (decryptedForm.contractAccepted) {
    decryptedForm.contractAccepted = decrypt(decryptedForm.contractAccepted) === 'true';
  }
  
  if (decryptedForm.ipAddress) {
    decryptedForm.ipAddress = decrypt(decryptedForm.ipAddress);
  }

  return decryptedForm;
};

export default mongoose.models.HealthForm || mongoose.model('HealthForm', HealthFormSchema);
export interface PersonalData {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  gender: string
  address: string
  city: string
  country: string
  emergencyContact: string
  emergencyPhone: string
  occupation: string
}

export interface MedicalData {
  sections: {
    [key: string]: boolean[]
  }
  mentalHealth: string[]
  personalReflections: string[]
}

export interface HealthForm {
  _id: string
  personalData: string
  medicalData: string
  contractAccepted: boolean
  ipAddress: string
  submissionDate: string
}

export interface DecryptedHealthForm extends Omit<HealthForm, 'personalData' | 'medicalData'> {
  personalData: PersonalData
  medicalData: MedicalData
}
// apps/form/src/pages/index.tsx
import React, { useState } from 'react';
import ContractStep from '@/components/ContractStep';
import PersonalDataStep from '@/components/PersonalDataStep';
import BasicMedicalStep from '@/components/BasicMedicalStep'; // NUEVO
import HealthEvaluationsStep from '@/components/HealthEvaluationsStep'; // NUEVO
import MentalHealthStep from '@/components/MentalHealthStep'; // NUEVO
import DocumentsStep from '@/components/DocumentsStep';
import SuccessStep from '@/components/SuccessStep';
import { apiClient } from '@/lib/api';

// Definición de tipos (si no existen en otro archivo)
interface PersonalData {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: string;
  age: string;
  weight: string;
  height: string;
  maritalStatus: string;
  education: string;
  occupation: string;
  profilePhoto?: File;
}

interface MedicalData {
  // Campos de BasicMedicalStep
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
  
  // Campos de HealthEvaluationsStep
  carbohydrateAddiction: any;
  leptinResistance: any;
  circadianRhythms: any;
  sleepHygiene: any;
  electrosmogExposure: any;
  generalToxicity: any;
  microbiotaHealth: any;
  
  // Campos de MentalHealthStep
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
  
  documents?: File[];
}

interface HealthFormData {
  contractAccepted: boolean;
  personalData: PersonalData;
  medicalData: MedicalData;
}

const FormPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<HealthFormData>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const updateFormData = (newData: any) => {
    setFormData({ ...formData, ...newData });
  };

  const handleContractAccept = () => {
    updateFormData({ contractAccepted: true });
    nextStep();
  };

  const handleContractReject = () => {
    window.location.href = '/thank-you?status=rejected';
  };

  const handlePersonalDataSubmit = (data: PersonalData) => {
    updateFormData({ personalData: data });
    nextStep();
  };

  // NUEVO: Manejar envío de datos médicos básicos
  const handleBasicMedicalSubmit = (data: any) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        ...data
      }
    });
    nextStep();
  };

  // NUEVO: Manejar envío de evaluaciones de salud
  const handleHealthEvaluationsSubmit = (data: any) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        ...data
      }
    });
    nextStep();
  };

  // NUEVO: Manejar envío de bienestar emocional
  const handleMentalHealthSubmit = (data: any) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        ...data
      }
    });
    nextStep();
  };

  // Manejar envío de documentos (ahora es el paso 6)
  const handleDocumentsSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    
    // Combinar todos los datos del formulario
    const completeData: HealthFormData = { 
      ...formData as HealthFormData, 
      medicalData: {
        ...(formData.medicalData || {}),
        documents: data.documents
      }
    };
    
    console.log('📋 Enviando formulario completo...', {
      personalData: completeData.personalData,
      medicalDataFields: Object.keys(completeData.medicalData).filter(key => key !== 'documents'),
      documentCount: completeData.medicalData.documents?.length || 0,
      hasProfilePhoto: !!completeData.personalData.profilePhoto
    });

    try {
      const result = await apiClient.submitForm(completeData);

      if (result.success) {
        nextStep();
        console.log('✅ Formulario enviado exitosamente!');
      } else {
        setError(result.message || 'Error al enviar el formulario');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      setError('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // NUEVO FLUJO: 7 pasos
  const steps = [
    <ContractStep key="contract" onAccept={handleContractAccept} onReject={handleContractReject} />,
    <PersonalDataStep 
      key="personal"
      data={formData.personalData || {}} 
      onSubmit={handlePersonalDataSubmit} 
      onBack={prevStep} 
    />,
    <BasicMedicalStep 
      key="basic-medical"
      data={formData.medicalData || {}} 
      onSubmit={handleBasicMedicalSubmit} 
      onBack={prevStep} 
    />,
    <HealthEvaluationsStep 
      key="health-evaluations"
      data={formData.medicalData || {}} 
      onSubmit={handleHealthEvaluationsSubmit} 
      onBack={prevStep} 
    />,
    <MentalHealthStep 
      key="mental-health"
      data={formData.medicalData || {}} 
      onSubmit={handleMentalHealthSubmit} 
      onBack={prevStep} 
    />,
    <DocumentsStep 
      key="documents"
      data={formData.medicalData?.documents || []} 
      onSubmit={handleDocumentsSubmit} 
      onBack={prevStep} 
      loading={loading}
    />,
    <SuccessStep key="success" />,
  ];

  return (
    <div>
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
            <div className="flex items-center">
              <span className="text-lg mr-2">⚠️</span>
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      {steps[step]}
    </div>
  );
};

export default FormPage;
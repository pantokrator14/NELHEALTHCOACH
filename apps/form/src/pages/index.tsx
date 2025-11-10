import React, { useState } from 'react';
import ContractStep from '@/components/ContractStep';
import PersonalDataStep from '@/components/PersonalDataStep';
import MedicalDataStep from '@/components/MedicalDataStep';
import DocumentsStep from '@/components/DocumentsStep'; // NUEVO
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
  carbohydrateAddiction: any;
  leptinResistance: any;
  circadianRhythms: any;
  sleepHygiene: any;
  electrosmogExposure: any;
  generalToxicity: any;
  microbiotaHealth: any;
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

  const handleMedicalDataSubmit = (data: MedicalData) => {
    updateFormData({ medicalData: data });
    nextStep(); // Ahora va al paso de documentos, no al éxito
  };

  // NUEVA FUNCIÓN: Manejar envío de documentos
  const handleDocumentsSubmit = async (data: any) => {
    console.log('📨 handleDocumentsSubmit llamado', data);
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
    
    console.log('📋 Datos completos a enviar:', {
      tieneDatosPersonales: !!completeData.personalData,
      tieneDatosMedicos: !!completeData.medicalData,
      numeroDeDocumentos: completeData.medicalData.documents?.length || 0,
      tieneFotoPerfil: !!completeData.personalData?.profilePhoto
    });

    try {
      console.log('🔄 Llamando a apiClient.submitForm...');
      const result = await apiClient.submitForm(completeData);

      if (result.success) {
        console.log('✅ Formulario enviado exitosamente!', result);
        nextStep();
      } else {
        console.error('❌ Error en la respuesta del servidor:', result);
        setError(result.message || 'Error al enviar el formulario');
      }
    } catch (error: any) {
      console.error('❌ Error capturado en handleDocumentsSubmit:', error);
      setError('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    <ContractStep key="contract" onAccept={handleContractAccept} onReject={handleContractReject} />,
    <PersonalDataStep 
      key="personal"
      data={formData.personalData || {}} 
      onSubmit={handlePersonalDataSubmit} 
      onBack={prevStep} 
    />,
    <MedicalDataStep 
      key="medical"
      data={formData.medicalData || {}} 
      onSubmit={handleMedicalDataSubmit} 
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
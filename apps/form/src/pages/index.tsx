// apps/form/src/pages/index.tsx
import React, { useState } from 'react';
import ContractStep from '@/components/ContractStep';
import PersonalDataStep from '@/components/PersonalDataStep';
import BasicMedicalStep from '@/components/BasicMedicalStep';
import HealthEvaluationsStep from '@/components/HealthEvaluationsStep';
import MentalHealthStep from '@/components/MentalHealthStep';
import DocumentsStep from '@/components/DocumentsStep';
import SuccessStep from '@/components/SuccessStep';
import { apiClient, FormPayload } from '@/lib/api'; // Importar FormPayload desde api

// Definición de tipos actualizados para aceptar valores parciales durante el flujo
interface PersonalData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  age?: string;
  weight?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  profilePhoto?: File | string;
}

interface MedicalData {
  // Campos de BasicMedicalStep
  mainComplaint?: string;
  medications?: string;
  supplements?: string;
  currentPastConditions?: string;
  additionalMedicalHistory?: string;
  employmentHistory?: string;
  hobbies?: string;
  allergies?: string;
  surgeries?: string;
  housingHistory?: string;
  
  // Campos de HealthEvaluationsStep
  carbohydrateAddiction?: unknown;
  leptinResistance?: unknown;
  circadianRhythms?: unknown;
  sleepHygiene?: unknown;
  electrosmogExposure?: unknown;
  generalToxicity?: unknown;
  microbiotaHealth?: unknown;
  
  // Campos de MentalHealthStep
  mentalHealthEmotionIdentification?: string;
  mentalHealthEmotionIntensity?: string;
  mentalHealthUncomfortableEmotion?: string;
  mentalHealthInternalDialogue?: string;
  mentalHealthStressStrategies?: string;
  mentalHealthSayingNo?: string;
  mentalHealthRelationships?: string;
  mentalHealthExpressThoughts?: string;
  mentalHealthEmotionalDependence?: string;
  mentalHealthPurpose?: string;
  mentalHealthFailureReaction?: string;
  mentalHealthSelfConnection?: string;
  mentalHealthSelfRelationship?: string;
  mentalHealthLimitingBeliefs?: string;
  mentalHealthIdealBalance?: string;
  
  documents?: (File | string)[];
}

// Interfaz para los datos completos del formulario
interface CompleteHealthFormData {
  contractAccepted: boolean;
  personalData: Required<Omit<PersonalData, 'profilePhoto'>> & { profilePhoto?: File | string };
  medicalData: Required<Omit<MedicalData, 'documents'>> & { documents?: (File | string)[] };
}

// Interfaz para el estado del formulario (valores parciales)
interface HealthFormData {
  contractAccepted?: boolean;
  personalData?: PersonalData;
  medicalData?: MedicalData;
}

// Tipos para los datos que esperan los componentes
interface BasicMedicalStepData {
  mainComplaint: string;
  medications?: string;
  supplements?: string;
  currentPastConditions?: string;
  additionalMedicalHistory?: string;
  employmentHistory?: string;
  hobbies?: string;
  allergies?: string;
  surgeries?: string;
  housingHistory?: string;
  documents?: (string | File | undefined)[];
  [key: string]: unknown;
}

interface HealthEvaluationsStepData {
  carbohydrateAddiction: unknown;
  leptinResistance: unknown;
  circadianRhythms: unknown;
  sleepHygiene: unknown;
  electrosmogExposure: unknown;
  generalToxicity: unknown;
  microbiotaHealth: unknown;
  documents?: (string | File | undefined)[];
  [key: string]: unknown;
}

interface MentalHealthStepData {
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
  documents?: (string | File | undefined)[];
  [key: string]: unknown;
}

const FormPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<HealthFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const updateFormData = (newData: Partial<HealthFormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
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

  const handleBasicMedicalSubmit = (data: BasicMedicalStepData) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        mainComplaint: data.mainComplaint,
        medications: data.medications,
        supplements: data.supplements,
        currentPastConditions: data.currentPastConditions,
        additionalMedicalHistory: data.additionalMedicalHistory,
        employmentHistory: data.employmentHistory,
        hobbies: data.hobbies,
        allergies: data.allergies,
        surgeries: data.surgeries,
        housingHistory: data.housingHistory
      }
    });
    nextStep();
  };

  const handleHealthEvaluationsSubmit = (data: HealthEvaluationsStepData) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        carbohydrateAddiction: data.carbohydrateAddiction,
        leptinResistance: data.leptinResistance,
        circadianRhythms: data.circadianRhythms,
        sleepHygiene: data.sleepHygiene,
        electrosmogExposure: data.electrosmogExposure,
        generalToxicity: data.generalToxicity,
        microbiotaHealth: data.microbiotaHealth
      }
    });
    nextStep();
  };

  const handleMentalHealthSubmit = (data: MentalHealthStepData) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        mentalHealthEmotionIdentification: data.mentalHealthEmotionIdentification,
        mentalHealthEmotionIntensity: data.mentalHealthEmotionIntensity,
        mentalHealthUncomfortableEmotion: data.mentalHealthUncomfortableEmotion,
        mentalHealthInternalDialogue: data.mentalHealthInternalDialogue,
        mentalHealthStressStrategies: data.mentalHealthStressStrategies,
        mentalHealthSayingNo: data.mentalHealthSayingNo,
        mentalHealthRelationships: data.mentalHealthRelationships,
        mentalHealthExpressThoughts: data.mentalHealthExpressThoughts,
        mentalHealthEmotionalDependence: data.mentalHealthEmotionalDependence,
        mentalHealthPurpose: data.mentalHealthPurpose,
        mentalHealthFailureReaction: data.mentalHealthFailureReaction,
        mentalHealthSelfConnection: data.mentalHealthSelfConnection,
        mentalHealthSelfRelationship: data.mentalHealthSelfRelationship,
        mentalHealthLimitingBeliefs: data.mentalHealthLimitingBeliefs,
        mentalHealthIdealBalance: data.mentalHealthIdealBalance
      }
    });
    nextStep();
  };

  // Función para validar que todos los campos requeridos estén completos
  const validateCompleteFormData = (): CompleteHealthFormData | null => {
    // Validar contractAccepted
    if (!formData.contractAccepted) {
      setError('Debes aceptar el contrato para continuar');
      return null;
    }

    // Validar datos personales
    if (!formData.personalData) {
      setError('Faltan datos personales');
      return null;
    }

    const { personalData } = formData;
    const requiredPersonalFields = [
      'name', 'email', 'phone', 'address', 'birthDate',
      'gender', 'age', 'weight', 'height', 'maritalStatus',
      'education', 'occupation'
    ];

    for (const field of requiredPersonalFields) {
      if (!personalData[field as keyof PersonalData]) {
        setError(`El campo ${field} es requerido`);
        return null;
      }
    }

    // Validar datos médicos básicos
    if (!formData.medicalData) {
      setError('Faltan datos médicos');
      return null;
    }

    const { medicalData } = formData;
    const requiredMedicalFields = [
      'mainComplaint', 'medications', 'supplements', 'currentPastConditions',
      'additionalMedicalHistory', 'employmentHistory', 'hobbies', 'allergies',
      'surgeries', 'housingHistory'
    ];

    for (const field of requiredMedicalFields) {
      if (medicalData[field as keyof MedicalData] === undefined || medicalData[field as keyof MedicalData] === '') {
        setError(`El campo médico ${field} es requerido`);
        return null;
      }
    }

    // Validar evaluaciones de salud
    const requiredHealthEvaluationFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    for (const field of requiredHealthEvaluationFields) {
      if (medicalData[field as keyof MedicalData] === undefined) {
        setError(`La evaluación de salud ${field} es requerida`);
        return null;
      }
    }

    // Validar bienestar emocional
    const requiredMentalHealthFields = [
      'mentalHealthEmotionIdentification', 'mentalHealthEmotionIntensity',
      'mentalHealthUncomfortableEmotion', 'mentalHealthInternalDialogue',
      'mentalHealthStressStrategies', 'mentalHealthSayingNo',
      'mentalHealthRelationships', 'mentalHealthExpressThoughts',
      'mentalHealthEmotionalDependence', 'mentalHealthPurpose',
      'mentalHealthFailureReaction', 'mentalHealthSelfConnection',
      'mentalHealthSelfRelationship', 'mentalHealthLimitingBeliefs',
      'mentalHealthIdealBalance'
    ];

    for (const field of requiredMentalHealthFields) {
      if (!medicalData[field as keyof MedicalData]) {
        setError(`El campo de bienestar emocional ${field} es requerido`);
        return null;
      }
    }

    // Construir objeto completo con tipos correctos
    return {
      contractAccepted: formData.contractAccepted,
      personalData: {
        ...personalData,
        name: personalData.name!,
        email: personalData.email!,
        phone: personalData.phone!,
        address: personalData.address!,
        birthDate: personalData.birthDate!,
        gender: personalData.gender!,
        age: personalData.age!,
        weight: personalData.weight!,
        height: personalData.height!,
        maritalStatus: personalData.maritalStatus!,
        education: personalData.education!,
        occupation: personalData.occupation!,
        profilePhoto: personalData.profilePhoto
      },
      medicalData: {
        ...medicalData,
        // Campos básicos
        mainComplaint: medicalData.mainComplaint!,
        medications: medicalData.medications!,
        supplements: medicalData.supplements!,
        currentPastConditions: medicalData.currentPastConditions!,
        additionalMedicalHistory: medicalData.additionalMedicalHistory!,
        employmentHistory: medicalData.employmentHistory!,
        hobbies: medicalData.hobbies!,
        allergies: medicalData.allergies!,
        surgeries: medicalData.surgeries!,
        housingHistory: medicalData.housingHistory!,
        // Evaluaciones de salud
        carbohydrateAddiction: medicalData.carbohydrateAddiction!,
        leptinResistance: medicalData.leptinResistance!,
        circadianRhythms: medicalData.circadianRhythms!,
        sleepHygiene: medicalData.sleepHygiene!,
        electrosmogExposure: medicalData.electrosmogExposure!,
        generalToxicity: medicalData.generalToxicity!,
        microbiotaHealth: medicalData.microbiotaHealth!,
        // Bienestar emocional
        mentalHealthEmotionIdentification: medicalData.mentalHealthEmotionIdentification!,
        mentalHealthEmotionIntensity: medicalData.mentalHealthEmotionIntensity!,
        mentalHealthUncomfortableEmotion: medicalData.mentalHealthUncomfortableEmotion!,
        mentalHealthInternalDialogue: medicalData.mentalHealthInternalDialogue!,
        mentalHealthStressStrategies: medicalData.mentalHealthStressStrategies!,
        mentalHealthSayingNo: medicalData.mentalHealthSayingNo!,
        mentalHealthRelationships: medicalData.mentalHealthRelationships!,
        mentalHealthExpressThoughts: medicalData.mentalHealthExpressThoughts!,
        mentalHealthEmotionalDependence: medicalData.mentalHealthEmotionalDependence!,
        mentalHealthPurpose: medicalData.mentalHealthPurpose!,
        mentalHealthFailureReaction: medicalData.mentalHealthFailureReaction!,
        mentalHealthSelfConnection: medicalData.mentalHealthSelfConnection!,
        mentalHealthSelfRelationship: medicalData.mentalHealthSelfRelationship!,
        mentalHealthLimitingBeliefs: medicalData.mentalHealthLimitingBeliefs!,
        mentalHealthIdealBalance: medicalData.mentalHealthIdealBalance!,
        // Documentos (opcional)
        documents: medicalData.documents
      }
    };
  };

  // Manejar envío de documentos
  const handleDocumentsSubmit = async (data: unknown) => {
    setLoading(true);
    setError(null);
    
    try {
      // Extraer documentos del data unknown
      const documentsData = data as { documents?: (File | string)[] };
      
      // Actualizar documentos en el estado
      updateFormData({
        medicalData: {
          ...formData.medicalData,
          documents: documentsData.documents
        }
      });

      // Validar que todos los campos estén completos
      const completeData = validateCompleteFormData();
      
      if (!completeData) {
        // El error ya fue establecido en validateCompleteFormData
        setLoading(false);
        return;
      }
      
      console.log('📋 Enviando formulario completo...', {
        personalData: completeData.personalData,
        medicalDataFields: Object.keys(completeData.medicalData).filter(key => key !== 'documents'),
        documentCount: completeData.medicalData.documents?.length || 0,
        hasProfilePhoto: !!completeData.personalData.profilePhoto
      });

      // Convertir a FormPayload para la API
      const formPayload: FormPayload = {
        contractAccepted: completeData.contractAccepted,
        personalData: completeData.personalData,
        medicalData: completeData.medicalData
      };

      const result = await apiClient.submitForm(formPayload);

      if (result.success) {
        nextStep();
        console.log('✅ Formulario enviado exitosamente!');
      } else {
        setError(result.message || 'Error al enviar el formulario');
      }
    } catch (error: unknown) {
      console.error('❌ Error:', error);
      setError('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para cada componente
  const getBasicMedicalStepData = (): BasicMedicalStepData => {
    const baseData = formData.medicalData || {};
    return {
      mainComplaint: baseData.mainComplaint || '',
      medications: baseData.medications || '',
      supplements: baseData.supplements || '',
      currentPastConditions: baseData.currentPastConditions || '',
      additionalMedicalHistory: baseData.additionalMedicalHistory || '',
      employmentHistory: baseData.employmentHistory || '',
      hobbies: baseData.hobbies || '',
      allergies: baseData.allergies || '',
      surgeries: baseData.surgeries || '',
      housingHistory: baseData.housingHistory || '',
      documents: baseData.documents || []
    };
  };

  const getHealthEvaluationsStepData = (): HealthEvaluationsStepData => {
    const baseData = formData.medicalData || {};
    return {
      carbohydrateAddiction: baseData.carbohydrateAddiction || null,
      leptinResistance: baseData.leptinResistance || null,
      circadianRhythms: baseData.circadianRhythms || null,
      sleepHygiene: baseData.sleepHygiene || null,
      electrosmogExposure: baseData.electrosmogExposure || null,
      generalToxicity: baseData.generalToxicity || null,
      microbiotaHealth: baseData.microbiotaHealth || null,
      documents: baseData.documents || []
    };
  };

  const getMentalHealthStepData = (): MentalHealthStepData => {
    const baseData = formData.medicalData || {};
    return {
      mentalHealthEmotionIdentification: baseData.mentalHealthEmotionIdentification || '',
      mentalHealthEmotionIntensity: baseData.mentalHealthEmotionIntensity || '',
      mentalHealthUncomfortableEmotion: baseData.mentalHealthUncomfortableEmotion || '',
      mentalHealthInternalDialogue: baseData.mentalHealthInternalDialogue || '',
      mentalHealthStressStrategies: baseData.mentalHealthStressStrategies || '',
      mentalHealthSayingNo: baseData.mentalHealthSayingNo || '',
      mentalHealthRelationships: baseData.mentalHealthRelationships || '',
      mentalHealthExpressThoughts: baseData.mentalHealthExpressThoughts || '',
      mentalHealthEmotionalDependence: baseData.mentalHealthEmotionalDependence || '',
      mentalHealthPurpose: baseData.mentalHealthPurpose || '',
      mentalHealthFailureReaction: baseData.mentalHealthFailureReaction || '',
      mentalHealthSelfConnection: baseData.mentalHealthSelfConnection || '',
      mentalHealthSelfRelationship: baseData.mentalHealthSelfRelationship || '',
      mentalHealthLimitingBeliefs: baseData.mentalHealthLimitingBeliefs || '',
      mentalHealthIdealBalance: baseData.mentalHealthIdealBalance || '',
      documents: baseData.documents || []
    };
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
      data={getBasicMedicalStepData()} 
      onSubmit={handleBasicMedicalSubmit} 
      onBack={prevStep} 
    />,
    <HealthEvaluationsStep 
      key="health-evaluations"
      data={getHealthEvaluationsStepData()} 
      onSubmit={handleHealthEvaluationsSubmit} 
      onBack={prevStep} 
    />,
    <MentalHealthStep 
      key="mental-health"
      data={getMentalHealthStepData()} 
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
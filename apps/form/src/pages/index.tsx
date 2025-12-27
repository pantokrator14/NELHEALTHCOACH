// apps/form/src/pages/index.tsx
import React, { useState } from 'react';
import ContractStep from '@/components/ContractStep';
import PersonalDataStep from '@/components/PersonalDataStep';
import BasicMedicalStep from '@/components/BasicMedicalStep';
import HealthEvaluationsStep from '@/components/HealthEvaluationsStep';
import MentalHealthStep from '@/components/MentalHealthStep';
import DocumentsStep from '@/components/DocumentsStep';
import SuccessStep from '@/components/SuccessStep';
import { apiClient, FormPayload } from '@/lib/api';
import { PersonalDataFormValues, MedicalDataFormValues } from '@/lib/validation';

// Interfaz para los datos completos del formulario
interface CompleteHealthFormData {
  contractAccepted: boolean;
  personalData: PersonalDataFormValues;
  medicalData: MedicalDataFormValues;
}

// Interfaz para el estado del formulario (valores parciales)
interface HealthFormData {
  contractAccepted?: boolean;
  personalData?: Partial<PersonalDataFormValues>;
  medicalData?: Partial<MedicalDataFormValues>;
}

// Interfaz para los datos que espera HealthEvaluationsStep
interface HealthEvaluationsStepData {
  mainComplaint: string;
  carbohydrateAddiction?: unknown;
  leptinResistance?: unknown;
  circadianRhythms?: unknown;
  sleepHygiene?: unknown;
  electrosmogExposure?: unknown;
  generalToxicity?: unknown;
  microbiotaHealth?: unknown;
  // Otros campos que pueda necesitar
  [key: string]: unknown;
}

// Helper function para convertir PersonalDataFormValues al tipo que espera la API
const convertPersonalDataForApi = (data: PersonalDataFormValues): FormPayload['personalData'] => {
  const result: FormPayload['personalData'] = {};
  
  // Copiar todos los campos de data a result
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  });
  
  return result;
};

// Helper function para convertir MedicalDataFormValues al tipo que espera la API
const convertMedicalDataForApi = (data: MedicalDataFormValues): FormPayload['medicalData'] => {
  const result: FormPayload['medicalData'] = {};
  
  // Copiar todos los campos de data a result
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Convertir documentos a File[] si están presentes
      if (key === 'documents' && Array.isArray(value)) {
        const files = value.filter((item): item is File => item instanceof File);
        if (files.length > 0) {
          result[key] = files;
        }
      } else {
        result[key] = value;
      }
    }
  });
  
  return result;
};

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

  const handlePersonalDataSubmit = (data: PersonalDataFormValues) => {
    updateFormData({ personalData: data });
    nextStep();
  };

  const handleBasicMedicalSubmit = (data: Record<string, unknown>) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        mainComplaint: data.mainComplaint as string,
        medications: data.medications as string,
        supplements: data.supplements as string,
        currentPastConditions: data.currentPastConditions as string,
        additionalMedicalHistory: data.additionalMedicalHistory as string,
        employmentHistory: data.employmentHistory as string,
        hobbies: data.hobbies as string,
        allergies: data.allergies as string,
        surgeries: data.surgeries as string,
        housingHistory: data.housingHistory as string
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
        microbiotaHealth: data.microbiotaHealth,
        // Asegurarnos de mantener mainComplaint
        mainComplaint: data.mainComplaint || formData.medicalData?.mainComplaint
      }
    });
    nextStep();
  };

  const handleMentalHealthSubmit = (data: Record<string, unknown>) => {
    updateFormData({ 
      medicalData: {
        ...formData.medicalData,
        mentalHealthEmotionIdentification: data.mentalHealthEmotionIdentification as string,
        mentalHealthEmotionIntensity: data.mentalHealthEmotionIntensity as string,
        mentalHealthUncomfortableEmotion: data.mentalHealthUncomfortableEmotion as string,
        mentalHealthInternalDialogue: data.mentalHealthInternalDialogue as string,
        mentalHealthStressStrategies: data.mentalHealthStressStrategies as string,
        mentalHealthSayingNo: data.mentalHealthSayingNo as string,
        mentalHealthRelationships: data.mentalHealthRelationships as string,
        mentalHealthExpressThoughts: data.mentalHealthExpressThoughts as string,
        mentalHealthEmotionalDependence: data.mentalHealthEmotionalDependence as string,
        mentalHealthPurpose: data.mentalHealthPurpose as string,
        mentalHealthFailureReaction: data.mentalHealthFailureReaction as string,
        mentalHealthSelfConnection: data.mentalHealthSelfConnection as string,
        mentalHealthSelfRelationship: data.mentalHealthSelfRelationship as string,
        mentalHealthLimitingBeliefs: data.mentalHealthLimitingBeliefs as string,
        mentalHealthIdealBalance: data.mentalHealthIdealBalance as string
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
      if (!personalData[field as keyof PersonalDataFormValues]) {
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
      if (medicalData[field as keyof MedicalDataFormValues] === undefined || medicalData[field as keyof MedicalDataFormValues] === '') {
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
      if (medicalData[field as keyof MedicalDataFormValues] === undefined) {
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
      if (!medicalData[field as keyof MedicalDataFormValues]) {
        setError(`El campo de bienestar emocional ${field} es requerido`);
        return null;
      }
    }

    // Construir objeto completo
    return {
      contractAccepted: formData.contractAccepted,
      personalData: personalData as PersonalDataFormValues,
      medicalData: medicalData as MedicalDataFormValues
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
        personalData: convertPersonalDataForApi(completeData.personalData),
        medicalData: convertMedicalDataForApi(completeData.medicalData)
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
  const getBasicMedicalStepData = (): Record<string, unknown> => {
    const baseData = formData.medicalData || {};
    const result: Record<string, unknown> = {
      mainComplaint: baseData.mainComplaint || '',
      medications: baseData.medications || '',
      supplements: baseData.supplements || '',
      currentPastConditions: baseData.currentPastConditions || '',
      additionalMedicalHistory: baseData.additionalMedicalHistory || '',
      employmentHistory: baseData.employmentHistory || '',
      hobbies: baseData.hobbies || '',
      allergies: baseData.allergies || '',
      surgeries: baseData.surgeries || '',
      housingHistory: baseData.housingHistory || ''
    };
    
    // Incluir otros campos que puedan ser necesarios
    Object.entries(baseData).forEach(([key, value]) => {
      if (!result[key] && value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  };

  const getHealthEvaluationsStepData = (): HealthEvaluationsStepData => {
    const baseData = formData.medicalData || {};
    return {
      mainComplaint: baseData.mainComplaint || '',
      carbohydrateAddiction: baseData.carbohydrateAddiction,
      leptinResistance: baseData.leptinResistance,
      circadianRhythms: baseData.circadianRhythms,
      sleepHygiene: baseData.sleepHygiene,
      electrosmogExposure: baseData.electrosmogExposure,
      generalToxicity: baseData.generalToxicity,
      microbiotaHealth: baseData.microbiotaHealth
    };
  };

  const getMentalHealthStepData = (): Record<string, unknown> => {
    const baseData = formData.medicalData || {};
    const result: Record<string, unknown> = {
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
      mentalHealthIdealBalance: baseData.mentalHealthIdealBalance || ''
    };
    
    // Incluir mainComplaint requerido por el esquema
    if (baseData.mainComplaint) {
      result.mainComplaint = baseData.mainComplaint;
    }
    
    return result;
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
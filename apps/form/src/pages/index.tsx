// apps/form/src/pages/index.tsx
import React, { useState } from 'react';
import ContractStep from '@/components/ContractStep';
import PersonalDataStep from '@/components/PersonalDataStep';
import BasicMedicalStep from '@/components/BasicMedicalStep';
import HealthEvaluationsStep from '@/components/HealthEvaluationsStep';
import ObjectivesStep from '@/components/ObjectivesStep';
import LifestyleContextStep from '@/components/LifestyleContextStep';
import MentalHealthStep from '@/components/MentalHealthStep';
import DocumentsStep from '@/components/DocumentsStep';
import SuccessStep from '@/components/SuccessStep';
import { apiClient, FormPayload } from '@/lib/api';
import { PersonalDataFormValues, MedicalDataFormValues } from '@/lib/validation';

interface CompleteHealthFormData {
  contractAccepted: boolean;
  personalData: PersonalDataFormValues;
  medicalData: MedicalDataFormValues;
}

interface HealthFormData {
  contractAccepted?: boolean;
  personalData?: Partial<PersonalDataFormValues>;
  medicalData?: Partial<MedicalDataFormValues>;
}

interface HealthEvaluationsStepData {
  mainComplaint: string;
  carbohydrateAddiction?: (string | undefined)[];
  leptinResistance?: (string | undefined)[];
  circadianRhythms?: (string | undefined)[];
  sleepHygiene?: (string | undefined)[];
  electrosmogExposure?: (string | undefined)[];
  generalToxicity?: (string | undefined)[];
  microbiotaHealth?: (string | undefined)[];
  [key: string]: unknown;
}

const convertPersonalDataForApi = (data: PersonalDataFormValues): FormPayload['personalData'] => {
  const result: FormPayload['personalData'] = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  });
  return result;
};

const convertMedicalDataForApi = (data: MedicalDataFormValues): FormPayload['medicalData'] => {
  const result: FormPayload['medicalData'] = {};

  (Object.keys(data) as Array<keyof MedicalDataFormValues>).forEach((key) => {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'documents' && Array.isArray(value)) {
        // Filtramos solo los archivos y aseguramos el tipo con as File[]
        const files = value.filter((item): item is File => item instanceof File) as File[];
        if (files.length > 0) {
          // Asignación directa a la propiedad conocida (segura)
          result.documents = files;
        }
      } else {
        // Para el resto de campos, usamos un cast a Record<string, unknown>
        // Esto le dice a TypeScript que confíe en que la clave es una string y el valor es cualquier cosa,
        // pero no estamos usando 'any', sino un tipo índice más permisivo.
        (result as Record<string, unknown>)[key] = value;
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
        mainComplaintIntensity: data.mainComplaintIntensity as number | undefined,
        mainComplaintImpact: data.mainComplaintImpact as string | undefined,
        medications: data.medications as string,
        supplements: data.supplements as string,
        currentPastConditions: data.currentPastConditions as string,
        additionalMedicalHistory: data.additionalMedicalHistory as string,
        employmentHistory: data.employmentHistory as string,
        hobbies: data.hobbies as string,
        allergies: data.allergies as string,
        surgeries: data.surgeries as string,
        housingHistory: data.housingHistory as string,
        // Usar el tipo específico del campo
        appetiteChanges: data.appetiteChanges as MedicalDataFormValues['appetiteChanges'],
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
        mainComplaint: data.mainComplaint || formData.medicalData?.mainComplaint,
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
        mentalHealthIdealBalance: data.mentalHealthIdealBalance as string,
        // Tipos literales
        mentalHealthSupportNetwork: data.mentalHealthSupportNetwork as MedicalDataFormValues['mentalHealthSupportNetwork'],
        mentalHealthDailyStress: data.mentalHealthDailyStress as MedicalDataFormValues['mentalHealthDailyStress'],
      }
    });
    nextStep();
  };

  const handleObjectivesSubmit = (data: Partial<MedicalDataFormValues>) => {
    updateFormData({ medicalData: { ...formData.medicalData, ...data } });
    console.log('handleObjectivesSubmit llamado con:', data);
    nextStep();
  };

  const handleLifestyleSubmit = (data: Partial<MedicalDataFormValues>) => {
    updateFormData({ medicalData: { ...formData.medicalData, ...data } });
    console.log('handleLifestyleSubmit llamado con:', data);
    nextStep();
  };

  const validateCompleteFormData = (): CompleteHealthFormData | null => {
    if (!formData.contractAccepted) {
      setError('Debes aceptar el contrato para continuar');
      return null;
    }

    if (!formData.personalData) {
      setError('Faltan datos personales');
      return null;
    }

    const { personalData } = formData;
    const requiredPersonalFields = [
      'name', 'email', 'phone', 'address', 'birthDate',
      'gender', 'age', 'weight', 'height', 'maritalStatus',
      'education', 'occupation'
    ] as const;

    for (const field of requiredPersonalFields) {
      if (!personalData[field]) {
        setError(`El campo ${field} es requerido`);
        return null;
      }
    }

    if (!formData.medicalData) {
      setError('Faltan datos médicos');
      return null;
    }

    const { medicalData } = formData;
    const requiredMedicalFields = [
      'mainComplaint', 'medications', 'supplements', 'currentPastConditions',
      'additionalMedicalHistory', 'employmentHistory', 'hobbies', 'allergies',
      'surgeries', 'housingHistory'
    ] as const;

    for (const field of requiredMedicalFields) {
      const value = medicalData[field];
      if (value === undefined || value === '') {
        setError(`El campo médico ${field} es requerido`);
        return null;
      }
    }

    const requiredHealthEvaluationFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ] as const;

    for (const field of requiredHealthEvaluationFields) {
      if (medicalData[field] === undefined) {
        setError(`La evaluación de salud ${field} es requerida`);
        return null;
      }
    }

    const requiredMentalHealthFields = [
      'mentalHealthEmotionIdentification', 'mentalHealthEmotionIntensity',
      'mentalHealthUncomfortableEmotion', 'mentalHealthInternalDialogue',
      'mentalHealthStressStrategies', 'mentalHealthSayingNo',
      'mentalHealthRelationships', 'mentalHealthExpressThoughts',
      'mentalHealthEmotionalDependence', 'mentalHealthPurpose',
      'mentalHealthFailureReaction', 'mentalHealthSelfConnection',
      'mentalHealthSelfRelationship', 'mentalHealthLimitingBeliefs',
      'mentalHealthIdealBalance'
    ] as const;

    for (const field of requiredMentalHealthFields) {
      if (!medicalData[field]) {
        setError(`El campo de bienestar emocional ${field} es requerido`);
        return null;
      }
    }

    return {
      contractAccepted: formData.contractAccepted,
      personalData: personalData as PersonalDataFormValues,
      medicalData: medicalData as MedicalDataFormValues,
    };
  };

  const handleDocumentsSubmit = async (data: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const documentsData = data as { documents?: (File | string)[] };
      updateFormData({
        medicalData: {
          ...formData.medicalData,
          documents: documentsData.documents,
        }
      });

      const completeData = validateCompleteFormData();
      if (!completeData) {
        setLoading(false);
        return;
      }

      const formPayload: FormPayload = {
        contractAccepted: completeData.contractAccepted,
        personalData: convertPersonalDataForApi(completeData.personalData),
        medicalData: convertMedicalDataForApi(completeData.medicalData),
      };

      const result = await apiClient.submitForm(formPayload);

      if (result.success) {
        nextStep();
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

  const getBasicMedicalStepData = (): Record<string, unknown> => {
    const baseData = formData.medicalData || {};
    return {
      mainComplaint: baseData.mainComplaint || '',
      mainComplaintIntensity: baseData.mainComplaintIntensity,
      mainComplaintImpact: baseData.mainComplaintImpact || '',
      medications: baseData.medications || '',
      supplements: baseData.supplements || '',
      currentPastConditions: baseData.currentPastConditions || '',
      additionalMedicalHistory: baseData.additionalMedicalHistory || '',
      employmentHistory: baseData.employmentHistory || '',
      hobbies: baseData.hobbies || '',
      allergies: baseData.allergies || '',
      surgeries: baseData.surgeries || '',
      housingHistory: baseData.housingHistory || '',
      appetiteChanges: baseData.appetiteChanges,
    };
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
      microbiotaHealth: baseData.microbiotaHealth,
    };
  };

  const getMentalHealthStepData = (): Record<string, unknown> => {
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
      mentalHealthSupportNetwork: baseData.mentalHealthSupportNetwork,
      mentalHealthDailyStress: baseData.mentalHealthDailyStress,
    };
  };

  const steps = [
    <ContractStep key="contract" onAccept={handleContractAccept} onReject={handleContractReject} />,
    <ObjectivesStep
      key="objectives"
      data={formData.medicalData || {}}
      onSubmit={handleObjectivesSubmit}
      onBack={prevStep}
    />,
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
    <LifestyleContextStep
      key="lifestyle"
      data={formData.medicalData || {}}
      onSubmit={handleLifestyleSubmit}
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
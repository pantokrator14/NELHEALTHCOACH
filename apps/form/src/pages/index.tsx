import React, { useState } from 'react';
import ContractStep from '@/components/ContractStep';
import PersonalDataStep from '@/components/PersonalDataStep';
import MedicalDataStep from '@/components/MedicalDataStep';
import SuccessStep from '@/components/SuccessStep';
import { apiClient } from '@/lib/api';
import error from 'next/error';

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

  const handleMedicalDataSubmit = async (data: MedicalData) => {
    setLoading(true);
    setError(null);
    
    const completeData: HealthFormData = { 
      ...formData as HealthFormData, 
      medicalData: data 
    };
    
    try {
      const result = await apiClient.submitForm(completeData);

      if (result.success) {
        nextStep();
        console.log('Formulario enviado!');
      } else {
        setError(result.message || 'Error al enviar el formulario');
      }
    } catch (error) {
      console.error('Error:', error);
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
    <SuccessStep key="success" />,
  ];

  return (
    <div>
      {steps[step]}
    </div>
  );
};

export default FormPage;
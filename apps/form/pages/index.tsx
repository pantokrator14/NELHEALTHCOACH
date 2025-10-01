import React, { useState } from 'react';
import ContractStep from '../components/ContractStep';
import PersonalDataStep from '../components/PersonalDataStep';
import MedicalDataStep from '../components/MedicalDataStep';
import SuccessStep from '../components/SuccessStep';

const FormPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});

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

  const handlePersonalDataSubmit = (data: any) => {
    updateFormData({ personalData: data });
    nextStep();
  };

  const handleMedicalDataSubmit = async (data: any) => {
    const completeData = { ...formData, medicalData: data };
    
    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeData),
      });

      if (response.ok) {
        nextStep();
      } else {
        alert('Error al enviar el formulario. Por favor, intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión. Por favor, intenta nuevamente.');
    }
  };

  const steps = [
    <ContractStep onAccept={handleContractAccept} onReject={handleContractReject} />,
    <PersonalDataStep 
      data={formData.personalData || {}} 
      onSubmit={handlePersonalDataSubmit} 
      onBack={prevStep} 
    />,
    <MedicalDataStep 
      data={formData.medicalData || {}} 
      onSubmit={handleMedicalDataSubmit} 
      onBack={prevStep} 
    />,
    <SuccessStep />,
  ];

  return (
    <div>
      {steps[step]}
    </div>
  );
};

export default FormPage;
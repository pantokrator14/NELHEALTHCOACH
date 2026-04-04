import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  valueLabels, 
  evaluationQuestions,
  mentalHealthOptions,
  mentalHealthMultipleChoiceQuestions,
  mentalHealthOpenQuestions
} from './formConstants';

// Define interface matching the client structure used in the page
interface UploadedFile {
  url: string;
  key: string;
  name: string;
  type: 'profile' | 'document';
  size: number;
  uploadedAt?: string;
}

interface Client {
  _id: string;
  personalData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    birthDate: string;
    gender: string;
    age: string;
    weight: string;
    height: string;
    maritalStatus: string;
    education: string;
    occupation: string;
    profilePhoto?: UploadedFile;
    bodyFatPercentage?: string;
    weightVariation?: string;
    dislikedFoodsActivities?: string;
  };
  medicalData: {
    mainComplaint: string;
    mainComplaintIntensity?: number;
    mainComplaintImpact?: string;
    medications: string;
    supplements: string;
    currentPastConditions: string;
    additionalMedicalHistory: string;
    employmentHistory: string;
    hobbies: string;
    allergies: string;
    surgeries: string;
    housingHistory: string;
    appetiteChanges?: string;
    documents?: UploadedFile[];
    carbohydrateAddiction: string[];
    leptinResistance: string[];
    circadianRhythms: string[];
    sleepHygiene: string[];
    electrosmogExposure: string[];
    generalToxicity: string[];
    microbiotaHealth: string[];
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
    mentalHealthSupportNetwork?: 'si-tengo' | 'algunas' | 'no';
    mentalHealthDailyStress?: 'bajo' | 'moderado' | 'alto' | 'muy-alto';
    mentalHealthSelfRelationship: string;
    mentalHealthLimitingBeliefs: string;
    mentalHealthIdealBalance: string;
    motivation?: string[] | string;
    commitmentLevel?: number;
    previousCoachExperience?: boolean;
    previousCoachExperienceDetails?: string;
    targetDate?: string;
    typicalWeekday?: string;
    typicalWeekend?: string;
    whoCooks?: string;
    currentActivityLevel?: string;
    physicalLimitations?: string;
  };
  contractAccepted: string;
  ipAddress: string;
  submissionDate: string;
}

// Helper to format date
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// Helper to get label for a value
const getLabel = (value: string | undefined): string => {
  if (!value) return 'No especificado';
  return valueLabels[value] || value;
};

// Helper to get mental health label with meaning
const getMentalHealthLabel = (field: string, value: string): string => {
  if (!value) return 'No especificado';
  const options = mentalHealthOptions[field];
  if (options && options[value]) {
    return `${value.toUpperCase()}: ${options[value]}`;
  }
  return getLabel(value);
};

// Helper to parse array field
const parseArrayField = (field: unknown): string[] => {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const generateClientPDF = (client: Client) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(`Información del Cliente`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Client name and date
  doc.setFontSize(14);
  doc.text(`Nombre: ${client.personalData.name}`, margin, yPos);
  yPos += 7;
  doc.text(`Fecha de registro: ${formatDate(client.submissionDate)}`, margin, yPos);
  yPos += 7;
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, margin, yPos);
  yPos += 15;

  // Helper to add a section with better spacing
  const addSection = (title: string, color: [number, number, number], data: Array<[string, string]>) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }

    // Section header with background color
    doc.setFillColor(...color);
    doc.setDrawColor(...color);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, yPos + 7);
    yPos += 25; // Increased from 15 to 25 for more space after title

    // Data rows with better spacing
    doc.setFontSize(10);
    data.forEach(([label, value], index) => {
      if (!value || value.trim() === '') return;
      if (yPos > 280) {
        doc.addPage();
        yPos = margin;
      }
      
      // Draw label in bold with section color
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(`${label}:`, margin + 5, yPos);
      
      // Extra vertical space between question and answer for Personal and Medical sections
      const isPersonalOrMedical = (title === 'Información Personal' || title === 'Información Médica');
      const verticalSpace = isPersonalOrMedical ? 5 : 2; // More space for Personal/Medical sections
      yPos += verticalSpace;
      
      // Draw value in normal font with black color
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Wrap value text with proper indentation
      const lines = doc.splitTextToSize(value, pageWidth - 2 * margin - 60); // More space for label
      lines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 60, yPos + (idx * 5)); // Increased from 40 to 60
      });
      
      // Add extra space after the last item in personal information section
      // Special case: "Alimentos/actividades no deseadas" needs even more space
      const isLastPersonalItem = (title === 'Información Personal' && index === data.length - 1);
      const isFoodActivitiesItem = (label === 'Alimentos/actividades no deseadas');
      const extraSpace = isLastPersonalItem ? (isFoodActivitiesItem ? 12 : 8) : 0;
      yPos += Math.max(lines.length * 5, 10) + 3 + extraSpace; // More spacing between items
    });
    
    // Extra space after personal information section
    const sectionExtraSpace = (title === 'Información Personal') ? 15 : 8;
    yPos += sectionExtraSpace;
  };

  // 1. Personal Information (blue)
  const personalData: Array<[string, string]> = [
    ['Email', client.personalData.email],
    ['Teléfono', client.personalData.phone],
    ['Dirección', client.personalData.address],
    ['Fecha de nacimiento', formatDate(client.personalData.birthDate)],
    ['Género', client.personalData.gender],
    ['Edad', `${client.personalData.age} años`],
    ['Peso', `${client.personalData.weight} kg`],
    ['Altura', `${client.personalData.height} cm`],
    ['Estado civil', client.personalData.maritalStatus],
    ['Educación', client.personalData.education || 'No especificado'],
    ['Ocupación', client.personalData.occupation || 'No especificado'],
    ['% Grasa corporal', client.personalData.bodyFatPercentage || 'No especificado'],
    ['Variación de peso (6 meses)', getLabel(client.personalData.weightVariation)],
    ['Alimentos/actividades no deseadas', client.personalData.dislikedFoodsActivities || 'No especificado'],
  ];
  addSection('Información Personal', [59, 130, 246], personalData);

  // 2. Medical Information (yellow)
  const medicalData: Array<[string, string]> = [
    ['Mayor queja', client.medicalData.mainComplaint],
    ['Intensidad (1-10)', client.medicalData.mainComplaintIntensity?.toString() || 'No especificado'],
    ['Impacto en actividades', client.medicalData.mainComplaintImpact || 'No especificado'],
    ['Medicamentos', client.medicalData.medications || 'No especificado'],
    ['Suplementos', client.medicalData.supplements || 'No especificado'],
    ['Condiciones actuales/pasadas', client.medicalData.currentPastConditions || 'No especificado'],
    ['Historial adicional', client.medicalData.additionalMedicalHistory || 'No especificado'],
    ['Alergias', client.medicalData.allergies || 'No especificado'],
    ['Cirugías', client.medicalData.surgeries || 'No especificado'],
    ['Cambios en apetito/sed', getLabel(client.medicalData.appetiteChanges)],
  ];
  addSection('Información Médica', [253, 224, 71], medicalData);

  // 3. Mental Health (purple) - with complete questions and answers
  const addMentalHealthSection = () => {
    let hasMentalHealthData = false;
    
    // Multiple choice questions
    Object.entries(mentalHealthMultipleChoiceQuestions).forEach(([field, question]) => {
      const value = client.medicalData[field as keyof Client['medicalData']] as string;
      if (!value || value.trim() === '') return;
      
      if (!hasMentalHealthData) {
        // Add section header on first item
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFillColor(147, 51, 234);
        doc.setDrawColor(147, 51, 234);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('Salud Emocional', margin + 5, yPos + 7);
        yPos += 15;
        hasMentalHealthData = true;
      }
      
      if (yPos > 280) {
        doc.addPage();
        yPos = margin;
      }
      
      // Draw question in bold with purple color
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(147, 51, 234); // Purple color for mental health section
      const questionLines = doc.splitTextToSize(question, pageWidth - 2 * margin - 10);
      questionLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 5, yPos + (idx * 5));
      });
      yPos += questionLines.length * 5 + 2;
      
      // Draw answer with meaning in normal font and black
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const answerLabel = getMentalHealthLabel(field, value);
      const answerLines = doc.splitTextToSize(`Respuesta: ${answerLabel}`, pageWidth - 2 * margin - 20);
      answerLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 15, yPos + (idx * 5));
      });
      yPos += answerLines.length * 5 + 8;
    });
    
    // Open questions
    Object.entries(mentalHealthOpenQuestions).forEach(([field, question]) => {
      const value = client.medicalData[field as keyof Client['medicalData']] as string;
      if (!value || value.trim() === '') return;
      
      if (!hasMentalHealthData) {
        // Add section header on first item
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFillColor(147, 51, 234);
        doc.setDrawColor(147, 51, 234);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('Salud Emocional', margin + 5, yPos + 7);
        yPos += 15;
        hasMentalHealthData = true;
      }
      
      if (yPos > 280) {
        doc.addPage();
        yPos = margin;
      }
      
      // Draw question in bold with purple color
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(147, 51, 234); // Purple color for mental health section
      const questionLines = doc.splitTextToSize(question, pageWidth - 2 * margin - 10);
      questionLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 5, yPos + (idx * 5));
      });
      yPos += questionLines.length * 5 + 2;
      
      // Draw answer in normal font and black
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const answerLines = doc.splitTextToSize(`Respuesta: ${value}`, pageWidth - 2 * margin - 20);
      answerLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 15, yPos + (idx * 5));
      });
      yPos += answerLines.length * 5 + 8;
    });
    
    if (hasMentalHealthData) {
      yPos += 10; // Extra space after section
    }
  };
  
  addMentalHealthSection();

  // 4. Objectives (amber)
  const motivationArray = parseArrayField(client.medicalData.motivation);
  const objectivesData: Array<[string, string]> = [];
  if (motivationArray.length > 0) {
    objectivesData.push(['Motivación', motivationArray.map(v => getLabel(v)).join(', ')]);
  }
  if (client.medicalData.commitmentLevel) {
    objectivesData.push(['Nivel de compromiso', `${client.medicalData.commitmentLevel} / 10`]);
  }
  if (client.medicalData.previousCoachExperience !== undefined) {
    objectivesData.push(['Experiencia previa con coach', client.medicalData.previousCoachExperience ? 'Sí' : 'No']);
  }
  if (client.medicalData.previousCoachExperienceDetails) {
    objectivesData.push(['Detalles experiencia previa', client.medicalData.previousCoachExperienceDetails]);
  }
  if (client.medicalData.targetDate) {
    objectivesData.push(['Fecha objetivo', client.medicalData.targetDate]);
  }
  if (objectivesData.length > 0) {
    addSection('Objetivos', [245, 158, 11], objectivesData);
  }

  // 5. Lifestyle (teal)
  const lifestyleData: Array<[string, string]> = [
    ['Historial de empleos', client.medicalData.employmentHistory || 'No especificado'],
    ['Historial de vivienda', client.medicalData.housingHistory || 'No especificado'],
    ['Hobbies e intereses', client.medicalData.hobbies || 'No especificado'],
    ['Día típico entre semana', client.medicalData.typicalWeekday || 'No especificado'],
    ['Día típico fin de semana', client.medicalData.typicalWeekend || 'No especificado'],
    ['Quién cocina / comida fuera', client.medicalData.whoCooks || 'No especificado'],
    ['Nivel de actividad física', client.medicalData.currentActivityLevel || 'No especificado'],
    ['Limitaciones físicas', client.medicalData.physicalLimitations || 'No especificado'],
  ];
  addSection('Estilo de Vida y Contexto', [20, 184, 184], lifestyleData);

  // 6. Health Evaluations (pink) - detailed questions and answers
  const addHealthEvaluationSection = (title: string, color: [number, number, number], evaluationKey: string) => {
    const answers = parseArrayField(client.medicalData[evaluationKey as keyof Client['medicalData']]);
    if (answers.length === 0) return false;
    
    const evaluation = evaluationQuestions[evaluationKey];
    if (!evaluation) return false;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }

    // Section header with background color
    doc.setFillColor(...color);
    doc.setDrawColor(...color);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, yPos + 7);
    yPos += 15;

    // Questions and answers
    doc.setFontSize(10);
    
    evaluation.questions.forEach((question: string, idx: number) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = margin;
      }
      
      const answer = answers[idx] || 'No respondido';
      const answerLabel = getLabel(answer);
      
      // Draw question in bold with section color
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      const questionLines = doc.splitTextToSize(`${idx + 1}. ${question}`, pageWidth - 2 * margin - 10);
      questionLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, margin + 5, yPos + (lineIdx * 5));
      });
      yPos += questionLines.length * 5 + 2;
      
      // Draw answer with indentation in normal font and black
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const answerLines = doc.splitTextToSize(`Respuesta: ${answerLabel}`, pageWidth - 2 * margin - 20);
      answerLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, margin + 15, yPos + (lineIdx * 5));
      });
      yPos += answerLines.length * 5 + 8; // More space between questions
    });
    
    yPos += 10; // Space after section
    return true;
  };

  // Add each evaluation section
  const evaluationSections = [
    { key: 'carbohydrateAddiction', title: 'Adicción a los carbohidratos' },
    { key: 'leptinResistance', title: 'Resistencia a la leptina' },
    { key: 'circadianRhythms', title: 'Alteración de los ritmos circadianos / Exposición al sol' },
    { key: 'sleepHygiene', title: 'Alteración en la higiene del sueño' },
    { key: 'electrosmogExposure', title: 'Exposición al electrosmog' },
    { key: 'generalToxicity', title: 'Toxicidad general' },
    { key: 'microbiotaHealth', title: 'Salud de la microbiota' },
  ];

  evaluationSections.forEach(({ key, title }) => {
    addHealthEvaluationSection(title, [244, 114, 182], key);
  });

  // 7. Documents (indigo)
  const documents = client.medicalData.documents || [];
  if (documents.length > 0) {

    // Use autoTable for a nicer table
    if (yPos > 200) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Documentos Médicos', margin + 5, yPos + 7);
    yPos += 15;

    const tableData = documents.map(doc => [
      doc.name,
      `${Math.round(doc.size / 1024)} KB`,
      doc.type.split('/').pop()?.toUpperCase() || doc.type,
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [['Nombre', 'Tamaño', 'Tipo']],
      body: tableData,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [99, 102, 241] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 50;
    yPos += 10;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`NELHEALTHCOACH - Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  // Save the PDF
  doc.save(`cliente_${client.personalData.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
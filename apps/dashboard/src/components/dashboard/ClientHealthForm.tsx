import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';
import { setAuthToken } from '@/lib/authSession';
import {
  evaluationQuestions,
  frequencyOptions,
  yesNoOptions,
  lifestyleQuestions,
  mentalHealthMultipleChoiceQuestions,
  mentalHealthOptions,
  mentalHealthOpenQuestions,
} from '@/lib/formConstants';

interface ClientHealthFormProps {
  clientEmail: string;
  activePlanName?: string;
  onCompleted: (clientId: string) => void;
}

type EvalSectionKey =
  | 'carbohydrateAddiction'
  | 'leptinResistance'
  | 'circadianRhythms'
  | 'sleepHygiene'
  | 'electrosmogExposure'
  | 'generalToxicity'
  | 'microbiotaHealth';

const EVAL_SECTION_ORDER: EvalSectionKey[] = [
  'carbohydrateAddiction',
  'leptinResistance',
  'circadianRhythms',
  'sleepHygiene',
  'electrosmogExposure',
  'generalToxicity',
  'microbiotaHealth',
];

// Índices de preguntas Sí/No por sección (alineados exactamente con apps/form/src/components/HealthEvaluationsStep.tsx)
const YES_NO_INDICES: Record<EvalSectionKey, number[]> = {
  carbohydrateAddiction: [0, 6],
  leptinResistance: [0],
  circadianRhythms: [0, 2, 3, 6, 8, 9, 10],
  sleepHygiene: [0, 1, 2, 3, 4, 5, 8, 11],
  electrosmogExposure: [0, 2, 5, 6, 7, 8, 9],
  generalToxicity: [2, 3, 4, 5, 6, 7],
  microbiotaHealth: [3, 4, 8, 9, 11],
};

const MOTIVATION_OPTIONS = [
  { value: 'perder-peso', label: 'Perder peso / grasa corporal' },
  { value: 'ganar-musculo', label: 'Ganar masa muscular / tonificar' },
  { value: 'mas-energia', label: 'Tener más energía durante el día' },
  { value: 'mejorar-digestion', label: 'Mejorar mi digestión' },
  { value: 'reducir-estres', label: 'Reducir el estrés y la ansiedad' },
  { value: 'dormir-mejor', label: 'Dormir mejor' },
  { value: 'prevenir-enfermedades', label: 'Prevenir enfermedades futuras' },
  { value: 'rendimiento-deportivo', label: 'Mejorar mi rendimiento deportivo' },
  { value: 'manejar-condicion', label: 'Manejar una condición de salud específica' },
];

const ALLOWED_DOC_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const STEP_TITLES = [
  '1. Consentimientos',
  '2. Objetivos',
  '3. Datos Personales',
  '4. Info. Médica',
  '5. Evaluaciones',
  '6. Bienestar Emocional',
  '7. Estilo de Vida',
  '8. Documentos y Envío',
];

function createEmptyEvaluations(): Record<EvalSectionKey, string[]> {
  return {
    carbohydrateAddiction: Array(11).fill(''),
    leptinResistance: Array(8).fill(''),
    circadianRhythms: Array(11).fill(''),
    sleepHygiene: Array(12).fill(''),
    electrosmogExposure: Array(10).fill(''),
    generalToxicity: Array(10).fill(''),
    microbiotaHealth: Array(12).fill(''),
  };
}

export default function ClientHealthForm({
  clientEmail,
  activePlanName,
  onCompleted,
}: ClientHealthFormProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Paso 1: Consentimientos
  const [termsAndPrivacyConsent, setTermsAndPrivacyConsent] = useState(false);
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const [immediateServiceConsent, setImmediateServiceConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Paso 2: Objetivos
  const [motivation, setMotivation] = useState<string[]>([]);
  const [commitmentLevel, setCommitmentLevel] = useState<number>(8);
  const [previousCoachExperience, setPreviousCoachExperience] = useState<string>('');
  const [previousCoachExperienceDetails, setPreviousCoachExperienceDetails] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Paso 3: Datos personales
  const [personal, setPersonal] = useState({
    name: '',
    address: '',
    phone: '',
    birthDate: '',
    gender: '',
    language: 'es' as 'es' | 'en' | 'it' | 'pt' | 'fr' | 'de',
    age: '',
    weight: '',
    height: '',
    maritalStatus: '',
    education: '',
    occupation: '',
    bodyFatPercentage: '',
    weightVariation: '',
    dislikedFoodsActivities: '',
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

  // Paso 4: Información médica básica
  const [basicMedical, setBasicMedical] = useState({
    mainComplaint: '',
    mainComplaintIntensity: 5,
    mainComplaintImpact: '',
    medications: '',
    supplements: '',
    currentPastConditions: '',
    additionalMedicalHistory: '',
    allergies: '',
    surgeries: '',
    employmentHistory: '',
    hobbies: '',
    housingHistory: '',
    appetiteChanges: '',
  });

  // Paso 5: Evaluaciones de salud
  const [evaluations, setEvaluations] = useState<Record<EvalSectionKey, string[]>>(
    createEmptyEvaluations
  );

  // Paso 6: Bienestar emocional
  const [mentalHealth, setMentalHealth] = useState<Record<string, string>>({});

  // Paso 7: Contexto y estilo de vida
  const [lifestyle, setLifestyle] = useState({
    typicalWeekday: '',
    typicalWeekend: '',
    whoCooks: '',
    currentActivityLevel: '',
    physicalLimitations: '',
    gymAccess: '',
    gymAccessDetails: '',
    preferredExerciseTypes: '',
    exerciseTimeAvailability: '',
  });

  // Paso 8: Documentos médicos opcionales
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const handleMotivationToggle = (val: string) => {
    setMotivation((prev) => {
      if (prev.includes(val)) {
        return prev.filter((item) => item !== val);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, val];
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('La foto de perfil debe ser JPEG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto de perfil no puede superar los 5 MB.');
      return;
    }
    setError('');
    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleDocumentsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!ALLOWED_DOC_TYPES.has(file.type)) {
        setError(`Formato no soportado en "${file.name}". Usa PDF, JPG, PNG, WebP o Word.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`El archivo "${file.name}" excede el máximo de 5 MB.`);
        return;
      }
    }
    setError('');
    setDocumentFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const validateCurrentStep = (): boolean => {
    setError('');

    if (step === 0) {
      if (!termsAndPrivacyConsent || !healthDataConsent || !immediateServiceConsent) {
        setError('Debes aceptar los tres consentimientos obligatorios para continuar.');
        return false;
      }
    }

    if (step === 2) {
      if (!personal.name.trim()) {
        setError('Ingresa tu nombre completo.');
        return false;
      }
      if (!personal.phone.trim()) {
        setError('Ingresa tu número de teléfono o WhatsApp.');
        return false;
      }
      if (!personal.address.trim()) {
        setError('Ingresa tu dirección o ciudad/país.');
        return false;
      }
      if (!personal.birthDate) {
        setError('Selecciona tu fecha de nacimiento.');
        return false;
      }
      if (!personal.gender) {
        setError('Selecciona tu género.');
        return false;
      }
      if (!personal.age || !personal.weight || !personal.height) {
        setError('Completa tu edad, peso (kg) y talla (cm).');
        return false;
      }
    }

    if (step === 3) {
      if (!basicMedical.mainComplaint.trim()) {
        setError('Describe tu objetivo o queja principal de salud.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadSingleFile = async (
    clientId: string,
    file: File,
    category: 'profile' | 'document'
  ) => {
    const presigned = await apiClient.generateUploadURL(
      clientId,
      file.name,
      file.type,
      file.size,
      category
    );

    const s3Res = await fetch(presigned.uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!s3Res.ok) {
      throw new Error(`No se pudo subir el archivo "${file.name}".`);
    }

    await apiClient.confirmUpload(
      clientId,
      presigned.fileKey,
      file.name,
      file.type,
      file.size,
      category,
      presigned.fileURL || ''
    );
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        personalData: {
          ...personal,
          email: clientEmail,
          timezone:
            typeof Intl !== 'undefined'
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : undefined,
          age: personal.age ? Number(personal.age) : '',
          weight: personal.weight ? Number(personal.weight) : '',
          height: personal.height ? Number(personal.height) : '',
        },
        medicalData: {
          ...basicMedical,
          motivation,
          commitmentLevel,
          previousCoachExperience,
          previousCoachExperienceDetails,
          targetDate,
          ...evaluations,
          ...mentalHealth,
          ...lifestyle,
          documents: [],
        },
        contractAccepted: true,
        contractVersion: '2026.1',
        healthDataConsent: true,
        termsAndPrivacyConsent: true,
        immediateServiceConsent: true,
        marketingConsent,
        consentTimestamp: new Date().toISOString(),
        consentPolicyVersion: '2026.1',
      };

      const res = await apiClient.submitClientHealthForm(payload);
      const createdId = res?.data?._id;
      if (res?.data?.token) {
        setAuthToken(res.data.token);
      }

      if (createdId) {
        if (profilePhotoFile) {
          await uploadSingleFile(createdId, profilePhotoFile, 'profile').catch(() => {
            /* No bloquear finalización si falla un adjunto opcional; podrá reintentar desde Mi Perfil */
          });
        }
        for (const doc of documentFiles) {
          await uploadSingleFile(createdId, doc, 'document').catch(() => {
            /* Idem */
          });
        }
      }

      onCompleted(createdId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar tu historial clínico.');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Encabezado y barra de progreso */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              {activePlanName ? `Plan activo: ${activePlanName}` : 'Onboarding de Salud'}
            </p>
            <h2 className="text-xl font-bold mt-0.5">Completa tu Historial Personal y Médico</h2>
          </div>
          <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full self-start sm:self-auto">
            Paso {step + 1} de {STEP_TITLES.length}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {STEP_TITLES.map((title, idx) => (
            <button
              key={title}
              type="button"
              disabled={idx > step || submitting}
              onClick={() => idx < step && setStep(idx)}
              title={title}
              className={`h-2 rounded-full transition-all ${
                idx <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-emerald-50 mt-2 font-medium">{STEP_TITLES[step]}</p>
      </div>

      <form onSubmit={handleFinalSubmit} className="p-6 md:p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* PASO 1: Consentimientos */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 space-y-2 max-h-56 overflow-y-auto">
              <h3 className="font-bold text-gray-900">Acuerdo de Coaching y Protección de Datos (v2026.1)</h3>
              <p>
                Manuel Martínez y NELHEALTHCOACH brindan acompañamiento integral en nutrición, hábitos circadianos, descanso y estilo de vida. Este programa no sustituye atención, diagnóstico ni tratamiento médico de urgencia.
              </p>
              <p>
                Tus datos de salud serán cifrados en base de datos y procesados exclusivamente para elaborar tu perfil personalizado y recomendaciones junto a tu asesor asignado (Manuel Martínez).
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAndPrivacyConsent}
                  onChange={(e) => setTermsAndPrivacyConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-800">
                  <strong className="text-red-600">*</strong> He leído y acepto los{' '}
                  <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Términos y Condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Política de Privacidad
                  </a>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={healthDataConsent}
                  onChange={(e) => setHealthDataConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-800">
                  <strong className="text-red-600">*</strong> Autorizo expresamente el tratamiento confidencial de mis datos personales de salud (Art. 9 RGPD) para fines exclusivos de mi programa de coaching.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={immediateServiceConsent}
                  onChange={(e) => setImmediateServiceConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-800">
                  <strong className="text-red-600">*</strong> Solicito el inicio inmediato del servicio digital personalizado tras la activación de mi plan.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-blue-200">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">
                  (Opcional) Deseo recibir guías educativas y novedades de NELHEALTHCOACH por correo electrónico.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* PASO 2: Objetivos */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className={labelClass}>¿Cuál es tu motivación principal? (Selecciona hasta 3)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {MOTIVATION_OPTIONS.map((opt) => {
                  const checked = motivation.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleMotivationToggle(opt.value)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={labelClass}>
                Nivel de compromiso para los próximos 3 meses (1 = bajo, 10 = máximo)
              </p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCommitmentLevel(num)}
                    className={`py-2.5 rounded-lg font-bold border-2 transition ${
                      commitmentLevel === num
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={labelClass}>¿Has trabajado antes con un coach de salud o nutricionista?</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="prevCoach"
                    checked={previousCoachExperience === 'true'}
                    onChange={() => setPreviousCoachExperience('true')}
                    className="text-emerald-600"
                  />
                  Sí
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="prevCoach"
                    checked={previousCoachExperience === 'false'}
                    onChange={() => setPreviousCoachExperience('false')}
                    className="text-emerald-600"
                  />
                  No
                </label>
              </div>
            </div>

            <div>
              <label className={labelClass}>Si respondiste sí, ¿qué funcionó bien y qué no?</label>
              <textarea
                rows={3}
                value={previousCoachExperienceDetails}
                onChange={(e) => setPreviousCoachExperienceDetails(e.target.value)}
                className={inputClass}
                placeholder="Cuéntanos brevemente tu experiencia previa..."
              />
            </div>

            <div>
              <label className={labelClass}>Fecha límite o evento importante (opcional)</label>
              <input
                type="text"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputClass}
                placeholder="Ej: Próximo chequeo médico en 3 meses, vacaciones, etc."
              />
            </div>
          </div>
        )}

        {/* PASO 3: Datos personales */}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre completo *</label>
              <input
                type="text"
                value={personal.name}
                onChange={(e) => setPersonal((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                placeholder="Tu nombre y apellido"
              />
            </div>

            <div>
              <label className={labelClass}>Correo electrónico (vinculado a tu cuenta)</label>
              <input
                type="email"
                value={clientEmail}
                readOnly
                disabled
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
              />
            </div>

            <div>
              <label className={labelClass}>Teléfono / WhatsApp *</label>
              <input
                type="tel"
                value={personal.phone}
                onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
                placeholder="+1 555 000 0000"
              />
            </div>

            <div>
              <label className={labelClass}>{t('clientPortal.addressFieldLabel')}</label>
              <input
                type="text"
                value={personal.address}
                onChange={(e) => setPersonal((p) => ({ ...p, address: e.target.value }))}
                className={inputClass}
                placeholder={t('clientPortal.addressFieldPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('clientPortal.addressFieldHint')}</p>
            </div>

            <div>
              <label className={labelClass}>Fecha de nacimiento *</label>
              <input
                type="date"
                value={personal.birthDate}
                onChange={(e) => setPersonal((p) => ({ ...p, birthDate: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Género *</label>
              <select
                value={personal.gender}
                onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value }))}
                className={inputClass}
              >
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="prefiero-no-decir">Prefiero no decir</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Idioma preferido</label>
              <select
                value={personal.language}
                onChange={(e) =>
                  setPersonal((p) => ({
                    ...p,
                    language: e.target.value as 'es' | 'en' | 'it' | 'pt' | 'fr' | 'de',
                  }))
                }
                className={inputClass}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
                <option value="it">Italiano</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Edad (años) *</label>
              <input
                type="number"
                min={1}
                max={120}
                value={personal.age}
                onChange={(e) => setPersonal((p) => ({ ...p, age: e.target.value }))}
                className={inputClass}
                placeholder="Ej: 38"
              />
            </div>

            <div>
              <label className={labelClass}>Peso (kg) *</label>
              <input
                type="number"
                step="any"
                min={20}
                value={personal.weight}
                onChange={(e) => setPersonal((p) => ({ ...p, weight: e.target.value }))}
                className={inputClass}
                placeholder="Ej: 74.5"
              />
            </div>

            <div>
              <label className={labelClass}>Talla / Estatura (cm) *</label>
              <input
                type="number"
                step="any"
                min={50}
                value={personal.height}
                onChange={(e) => setPersonal((p) => ({ ...p, height: e.target.value }))}
                className={inputClass}
                placeholder="Ej: 172"
              />
            </div>

            <div>
              <label className={labelClass}>Estado civil</label>
              <select
                value={personal.maritalStatus}
                onChange={(e) => setPersonal((p) => ({ ...p, maritalStatus: e.target.value }))}
                className={inputClass}
              >
                <option value="">Seleccionar</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
                <option value="union-libre">Unión libre</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Nivel educativo</label>
              <select
                value={personal.education}
                onChange={(e) => setPersonal((p) => ({ ...p, education: e.target.value }))}
                className={inputClass}
              >
                <option value="">Seleccionar</option>
                <option value="primaria">Primaria</option>
                <option value="secundaria">Secundaria</option>
                <option value="bachillerato">Bachillerato</option>
                <option value="tecnico">Técnico</option>
                <option value="universitario">Universitario</option>
                <option value="posgrado">Posgrado</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Ocupación</label>
              <input
                type="text"
                value={personal.occupation}
                onChange={(e) => setPersonal((p) => ({ ...p, occupation: e.target.value }))}
                className={inputClass}
                placeholder="Tu actividad laboral principal"
              />
            </div>

            <div>
              <label className={labelClass}>% Grasa corporal (opcional)</label>
              <input
                type="text"
                value={personal.bodyFatPercentage}
                onChange={(e) => setPersonal((p) => ({ ...p, bodyFatPercentage: e.target.value }))}
                className={inputClass}
                placeholder="Ej: 22%"
              />
            </div>

            <div>
              <label className={labelClass}>Variación de peso último año</label>
              <select
                value={personal.weightVariation}
                onChange={(e) => setPersonal((p) => ({ ...p, weightVariation: e.target.value }))}
                className={inputClass}
              >
                <option value="">Seleccionar</option>
                <option value="estable">Se ha mantenido estable</option>
                <option value="bajo">Ha bajado</option>
                <option value="subido">Ha subido</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Alimentos o ejercicios que no toleras / evitas (opcional)</label>
              <textarea
                rows={2}
                value={personal.dislikedFoodsActivities}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, dislikedFoodsActivities: e.target.value }))
                }
                className={inputClass}
                placeholder="Ej: No consumo mariscos, prefiero ejercicios de bajo impacto..."
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Foto de perfil (opcional — JPEG/PNG/WebP, máx. 5MB)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="text-sm text-gray-600"
                />
                {profilePhotoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePhotoPreview}
                    alt="Vista previa"
                    className="w-12 h-12 rounded-full object-cover border border-emerald-300"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: Información Médica Básica */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                ¿Cuál es tu mayor queja o motivo principal de consulta? *
              </label>
              <textarea
                rows={3}
                value={basicMedical.mainComplaint}
                onChange={(e) => setBasicMedical((m) => ({ ...m, mainComplaint: e.target.value }))}
                className={inputClass}
                placeholder="Describe síntomas principales, cuándo comenzaron y cómo afectan tu día..."
              />
            </div>

            <div>
              <p className={labelClass}>Intensidad de esa queja (1 = leve, 10 = insoportable)</p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBasicMedical((m) => ({ ...m, mainComplaintIntensity: num }))}
                    className={`py-2 rounded-lg font-bold border transition ${
                      basicMedical.mainComplaintIntensity === num
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>¿Cómo afecta tus actividades diarias?</label>
                <textarea
                  rows={2}
                  value={basicMedical.mainComplaintImpact}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, mainComplaintImpact: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Medicamentos actuales</label>
                <textarea
                  rows={2}
                  value={basicMedical.medications}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, medications: e.target.value }))}
                  className={inputClass}
                  placeholder="Nombre, dosis y frecuencia (o 'Ninguno')"
                />
              </div>
              <div>
                <label className={labelClass}>Suplementos actuales</label>
                <textarea
                  rows={2}
                  value={basicMedical.supplements}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, supplements: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Condiciones médicas actuales y pasadas</label>
                <textarea
                  rows={2}
                  value={basicMedical.currentPastConditions}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, currentPastConditions: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Alergias o intolerancias</label>
                <textarea
                  rows={2}
                  value={basicMedical.allergies}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, allergies: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cirugías previas</label>
                <textarea
                  rows={2}
                  value={basicMedical.surgeries}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, surgeries: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Historial médico adicional / familiar</label>
                <textarea
                  rows={2}
                  value={basicMedical.additionalMedicalHistory}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, additionalMedicalHistory: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Historial laboral actual</label>
                <textarea
                  rows={2}
                  value={basicMedical.employmentHistory}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, employmentHistory: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Hobbies presentes y pasados</label>
                <textarea
                  rows={2}
                  value={basicMedical.hobbies}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, hobbies: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Historial de vivienda</label>
                <textarea
                  rows={2}
                  value={basicMedical.housingHistory}
                  onChange={(e) => setBasicMedical((m) => ({ ...m, housingHistory: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>¿Cambios significativos en apetito o sed recientemente?</label>
              <select
                value={basicMedical.appetiteChanges}
                onChange={(e) => setBasicMedical((m) => ({ ...m, appetiteChanges: e.target.value }))}
                className={inputClass}
              >
                <option value="">Selecciona una opción</option>
                <option value="mucho-hambre">Sí, mucha más hambre</option>
                <option value="mucha-sed">Sí, mucha más sed</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        )}

        {/* PASO 5: Evaluaciones de Salud */}
        {step === 4 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              Responde las preguntas que apliquen a tu situación actual. Esto permite a Manuel Martínez evaluar tus hábitos circadianos, metabólicos y digestivos.
            </p>

            {EVAL_SECTION_ORDER.map((sectionKey) => {
              const section = evaluationQuestions[sectionKey];
              if (!section) return null;
              const yesNoSet = new Set(YES_NO_INDICES[sectionKey]);

              return (
                <div key={sectionKey} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                  <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
                  <div className="space-y-2.5">
                    {section.questions.map((qText, idx) => {
                      const opts = yesNoSet.has(idx) ? yesNoOptions : frequencyOptions;
                      const currentVal = evaluations[sectionKey][idx] || '';
                      return (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded-lg border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                        >
                          <span className="text-sm text-gray-700 flex-1">{qText}</span>
                          <div className="flex flex-wrap gap-2">
                            {opts.map((opt) => (
                              <label
                                key={opt.value}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs cursor-pointer border ${
                                  currentVal === opt.value
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`eval-${sectionKey}-${idx}`}
                                  value={opt.value}
                                  checked={currentVal === opt.value}
                                  onChange={() =>
                                    setEvaluations((prev) => {
                                      const nextArr = [...prev[sectionKey]];
                                      nextArr[idx] = opt.value;
                                      return { ...prev, [sectionKey]: nextArr };
                                    })
                                  }
                                  className="sr-only"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PASO 6: Bienestar Emocional */}
        {step === 5 && (
          <div className="space-y-5">
            {Object.entries(mentalHealthMultipleChoiceQuestions).map(([field, question]) => {
              const opts = mentalHealthOptions[field] || {};
              return (
                <div key={field} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <p className="text-sm font-medium text-gray-800">{question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(opts).map(([val, label]) => (
                      <label
                        key={val}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer ${
                          mentalHealth[field] === val
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-medium'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`mh-${field}`}
                          value={val}
                          checked={mentalHealth[field] === val}
                          onChange={() => setMentalHealth((prev) => ({ ...prev, [field]: val }))}
                          className="text-emerald-600"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.entries(mentalHealthOpenQuestions).map(([field, question]) => (
              <div key={field}>
                <label className={labelClass}>{question}</label>
                <textarea
                  rows={2}
                  value={mentalHealth[field] || ''}
                  onChange={(e) => setMentalHealth((prev) => ({ ...prev, [field]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}

        {/* PASO 7: Contexto y Estilo de Vida */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{lifestyleQuestions.typicalWeekday}</label>
              <textarea
                rows={3}
                value={lifestyle.typicalWeekday}
                onChange={(e) => setLifestyle((l) => ({ ...l, typicalWeekday: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.typicalWeekend}</label>
              <textarea
                rows={3}
                value={lifestyle.typicalWeekend}
                onChange={(e) => setLifestyle((l) => ({ ...l, typicalWeekend: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.whoCooks}</label>
              <textarea
                rows={2}
                value={lifestyle.whoCooks}
                onChange={(e) => setLifestyle((l) => ({ ...l, whoCooks: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.currentActivityLevel}</label>
              <textarea
                rows={2}
                value={lifestyle.currentActivityLevel}
                onChange={(e) => setLifestyle((l) => ({ ...l, currentActivityLevel: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.physicalLimitations}</label>
              <textarea
                rows={2}
                value={lifestyle.physicalLimitations}
                onChange={(e) => setLifestyle((l) => ({ ...l, physicalLimitations: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.gymAccess}</label>
              <select
                value={lifestyle.gymAccess}
                onChange={(e) => setLifestyle((l) => ({ ...l, gymAccess: e.target.value }))}
                className={inputClass}
              >
                <option value="">Selecciona una opción</option>
                <option value="si-gimnasio">Sí, tengo acceso a un gimnasio</option>
                <option value="si-parque">Sí, tengo acceso a un parque de calistenia o área al aire libre</option>
                <option value="equipos-casa">Sí, tengo equipos básicos en casa (pesas, bandas, etc.)</option>
                <option value="peso-corporal">Prefiero ejercicios sin equipo (peso corporal)</option>
                <option value="no-acceso">No tengo acceso a equipos específicos</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.gymAccessDetails}</label>
              <textarea
                rows={2}
                value={lifestyle.gymAccessDetails}
                onChange={(e) => setLifestyle((l) => ({ ...l, gymAccessDetails: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.preferredExerciseTypes}</label>
              <textarea
                rows={2}
                value={lifestyle.preferredExerciseTypes}
                onChange={(e) => setLifestyle((l) => ({ ...l, preferredExerciseTypes: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{lifestyleQuestions.exerciseTimeAvailability}</label>
              <textarea
                rows={2}
                value={lifestyle.exerciseTimeAvailability}
                onChange={(e) => setLifestyle((l) => ({ ...l, exerciseTimeAvailability: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* PASO 8: Documentos médicos opcionales y confirmación */}
        {step === 7 && (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
              <p className="font-semibold">¡Ya casi terminas!</p>
              <p className="text-xs mt-1 text-emerald-800">
                Si tienes exámenes médicos recientes (análisis de sangre, estudios de laboratorio o reportes en PDF/imagen), puedes adjuntarlos aquí. También podrás subir más documentos después desde <strong>Mi Perfil</strong>.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
              <label className="cursor-pointer inline-flex flex-col items-center">
                <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
                  + Seleccionar archivos médicos (opcional)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleDocumentsSelect}
                  className="hidden"
                />
                <span className="text-xs text-gray-500 mt-2">
                  Formatos: PDF, JPG, PNG, WebP o Word. Máximo 5 MB por archivo.
                </span>
              </label>

              {documentFiles.length > 0 && (
                <ul className="mt-4 space-y-2 text-left">
                  {documentFiles.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs"
                    >
                      <span className="truncate font-medium text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDocumentFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-red-600 hover:text-red-800 font-semibold ml-3"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Navegación inferior */}
        <div className="pt-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleBack}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm transition"
            >
              ← Anterior
            </button>
          ) : (
            <div />
          )}

          {step < STEP_TITLES.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm transition shadow-sm"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm transition shadow-md disabled:opacity-50"
            >
              {submitting ? 'Guardando tu perfil...' : 'Finalizar y Crear Mi Perfil'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

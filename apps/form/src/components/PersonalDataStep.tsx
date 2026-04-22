// apps/form/src/components/PersonalDataStep.tsx
import React, { useState } from 'react';
import { useForm, UseFormSetValue } from 'react-hook-form';
import Image from 'next/image';
import { yupResolver } from '@hookform/resolvers/yup';
import { personalDataSchema, PersonalDataFormValues } from '../lib/validation';
import FileUpload from './FileUpload';
import { useTranslation } from 'react-i18next';

interface PersonalDataStepProps {
  data?: Partial<PersonalDataFormValues>;
  onSubmit: (data: PersonalDataFormValues) => void;
  onBack: () => void;
}

const PersonalDataStep: React.FC<PersonalDataStepProps> = ({ data, onSubmit, onBack }) => {
  const { t } = useTranslation();
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setValue,
    trigger
  } = useForm<PersonalDataFormValues>({
    defaultValues: {
      ...data,
      profilePhoto: data?.profilePhoto as File | string | undefined
    },
    resolver: yupResolver(personalDataSchema),
  });

  const handlePhotoSelect = (file: File) => {
    setProfilePhoto(file);
    setPhotoError(null);
    setValue('profilePhoto', file, { shouldValidate: true });
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handlePhotoRemove = () => {
    setProfilePhoto(null);
    setPhotoError('La foto de rostro es requerida');
    setPreviewUrl(null);
    // No establecer el valor en el formulario, dejará que el esquema falle la validación
  };

  const onSubmitWithPhoto = async (formData: PersonalDataFormValues) => {
    // Validar manualmente que haya una foto
    if (!formData.profilePhoto || (!(formData.profilePhoto instanceof File) && typeof formData.profilePhoto !== 'string')) {
      setPhotoError('La foto de rostro es requerida');
      return;
    }

    console.log('📸 Datos personales con foto:', {
      nombre: formData.name,
      tieneFoto: !!formData.profilePhoto,
      nombreFoto: profilePhoto?.name
    });
    
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
      </div>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-16">
              <Image
                src="/logo.png"
                alt="NELHEALTHCOACH"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-blue-500 mb-8">
            Datos Personales
          </h2>
          
          <form onSubmit={handleSubmit(onSubmitWithPhoto)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Tu nombre completo"
                />
                {errors.name?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.name?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: Calle Principal #123, Colonia Centro, Ciudad de México, CP 06000"
                />
                {errors.address?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.address?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: +52 55 1234 5678 (incluye código de país y área)"
                />
                {errors.phone?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.phone?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="tu@email.com"
                />
                {errors.email?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.email?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Fecha de nacimiento *
                </label>
                <input
                  type="date"
                  {...register('birthDate')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                {errors.birthDate?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.birthDate?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  {t('form.gender')} *
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">{t('form.selectYourGender')}</option>
                  <option value="masculino">{t('form.male')}</option>
                  <option value="femenino">{t('form.female')}</option>
                  <option value="prefiero-no-decir">{t('form.preferNotToSay')}</option>
                </select>
                {errors.gender?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.gender?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Edad *
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('age')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Tu edad"
                />
                {errors.age?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.age?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('weight')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Tu peso en kilogramos"
                />
                {errors.weight?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.weight?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Talla (cm) *
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('height')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Tu altura en centímetros"
                />
                {errors.height?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.height?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  {t('form.maritalStatus')} *
                </label>
                <select
                  {...register('maritalStatus')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">{t('form.selectMaritalStatus')}</option>
                  <option value="soltero">{t('form.single')}</option>
                  <option value="casado">{t('form.married')}</option>
                  <option value="divorciado">{t('form.divorced')}</option>
                  <option value="viudo">{t('form.widowed')}</option>
                  <option value="union-libre">{t('form.civilUnion')}</option>
                </select>
                {errors.maritalStatus?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.maritalStatus?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  {t('form.education')} *
                </label>
                <select
                  {...register('education')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">{t('form.selectEducationLevel')}</option>
                  <option value="primaria">{t('form.primary')}</option>
                  <option value="secundaria">{t('form.secondary')}</option>
                  <option value="bachillerato">{t('form.bachelor')}</option>
                  <option value="tecnico">{t('form.technical')}</option>
                  <option value="universitario">{t('form.university')}</option>
                  <option value="posgrado">{t('form.postgraduate')}</option>
                </select>
                {errors.education?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.education?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Ocupación *
                </label>
                <input
                  type="text"
                  {...register('occupation')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: Ingeniero de software, Maestra de primaria, Médico cirujano, Emprendedor en el sector alimenticio"
                />
                {errors.occupation?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.occupation?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Porcentaje de grasa corporal (opcional)
                </label>
                <input
                  type="text"
                  {...register('bodyFatPercentage')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: 25%"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  {t('form.weightStable')}
                </label>
                <select
                  {...register('weightVariation')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">{t('form.selectOption')}</option>
                  <option value="estable">{t('form.stable')}</option>
                  <option value="bajo">{t('form.decreased')}</option>
                  <option value="subido">{t('form.increased')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  {t('form.foodRestrictions')}
                </label>
                <textarea
                  {...register('dislikedFoodsActivities')}
                  rows={3}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: No como mariscos por alergia, evito el brócoli por gases, no me gusta correr por dolor de rodillas, prefiero ejercicios de bajo impacto como natación o yoga, tengo aversión a las coles de Bruselas"
                />
              </div>

              <div className="md:col-span-2">
                <FileUpload
                  onFileSelect={handlePhotoSelect}
                  onFileRemove={handlePhotoRemove}
                  accept="image/jpeg,image/png,image/webp"
                  label="Foto de rostro (requerida)"
                  description="Foto clara de tu rostro, sin accesorios como anteojos oscuros. Formatos: JPEG, PNG, WebP. Máximo 5MB."
                  previewUrl={previewUrl}
                />
                {photoError && <p className="text-red-500 text-sm mt-1">{photoError}</p>}
                {errors.profilePhoto?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.profilePhoto.message)}</p>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row justify-between pt-6 gap-3">
              <button
                type="button"
                onClick={onBack} // Asegúrate de recibir onBack como prop
                className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold order-2 sm:order-1"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold order-1 sm:order-2"
              >
                Siguiente
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalDataStep;
// apps/form/src/components/PersonalDataStep.tsx
import React, { useState } from 'react';
import { useForm, FieldValues } from 'react-hook-form';
import Image from 'next/image';
import { yupResolver } from '@hookform/resolvers/yup';
import { personalDataSchema } from '../lib/validation';
import FileUpload from './FileUpload';
import * as yup from 'yup';

// ✅ Extraer el tipo DIRECTAMENTE del esquema Yup
type PersonalDataFormValues = yup.InferType<typeof personalDataSchema>;

interface PersonalDataStepProps {
  data?: Partial<PersonalDataFormValues>;
  onSubmit: (data: PersonalDataFormValues) => void;
  onBack: () => void;
}

const PersonalDataStep: React.FC<PersonalDataStepProps> = ({ data, onSubmit, onBack }) => {
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ✅ Usar FieldValues como genérico para useForm
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FieldValues>({
    defaultValues: data as FieldValues,
    resolver: yupResolver(personalDataSchema) as unknown, // ✅ Type assertion necesario
  });

  const handlePhotoSelect = (file: File) => {
    setProfilePhoto(file);
    setValue('profilePhoto', file);
    
    // Crear preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handlePhotoRemove = () => {
    setProfilePhoto(null);
    setValue('profilePhoto', undefined);
    setPreviewUrl(null);
  };

  const onSubmitWithPhoto = (formData: FieldValues) => {
    console.log('📸 Datos personales con foto:', {
      nombre: formData.name,
      tieneFoto: !!profilePhoto,
      nombreFoto: profilePhoto?.name
    });
    
    // ✅ Convertir FieldValues al tipo esperado
    const typedData = formData as PersonalDataFormValues;
    onSubmit(typedData);
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
                  placeholder="Tu dirección completa"
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
                  placeholder="Tu número de teléfono"
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
                  Género *
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Selecciona tu género</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="prefiero-no-decir">Prefiero no decir</option>
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
                  step="0.1"
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
                  Estado civil *
                </label>
                <select
                  {...register('maritalStatus')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Selecciona tu estado civil</option>
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="union-libre">Unión libre</option>
                </select>
                {errors.maritalStatus?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.maritalStatus?.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-500 mb-2">
                  Educación *
                </label>
                <select
                  {...register('education')}
                  className="w-full px-4 py-3 text-gray-700 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Selecciona tu nivel educativo</option>
                  <option value="primaria">Primaria</option>
                  <option value="secundaria">Secundaria</option>
                  <option value="bachillerato">Bachillerato</option>
                  <option value="tecnico">Técnico</option>
                  <option value="universitario">Universitario</option>
                  <option value="posgrado">Posgrado</option>
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
                  placeholder="Tu ocupación actual"
                />
                {errors.occupation?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.occupation?.message)}</p>
                )}
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
                {errors.profilePhoto?.message && (
                  <p className="text-red-500 text-sm mt-1">{String(errors.profilePhoto.message)}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={onBack}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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
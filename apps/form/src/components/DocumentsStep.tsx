import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { yupResolver } from '@hookform/resolvers/yup';
import { documentsSchema } from '../lib/validation';
import FileUpload from './FileUpload';
import { useTranslation } from 'react-i18next';

interface DocumentsStepProps {
  data: unknown;
  onSubmit: (data: unknown) => void;
  onBack: () => void;
  loading?: boolean;
}

interface DocumentFile {
  file: File;
  previewUrl: string;
  id: string;
}

const DocumentsStep: React.FC<DocumentsStepProps> = ({ data, onSubmit, onBack, loading = false }) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);

  const { handleSubmit, formState: { errors } } = useForm({
    defaultValues: { documents: [] },
    resolver: yupResolver(documentsSchema),
  });

  const handleDocumentSelect = (file: File) => {
    console.log('📁 Documento seleccionado:', file.name);
    const previewUrl = URL.createObjectURL(file);
    const newDocument: DocumentFile = {
      file,
      previewUrl,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    const updatedDocuments = [...documents, newDocument];
    setDocuments(updatedDocuments);
    console.log('📊 Total de documentos:', updatedDocuments.length);
  };

  const handleDocumentRemove = (id: string) => {
    console.log('🗑️ Eliminando documento:', id);
    const documentToRemove = documents.find(doc => doc.id === id);
    if (documentToRemove) {
      URL.revokeObjectURL(documentToRemove.previewUrl);
    }
    
    const updatedDocuments = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocuments);
    console.log('📊 Documentos restantes:', updatedDocuments.length);
  };

  const handleFormSubmit = () => {
    console.log('🚀 Enviando formulario de documentos...');
    console.log('📄 Documentos a enviar:', documents.map(doc => doc.file.name));
    
    onSubmit({ 
      documents: documents.map(doc => doc.file)
    });
  };

  useEffect(() => {
    // Logging outside of JSX to avoid returning void into ReactNode
    console.log('📝 Estado actual de documentos:', documents);
    console.log('🔍 Errores de formulario:', errors);
  }, [documents, errors]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 py-12 px-4">
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
          
          <h2 className="text-3xl font-bold text-center text-green-500 mb-8">
            Documentos Médicos (OPCIONAL)
          </h2>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleFormSubmit();
          }} className="space-y-8">
            {/* Sección de upload de documentos */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-xl font-semibold text-green-700 mb-4">
                Subir Resultados Médicos 
              </h3>
              
              <FileUpload
                onFileSelect={handleDocumentSelect}
                accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                label="Documentos médicos (opcional)"
                description="Resultados de exámenes, recetas médicas, diagnósticos, etc. Formatos: imágenes (JPEG, PNG, WebP), PDF, Word. Máximo 5MB por archivo."
              />

              {/* Mostrar errores de validación */}
              {errors.documents && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{String(errors.documents.message)}</p>
                </div>
              )}

              {/* Lista de documentos subidos */}
              {documents.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-green-600 mb-3">
                    Documentos seleccionados ({documents.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="bg-white p-4 rounded-lg border border-green-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            {doc.file.type.startsWith('image/') ? '🖼️' : '📄'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-700 truncate max-w-[150px]">
                              {doc.file.name}
                            </p>
                            <p className="text-xs text-green-500">
                              {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDocumentRemove(doc.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                          disabled={loading}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-700 mb-2">{t('form.documentsTitle')}</h4>
              <ul className="text-sm text-green-600 list-disc list-inside space-y-1">
                <li>{t('form.bloodResults')}</li>
                <li>{t('form.imagingStudies')}</li>
                <li>{t('form.currentPrescriptions')}</li>
                <li>{t('form.previousDiagnoses')}</li>
                <li>{t('form.specialistReports')}</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row justify-between pt-6 border-t border-gray-200 gap-3 button-group">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold disabled:opacity-50 order-2 sm:order-1"
                disabled={loading}
              >
                Atrás
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center order-1 sm:order-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  `Finalizar Registro ${documents.length > 0 ? `(${documents.length} archivos)` : '(sin documentos)'}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentsStep;
// apps/form/src/components/FileUpload.tsx
import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept: string;
  maxSize?: number;
  label: string;
  description?: string;
  previewUrl?: string | null;
  existingFile?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB default
  label,
  description,
  previewUrl,
  existingFile = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`);
      return false;
    }

    if (!accept.split(',').some(type => file.type.match(type.replace('*', '')))) {
      setError('Tipo de archivo no permitido');
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileRemove) {
      onFileRemove();
    }
    setError(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-blue-500 mb-2">
        {label}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-blue-300 hover:border-blue-400'
        } ${previewUrl ? 'bg-green-50 border-green-300' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative mx-auto w-32 h-32 bg-white rounded-lg overflow-hidden border">
                {previewUrl.startsWith('data:image') ? (                  
                  <Image 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    layout="fill"
                    objectFit="cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="text-2xl">📄</div>
                      <div className="text-xs text-gray-500 mt-1">Documento</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-sm text-green-600 font-medium">
                ✓ Archivo seleccionado
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Eliminar archivo
              </button>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">📁</div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">
                  Arrastra tu archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500">
                  {description}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FileUpload;
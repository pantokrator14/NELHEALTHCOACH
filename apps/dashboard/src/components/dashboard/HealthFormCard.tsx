// apps/dashboard/src/components/dashboard/HealthFormCard.tsx
import { useState } from 'react'

interface PersonalData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate: string;
  occupation?: string;
}

interface HealthForm {
  personalData: PersonalData;
  submissionDate: string;
  // Agregar otros campos del formulario según sea necesario
}

interface HealthFormCardProps {
  form: HealthForm;
}

export default function HealthFormCard({ form }: HealthFormCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Función para calcular la edad de forma segura
  const calculateAge = (birthDate: string): string => {
    try {
      const birth = new Date(birthDate);
      if (isNaN(birth.getTime())) {
        return 'Fecha inválida';
      }
      
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return `${age} años`;
    } catch {
      return 'Fecha inválida';
    }
  };

  // Función para formatear la fecha de forma segura
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {form.personalData.firstName} {form.personalData.lastName}
            </h3>
            <p className="text-sm text-gray-500">
              {form.personalData.email}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(form.submissionDate)}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4 bg-gray-100 hover:bg-gray-200 rounded-md p-2"
            aria-label={isExpanded ? "Contraer detalles" : "Expandir detalles"}
          >
            <svg
              className={`h-5 w-5 text-gray-600 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Información Personal</h4>
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {form.personalData.phone && (
                  <div>
                    <dt className="text-xs text-gray-500">Teléfono</dt>
                    <dd className="text-sm text-gray-900">{form.personalData.phone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">Edad</dt>
                  <dd className="text-sm text-gray-900">
                    {calculateAge(form.personalData.birthDate)}
                  </dd>
                </div>
                {form.personalData.occupation && (
                  <div>
                    <dt className="text-xs text-gray-500">Ocupación</dt>
                    <dd className="text-sm text-gray-900">{form.personalData.occupation}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
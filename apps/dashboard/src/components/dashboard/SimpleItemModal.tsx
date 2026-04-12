import React, { useState } from 'react';

interface SimpleItemOutput {
  description: string;
  type: string;
  details?: {
    duration?: string;
    frequency?: string;
    equipment?: string[];
  };
  isRecurring?: boolean;
}

interface SimpleItemModalProps {
  category: 'exercise' | 'habit';
  onSave: (data: SimpleItemOutput) => void;
  onClose: () => void;
  initialData?: SimpleItemOutput;
}

const SimpleItemModal: React.FC<SimpleItemModalProps> = ({ 
  category, 
  onSave, 
  onClose,
  initialData 
}) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState(initialData?.type || (category === 'exercise' ? 'cardio' : 'toAdopt'));
  const [duration, setDuration] = useState(initialData?.details?.duration || '');
  const [frequency, setFrequency] = useState(initialData?.details?.frequency || '');
  const [equipment, setEquipment] = useState(initialData?.details?.equipment?.join(', ') || '');
  const isRecurring = false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: SimpleItemOutput = { description, type, isRecurring };
    if (category === 'exercise') {
      data.details = {
        duration,
        frequency,
        equipment: equipment.split(',').map(s => s.trim()).filter(Boolean),
      };
    }
    console.log('Datos del item generado:', data);
    onSave(data);
  };

  const colorClasses = category === 'exercise' 
    ? {
        headerBg: 'bg-blue-50',
        headerBorder: 'border-blue-200',
        headerText: 'text-blue-700',
        label: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        focusRing: 'focus:ring-blue-500',
      }
    : {
        headerBg: 'bg-purple-50',
        headerBorder: 'border-purple-200',
        headerText: 'text-purple-700',
        label: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        focusRing: 'focus:ring-purple-500',
      };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full flex flex-col border-2 overflow-hidden" style={{ borderColor: category === 'exercise' ? '#bfdbfe' : '#e9d5ff' }}>
        {/* Header */}
        <div className={`p-4 border-b ${colorClasses.headerBg} ${colorClasses.headerBorder}`}>
          <h3 className={`text-lg font-bold ${colorClasses.headerText}`}>
            {category === 'exercise' ? '🏋️ Editar ejercicio' : '🌟 Editar hábito'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder={category === 'exercise' ? 'Ej: Caminata rápida' : 'Ej: Beber 2L de agua'}
            />
          </div>

          {category === 'exercise' ? (
            <>
              <div>
                <label className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Tipo de ejercicio
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-2 ${colorClasses.focusRing}`}
                >
                  <option value="cardio">Cardio</option>
                  <option value="strength">Fuerza</option>
                  <option value="flexibility">Flexibilidad</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Duración
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-600"
                  placeholder="Ej: 20 minutos"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Frecuencia
                </label>
                <input
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-600"
                  placeholder="Ej: 3 veces por semana"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Equipo (separado por comas)
                </label>
                <input
                  type="text"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-600"
                  placeholder="Ej: pesas, colchoneta"
                />
              </div>
            </>
          ) : (
            <div>
              <label className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                Tipo de hábito
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'toAdopt' | 'toEliminate')}
                className={`w-full p-2 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-2 ${colorClasses.focusRing}`}
              >
                <option value="toAdopt">Adoptar</option>
                <option value="toEliminate">Eliminar</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-lg transition-colors ${colorClasses.button}`}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleItemModal;
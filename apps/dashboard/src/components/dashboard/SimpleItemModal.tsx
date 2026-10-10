import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        label: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700',
        focusRing: 'focus:ring-blue-500',
      }
    : {
        headerBg: 'bg-purple-50',
        headerBorder: 'border-purple-200',
        headerText: 'text-purple-700',
        label: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700',
        focusRing: 'focus:ring-purple-500',
      };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-md w-full flex flex-col border-2 overflow-hidden shadow-xl" style={{ borderColor: category === 'exercise' ? '#bfdbfe' : '#e9d5ff' }}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${colorClasses.headerBg} ${colorClasses.headerBorder}`}>
          <h3 className={`text-lg font-bold ${colorClasses.headerText}`}>
            {category === 'exercise' ? '🏋️ Editar ejercicio' : '🌟 Editar hábito'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="simple-item-desc" className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
              Descripción
            </label>
            <input
              id="simple-item-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder={category === 'exercise' ? 'Ej: Caminata rápida' : 'Ej: Beber 2L de agua'}
            />
          </div>

          {category === 'exercise' ? (
            <>
              <div>
                <label htmlFor="simple-item-type" className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Tipo de ejercicio
                </label>
                <select
                  id="simple-item-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 ${colorClasses.focusRing}`}
                >
                  <option value="cardio">Cardio</option>
                  <option value="strength">Fuerza</option>
                  <option value="flexibility">Flexibilidad</option>
                </select>
              </div>
              <div>
                <label htmlFor="simple-item-duration" className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Duración
                </label>
                <input
                  id="simple-item-duration"
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  placeholder="Ej: 20 minutos"
                />
              </div>
              <div>
                <label htmlFor="simple-item-frequency" className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Frecuencia
                </label>
                <input
                  id="simple-item-frequency"
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  placeholder="Ej: 3 veces por semana"
                />
              </div>
              <div>
                <label htmlFor="simple-item-equipment" className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                  Equipo (separado por comas)
                </label>
                <input
                  id="simple-item-equipment"
                  type="text"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  placeholder="Ej: pesas, colchoneta"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="simple-item-habit-type" className={`block text-sm font-medium ${colorClasses.label} mb-1`}>
                Tipo de hábito
              </label>
              <select
                id="simple-item-habit-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'toAdopt' | 'toEliminate')}
                className={`w-full p-2 border border-gray-300 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 ${colorClasses.focusRing}`}
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-lg transition-colors ${colorClasses.button} focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none`}
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

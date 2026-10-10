import React, { useState, useEffect } from 'react';

export interface AIRecipeData {
  description: string;
  type: string;
  frequency: number;
  details: {
    recipe: {
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    };
  };
}

interface AIRecipeEditModalProps {
  initialData: AIRecipeData;
  onSave: (data: AIRecipeData) => void;
  onClose: () => void;
}

const AIRecipeEditModal: React.FC<AIRecipeEditModalProps> = ({ initialData, onSave, onClose }) => {
  const [description, setDescription] = useState(initialData.description);
  const [type, setType] = useState(initialData.type || 'meal');
  const [frequency, setFrequency] = useState(initialData.frequency || 1);
  const [ingredients, setIngredients] = useState(
    initialData.details?.recipe?.ingredients?.map(i => `${i.name}: ${i.quantity}`).join("\n") || ''
  );
  const [preparation, setPreparation] = useState(initialData.details?.recipe?.preparation || '');
  const [tips, setTips] = useState(initialData.details?.recipe?.tips || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedIngredients = ingredients.split("\n")
      .filter(line => line.trim() !== '')
      .map(line => {
        const [name, quantity] = line.split(':').map(s => s.trim());
        return { name, quantity, notes: '' };
      });

    onSave({
      description,
      type,
      frequency,
      details: {
        recipe: {
          ingredients: parsedIngredients,
          preparation,
          tips,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full flex flex-col border-2 border-green-200 overflow-hidden">
        <div className="p-4 border-b border-green-200 bg-green-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-green-700">🍽️ Editar receta (IA)</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-green-500 rounded p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor="ai-recipe-desc" className="block text-sm font-medium text-green-600 mb-1">Nombre del plato</label>
            <input
              id="ai-recipe-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="ai-recipe-type" className="block text-sm font-medium text-green-600 mb-1">Tipo</label>
            <select
              id="ai-recipe-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <option value="breakfast">Desayuno</option>
              <option value="lunch">Almuerzo</option>
              <option value="dinner">Cena</option>
              <option value="snack">Merienda</option>
            </select>
          </div>

          <div>
            <label htmlFor="ai-recipe-freq" className="block text-sm font-medium text-green-600 mb-1">Frecuencia (veces/semana)</label>
            <input
              id="ai-recipe-freq"
              type="number"
              min={1}
              max={7}
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="ai-recipe-ing" className="block text-sm font-medium text-green-600 mb-1">
              Ingredientes (uno por línea, formato: &quot;nombre: cantidad&quot;)
            </label>
            <textarea
              id="ai-recipe-ing"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus-visible:ring-2 focus-visible:ring-green-500"
              placeholder="Ej: Huevos: 2 unidades&#10;Espinacas: 100g"
            />
          </div>

          <div>
            <label htmlFor="ai-recipe-prep" className="block text-sm font-medium text-green-600 mb-1">Preparación</label>
            <textarea
              id="ai-recipe-prep"
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="ai-recipe-tips" className="block text-sm font-medium text-green-600 mb-1">Consejos (opcional)</label>
            <textarea
              id="ai-recipe-tips"
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIRecipeEditModal;

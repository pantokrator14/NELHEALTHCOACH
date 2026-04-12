import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import Image from 'next/image';

interface Recipe {
  id: string;
  title: string;
  description: string;
  image?: { url: string };
  cookTime: number;
  ingredients?: string[];
  instructions?: string[];
  isRecurring?: boolean;
}

interface RecipeSearchModalProps {
  onSelect: (recipe: Recipe, frequency: number, isRecurring: boolean) => void;
  onClose: () => void;
}

const RecipeSearchModal: React.FC<RecipeSearchModalProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [frequency, setFrequency] = useState(1);
  const isRecurring = false;

  const searchRecipes = useCallback(async () => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.searchRecipes(search);
      if (response.success) {
        setResults(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchRecipes();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search, searchRecipes]);

  const handleSelectRecipe = (recipe: Recipe) => setSelectedRecipe(recipe);
  const handleConfirm = () => {
    if (selectedRecipe) {
      console.log('Receta seleccionada:', selectedRecipe);
      console.log('Frecuencia:', frequency);
      console.log('¿Es recurrente?', isRecurring);
      onSelect(selectedRecipe, frequency, isRecurring);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-green-200 overflow-hidden">
        {/* Header verde */}
        <div className="p-4 border-b border-green-200 bg-green-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-green-700">🍽️ Buscar receta</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Campo de búsqueda */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Buscar por nombre, ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            results.map(recipe => (
              <div
                key={recipe.id}
                onClick={() => handleSelectRecipe(recipe)}
                className={`p-3 border rounded-lg cursor-pointer flex items-center space-x-4 transition-colors ${
                  selectedRecipe?.id === recipe.id 
                    ? 'bg-green-100 border-green-500' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}
              >
                {recipe.image?.url ? (
                  <Image src={recipe.image.url} alt={recipe.title} width={60} height={60} className="rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-2xl">
                    🍳
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-green-700">{recipe.title}</h4>
                  <p className="text-sm text-gray-600">{recipe.description.substring(0, 80)}...</p>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <span className="mr-3">⏱️ {recipe.cookTime} min</span>
                  </div>
                </div>
              </div>
            ))
          )}
          {results.length === 0 && search.length >= 2 && !loading && (
            <p className="text-center text-gray-500 py-4">No se encontraron recetas</p>
          )}
        </div>

        {/* Pie con frecuencia */}
        {selectedRecipe && (
          <div className="p-4 border-t border-green-200 bg-green-50">
            <label className="block text-sm font-medium text-green-700 mb-2">
              Frecuencia (veces por semana)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min={1}
                max={7}
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
                className="w-20 p-2 border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Agregar a la semana
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeSearchModal;
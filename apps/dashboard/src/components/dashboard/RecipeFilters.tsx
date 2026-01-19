import React, { useState, useEffect } from 'react';
import { Recipe } from '../../../../../packages/types/src/recipe-types';

interface RecipeFiltersProps {
  recipes: Recipe[];
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export interface FilterState {
  search: string;
  category: string[];
  difficulty: string[];
  maxCookTime: number | null;
  minCalories: number | null;
  maxCalories: number | null;
  tags: string[];
}

const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  recipes,
  activeFilters,
  onFilterChange,
  onReset
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extraer categorías únicas de las recetas
  const allCategories = Array.from(
    new Set(recipes.flatMap(recipe => recipe.category))
  ).sort();

  // Extraer tags únicos
  const allTags = Array.from(
    new Set(recipes.flatMap(recipe => recipe.tags))
  ).sort();

  // Dificultades disponibles
  const difficulties = [
    { value: 'fácil', label: 'Fácil' },
    { value: 'medio', label: 'Media' },
    { value: 'dificil', label: 'Difícil' },
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Media' },
    { value: 'hard', label: 'Difícil' }
  ];

  // Actualizar filtros locales y propagar cambios
  const updateFilter = (key: keyof FilterState, value: unknown) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Manejar búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localFilters.search !== activeFilters.search) {
        onFilterChange(localFilters);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localFilters.search]);

  // Calcular estadísticas para los sliders
  const cookTimes = recipes.map(r => r.cookTime).filter(Boolean);
  const maxCookTime = cookTimes.length > 0 ? Math.max(...cookTimes) : 120;
  
  const calories = recipes.map(r => r.nutrition.calories).filter(Boolean);
  const maxCalories = calories.length > 0 ? Math.max(...calories) : 1000;

  // Contar recetas por categoría para mostrar conteo
  const categoryCounts = allCategories.reduce((acc, category) => {
    const count = recipes.filter(r => r.category.includes(category)).length;
    acc[category] = count;
    return acc;
  }, {} as Record<string, number>);

  // Contar recetas por dificultad
  const difficultyCounts = difficulties.reduce((acc, diff) => {
    const count = recipes.filter(r => r.difficulty === diff.value).length;
    acc[diff.value] = count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      {/* Header de filtros */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Filtros de Recetas</h2>
          <p className="text-gray-600 text-sm">
            {recipes.length} recetas disponibles
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Menos opciones' : 'Más opciones'}
          </button>
          
          <button
            onClick={onReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Barra de búsqueda principal */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Buscar recetas por nombre, ingredientes o descripción..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {localFilters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filtros principales (siempre visibles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Categorías */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categorías
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
            {allCategories.map((category) => (
              <label key={category} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.category.includes(category)}
                  onChange={(e) => {
                    const newCategories = e.target.checked
                      ? [...localFilters.category, category]
                      : localFilters.category.filter(c => c !== category);
                    updateFilter('category', newCategories);
                  }}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">
                  {category} 
                  <span className="text-gray-400 text-xs ml-1">
                    ({categoryCounts[category] || 0})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Dificultad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dificultad
          </label>
          <div className="space-y-2">
            {difficulties.filter(d => difficultyCounts[d.value] > 0).map((diff) => (
              <label key={diff.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.difficulty.includes(diff.value)}
                  onChange={(e) => {
                    const newDifficulties = e.target.checked
                      ? [...localFilters.difficulty, diff.value]
                      : localFilters.difficulty.filter(d => d !== diff.value);
                    updateFilter('difficulty', newDifficulties);
                  }}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">
                  {diff.label}
                  <span className="text-gray-400 text-xs ml-1">
                    ({difficultyCounts[diff.value] || 0})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Tiempo de cocción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tiempo máximo: {localFilters.maxCookTime || maxCookTime} min
          </label>
          <input
            type="range"
            min="5"
            max={maxCookTime}
            step="5"
            value={localFilters.maxCookTime || maxCookTime}
            onChange={(e) => updateFilter('maxCookTime', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 min</span>
            <span>{maxCookTime} min</span>
          </div>
        </div>
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros avanzados</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rango de calorías */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rango de calorías
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Mínimo</label>
                  <input
                    type="range"
                    min="0"
                    max={maxCalories}
                    step="10"
                    value={localFilters.minCalories || 0}
                    onChange={(e) => updateFilter('minCalories', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center text-sm text-gray-700">
                    {localFilters.minCalories || 0} cal
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Máximo</label>
                  <input
                    type="range"
                    min="0"
                    max={maxCalories}
                    step="10"
                    value={localFilters.maxCalories || maxCalories}
                    onChange={(e) => updateFilter('maxCalories', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center text-sm text-gray-700">
                    {localFilters.maxCalories || maxCalories} cal
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const newTags = localFilters.tags.includes(tag)
                        ? localFilters.tags.filter(t => t !== tag)
                        : [...localFilters.tags, tag];
                      updateFilter('tags', newTags);
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      localFilters.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mostrar filtros activos */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Filtros activos:</h4>
            <div className="flex flex-wrap gap-2">
              {localFilters.search && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Buscar: &quot;{localFilters.search}&quot;
                  <button onClick={() => updateFilter('search', '')}>×</button>
                </span>
              )}
              
              {localFilters.category.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {cat}
                  <button onClick={() => updateFilter('category', localFilters.category.filter(c => c !== cat))}>×</button>
                </span>
              ))}
              
              {localFilters.difficulty.map(diff => (
                <span key={diff} className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  {difficulties.find(d => d.value === diff)?.label || diff}
                  <button onClick={() => updateFilter('difficulty', localFilters.difficulty.filter(d => d !== diff))}>×</button>
                </span>
              ))}
              
              {localFilters.maxCookTime && localFilters.maxCookTime < maxCookTime && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  ≤ {localFilters.maxCookTime} min
                  <button onClick={() => updateFilter('maxCookTime', null)}>×</button>
                </span>
              )}
              
              {localFilters.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  #{tag}
                  <button onClick={() => updateFilter('tags', localFilters.tags.filter(t => t !== tag))}>×</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeFilters;
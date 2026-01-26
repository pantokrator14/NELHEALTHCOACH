import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
}

export type SortOption = 
  | 'title' 
  | 'cookTime' 
  | 'calories' 
  | 'createdAt' 
  | 'difficulty' 
  | 'ingredientCount';

// Definir dificultades fuera del componente para evitar recreación
const DIFFICULTIES = [
  { value: 'easy', label: 'Fácil', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: 'Difícil', color: 'bg-red-100 text-red-800' },
] as const;

// Definir opciones de ordenamiento fuera del componente
const SORT_OPTIONS = [
  { value: 'title' as const, label: 'Nombre A-Z', icon: '🔤' },
  { value: 'cookTime' as const, label: 'Tiempo de preparación', icon: '⏱️' },
  { value: 'calories' as const, label: 'Calorías', icon: '🔥' },
  { value: 'difficulty' as const, label: 'Dificultad', icon: '📊' },
  { value: 'ingredientCount' as const, label: 'Número de ingredientes', icon: '🥕' },
  { value: 'createdAt' as const, label: 'Fecha de creación', icon: '📅' },
] as const;

const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  recipes,
  activeFilters,
  onFilterChange,
  onReset
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSortExpanded, setIsSortExpanded] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isDifficultyExpanded, setIsDifficultyExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extraer datos únicos para filtros usando useMemo
  const allCategories = useMemo(() => 
    Array.from(new Set(recipes.flatMap(recipe => recipe.category))).sort(),
    [recipes]
  );

  const allTags = useMemo(() =>
    Array.from(new Set(recipes.flatMap(recipe => recipe.tags))).sort(),
    [recipes]
  );

  // Calcular estadísticas para los sliders
  const cookTimes = useMemo(() => 
    recipes.map(r => r.cookTime).filter(Boolean),
    [recipes]
  );
  const maxCookTime = cookTimes.length > 0 ? Math.max(...cookTimes) : 120;
  
  const calories = useMemo(() => 
    recipes.map(r => r.nutrition.calories).filter(Boolean),
    [recipes]
  );
  const maxCalories = calories.length > 0 ? Math.max(...calories) : 1000;

  // Actualizar filtros locales y propagar cambios
  const updateFilter = useCallback((key: keyof FilterState, value: unknown) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // Para búsqueda, manejamos con debounce
    if (key === 'search') {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        onFilterChange(newFilters);
      }, 300);
    } else {
      // Para otros filtros, actualizar inmediatamente
      onFilterChange(newFilters);
    }
  }, [localFilters, onFilterChange]);

  // Sincronizar localFilters cuando activeFilters cambia externamente
  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Contar recetas por categoría
  const categoryCounts = useMemo(() => 
    allCategories.reduce((acc, category) => {
      const count = recipes.filter(r => r.category.includes(category)).length;
      acc[category] = count;
      return acc;
    }, {} as Record<string, number>),
    [allCategories, recipes]
  );

  // Contar recetas por dificultad
  const difficultyCounts = useMemo(() =>
    DIFFICULTIES.reduce((acc, diff) => {
      const count = recipes.filter(r => r.difficulty === diff.value).length;
      acc[diff.value] = count;
      return acc;
    }, {} as Record<string, number>),
    [recipes]
  );

  // Contar recetas por tag
  const tagCounts = useMemo(() =>
    allTags.reduce((acc, tag) => {
      const count = recipes.filter(r => r.tags.includes(tag)).length;
      acc[tag] = count;
      return acc;
    }, {} as Record<string, number>),
    [allTags, recipes]
  );

  // Calcular el número de filtros activos
  const activeFilterCount = useMemo(() => 
    Object.entries(localFilters).reduce((count, [key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return count;
      
      if (Array.isArray(value) && value.length > 0) return count + 1;
      if (typeof value === 'string' && value.trim() !== '') return count + 1;
      if (typeof value === 'number' && value !== null) {
        if (key === 'maxCookTime' && value < maxCookTime) return count + 1;
        if ((key === 'minCalories' && value > 0) || (key === 'maxCalories' && value < maxCalories)) {
          return count + 1;
        }
      }
      return count;
    }, 0),
    [localFilters, maxCookTime, maxCalories]
  );

  // Colapsar todos los acordeones
  const collapseAll = () => {
    setIsSortExpanded(false);
    setIsCategoriesExpanded(false);
    setIsDifficultyExpanded(false);
    setIsAdvancedExpanded(false);
    setIsExpanded(false);
  };

  // Expandir todos los acordeones
  const expandAll = () => {
    setIsSortExpanded(true);
    setIsCategoriesExpanded(true);
    setIsDifficultyExpanded(true);
    setIsAdvancedExpanded(true);
    setIsExpanded(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
      {/* Header de filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Filtros de Recetas</h2>
          <p className="text-gray-600 text-sm">
            {recipes.length} recetas disponibles • {activeFilterCount} filtro(s) activo(s)
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 rounded-lg transition font-medium border border-blue-200"
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
          
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onReset();
                collapseAll();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 rounded-lg transition font-medium border border-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros ({activeFilterCount})
            </button>
          )}

          {isExpanded && (
            <button
              onClick={expandAll}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 rounded-lg transition font-medium border border-green-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Expandir todos
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda principal - SIEMPRE VISIBLE */}
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
            placeholder="Buscar recetas por nombre, ingredientes, categorías o etiquetas..."
            className="w-full pl-10 pr-10 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
          {localFilters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Panel de filtros (Acordeón) */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Acordeón de Ordenamiento */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSortExpanded(!isSortExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                <span className="font-semibold text-gray-900">Ordenamiento</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  {SORT_OPTIONS.find(s => s.value === localFilters.sortBy)?.label} ({localFilters.sortOrder === 'asc' ? '↑' : '↓'})
                </span>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isSortExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {isSortExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordenar por
                    </label>
                    <div className="space-y-2">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateFilter('sortBy', option.value)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                            localFilters.sortBy === option.value
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="mr-3">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                          </div>
                          {localFilters.sortBy === option.value && (
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateFilter('sortOrder', 'asc')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition ${
                          localFilters.sortOrder === 'asc'
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                        </svg>
                        Ascendente
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFilter('sortOrder', 'desc')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition ${
                          localFilters.sortOrder === 'desc'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        Descendente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Acordeón de Categorías */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span className="font-semibold text-gray-900">Categorías</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  {localFilters.category.length} seleccionadas
                </span>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isCategoriesExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {isCategoriesExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="space-y-2 max-h-60 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                  {allCategories.map((category) => (
                    <label key={category} className="flex items-center justify-between group hover:bg-white p-2 rounded transition">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localFilters.category.includes(category)}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...localFilters.category, category]
                              : localFilters.category.filter(c => c !== category);
                            updateFilter('category', newCategories);
                          }}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-3 text-gray-700 group-hover:text-gray-900">
                          {category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {categoryCounts[category] || 0}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Acordeón de Dificultad y Tiempo */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsDifficultyExpanded(!isDifficultyExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-gray-900">Dificultad y Tiempo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  {localFilters.difficulty.length} dificultades
                </span>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isDifficultyExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {isDifficultyExpanded && (
              <div className="p-4 bg-white border-t border-gray-200 space-y-6">
                {/* Dificultad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dificultad
                  </label>
                  <div className="space-y-2">
                    {DIFFICULTIES.map((diff) => (
                      <label key={diff.value} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded transition">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={localFilters.difficulty.includes(diff.value)}
                            onChange={(e) => {
                              const newDifficulties = e.target.checked
                                ? [...localFilters.difficulty, diff.value]
                                : localFilters.difficulty.filter(d => d !== diff.value);
                              updateFilter('difficulty', newDifficulties);
                            }}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                          />
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${diff.color}`}>
                            {diff.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {difficultyCounts[diff.value] || 0}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tiempo de cocción */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Tiempo máximo
                    </label>
                    <span className="text-sm font-semibold text-blue-600">
                      {localFilters.maxCookTime || maxCookTime} min
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max={maxCookTime}
                    step="5"
                    value={localFilters.maxCookTime || maxCookTime}
                    onChange={(e) => updateFilter('maxCookTime', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5 min</span>
                    <span>{maxCookTime} min</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Acordeón de Filtros Avanzados */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold text-gray-900">Filtros Avanzados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  Calorías y Etiquetas
                </span>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isAdvancedExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {isAdvancedExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rango de calorías */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Rango de calorías
                      </label>
                      <span className="text-sm font-semibold text-green-600">
                        {localFilters.minCalories || 0} - {localFilters.maxCalories || maxCalories} cal
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Mínimo: {localFilters.minCalories || 0} cal</label>
                        <input
                          type="range"
                          min="0"
                          max={maxCalories}
                          step="10"
                          value={localFilters.minCalories || 0}
                          onChange={(e) => updateFilter('minCalories', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Máximo: {localFilters.maxCalories || maxCalories} cal</label>
                        <input
                          type="range"
                          min="0"
                          max={maxCalories}
                          step="10"
                          value={localFilters.maxCalories || maxCalories}
                          onChange={(e) => updateFilter('maxCalories', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={localFilters.minCalories || 0}
                        onChange={(e) => updateFilter('minCalories', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        placeholder="Mínimo"
                        min="0"
                        max={maxCalories}
                      />
                      <input
                        type="number"
                        value={localFilters.maxCalories || maxCalories}
                        onChange={(e) => updateFilter('maxCalories', parseInt(e.target.value) || maxCalories)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        placeholder="Máximo"
                        min="0"
                        max={maxCalories}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const newTags = localFilters.tags.includes(tag)
                              ? localFilters.tags.filter(t => t !== tag)
                              : [...localFilters.tags, tag];
                            updateFilter('tags', newTags);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1 ${
                            localFilters.tags.includes(tag)
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <span>#{tag}</span>
                          <span className="text-xs opacity-75">({tagCounts[tag] || 0})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mostrar filtros activos */}
                {activeFilterCount > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Filtros activos
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {localFilters.search && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          Buscar: &quot;{localFilters.search}&quot;
                          <button 
                            onClick={() => updateFilter('search', '')}
                            className="ml-1 hover:text-blue-900"
                            aria-label="Eliminar filtro de búsqueda"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      
                      {localFilters.category.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          Categoría: {cat}
                          <button 
                            onClick={() => updateFilter('category', localFilters.category.filter(c => c !== cat))}
                            aria-label={`Eliminar filtro de categoría ${cat}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      
                      {localFilters.difficulty.map(diff => (
                        <span key={diff} className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                          {DIFFICULTIES.find(d => d.value === diff)?.label || diff}
                          <button 
                            onClick={() => updateFilter('difficulty', localFilters.difficulty.filter(d => d !== diff))}
                            aria-label={`Eliminar filtro de dificultad ${diff}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      
                      {localFilters.maxCookTime && localFilters.maxCookTime < maxCookTime && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          ≤ {localFilters.maxCookTime} min
                          <button 
                            onClick={() => updateFilter('maxCookTime', null)}
                            aria-label="Eliminar filtro de tiempo máximo"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      
                      {localFilters.minCalories && localFilters.minCalories > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          ≥ {localFilters.minCalories} cal
                          <button 
                            onClick={() => updateFilter('minCalories', null)}
                            aria-label="Eliminar filtro de calorías mínimas"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      
                      {localFilters.maxCalories && localFilters.maxCalories < maxCalories && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          ≤ {localFilters.maxCalories} cal
                          <button 
                            onClick={() => updateFilter('maxCalories', null)}
                            aria-label="Eliminar filtro de calorías máximas"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      
                      {localFilters.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                          #{tag}
                          <button 
                            onClick={() => updateFilter('tags', localFilters.tags.filter(t => t !== tag))}
                            aria-label={`Eliminar filtro de etiqueta ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        Orden: {SORT_OPTIONS.find(s => s.value === localFilters.sortBy)?.label} ({localFilters.sortOrder === 'asc' ? '↑' : '↓'})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeFilters;
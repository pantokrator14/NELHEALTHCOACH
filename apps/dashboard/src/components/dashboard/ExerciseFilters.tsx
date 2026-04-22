import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Exercise } from '../../lib/api';

interface ExerciseFiltersProps {
  exercises: Exercise[];
  activeFilters: ExerciseFilterState;
  onFilterChange: (filters: ExerciseFilterState) => void;
  onReset: () => void;
}

export interface ExerciseFilterState {
  search: string;
  category: string[];
  difficulty: string[];
  clientLevel: string[];
  muscleGroup: string[];
  equipment: string[];
  sortBy: ExerciseSortOption;
  sortOrder: 'asc' | 'desc';
}

export type ExerciseSortOption =
  | 'name'
  | 'createdAt'
  | 'difficulty'
  | 'clientLevel'
  | 'sets'
  | 'muscleGroupCount';

const DIFFICULTIES = [
  { value: 'easy' as const, label: 'Fácil', color: 'bg-green-100 text-green-800' },
  { value: 'medium' as const, label: 'Medio', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard' as const, label: 'Complejo', color: 'bg-red-100 text-red-800' },
] as const;

const LEVELS = [
  { value: 'principiante' as const, label: 'Principiante', color: 'bg-blue-100 text-blue-800' },
  { value: 'intermedio' as const, label: 'Intermedio', color: 'bg-purple-100 text-purple-800' },
  { value: 'avanzado' as const, label: 'Avanzado', color: 'bg-orange-100 text-orange-800' },
] as const;

const SORT_OPTIONS = [
  { value: 'name' as const, label: 'Nombre A-Z', icon: '🔤' },
  { value: 'createdAt' as const, label: 'Fecha de creación', icon: '📅' },
  { value: 'difficulty' as const, label: 'Dificultad', icon: '📊' },
  { value: 'clientLevel' as const, label: 'Nivel de cliente', icon: '🎯' },
  { value: 'sets' as const, label: 'Series', icon: '💪' },
  { value: 'muscleGroupCount' as const, label: 'Grupos musculares', icon: '🏋️' },
] as const;

const ExerciseFilters: React.FC<ExerciseFiltersProps> = ({
  exercises,
  activeFilters,
  onFilterChange,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<ExerciseFilterState>(activeFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSortExpanded, setIsSortExpanded] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isDifficultyExpanded, setIsDifficultyExpanded] = useState(false);
  const [isLevelExpanded, setIsLevelExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const allCategories = useMemo(() =>
    Array.from(new Set(exercises.flatMap(e => e.category))).sort(),
    [exercises]
  );

  const allMuscleGroups = useMemo(() =>
    Array.from(new Set(exercises.flatMap(e => e.muscleGroups))).sort(),
    [exercises]
  );

  const allEquipment = useMemo(() =>
    Array.from(new Set(exercises.flatMap(e => e.equipment))).sort(),
    [exercises]
  );

  const updateFilter = useCallback((key: keyof ExerciseFilterState, value: unknown) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    if (key === 'search') {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        onFilterChange(newFilters);
      }, 300);
    } else {
      onFilterChange(newFilters);
    }
  }, [localFilters, onFilterChange]);

  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const categoryCounts = useMemo(() =>
    allCategories.reduce((acc, cat) => {
      acc[cat] = exercises.filter(e => e.category.includes(cat)).length;
      return acc;
    }, {} as Record<string, number>),
    [allCategories, exercises]
  );

  const difficultyCounts = useMemo(() =>
    DIFFICULTIES.reduce((acc, diff) => {
      acc[diff.value] = exercises.filter(e => e.difficulty === diff.value).length;
      return acc;
    }, {} as Record<string, number>),
    [exercises]
  );

  const levelCounts = useMemo(() =>
    LEVELS.reduce((acc, level) => {
      acc[level.value] = exercises.filter(e => e.clientLevel === level.value).length;
      return acc;
    }, {} as Record<string, number>),
    [exercises]
  );

  const muscleGroupCounts = useMemo(() =>
    allMuscleGroups.reduce((acc, mg) => {
      acc[mg] = exercises.filter(e => e.muscleGroups.includes(mg)).length;
      return acc;
    }, {} as Record<string, number>),
    [allMuscleGroups, exercises]
  );

  const equipmentCounts = useMemo(() =>
    allEquipment.reduce((acc, eq) => {
      acc[eq] = exercises.filter(e => e.equipment.includes(eq)).length;
      return acc;
    }, {} as Record<string, number>),
    [allEquipment, exercises]
  );

  const activeFilterCount = useMemo(() =>
    Object.entries(localFilters).reduce((count, [key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return count;
      if (Array.isArray(value) && value.length > 0) return count + 1;
      if (typeof value === 'string' && value.trim() !== '') return count + 1;
      return count;
    }, 0),
    [localFilters]
  );

  const collapseAll = () => {
    setIsSortExpanded(false);
    setIsCategoriesExpanded(false);
    setIsDifficultyExpanded(false);
    setIsLevelExpanded(false);
    setIsAdvancedExpanded(false);
    setIsExpanded(false);
  };

  const expandAll = () => {
    setIsSortExpanded(true);
    setIsCategoriesExpanded(true);
    setIsDifficultyExpanded(true);
    setIsLevelExpanded(true);
    setIsAdvancedExpanded(true);
    setIsExpanded(true);
  };

  const toggleArrayFilter = (key: keyof ExerciseFilterState, value: string) => {
    const current = localFilters[key] as string[];
    const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateFilter(key, updated);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Filtros de Ejercicios</h2>
          <p className="text-gray-600 text-sm">
            {exercises.length} ejercicios disponibles • {activeFilterCount} filtro(s) activo(s)
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 hover:from-teal-100 hover:to-teal-200 rounded-lg transition font-medium border border-teal-200"
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { onReset(); collapseAll(); }}
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

      {/* Search bar - SIEMPRE VISIBLE */}
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
            placeholder="Buscar ejercicios por nombre, categorías, grupos musculares o equipamiento..."
            className="w-full pl-10 pr-10 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
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
          {/* Ordenamiento */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSortExpanded(!isSortExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-teal-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                <span className="font-semibold text-gray-900">Ordenamiento</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  {SORT_OPTIONS.find(s => s.value === localFilters.sortBy)?.label} ({localFilters.sortOrder === 'asc' ? '↑' : '↓'})
                </span>
                <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isSortExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {isSortExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
                    <div className="space-y-2">
                      {SORT_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateFilter('sortBy', option.value)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                            localFilters.sortBy === option.value
                              ? 'bg-teal-50 border-teal-300 text-teal-700'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="mr-3">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                          </div>
                          {localFilters.sortBy === option.value && (
                            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
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
                        ↑ Ascendente
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
                        ↓ Descendente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dificultad */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsDifficultyExpanded(!isDifficultyExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-semibold text-gray-900">Dificultad</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  {localFilters.difficulty.length} seleccionada(s)
                </span>
                <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isDifficultyExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {isDifficultyExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DIFFICULTIES.map(diff => (
                    <button
                      key={diff.value}
                      type="button"
                      onClick={() => toggleArrayFilter('difficulty', diff.value)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                        localFilters.difficulty.includes(diff.value)
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff.color}`}>{diff.label}</span>
                      <span className="text-sm text-gray-500">{difficultyCounts[diff.value] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nivel de cliente */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsLevelExpanded(!isLevelExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-semibold text-gray-900">Nivel de cliente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                  {localFilters.clientLevel.length} seleccionado(s)
                </span>
                <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isLevelExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {isLevelExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {LEVELS.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => toggleArrayFilter('clientLevel', level.value)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                        localFilters.clientLevel.includes(level.value)
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${level.color}`}>{level.label}</span>
                      <span className="text-sm text-gray-500">{levelCounts[level.value] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categorías */}
          {allCategories.length > 0 && (
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
                    {localFilters.category.length} seleccionada(s)
                  </span>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isCategoriesExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {isCategoriesExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleArrayFilter('category', cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                          localFilters.category.includes(cat)
                            ? 'bg-teal-100 border-teal-300 text-teal-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cat} ({categoryCounts[cat] ?? 0})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Avanzado: Grupos musculares + Equipamiento */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-gray-900">Filtros avanzados</span>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isAdvancedExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isAdvancedExpanded && (
              <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                {/* Grupos musculares */}
                {allMuscleGroups.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Grupos musculares</h4>
                    <div className="flex flex-wrap gap-2">
                      {allMuscleGroups.map(mg => (
                        <button
                          key={mg}
                          type="button"
                          onClick={() => toggleArrayFilter('muscleGroup', mg)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                            localFilters.muscleGroup.includes(mg)
                              ? 'bg-teal-100 border-teal-300 text-teal-800'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {mg} ({muscleGroupCounts[mg] ?? 0})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Equipamiento */}
                {allEquipment.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Equipamiento</h4>
                    <div className="flex flex-wrap gap-2">
                      {allEquipment.map(eq => (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => toggleArrayFilter('equipment', eq)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                            localFilters.equipment.includes(eq)
                              ? 'bg-teal-100 border-teal-300 text-teal-800'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {eq} ({equipmentCounts[eq] ?? 0})
                        </button>
                      ))}
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

export default ExerciseFilters;

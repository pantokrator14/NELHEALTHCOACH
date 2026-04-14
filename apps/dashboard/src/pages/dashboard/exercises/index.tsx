import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import ExerciseCard from '../../../components/dashboard/ExerciseCard';
import ExerciseModal from '../../../components/dashboard/ExerciseModal';
import ExerciseDetailModal from '../../../components/dashboard/ExerciseDetailModal';
import ExerciseFilters, { ExerciseFilterState, ExerciseSortOption } from '../../../components/dashboard/ExerciseFilters';
import { useToast } from '../../../components/ui/Toast';
import { apiClient, Exercise, ExerciseFormData } from '../../../lib/api';

const ExercisesPage = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  });

  // Estado para eliminación múltiple
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const [filters, setFilters] = useState<ExerciseFilterState>({
    search: '',
    category: [],
    difficulty: [],
    clientLevel: [],
    muscleGroup: [],
    equipment: [],
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { showToast, ToastComponent } = useToast();

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getExercises();

      if (response.success) {
        setExercises(response.data);

        const statsData = {
          total: response.data.length,
          easy: response.data.filter(e => e.difficulty === 'easy').length,
          medium: response.data.filter(e => e.difficulty === 'medium').length,
          hard: response.data.filter(e => e.difficulty === 'hard').length,
        };
        setStats(statsData);
      } else {
        console.error('Error al cargar ejercicios:', response.message);
        showToast('Error al cargar los ejercicios', 'error');
      }
    } catch (err: unknown) {
      console.error('Error loading exercises:', err);
      showToast('Error al cargar los ejercicios', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Obtener categorías y tags existentes para sugerencias
  const existingCategories = useMemo(() => {
    return Array.from(new Set(exercises.flatMap(ex => ex.category))).sort();
  }, [exercises]);

  const existingTags = useMemo(() => {
    return Array.from(new Set(exercises.flatMap(ex => ex.tags))).sort();
  }, [exercises]);

  const existingMuscleGroups = useMemo(() => {
    return Array.from(new Set(exercises.flatMap(ex => ex.muscleGroups))).sort();
  }, [exercises]);

  const existingEquipment = useMemo(() => {
    return Array.from(new Set(exercises.flatMap(ex => ex.equipment))).sort();
  }, [exercises]);

  // Filtrar y ordenar ejercicios
  const filteredAndSortedExercises = useMemo(() => {
    let result = [...exercises];

    // Aplicar filtros
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(exercise =>
        exercise.name.toLowerCase().includes(searchLower) ||
        exercise.description.toLowerCase().includes(searchLower) ||
        exercise.category.some(cat => cat.toLowerCase().includes(searchLower)) ||
        exercise.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        exercise.muscleGroups.some(mg => mg.toLowerCase().includes(searchLower)) ||
        exercise.equipment.some(eq => eq.toLowerCase().includes(searchLower))
      );
    }

    if (filters.category.length > 0) {
      result = result.filter(exercise =>
        filters.category.some(cat => exercise.category.includes(cat))
      );
    }

    if (filters.difficulty.length > 0) {
      result = result.filter(exercise =>
        filters.difficulty.includes(exercise.difficulty)
      );
    }

    if (filters.clientLevel.length > 0) {
      result = result.filter(exercise =>
        filters.clientLevel.includes(exercise.clientLevel)
      );
    }

    if (filters.muscleGroup.length > 0) {
      result = result.filter(exercise =>
        filters.muscleGroup.some(mg => exercise.muscleGroups.includes(mg))
      );
    }

    if (filters.equipment.length > 0) {
      result = result.filter(exercise =>
        filters.equipment.some(eq => exercise.equipment.includes(eq))
      );
    }

    // Ordenar
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'difficulty':
          const diffOrder = { easy: 1, medium: 2, hard: 3 };
          comparison = (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0);
          break;
        case 'clientLevel':
          const levelOrder = { principiante: 1, intermedio: 2, avanzado: 3 };
          comparison = (levelOrder[a.clientLevel] || 0) - (levelOrder[b.clientLevel] || 0);
          break;
        case 'sets':
          comparison = a.sets - b.sets;
          break;
        case 'muscleGroupCount':
          comparison = a.muscleGroups.length - b.muscleGroups.length;
          break;
        default: // createdAt
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [exercises, filters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      search: '',
      category: [],
      difficulty: [],
      clientLevel: [],
      muscleGroup: [],
      equipment: [],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, []);

  // Handlers de eliminación
  const toggleDeleteMode = useCallback(() => {
    if (deleteMode) {
      setSelectedExercises([]);
    }
    setDeleteMode(prev => !prev);
  }, [deleteMode]);

  const toggleExerciseSelection = useCallback((id: string) => {
    setSelectedExercises(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleDeleteMultipleExercises = useCallback(async () => {
    if (selectedExercises.length === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedExercises.length} ejercicio(s)? Esta acción no se puede deshacer.`)) return;
    try {
      const response = await apiClient.deleteExercises(selectedExercises);
      if (response.success) {
        showToast(`${response.data.deletedCount} ejercicio(s) eliminado(s)`, 'success');
        setSelectedExercises([]);
        setDeleteMode(false);
        loadExercises();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar ejercicios';
      showToast(errorMessage, 'error');
    }
  }, [selectedExercises, showToast, loadExercises]);

  // Handlers de card click
  const handleCardClick = useCallback((exercise: Exercise) => {
    if (deleteMode) return;
    setSelectedExercise(exercise);
    setIsDetailModalOpen(true);
  }, [deleteMode]);

  const hasPrevious = useMemo(() => {
    if (!selectedExercise) return false;
    const idx = filteredAndSortedExercises.findIndex(e => e.id === selectedExercise.id);
    return idx > 0;
  }, [selectedExercise, filteredAndSortedExercises]);

  const hasNext = useMemo(() => {
    if (!selectedExercise) return false;
    const idx = filteredAndSortedExercises.findIndex(e => e.id === selectedExercise.id);
    return idx < filteredAndSortedExercises.length - 1;
  }, [selectedExercise, filteredAndSortedExercises]);

  const handlePrevious = useCallback(() => {
    if (!selectedExercise) return;
    const idx = filteredAndSortedExercises.findIndex(e => e.id === selectedExercise.id);
    if (idx > 0) {
      setSelectedExercise(filteredAndSortedExercises[idx - 1]);
    }
  }, [selectedExercise, filteredAndSortedExercises]);

  const handleNext = useCallback(() => {
    if (!selectedExercise) return;
    const idx = filteredAndSortedExercises.findIndex(e => e.id === selectedExercise.id);
    if (idx < filteredAndSortedExercises.length - 1) {
      setSelectedExercise(filteredAndSortedExercises[idx + 1]);
    }
  }, [selectedExercise, filteredAndSortedExercises]);

  // Handlers de editar/eliminar desde modal
  const handleEditExercise = useCallback((exercise: Exercise) => {
    setIsDetailModalOpen(false);
    setSelectedExercise(exercise);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteExercise = useCallback(async (exercise: Exercise) => {
    if (!confirm(`¿Eliminar "${exercise.name}"?`)) return;
    try {
      await apiClient.deleteExercises([exercise.id]);
      showToast('Ejercicio eliminado', 'success');
      setIsDetailModalOpen(false);
      setSelectedExercise(null);
      loadExercises();
    } catch {
      showToast('Error al eliminar el ejercicio', 'error');
    }
  }, [showToast, loadExercises]);

  // Crear ejercicio
  const handleCreateExercise = useCallback(() => {
    setSelectedExercise(null);
    setIsEditModalOpen(true);
  }, []);

  // onSuccess del modal de edición/creación
  const handleExerciseSuccess = useCallback((_exercise?: Exercise) => {
    loadExercises();
    setIsEditModalOpen(false);
    setSelectedExercise(null);
  }, [loadExercises]);

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-teal-100 rounded-full"></div>
              </div>
            </div>
            <p className="mt-6 text-lg text-gray-700 font-medium">Cargando ejercicios...</p>
            <p className="text-gray-500">Por favor espera un momento</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Ejercicios - NELHEALTHCOACH</title>
        <meta name="description" content="Gestión de ejercicios para clientes" />
      </Head>
      <Layout>
        <div className="p-8">
          {/* Encabezado */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mr-4 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-teal-700">
                  Ejercicios
                </h1>
                <p className="text-teal-600 mt-1">Gestiona tu biblioteca de ejercicios para clientes</p>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 shadow-sm">
                <div className="text-lg text-gray-700">
                  Total: <span className="font-bold text-blue-700 text-xl">{stats.total}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 shadow-sm">
                <div className="text-lg text-gray-700">
                  Fáciles: <span className="font-bold text-green-700 text-xl">{stats.easy}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200 shadow-sm">
                <div className="text-lg text-gray-700">
                  Medios: <span className="font-bold text-yellow-700 text-xl">{stats.medium}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200 shadow-sm">
                <div className="text-lg text-gray-700">
                  Difíciles: <span className="font-bold text-red-700 text-xl">{stats.hard}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <ExerciseFilters
            exercises={exercises}
            activeFilters={filters}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
          />

          {/* Botones de acciones */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              {deleteMode ? (
                <button
                  onClick={toggleDeleteMode}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-md font-medium"
                  aria-label="Cancelar modo eliminación"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              ) : (
                <button
                  onClick={toggleDeleteMode}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 shadow-md font-medium"
                  aria-label="Activar modo eliminación múltiple"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar Varios
                </button>
              )}
            </div>
            <button
              onClick={handleCreateExercise}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all transform hover:scale-105 shadow-md font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Nuevo Ejercicio
            </button>
          </div>

          {/* Banner de modo eliminación */}
          {deleteMode && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-700 font-medium">
                  Modo eliminación - Selecciona los ejercicios que deseas eliminar.
                  <span className="font-normal text-red-600 ml-1">Haz clic en el checkbox de cada tarjeta para seleccionar.</span>
                </p>
              </div>
            </div>
          )}

          {/* Resultados de búsqueda */}
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {filteredAndSortedExercises.length === exercises.length
                ? `Todos los ejercicios (${filteredAndSortedExercises.length})`
                : `Ejercicios encontrados: ${filteredAndSortedExercises.length} de ${exercises.length}`
              }
            </h3>

            {filteredAndSortedExercises.length > 0 && (
              <div className="text-sm text-teal-700 bg-gray-100 px-3 py-1 rounded-full">
                Ordenado por: {
                  filters.sortBy === 'name' ? 'Nombre' :
                  filters.sortBy === 'difficulty' ? 'Dificultad' :
                  filters.sortBy === 'clientLevel' ? 'Nivel' :
                  filters.sortBy === 'sets' ? 'Series' :
                  filters.sortBy === 'muscleGroupCount' ? 'Grupos musculares' :
                  'Fecha'
                } ({filters.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
              </div>
            )}
          </div>

          {/* Grid de ejercicios */}
          {filteredAndSortedExercises.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredAndSortedExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  deleteMode={deleteMode}
                  isSelected={selectedExercises.includes(exercise.id)}
                  onToggleSelect={toggleExerciseSelection}
                  onClick={() => handleCardClick(exercise)}
                />
              ))}
            </div>
          ) : exercises.length > 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
              <div className="text-gray-400 text-6xl mb-6">🔍</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">No se encontraron ejercicios</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                No hay ejercicios que coincidan con los filtros seleccionados.
                Intenta ajustar tus criterios de búsqueda.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-200">
              <div className="text-teal-400 text-7xl mb-6">⚡</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">No hay ejercicios registrados</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Comienza creando tu primer ejercicio para tus clientes.</p>
              <button
                onClick={handleCreateExercise}
                className="px-8 py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition font-medium shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Primer Ejercicio
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Botón flotante para eliminar seleccionados */}
        {deleteMode && selectedExercises.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleDeleteMultipleExercises}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 shadow-lg font-medium animate-bounce"
              aria-label={`Eliminar ${selectedExercises.length} ejercicios seleccionados`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar seleccionados ({selectedExercises.length})
            </button>
          </div>
        )}

        {/* Modal de detalle */}
        {isDetailModalOpen && selectedExercise && (
          <ExerciseDetailModal
            exercise={selectedExercise}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedExercise(null);
            }}
            onEdit={() => handleEditExercise(selectedExercise)}
            onDelete={() => handleDeleteExercise(selectedExercise)}
            onPrevious={() => { if (hasPrevious) handlePrevious(); }}
            onNext={() => { if (hasNext) handleNext(); }}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        )}

        {/* Modal de creación/edición */}
        {isEditModalOpen && (
          <ExerciseModal
            exercise={selectedExercise}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedExercise(null);
            }}
            onSuccess={handleExerciseSuccess}
            existingCategories={existingCategories}
            existingTags={existingTags}
            allExercises={exercises}
          />
        )}

        {/* Toast Notifications */}
        <ToastComponent />
      </Layout>
    </>
  );
};

export default ExercisesPage;

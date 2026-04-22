import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import RecipeCard from '../../../components/dashboard/RecipeCard';
import RecipeModal from '../../../components/dashboard/RecipeModal';
import RecipeDetailModal from '../../../components/dashboard/RecipeDetailModal';
import RecipeFilters, { FilterState, SortOption } from '../../../components/dashboard/RecipeFilters';
import { useToast } from '../../../components/ui/Toast';
import { apiClient } from '../../../lib/api';
import { Recipe } from '../../../../../../packages/types/src/recipe-types';
import { useTranslation } from 'react-i18next';

const RecipesPage = () => {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
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
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: [],
    difficulty: [],
    maxCookTime: null,
    minCalories: null,
    maxCalories: null,
    tags: [],
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { showToast, ToastComponent } = useToast();

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRecipes();
      
      if (response.success) {
        setRecipes(response.data);
        
        const statsData = {
          total: response.data.length,
          easy: response.data.filter(r => r.difficulty === 'easy').length,
          medium: response.data.filter(r => r.difficulty === 'medium').length,
          hard: response.data.filter(r => r.difficulty === 'hard').length,
        };
        setStats(statsData);
      } else {
        console.error('Error loading recipes:', response.message);
        showToast(t('recipes.errorLoading'), 'error');
      }
    } catch (err: unknown) {
      console.error('Error loading recipes:', err);
      showToast(t('recipes.errorLoading'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // Obtener categorías y tags existentes para sugerencias
  const existingCategories = useMemo(() => {
    return Array.from(new Set(recipes.flatMap(recipe => recipe.category))).sort();
  }, [recipes]);

  const existingTags = useMemo(() => {
    return Array.from(new Set(recipes.flatMap(recipe => recipe.tags))).sort();
  }, [recipes]);

  // Filtrar y ordenar recetas
  const filteredAndSortedRecipes = useMemo(() => {
    let result = [...recipes];

    // Aplicar filtros
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(recipe =>
        recipe.title.toLowerCase().includes(searchLower) ||
        recipe.description.toLowerCase().includes(searchLower) ||
        recipe.category.some(cat => cat.toLowerCase().includes(searchLower)) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        recipe.ingredients.some(ing => ing.toLowerCase().includes(searchLower))
      );
    }

    if (filters.category.length > 0) {
      result = result.filter(recipe =>
        filters.category.some(cat => recipe.category.includes(cat))
      );
    }

    if (filters.difficulty.length > 0) {
      result = result.filter(recipe =>
        filters.difficulty.includes(recipe.difficulty)
      );
    }

    if (filters.maxCookTime !== null) {
      result = result.filter(recipe =>
        recipe.cookTime <= filters.maxCookTime!
      );
    }

    if (filters.minCalories !== null) {
      result = result.filter(recipe =>
        recipe.nutrition.calories >= filters.minCalories!
      );
    }

    if (filters.maxCalories !== null) {
      result = result.filter(recipe =>
        recipe.nutrition.calories <= filters.maxCalories!
      );
    }

    if (filters.tags.length > 0) {
      result = result.filter(recipe =>
        filters.tags.some(tag => recipe.tags.includes(tag))
      );
    }

    // Aplicar ordenamiento
    const getSortValue = (recipe: Recipe, sortBy: SortOption): number | string => {
      switch (sortBy) {
        case 'title':
          return recipe.title.toLowerCase();
        case 'cookTime':
          return recipe.cookTime;
        case 'calories':
          return recipe.nutrition.calories;
        case 'difficulty':
          return recipe.difficulty === 'easy' ? 1 : recipe.difficulty === 'medium' ? 2 : 3;
        case 'ingredientCount':
          return recipe.ingredients.length;
        case 'createdAt':
          return new Date(recipe.createdAt).getTime();
        default:
          return 0;
      }
    };

    result.sort((a, b) => {
      const aValue = getSortValue(a, filters.sortBy);
      const bValue = getSortValue(b, filters.sortBy);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return filters.sortOrder === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return result;
  }, [recipes, filters]);

  // Calcular índices para navegación
  const currentIndex = useMemo(() => {
    if (!selectedRecipe) return -1;
    return filteredAndSortedRecipes.findIndex(r => r.id === selectedRecipe.id);
  }, [selectedRecipe, filteredAndSortedRecipes]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < filteredAndSortedRecipes.length - 1;

  const handlePrevious = useCallback(() => {
    if (hasPrevious && currentIndex > 0) {
      setSelectedRecipe(filteredAndSortedRecipes[currentIndex - 1]);
    }
  }, [hasPrevious, currentIndex, filteredAndSortedRecipes]);

  const handleNext = useCallback(() => {
    if (hasNext && currentIndex < filteredAndSortedRecipes.length - 1) {
      setSelectedRecipe(filteredAndSortedRecipes[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, filteredAndSortedRecipes]);

  const handleCardClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsDetailModalOpen(true);
  };

  const handleCreateRecipe = () => {
    setSelectedRecipe(null);
    setIsEditModalOpen(true);
  };

  const handleEditRecipe = () => {
    if (selectedRecipe) {
      setIsDetailModalOpen(false);
      setIsEditModalOpen(true);
    }
  };

 

  // Función para eliminar múltiples recetas
  const handleDeleteMultipleRecipes = async () => {
    if (selectedRecipes.length === 0) return;

    if (window.confirm(`¿Estás seguro de eliminar ${selectedRecipes.length} receta(s)? Esta acción no se puede deshacer.`)) {
      try {
        // Eliminar cada receta individualmente
        for (const recipeId of selectedRecipes) {
          await apiClient.deleteRecipe(recipeId);
        }
        showToast(t('recipes.deletedMultiple', { count: selectedRecipes.length.toString() }), 'success');
        await loadRecipes();
        // Salir del modo eliminar y limpiar selección
        setDeleteMode(false);
        setSelectedRecipes([]);
      } catch (err: unknown) {
        console.error('Error deleting recipes:', err);
        const errorMessage = err instanceof Error ? err.message : t('recipes.errorDeleting');
        showToast(errorMessage, 'error');
      }
    }
  };

  // Función para alternar selección de una receta
  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  // Función para activar/desactivar modo eliminar
  const toggleDeleteMode = () => {
    if (deleteMode) {
      // Si está activo, desactivar y limpiar selección
      setDeleteMode(false);
      setSelectedRecipes([]);
    } else {
      // Activar modo eliminar
      setDeleteMode(true);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;
    
    if (window.confirm(`¿Estás seguro de eliminar la receta "${selectedRecipe.title}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiClient.deleteRecipe(selectedRecipe.id);
        showToast(t('recipes.deleted'), 'success');
        await loadRecipes();
        setIsDetailModalOpen(false);
        setSelectedRecipe(null);
      } catch (err: unknown) {
        console.error('Error deleting recipe:', err);
        const errorMessage = err instanceof Error ? err.message : t('recipes.errorDeleting');
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: [],
      difficulty: [],
      maxCookTime: null,
      minCalories: null,
      maxCalories: null,
      tags: [],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const handleRecipeSuccess = useCallback((updatedRecipe?: Recipe) => {
    // Recargar la lista para reflejar cambios
    loadRecipes();

    if (isEditModalOpen && updatedRecipe) {
      // Venimos de edición: cerrar modal de edición y abrir detalle con la receta actualizada
      setIsEditModalOpen(false);
      setSelectedRecipe(updatedRecipe);
      setIsDetailModalOpen(true);
    } else if (!isEditModalOpen && updatedRecipe) {
      // Venimos de creación: decidir qué hacer
      // Opción A: abrir detalle de la receta creada
      setSelectedRecipe(updatedRecipe);
      setIsDetailModalOpen(true);
      // Opción B: simplemente recargar (comportamiento actual)
      // Si eliges esta, no hagas nada extra
    }
  }, [loadRecipes, isEditModalOpen]);

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full"></div>
              </div>
            </div>
            <p className="mt-6 text-lg text-gray-700 font-medium">Cargando recetas...</p>
            <p className="text-gray-500">Por favor espera un momento</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Recetas - NELHEALTHCOACH</title>
        <meta name="description" content="Gestión de recetas saludables para clientes" />
      </Head>
      <Layout>
        <div className="p-8">
          {/* Encabezado */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mr-4 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-green-700">
                  Recetas Saludables
                </h1>
                <p className="text-green-600 mt-1">Gestiona tu biblioteca de recetas para clientes</p>
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
                  Medias: <span className="font-bold text-yellow-700 text-xl">{stats.medium}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200 shadow-sm">
                <div className="text-lg text-gray-700">
                  Complejas: <span className="font-bold text-red-700 text-xl">{stats.hard}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <RecipeFilters
            recipes={recipes}
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
                  Eliminar Varias
                </button>
              )}
            </div>
            <button
              onClick={handleCreateRecipe}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-md font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Nueva Receta
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
                  Modo eliminación - Selecciona las recetas que deseas eliminar. 
                  <span className="font-normal text-red-600 ml-1">Haz clic en la X de cada tarjeta para seleccionar.</span>
                </p>
              </div>
            </div>
          )}

          {/* Resultados de búsqueda */}
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {filteredAndSortedRecipes.length === recipes.length
                ? `Todas las recetas (${filteredAndSortedRecipes.length})`
                : `Recetas encontradas: ${filteredAndSortedRecipes.length} de ${recipes.length}`
              }
            </h3>
            
            {filteredAndSortedRecipes.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Ordenado por: {
                  filters.sortBy === 'title' ? 'Nombre' :
                  filters.sortBy === 'cookTime' ? 'Tiempo' :
                  filters.sortBy === 'calories' ? 'Calorías' :
                  filters.sortBy === 'difficulty' ? 'Dificultad' :
                  filters.sortBy === 'ingredientCount' ? 'Ingredientes' :
                  'Fecha'
                } ({filters.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
              </div>
            )}
          </div>

          {/* Grid de recetas */}
          {filteredAndSortedRecipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredAndSortedRecipes.map((recipe) => (
                 <RecipeCard
                   key={recipe.id}
                   recipe={recipe}
                   onClick={() => handleCardClick(recipe)}
                   deleteMode={deleteMode}
                   isSelected={selectedRecipes.includes(recipe.id)}
                   onToggleSelect={toggleRecipeSelection}
                 />
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
              <div className="text-gray-400 text-6xl mb-6">🔍</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">No se encontraron recetas</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                No hay recetas que coincidan con los filtros seleccionados. 
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
            <div className="text-center py-16 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-200">
              <div className="text-green-400 text-7xl mb-6">🍽️</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">No hay recetas registradas</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Comienza creando tu primera receta saludable para tus clientes.</p>
              <button
                onClick={handleCreateRecipe}
                className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition font-medium shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Primera Receta
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Botón flotante para eliminar seleccionados */}
        {deleteMode && selectedRecipes.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleDeleteMultipleRecipes}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 shadow-lg font-medium animate-bounce"
              aria-label={`Eliminar ${selectedRecipes.length} recetas seleccionadas`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar seleccionados ({selectedRecipes.length})
            </button>
          </div>
        )}

        {/* Modal de detalles */}
        {isDetailModalOpen && selectedRecipe && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedRecipe(null);
            }}
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
            onPrevious={hasPrevious ? handlePrevious : undefined}
            onNext={hasNext ? handleNext : undefined}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
       )}

        {/* Modal de creación/edición */}
        {isEditModalOpen && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedRecipe(null);
            }}
            onSuccess={handleRecipeSuccess}  // ✅ Solo recarga la lista
            existingCategories={existingCategories}
            existingTags={existingTags}
          />
        )}

        {/* Toast Notifications */}
        <ToastComponent />
      </Layout>
    </>
  );
};

export default RecipesPage;
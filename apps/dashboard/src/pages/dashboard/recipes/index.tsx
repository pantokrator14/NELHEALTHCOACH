import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import RecipeCard from '../../../components/dashboard/RecipeCard';
import RecipeModal from '../../../components/dashboard/RecipeModal';
import RecipeDetailModal from '../../../components/dashboard/RecipeDetailModal';
import RecipeFilters, { FilterState, SortOption } from '../../../components/dashboard/RecipeFilters';
import { useToast } from '../../../components/ui/Toast';
import { apiClient } from '../../../lib/api';
import { Recipe, RecipeFormData } from '../../../../../../packages/types/src/recipe-types';

const RecipesPage = () => {
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
        console.error('Error al cargar recetas:', response.message);
        showToast('Error al cargar las recetas', 'error');
      }
    } catch (err: unknown) {
      console.error('Error loading recipes:', err);
      showToast('Error al cargar las recetas', 'error');
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

  const handleSaveRecipe = async (recipeData: RecipeFormData) => {
    try {
      if (selectedRecipe?.id) {
        await apiClient.updateRecipe(selectedRecipe.id, recipeData);
        showToast('¡Receta actualizada exitosamente!', 'success');
      } else {
        await apiClient.createRecipe(recipeData);
        showToast('¡Receta creada exitosamente!', 'success');
      }
      await loadRecipes();
      setIsEditModalOpen(false);
      setSelectedRecipe(null);
    } catch (err: unknown) {
      console.error('Error saving recipe:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar receta';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;
    
    if (window.confirm(`¿Estás seguro de eliminar la receta "${selectedRecipe.title}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiClient.deleteRecipe(selectedRecipe.id);
        showToast('Receta eliminada exitosamente', 'success');
        await loadRecipes();
        setIsDetailModalOpen(false);
        setSelectedRecipe(null);
      } catch (err: unknown) {
        console.error('Error deleting recipe:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error al eliminar receta';
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
                <h1 className="text-3xl font-bold text-gray-900">
                  Recetas Saludables
                </h1>
                <p className="text-gray-700 mt-1">Gestiona tu biblioteca de recetas para clientes</p>
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
                  Difíciles: <span className="font-bold text-red-700 text-xl">{stats.hard}</span>
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

          {/* Botón para crear receta */}
          <div className="mb-6 flex justify-end">
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
            onSave={handleSaveRecipe}
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
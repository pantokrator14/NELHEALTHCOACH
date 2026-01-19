// apps/dashboard/src/pages/dashboard/recipes/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import RecipeCard from '../../../components/dashboard/RecipeCard';
import RecipeModal from '../../../components/dashboard/RecipeModal';
import RecipeDetailModal from '../../../components/dashboard/RecipeDetailModal';
import { apiClient } from '../../../lib/api';
import { Recipe, RecipeFormData } from '../../../../../../packages/types/src/recipe-types';

const RecipesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  });

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRecipes();
      
      if (response.success) {
        setRecipes(response.data);
        
        // Calcular estadísticas
        const statsData = {
          total: response.data.length,
          easy: response.data.filter(r => r.difficulty === 'easy').length,
          medium: response.data.filter(r => r.difficulty === 'medium').length,
          hard: response.data.filter(r => r.difficulty === 'hard').length,
        };
        setStats(statsData);
      } else {
        console.error('Error al cargar recetas:', response.message);
      }
    } catch (err: unknown) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // Filtrar recetas basado en búsqueda
  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      } else {
        await apiClient.createRecipe(recipeData);
      }
      await loadRecipes();
      setIsEditModalOpen(false);
      setSelectedRecipe(null);
    } catch (err: unknown) {
      console.error('Error saving recipe:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar receta');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;
    
    if (window.confirm(`¿Estás seguro de eliminar la receta "${selectedRecipe.title}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiClient.deleteRecipe(selectedRecipe.id);
        await loadRecipes();
        setIsDetailModalOpen(false);
        setSelectedRecipe(null);
      } catch (err: unknown) {
        console.error('Error deleting recipe:', err);
        alert(err instanceof Error ? err.message : 'Error al eliminar receta');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Recetas - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-8">
          {/* Encabezado - Igual que en clientes */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-green-700">
                  Recetas Saludables
                </h1>
                <p className="text-gray-600">Gestiona tu biblioteca de recetas para clientes</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="text-lg text-gray-700">
                  Total: <span className="font-semibold text-green-600">{stats.total}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="text-lg text-gray-700">
                  Fáciles: <span className="font-semibold text-green-600">{stats.easy}</span>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <div className="text-lg text-gray-700">
                  Medias: <span className="font-semibold text-yellow-600">{stats.medium}</span>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <div className="text-lg text-gray-700">
                  Difíciles: <span className="font-semibold text-red-600">{stats.hard}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de búsqueda y acciones - Igual que en clientes */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar recetas por título, descripción, categoría o etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 text-gray-700 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={handleCreateRecipe}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-md font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Nueva Receta
            </button>
          </div>

          {/* Grid de recetas - Igual que en clientes */}
          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleCardClick(recipe)}
                />
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron recetas</h3>
              <p className="text-gray-500">Intenta con otros términos de búsqueda.</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 text-green-600 hover:text-green-800"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay recetas registradas</h3>
              <p className="text-gray-500 mb-6">Comienza creando tu primera receta saludable.</p>
              <button
                onClick={handleCreateRecipe}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Crear Primera Receta
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
          />
        )}
      </Layout>
    </>
  );
};

export default RecipesPage;
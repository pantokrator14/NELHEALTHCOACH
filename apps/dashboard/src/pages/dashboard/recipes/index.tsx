import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/dashboard/Layout';
import RecipeCard from '../../../components/dashboard/RecipeCard';
import RecipeModal from '../../../components/dashboard/RecipeModal';
import { apiClient } from '../../../lib/api';
import { Recipe, RecipeFormData, RecipeImage } from '../../../../../../packages/types/src/recipe-types';

const RecipesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getRecipes();
      if (response.success) {
        setRecipes(response.data);
      } else {
        setError(response.message || 'Error al cargar recetas');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleCardClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleCreateRecipe = () => {
    setSelectedRecipe(null);
    setIsModalOpen(true);
  };

  const handleSaveRecipe = async (recipeData: RecipeFormData & { image?: RecipeImage }) => {
    try {
      if (selectedRecipe?.id) {
        await apiClient.updateRecipe(selectedRecipe.id, recipeData);
      } else {
        await apiClient.createRecipe(recipeData);
      }
      await loadRecipes();
      setIsModalOpen(false);
      setSelectedRecipe(null);
    } catch (err: unknown) {
      console.error('Error saving recipe:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar receta');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta receta?')) {
      try {
        await apiClient.deleteRecipe(id);
        await loadRecipes();
      } catch (err: unknown) {
        console.error('Error deleting recipe:', err);
        alert(err instanceof Error ? err.message : 'Error al eliminar receta');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadRecipes}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
            <p className="text-gray-600 mt-1">
              {recipes.length} receta{recipes.length !== 1 ? 's' : ''} disponible{recipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={handleCreateRecipe}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Subir nueva receta
          </button>
        </div>

        {/* Grid de recetas */}
        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No hay recetas aún</h3>
            <p className="mt-1 text-gray-500">Comienza subiendo tu primera receta.</p>
            <button
              onClick={handleCreateRecipe}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Crear primera receta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => handleCardClick(recipe)}
                onDelete={() => handleDeleteRecipe(recipe.id)}
              />
            ))}
          </div>
        )}

        {/* Modal para crear/editar receta */}
        {isModalOpen && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedRecipe(null);
            }}
            onSave={handleSaveRecipe}
          />
        )}
      </div>
    </Layout>
  );
};

export default RecipesPage;
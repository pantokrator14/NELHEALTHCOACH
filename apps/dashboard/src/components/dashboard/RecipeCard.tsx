import React from 'react';
import { Recipe } from '../../../../../packages/types/src/recipe-types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  deleteMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (recipeId: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  onClick, 
  deleteMode = false, 
  isSelected = false, 
  onToggleSelect 
}) => {
  // Formatear dificultad para mostrar
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Media';
      case 'hard': return 'Complejo';
      default: return difficulty;
    }
  };

  // Obtener color basado en dificultad
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Formatear tiempo de cocción
  const formatCookTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // ✅ FUNCIÓN PARA OBTENER URL DE IMAGEN SEGURA
  const getSafeImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    
    // Si la URL empieza con U2FsdGVkX1, está encriptada
    if (url.startsWith('U2FsdGVkX1')) {
      // Devolver un placeholder ya que no podemos desencriptar en el frontend
      // El backend debería devolverla desencriptada
      return '';
    }
    
    return url;
  };

  const safeImageUrl = getSafeImageUrl(recipe.image?.url);

  return (
    <div
      onClick={deleteMode ? undefined : onClick}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ${deleteMode ? 'cursor-default' : 'cursor-pointer'} border ${isSelected ? 'border-red-300 hover:border-red-400' : 'border-green-100 hover:border-green-300'} p-4 group h-full flex flex-col relative`}
    >
      {/* Imagen de la receta - CORREGIDO */}
      <div className="relative mb-4 overflow-hidden rounded-lg h-48">
        {safeImageUrl ? (
          <div 
            className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ 
              backgroundImage: `url(${safeImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            role="img"
            aria-label={recipe.title}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Botón de selección para eliminación múltiple */}
        {deleteMode && onToggleSelect && (
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(recipe.id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${isSelected ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              aria-label={isSelected ? 'Deseleccionar receta' : 'Seleccionar receta para eliminar'}
            >
              {isSelected ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Badge de dificultad */}
        <div className="absolute top-2 right-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
            {getDifficultyText(recipe.difficulty)}
          </span>
        </div>
      </div>

      {/* Contenido de la card */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-green-700 transition-colors line-clamp-1">
          {recipe.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>

        {/* Categorías */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {recipe.category.slice(0, 2).map((cat, index) => (
              <span 
                key={index} 
                className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium"
              >
                {cat}
              </span>
            ))}
            {recipe.category.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{recipe.category.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Información rápida */}
        <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatCookTime(recipe.cookTime)}</span>
          </div>
          
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{recipe.nutrition.calories} cal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
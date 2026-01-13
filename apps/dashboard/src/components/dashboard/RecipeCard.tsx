import React from 'react';
import Image from 'next/image';
import { Recipe } from '../../../../../packages/types/src/recipe-types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, onDelete }) => {
  // Función para obtener color según categoría
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'mexicana': 'bg-red-100 text-red-800',
      'keto': 'bg-green-100 text-green-800',
      'vegana': 'bg-emerald-100 text-emerald-800',
      'baja en carbohidratos': 'bg-blue-100 text-blue-800',
      'alta en proteína': 'bg-purple-100 text-purple-800',
      'saludable': 'bg-amber-100 text-amber-800',
      'rápida': 'bg-cyan-100 text-cyan-800',
      'postre': 'bg-pink-100 text-pink-800',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className="group relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      {/* Badge de dificultad */}
      <div className="absolute top-3 right-3 z-10">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getDifficultyColor(recipe.difficulty)}`}>
          {recipe.difficulty === 'easy' ? 'Fácil' : 
           recipe.difficulty === 'medium' ? 'Media' : 'Difícil'}
        </span>
      </div>

      {/* Botón de eliminar */}
      <button
        onClick={onDelete}
        className="absolute top-3 left-3 z-10 p-2 bg-white rounded-full shadow-md hover:bg-red-50 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
        aria-label="Eliminar receta"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Imagen de la receta */}
      <div className="h-48 overflow-hidden bg-gray-100">
        {recipe.image?.url ? (
          <Image
            src={recipe.image.url}
            alt={recipe.title}
            width={1200}
            height={675}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Contenido de la card */}
      <div className="p-5">
        {/* Categorías */}
        <div className="flex flex-wrap gap-2 mb-3">
          {recipe.category.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(cat)}`}
            >
              {cat}
            </span>
          ))}
          {recipe.category.length > 2 && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              +{recipe.category.length - 2}
            </span>
          )}
        </div>

        {/* Título */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {recipe.title}
        </h3>

        {/* Descripción */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>

        {/* Información nutricional */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-blue-700 font-bold text-lg">
              {recipe.nutrition.protein}g
            </div>
            <div className="text-blue-600 text-xs">Proteína</div>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <div className="text-amber-700 font-bold text-lg">
              {recipe.nutrition.calories}
            </div>
            <div className="text-amber-600 text-xs">Calorías</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600">{recipe.cookTime} min</span>
          </div>
          
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
            Ver detalles
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
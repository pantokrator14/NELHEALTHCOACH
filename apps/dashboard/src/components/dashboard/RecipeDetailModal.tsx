import React, { useEffect } from 'react';
import Image from 'next/image';
import { Recipe } from '../../../../../packages/types/src/recipe-types';

interface RecipeDetailModalProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ 
  recipe, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  // Formatear la dificultad para mostrarla en español
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Media';
      case 'hard': return 'Difícil';
      default: return difficulty;
    }
  };

  // Calcular tiempo formateado
  const formatCookTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Cerrar modal con tecla Esc (si no está enviando o subiendo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Encabezado del modal */}
        <div className="p-4 md:p-6 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="text-xl md:text-2xl font-bold">Detalles de la Receta</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-green-800 rounded-full transition"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Columna izquierda - Imagen y metadatos */}
            <div className="space-y-6">
              {/* Imagen de la receta */}
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                {recipe.image?.url ? (
                  <div className="relative w-full h-64">
                    <Image
                      src={recipe.image.url}
                      alt={recipe.title}
                      fill
                      unoptimized={true}
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                      📸
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <svg className="w-20 h-20 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{recipe.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800 border border-green-200' :
                      recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {getDifficultyText(recipe.difficulty)}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-6">{recipe.description}</p>
                  
                  {/* Metadatos rápidos */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                    <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-100">
                      <div className="text-xl md:text-2xl font-bold text-blue-700">{formatCookTime(recipe.cookTime)}</div>
                      <div className="text-sm text-gray-700 font-medium mt-1">Tiempo</div>
                    </div>
                    <div className="bg-green-50 p-3 md:p-4 rounded-lg border border-green-100">
                      <div className="text-xl md:text-2xl font-bold text-green-700">{recipe.nutrition.calories}</div>
                      <div className="text-sm text-gray-700 font-medium mt-1">Calorías</div>
                    </div>
                    <div className="bg-orange-50 p-3 md:p-4 rounded-lg border border-orange-100">
                      <div className="text-xl md:text-2xl font-bold text-orange-700">{recipe.ingredients.length}</div>
                      <div className="text-sm text-gray-700 font-medium mt-1">Ingredientes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información nutricional - COLOR VERDE */}
              <div className="bg-white rounded-lg border border-green-200 p-4 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-2">
                  <h3 className="text-base md:text-lg font-bold text-green-700 flex items-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center mr-2 md:mr-3">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Información Nutricional
                  </h3>
                  <span className="text-xs md:text-sm text-green-600 font-medium bg-green-50 px-2 md:px-3 py-1 rounded-full self-start md:self-auto">
                    Por porción
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex justify-between items-center p-2 md:p-3 bg-green-50 rounded-lg text-sm md:text-base">
                      <span className="text-gray-700 font-medium">Proteínas</span>
                      <span className="font-bold text-green-700 text-base md:text-lg">{recipe.nutrition.protein}g</span>
                    </div>
                    <div className="flex justify-between items-center p-2 md:p-3 bg-green-50 rounded-lg text-sm md:text-base">
                      <span className="text-gray-700 font-medium">Carbohidratos</span>
                      <span className="font-bold text-green-700 text-base md:text-lg">{recipe.nutrition.carbs}g</span>
                    </div>
                    <div className="flex justify-between items-center p-2 md:p-3 bg-green-50 rounded-lg text-sm md:text-base">
                      <span className="text-gray-700 font-medium">Grasas</span>
                      <span className="font-bold text-green-700 text-base md:text-lg">{recipe.nutrition.fat}g</span>
                    </div>
                    <div className="flex justify-between items-center p-2 md:p-3 bg-green-100 rounded-lg border border-green-200 text-sm md:text-base">
                      <span className="text-gray-700 font-medium">Calorías totales</span>
                      <span className="font-bold text-green-800 text-lg md:text-xl">{recipe.nutrition.calories}</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 md:p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-700 mb-2 text-sm md:text-base">Análisis Nutricional</h4>
                    <p className="text-xs md:text-sm text-gray-700">
                      Esta receta es una opción{' '}
                      <span className="font-semibold text-green-800">
                        {recipe.nutrition.protein > recipe.nutrition.carbs ? 'rica en proteínas' : 
                        recipe.nutrition.carbs > recipe.nutrition.fat ? 'rica en carbohidratos' : 
                        'balanceada en grasas'}
                      </span>
                      . Ideal para {recipe.tags.join(', ').toLowerCase() || 'una alimentación saludable'}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Categorías y etiquetas */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  Categorías y Etiquetas
                </h3>
                <div className="space-y-6">
                  {/* Categorías - COLOR ÍNDIGO */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                      Categorías:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.category.map((cat, index) => (
                        <span 
                          key={index} 
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100 hover:bg-indigo-100 transition"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Etiquetas - COLOR ROSA */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                      Etiquetas:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg text-sm font-medium border border-pink-100 hover:bg-pink-100 transition"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Ingredientes e instrucciones */}
            <div className="space-y-6">
              {/* Ingredientes - COLOR NARANJA */}
              <div className="bg-white rounded-lg border border-orange-200 p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Ingredientes</h3>
                  <span className="ml-auto bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                    {recipe.ingredients.length} items
                  </span>
                </div>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start group hover:bg-orange-50 p-2 rounded-lg transition">
                      <div className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-gray-700 group-hover:text-orange-800 transition">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instrucciones - COLOR PÚRPURA */}
              <div className="bg-white rounded-lg border border-purple-200 p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Instrucciones de Preparación</h3>
                  <span className="ml-auto bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    {recipe.instructions.length} pasos
                  </span>
                </div>
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex group hover:bg-purple-50 p-3 rounded-lg transition">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-800 rounded-full font-bold mr-4 border-2 border-purple-200">
                          {index + 1}
                        </div>
                      </div>
                      <div className="pt-1">
                        <p className="text-gray-700 group-hover:text-purple-800 transition">{instruction}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 md:p-6 border-t border-gray-200 bg-white rounded-b-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="text-xs md:text-sm text-gray-700 w-full md:w-auto">
            <span className="font-medium">Creado:</span>{' '}
            {new Date(recipe.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {recipe.author && (
              <>
                {' '}• <span className="font-medium">Autor:</span> {recipe.author}
              </>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={onClose}
              className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center text-sm"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cerrar
            </button>
            <button
              onClick={onDelete}
              className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center text-sm"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
            <button
              onClick={onEdit}
              className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center text-sm"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar Receta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;
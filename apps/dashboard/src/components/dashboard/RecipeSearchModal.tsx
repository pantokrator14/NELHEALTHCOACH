import React, { useState, useEffect, useCallback } from 'react';

interface Recipe {
  id: string;
  title: string;
  description: string;
  image?: { url: string };
  cookTime: number;
  difficulty?: string;
  category?: string[];
  isRecurring?: boolean;
}

interface RecipeSearchModalProps {
  onSelect: (recipe: Recipe) => void;
  onClose: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const RecipeSearchModal: React.FC<RecipeSearchModalProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const searchRecipes = useCallback(async () => {
    if (search.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { apiClient } = await import('@/lib/api');
      const response = await apiClient.searchRecipes(search);
      if (response.success) setResults(response.data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const delay = setTimeout(searchRecipes, 400);
    return () => clearTimeout(delay);
  }, [searchRecipes]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, -1)); }
      else if (e.key === 'Enter' && focusedIndex >= 0 && results[focusedIndex]) {
        const recipe = results[focusedIndex];
        onSelect(recipe);
        onClose();
      }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [results, focusedIndex, onSelect, onClose]);

  const selectedRecipe = results.find(r => r.id === selectedId);

  const handleConfirm = () => {
    if (selectedRecipe) {
      onSelect(selectedRecipe);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={containerRef}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span>🍽️</span> Buscar Receta
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFocusedIndex(-1); }}
              placeholder="Buscar por nombre, ingrediente, categoría..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoFocus
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-2" />
              Buscando recetas...
            </div>
          )}

          {!loading && results.length === 0 && search.length >= 2 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No se encontraron recetas.</p>
              <p className="text-gray-400 text-xs mt-1">Prueba con otros términos.</p>
            </div>
          )}

          {!loading && search.length < 2 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Escribe al menos 2 caracteres para buscar.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((recipe, idx) => {
                const isSelected = selectedId === recipe.id;
                const isFocused = idx === focusedIndex;
                return (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedId(recipe.id)}
                    onDoubleClick={() => { onSelect(recipe); onClose(); }}
                    className={`text-left rounded-xl border-2 p-3 transition-all ${
                      isSelected || isFocused
                        ? 'border-green-500 bg-green-50 shadow-md scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:shadow'
                    }`}
                  >
                    {/* Image / Placeholder */}
                    <div className="w-full h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {recipe.image?.url ? (
                        <img src={recipe.image.url} alt={recipe.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-green-300">🍳</span>
                      )}
                    </div>

                    {/* Info */}
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-1">{recipe.title}</p>

                    <div className="flex flex-wrap gap-1">
                      {recipe.cookTime && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⏱ {recipe.cookTime}min</span>
                      )}
                      {recipe.difficulty && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[recipe.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                          {recipe.difficulty === 'easy' ? 'Fácil' : recipe.difficulty === 'medium' ? 'Medio' : recipe.difficulty}
                        </span>
                      )}
                      {recipe.category?.slice(0, 2).map((c) => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{c}</span>
                      ))}
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <div className="mt-1.5 flex items-center gap-1 text-green-600 text-xs font-medium">
                        <span>✓</span> Seleccionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <p className="text-xs text-gray-600">
            {selectedRecipe ? (
              <span>Seleccionado: <span className="font-semibold text-green-700">{selectedRecipe.title}</span></span>
            ) : (
              <span className="text-gray-400">Selecciona una receta</span>
            )}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button
              onClick={handleConfirm}
              disabled={!selectedRecipe}
              className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Agregar receta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeSearchModal;

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, Exercise } from '@/lib/api';

interface ExerciseSearchModalProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const ExerciseSearchModal: React.FC<ExerciseSearchModalProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getExercises(search || undefined);
      if (response.success && response.data) {
        // Filter by search term client-side if needed
        let filtered = response.data;
        if (search) {
          const q = search.toLowerCase();
          filtered = response.data.filter((ex: Exercise) =>
            ex.name.toLowerCase().includes(q) ||
            ex.muscleGroups?.some((m: string) => m.toLowerCase().includes(q)) ||
            ex.equipment?.some((e: string) => e.toLowerCase().includes(q)) ||
            (ex.category || []).some((c: string) => c.toLowerCase().includes(q))
          );
        }
        setResults(filtered);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const delay = setTimeout(searchExercises, 400);
    return () => clearTimeout(delay);
  }, [searchExercises]);

  const selectedExercise = results.find(r => r.id === selectedId);

  const handleConfirm = () => {
    if (selectedExercise) {
      onSelect(selectedExercise);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span>🔍</span> Buscar Ejercicio
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, músculo, equipo..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              Buscando ejercicios...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No se encontraron ejercicios.</p>
              {search && <p className="text-gray-400 text-xs mt-1">Prueba con otros términos.</p>}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((ex) => {
                const isSelected = selectedId === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedId(ex.id)}
                    className={`text-left rounded-xl border-2 p-3 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                    }`}
                  >
                    {/* Image / Placeholder */}
                    <div className="w-full h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {ex.demo?.url && (ex.demo.type === 'image' || ex.demo.type === 'gif') ? (
                        <img src={ex.demo.url} alt={ex.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-blue-300">🏋️</span>
                      )}
                    </div>

                    {/* Info */}
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-1">{ex.name}</p>

                    <div className="flex flex-wrap gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[ex.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                        {ex.difficulty === 'easy' ? 'Fácil' : ex.difficulty === 'medium' ? 'Medio' : ex.difficulty === 'hard' ? 'Difícil' : ex.difficulty}
                      </span>
                      {ex.sets && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{ex.sets}×{ex.repetitions}</span>}
                      {ex.muscleGroups?.slice(0, 2).map((m) => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{m}</span>
                      ))}
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="mt-1.5 flex items-center gap-1 text-blue-600 text-xs font-medium">
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
            {selectedExercise ? (
              <span>Seleccionado: <span className="font-semibold text-blue-700">{selectedExercise.name}</span></span>
            ) : (
              <span className="text-gray-400">Selecciona un ejercicio</span>
            )}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedExercise}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Agregar ejercicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseSearchModal;

import React, { useEffect, useState } from 'react';
import type { Exercise } from '../../lib/api';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export default function ExerciseDetailModal({
  exercise,
  onClose,
  onEdit,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: ExerciseDetailModalProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) onPrevious();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevious, onNext, onClose, hasPrevious, hasNext]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Detalle del Ejercicio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation arrows */}
        <div className="relative flex-1 overflow-auto">
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition"
              aria-label="Ejercicio anterior"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition"
              aria-label="Ejercicio siguiente"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Demo/Placeholder */}
            <div className="h-48 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
              {exercise.demo?.type === 'image' || exercise.demo?.type === 'gif' ? (
                <img src={exercise.demo.url} alt={exercise.name} className="w-full h-full object-cover rounded-lg" />
              ) : exercise.demo?.videoSearchUrl ? (
                <div className="text-center">
                  <svg className="w-16 h-16 text-red-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <a
                    href={exercise.demo.videoSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-800 font-medium text-sm underline"
                  >
                    Ver tutorial en YouTube
                  </a>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-16 h-16 text-green-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-green-400 text-sm mt-2">Demo no disponible</p>
                </div>
              )}
            </div>

            {/* Name & Badges */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{exercise.name}</h3>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  exercise.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {exercise.difficulty}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  exercise.clientLevel === 'principiante' ? 'bg-blue-100 text-blue-800' :
                  exercise.clientLevel === 'intermedio' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {exercise.clientLevel}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Descripción</h4>
              <p className="text-gray-600 text-sm">{exercise.description}</p>
            </div>

            {/* Instructions */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Instrucciones</h4>
              <ol className="list-decimal list-inside space-y-1">
                {exercise.instructions.map((inst: string, i: number) => (
                  <li key={i} className="text-gray-600 text-sm">{inst}</li>
                ))}
              </ol>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Series</h4>
                <p className="text-gray-600">{exercise.sets}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Repeticiones</h4>
                <p className="text-gray-600">{exercise.repetitions}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Tiempo bajo tensión</h4>
                <p className="text-gray-600">{exercise.timeUnderTension}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Descanso</h4>
                <p className="text-gray-600">{exercise.restBetweenSets}</p>
              </div>
            </div>

            {/* Muscle Groups */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Grupos musculares</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.muscleGroups.map((mg: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{mg}</span>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Equipamiento</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.equipment.map((eq: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{eq}</span>
                ))}
              </div>
            </div>

            {/* Contraindications */}
            {exercise.contraindications.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Contraindicaciones</h4>
                <div className="flex flex-wrap gap-1">
                  {exercise.contraindications.map((c: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Progression */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Progresión</h4>
              <p className="text-gray-600 text-sm">{exercise.progression}</p>
            </div>

            {/* Categories & Tags */}
            <div className="flex flex-wrap gap-2">
              {exercise.category.map((cat: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{cat}</span>
              ))}
              {exercise.tags.map((tag: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-50 text-gray-400 rounded-full text-xs">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div>
            {showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">¿Eliminar?</span>
                <button onClick={onDelete} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Sí</button>
                <button onClick={() => setShowConfirmDelete(false)} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">No</button>
              </div>
            ) : (
              <button onClick={() => setShowConfirmDelete(true)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium">
                Eliminar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
              Editar
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

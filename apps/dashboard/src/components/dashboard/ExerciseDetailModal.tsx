import React, { useEffect, useState, useRef } from 'react';
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
  /** Callback al hacer clic en un ejercicio de progresión */
  onSelectExercise?: (exerciseId: string) => void;
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
  onSelectExercise,
}: ExerciseDetailModalProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll al tope cada vez que cambia el ejercicio
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setShowConfirmDelete(false);
  }, [exercise.id]);

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Navigation arrows - fixed, fuera del overflow del modal */}
        {hasPrevious && (
          <button
            onClick={onPrevious}
            className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center shadow-lg border border-gray-200 transition"
            aria-label="Ejercicio anterior"
          >
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            onClick={onNext}
            className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center shadow-lg border border-gray-200 transition"
            aria-label="Siguiente ejercicio"
          >
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Header - con inner relative para que no afecte a las flechas fixed */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b border-gray-200 bg-teal-600">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Detalle del Ejercicio
          </h2>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-teal-700 rounded-full transition">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scroll content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">

          <div className="space-y-4 sm:space-y-6">
            {/* Demo/Video */}
            <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-teal-700 mb-3 sm:mb-4">Demostración del Ejercicio</h3>
              <div className="h-40 sm:h-56 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg flex items-center justify-center border border-teal-100">
                {exercise.demo?.type === 'image' || exercise.demo?.type === 'gif' ? (
                  <img src={exercise.demo.url} alt={exercise.name} className="w-full h-full object-cover rounded-lg" />
                ) : exercise.demo?.videoSearchUrl ? (
                  <div className="text-center">
                    <svg className="w-14 h-14 sm:w-20 sm:h-20 text-teal-300 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <a href={exercise.demo.videoSearchUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-teal-600 text-white text-sm px-5 py-2 rounded-full hover:bg-teal-700 transition shadow-sm">
                      ▶ Ver tutorial en YouTube
                    </a>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-7 h-7 sm:w-10 sm:h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-teal-600 text-sm">Video demo no disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* Nombre + badges */}
            <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{exercise.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    exercise.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {exercise.difficulty === 'easy' ? '🟢 Fácil' : exercise.difficulty === 'medium' ? '🟡 Medio' : '🔴 Difícil'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    exercise.clientLevel === 'principiante' ? 'bg-blue-100 text-blue-800' :
                    exercise.clientLevel === 'intermedio' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    👤 {exercise.clientLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-teal-700 mb-2">📝 Descripción</h3>
              <p className="text-gray-600 text-sm sm:text-base">{exercise.description}</p>
            </div>

            {/* Instrucciones */}
            <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-teal-700 mb-3">📋 Instrucciones</h3>
              <ol className="list-decimal list-inside space-y-1.5">
                {exercise.instructions.map((inst: string, i: number) => (
                  <li key={i} className="text-gray-600 text-sm sm:text-base leading-relaxed">{inst}</li>
                ))}
              </ol>
            </div>

            {/* Detalles: grid 2x2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg border border-teal-200 p-3 sm:p-4 text-center shadow-sm">
                <p className="text-xs text-teal-500 font-medium mb-1">Series</p>
                <p className="text-xl sm:text-2xl font-bold text-teal-700">{exercise.sets}</p>
              </div>
              <div className="bg-white rounded-lg border border-teal-200 p-3 sm:p-4 text-center shadow-sm">
                <p className="text-xs text-teal-500 font-medium mb-1">Repeticiones</p>
                <p className="text-sm sm:text-lg font-bold text-teal-700">{exercise.repetitions}</p>
              </div>
              <div className="bg-white rounded-lg border border-teal-200 p-3 sm:p-4 text-center shadow-sm">
                <p className="text-xs text-teal-500 font-medium mb-1">TUT</p>
                <p className="text-xs sm:text-sm font-bold text-teal-700">{exercise.timeUnderTension}</p>
              </div>
              <div className="bg-white rounded-lg border border-teal-200 p-3 sm:p-4 text-center shadow-sm">
                <p className="text-xs text-teal-500 font-medium mb-1">Descanso</p>
                <p className="text-xs sm:text-sm font-bold text-teal-700">{exercise.restBetweenSets}</p>
              </div>
            </div>

            {/* Grupos musculares */}
            <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-teal-700 mb-3">💪 Grupos musculares</h3>
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscleGroups.map((mg: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">{mg}</span>
                ))}
              </div>
            </div>

            {/* Equipamiento */}
            <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-teal-700 mb-3">🎒 Equipamiento</h3>
              <div className="flex flex-wrap gap-1.5">
                {exercise.equipment.map((eq: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">{eq}</span>
                ))}
              </div>
            </div>

            {/* Contraindicaciones */}
            {exercise.contraindications.length > 0 && (
              <div className="bg-white rounded-lg border border-red-200 p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-3">⚠️ Contraindicaciones</h3>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.contraindications.map((c: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Progresiones: Más fácil / Más difícil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ProgressionOf — Ejercicio más fácil */}
              <div className="bg-white rounded-lg border border-green-200 p-4 sm:p-6 shadow-sm min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-green-700 mb-3 flex items-center gap-1">
                  <span>⬇️</span> Progresión más fácil
                </h3>
                {!exercise.progressionOf || exercise.progressionOf === 'null' || exercise.progressionOf === '' ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">Es un ejercicio básico</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectExercise?.(exercise.progressionOf!)}
                    className="w-full text-left text-green-600 hover:text-green-800 hover:underline font-medium text-sm break-words transition-colors p-1 rounded hover:bg-green-50"
                  >
                    {exercise.progressionOfName || exercise.progressionOf}
                  </button>
                )}
              </div>

              {/* ProgressesTo — Ejercicios más difíciles */}
              <div className="bg-white rounded-lg border border-red-200 p-4 sm:p-6 shadow-sm min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-3 flex items-center gap-1">
                  <span>⬆️</span> Progresiones más difíciles
                </h3>
                {(!exercise.progressesTo || exercise.progressesTo.length === 0) ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-sm font-medium">Este ejercicio es el máximo</span>
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {exercise.progressesTo.map((id: string, i: number) => {
                      const name = exercise.progressesToNames?.[i] || id;
                      return (
                        <li key={i}>
                          <button
                            onClick={() => onSelectExercise?.(id)}
                            className="w-full text-left text-red-600 hover:text-red-800 hover:underline font-medium text-sm break-words transition-colors p-1 rounded hover:bg-red-50"
                          >
                            {name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Progresión — Descripción textual */}
            <div className="bg-white rounded-lg border border-amber-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-amber-700 mb-2">📈 Estrategia de progresión</h3>
              <p className="text-gray-600 text-sm sm:text-base">{exercise.progression}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {exercise.category.map((cat: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs border border-gray-200">{cat}</span>
              ))}
              {exercise.tags.map((tag: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-50 text-gray-400 rounded-full text-xs">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-5 border-t border-gray-200 bg-gray-50">
          <div>
            {showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">¿Eliminar?</span>
                <button onClick={onDelete} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">Sí, eliminar</button>
                <button onClick={() => setShowConfirmDelete(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setShowConfirmDelete(true)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium">🗑️ Eliminar</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium shadow-sm">✏️ Editar</button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

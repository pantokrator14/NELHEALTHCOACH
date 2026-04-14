import React from 'react';
import type { Exercise } from '../../lib/api';

interface ExerciseCardProps {
  exercise: Exercise;
  deleteMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: () => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'red-100 text-red-800',
};

const levelColors: Record<string, string> = {
  principiante: 'bg-blue-100 text-blue-800',
  intermedio: 'bg-purple-100 text-purple-800',
  avanzado: 'bg-orange-100 text-orange-800',
};

export default function ExerciseCard({
  exercise,
  deleteMode,
  isSelected,
  onToggleSelect,
  onClick,
}: ExerciseCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl shadow-md border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'border-red-400 ring-2 ring-red-300' : 'border-gray-200'
      }`}
    >
      {/* Botón de eliminación en modo delete */}
      {deleteMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(exercise.id);
          }}
          className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-red-600 border-red-600 text-white'
              : 'border-gray-300 bg-white text-transparent hover:border-red-400'
          }`}
          aria-label={isSelected ? 'Deseleccionar ejercicio' : 'Seleccionar ejercicio'}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Demo/Placeholder */}
      <div className="h-40 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-t-xl flex items-center justify-center relative overflow-hidden">
        {exercise.demo?.type === 'image' || exercise.demo?.type === 'gif' ? (
          <img
            src={exercise.demo.url}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <svg className="w-16 h-16 text-teal-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-teal-400 text-sm mt-2 font-medium">Ejercicio</p>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[exercise.difficulty] || 'bg-gray-100 text-gray-800'}`}>
            {exercise.difficulty}
          </span>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColors[exercise.clientLevel] || 'bg-gray-100 text-gray-800'}`}>
            {exercise.clientLevel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">{exercise.name}</h3>
        <p className="text-gray-600 text-xs line-clamp-2 mb-3">{exercise.description}</p>

        {/* Muscle groups */}
        <div className="flex flex-wrap gap-1 mb-2">
          {exercise.muscleGroups.slice(0, 3).map((mg: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs">
              {mg}
            </span>
          ))}
          {exercise.muscleGroups.length > 3 && (
            <span className="px-2 py-0.5 text-gray-400 text-xs">+{exercise.muscleGroups.length - 3}</span>
          )}
        </div>

        {/* Equipment */}
        <div className="flex items-center text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {exercise.equipment.slice(0, 2).join(', ')}
          {exercise.equipment.length > 2 && ` +${exercise.equipment.length - 2}`}
        </div>

        {/* Sets x Reps */}
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{exercise.sets} × {exercise.repetitions}</span>
          <span className="text-gray-400">{exercise.timeUnderTension}</span>
        </div>
      </div>
    </div>
  );
}

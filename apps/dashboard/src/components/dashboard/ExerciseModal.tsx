import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import DragDropList from '../ui/DragDropList';
import AutocompleteInput from '../ui/AutocompleteInput';
import { useToast } from '../ui/Toast';
import Tooltip from '../ui/Tooltip';
import type { Exercise, ExerciseFormData } from '../../lib/api';
import { useTranslation } from 'react-i18next';

interface ExerciseModalProps {
  exercise: Exercise | null;
  onClose: () => void;
  onSuccess: (exercise?: Exercise) => void;
  existingCategories: string[];
  existingTags: string[];
  allExercises?: Exercise[];
}

export default function ExerciseModal({
  exercise,
  onClose,
  onSuccess,
  existingCategories,
  existingTags,
  allExercises = [],
}: ExerciseModalProps) {
  const isEditing = !!exercise;
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();

  // Form state
  const [name, setName] = useState(exercise?.name ?? '');
  const [description, setDescription] = useState(exercise?.description ?? '');
  const [category, setCategory] = useState<string[]>(exercise?.category ?? []);
  const [instructions, setInstructions] = useState<string[]>(exercise?.instructions ?? ['']);
  const [equipment, setEquipment] = useState<string[]>(exercise?.equipment ?? []);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(exercise?.difficulty ?? 'easy');
  const [clientLevel, setClientLevel] = useState<'principiante' | 'intermedio' | 'avanzado'>(exercise?.clientLevel ?? 'principiante');
  const [muscleGroups, setMuscleGroups] = useState<string[]>(exercise?.muscleGroups ?? []);
  const [contraindications, setContraindications] = useState<string[]>(exercise?.contraindications ?? []);
  const [sets, setSets] = useState(exercise?.sets ?? 3);
  const [repetitions, setRepetitions] = useState(exercise?.repetitions ?? '12');
  const [timeUnderTension, setTimeUnderTension] = useState(exercise?.timeUnderTension ?? '3-1-1');
  const [restBetweenSets, setRestBetweenSets] = useState(exercise?.restBetweenSets ?? '45-60 segundos');
  const [progression, setProgression] = useState(exercise?.progression ?? '');
  const [tags, setTags] = useState<string[]>(exercise?.tags ?? []);
  const [isPublished, setIsPublished] = useState(exercise?.isPublished ?? true);

  // Progression state
  const [progressionOf, setProgressionOf] = useState(exercise?.progressionOf ?? '');
  const [progressesTo, setProgressesTo] = useState<string[]>(exercise?.progressesTo ?? []);

  // Demo/GIF state
  const [demoUrl, setDemoUrl] = useState(exercise?.demo?.url ?? '');
  const [demoType, setDemoType] = useState(exercise?.demo?.type ?? 'placeholder');
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoPreview, setDemoPreview] = useState<string | null>(exercise?.demo?.url ?? null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state for instructions
  const [newInstruction, setNewInstruction] = useState('');
  const [editingInstructionIndex, setEditingInstructionIndex] = useState<number | null>(null);
  const [editingInstructionText, setEditingInstructionText] = useState('');

  // Tag inputs
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [newContraindication, setNewContraindication] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Keyboard
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) onClose(); };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose, isSubmitting]);

  // Handlers
  const handleKeyDown = (e: React.KeyboardEvent, onAdd: () => void) => {
    if (e.key === 'Enter') { e.preventDefault(); onAdd(); }
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      setInstructions([...instructions, newInstruction.trim()]);
      setNewInstruction('');
    }
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleReorderInstructions = (reorderedItems: string[]) => {
    setInstructions(reorderedItems);
  };

  const startEditInstruction = (index: number, text: string) => {
    setEditingInstructionIndex(index);
    setEditingInstructionText(text);
  };

  const saveEditInstruction = () => {
    if (editingInstructionIndex !== null && editingInstructionText.trim()) {
      const updated = [...instructions];
      updated[editingInstructionIndex] = editingInstructionText.trim();
      setInstructions(updated);
      setEditingInstructionIndex(null);
      setEditingInstructionText('');
    }
  };

  const cancelEditInstruction = () => {
    setEditingInstructionIndex(null);
    setEditingInstructionText('');
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !category.includes(trimmed)) {
      setCategory([...category, trimmed]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    setCategory(category.filter((_, i) => i !== index));
  };

  const handleCreateCategory = (cat: string) => {
    if (!category.includes(cat)) setCategory([...category, cat]);
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleCreateTag = (tag: string) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };

  const handleAddEquipment = () => {
    const trimmed = newEquipment.trim();
    if (trimmed && !equipment.includes(trimmed)) {
      setEquipment([...equipment, trimmed]);
      setNewEquipment('');
    }
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const handleAddMuscleGroup = () => {
    const trimmed = newMuscleGroup.trim();
    if (trimmed && !muscleGroups.includes(trimmed)) {
      setMuscleGroups([...muscleGroups, trimmed]);
      setNewMuscleGroup('');
    }
  };

  const handleRemoveMuscleGroup = (index: number) => {
    setMuscleGroups(muscleGroups.filter((_, i) => i !== index));
  };

  const handleAddContraindication = () => {
    const trimmed = newContraindication.trim();
    if (trimmed && !contraindications.includes(trimmed)) {
      setContraindications([...contraindications, trimmed]);
      setNewContraindication('');
    }
  };

  const handleRemoveContraindication = (index: number) => {
    setContraindications(contraindications.filter((_, i) => i !== index));
  };

  // Demo file handler
  const handleDemoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast(t('exercises.invalidImageType'), 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(t('exercises.imageTooLarge'), 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setDemoFile(file);
      setDemoType(file.type.includes('gif') ? 'gif' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => setDemoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Filter exercises for progression dropdowns
  const easierExercises = useMemo(() => {
    const diffOrder = { easy: 1, medium: 2, hard: 3 };
    const currentDiff = diffOrder[difficulty];
    return allExercises.filter(e => e.id !== exercise?.id && diffOrder[e.difficulty] < currentDiff);
  }, [allExercises, exercise?.id, difficulty]);

  const harderExercises = useMemo(() => {
    const diffOrder = { easy: 1, medium: 2, hard: 3 };
    const currentDiff = diffOrder[difficulty];
    return allExercises.filter(e => e.id !== exercise?.id && diffOrder[e.difficulty] > currentDiff);
  }, [allExercises, exercise?.id, difficulty]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'El nombre es obligatorio';
if (!description.trim()) newErrors.description = t('common.required');
    if (category.length === 0) newErrors.category = t('common.required');
    if (instructions.filter(i => i.trim()).length === 0) newErrors.instructions = t('common.required');
    if (!progression.trim()) newErrors.progression = t('common.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { apiClient } = await import('../../lib/api');
      const formData: ExerciseFormData = {
        name,
        description,
        category,
        instructions: instructions.filter(i => i.trim()),
        equipment,
        difficulty,
        clientLevel,
        muscleGroups,
        contraindications,
        sets,
        repetitions,
        timeUnderTension,
        restBetweenSets,
        progression,
        tags,
        isPublished,
        demo: {
          url: demoPreview || demoUrl || '',
          key: '',
          type: demoType,
          name: demoFile?.name || name,
          size: demoFile?.size || 0,
          uploadedAt: new Date().toISOString(),
          videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}+tutorial`,
        },
        progressionOf: progressionOf || null,
        progressesTo,
      };

      if (isEditing && exercise) {
        await apiClient.updateExercise(exercise.id, formData);
        showToast(t('exercises.updated'), 'success');
      } else {
        await apiClient.createExercise(formData);
        showToast(t('exercises.created'), 'success');
      }
      onSuccess();
    } catch {
      showToast(t('exercises.errorSaving'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b border-gray-200 bg-teal-600">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isEditing ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-teal-800 rounded-full transition"
              aria-label="Cerrar"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            {errors.form && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm sm:text-base text-red-700">{errors.form}</span>
                </div>
              </div>
            )}

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Left column */}
              <div className="space-y-4 sm:space-y-6">
                {/* Demo/GIF Upload */}
                <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-teal-700 mb-3 sm:mb-4">Demostración del Ejercicio</h3>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const fakeEvent = { target: { files: e.dataTransfer.files } } as ChangeEvent<HTMLInputElement>;
                        handleDemoFileChange(fakeEvent);
                      }
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-teal-500 transition bg-gray-50"
                  >
                    {demoPreview && demoType !== 'placeholder' ? (
                      <div className="relative">
                        <div
                          className="w-full h-32 sm:h-48 bg-cover bg-center rounded-lg border border-gray-200 mb-4"
                          style={{ backgroundImage: `url(${demoPreview})` }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDemoPreview(null);
                            setDemoFile(null);
                            setDemoUrl('');
                            setDemoType('placeholder');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 text-white p-1 sm:p-1.5 rounded-full hover:bg-red-600 shadow-sm"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 sm:py-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-700 font-medium mb-2 text-sm sm:text-base">
                          Arrastra una imagen aquí o haz clic para subir
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mb-4">PNG, JPG, GIF, WebP hasta 10MB</p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDemoFileChange}
                      className="hidden"
                      id="exercise-demo-upload"
                      disabled={isSubmitting || isUploading}
                    />
                    <label
                      htmlFor="exercise-demo-upload"
                      className="inline-block px-4 py-2 sm:px-5 sm:py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm sm:text-base"
                    >
                      {demoPreview ? 'Cambiar Imagen' : 'Seleccionar Imagen/GIF'}
                    </label>

                    {/* URL input as alternative */}
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={demoUrl}
                        onChange={(e) => { setDemoUrl(e.target.value); if (e.target.value) { setDemoPreview(e.target.value); setDemoType('image'); } }}
                        className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm"
                        placeholder="O pega una URL de imagen/GIF..."
                      />
                    </div>
                  </div>

                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-700 mb-1">
                        <span className="font-medium">Subiendo imagen...</span>
                        <span className="font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-teal-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Nombre y Descripción */}
                <div className="bg-white rounded-lg border border-blue-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-700 mb-3 sm:mb-4 flex items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    Nombre y Descripción <span className="text-red-500">*</span>
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-600 mb-2">
                        Nombre del ejercicio  <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Ej: Sentadilla copa con mancuerna"
                        disabled={isSubmitting}
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-600 mb-2">
                        Descripción <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Describe brevemente el ejercicio..."
                        disabled={isSubmitting}
                      />
                      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>
                  </div>
                </div>

                {/* Información Básica */}
                <div className="bg-white rounded-lg border border-yellow-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-yellow-700 mb-3 sm:mb-4 flex items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Información Básica
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 mb-2">Dificultad</label>
                      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as ExerciseFormData['difficulty'])} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
                        <option value="easy">Fácil</option>
                        <option value="medium">Medio</option>
                        <option value="hard">Complejo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 mb-2">Nivel de cliente</label>
                      <select value={clientLevel} onChange={(e) => setClientLevel(e.target.value as ExerciseFormData['clientLevel'])} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
                        <option value="principiante">Principiante</option>
                        <option value="intermedio">Intermedio</option>
                        <option value="avanzado">Avanzado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 mb-2">Series</label>
                      <input type="number" value={sets} onChange={(e) => setSets(parseInt(e.target.value) || 1)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" min={1} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 mb-2">Repeticiones</label>
                      <input value={repetitions} onChange={(e) => setRepetitions(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" placeholder="12" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 mb-2 flex items-center">
                        TUT
                        <Tooltip content="Time Under Tension (Tiempo Bajo Tensión). Formato: fase concéntrica - pausa - fase excéntrica. Ej: 3-1-1 significa 3s subiendo, 1s de pausa, 1s bajando." position="right" delay={150}>
                          <button type="button" className="ml-1 text-gray-400 hover:text-gray-600 inline-flex items-center" aria-label="Información sobre TUT">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </Tooltip>
                      </label>
                      <input value={timeUnderTension} onChange={(e) => setTimeUnderTension(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" placeholder="3-1-1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 mb-2">Descanso</label>
                      <input value={restBetweenSets} onChange={(e) => setRestBetweenSets(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4 sm:space-y-6">
                {/* Categorías */}
                <div className="bg-white rounded-lg border border-teal-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <label className="block text-base sm:text-lg font-semibold text-teal-700 flex items-center">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      Categorías <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">{category.length} categorías</span>
                  </div>
                  {errors.category && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">{errors.category}</p>}
                  <div className="mb-4">
                    <AutocompleteInput
                      suggestions={existingCategories.filter(c => !category.includes(c))}
                      value={newCategory}
                      onChange={setNewCategory}
                      onSelect={handleAddCategory}
                      onItemCreate={handleCreateCategory}
                      allowCreate={true}
                      separator="both"
                      placeholder="Escribe para buscar o agregar una categoría..."
                      disabled={isSubmitting}
                      maxSuggestions={5}
                      className="border-teal-300"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.map((cat, index) => (
                      <div key={index} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-100 text-teal-800 rounded-full border border-teal-200 text-sm">
                        <span>{cat}</span>
                        <button type="button" onClick={() => handleRemoveCategory(index)} className="text-teal-600 hover:text-teal-800 disabled:opacity-50" disabled={isSubmitting}>
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grupos musculares */}
                <div className="bg-white rounded-lg border border-green-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <label className="block text-base sm:text-lg font-semibold text-green-700 flex items-center">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      Grupos musculares <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">{muscleGroups.length}</span>
                  </div>
                  {errors.muscleGroups && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">{errors.muscleGroups}</p>}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={newMuscleGroup}
                      onChange={(e) => setNewMuscleGroup(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddMuscleGroup)}
                      className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-green-200 rounded-lg text-sm"
                      placeholder="Ej: cuadriceps"
                      disabled={isSubmitting}
                    />
                    <button type="button" onClick={handleAddMuscleGroup} className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm" disabled={isSubmitting}>Agregar</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {muscleGroups.map((mg, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full border border-green-200 text-sm">
                        <span>{mg}</span>
                        <button type="button" onClick={() => handleRemoveMuscleGroup(i)} className="text-green-600 hover:text-green-800" disabled={isSubmitting}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipamiento */}
                <div className="bg-white rounded-lg border border-slate-300 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <label className="block text-base sm:text-lg font-semibold text-slate-700 flex items-center">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      Equipamiento <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">{equipment.length}</span>
                  </div>
                  {errors.equipment && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">{errors.equipment}</p>}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={newEquipment}
                      onChange={(e) => setNewEquipment(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddEquipment)}
                      className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-slate-300 rounded-lg text-sm"
                      placeholder="Ej: mancuerna"
                      disabled={isSubmitting}
                    />
                    <button type="button" onClick={handleAddEquipment} className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-sm" disabled={isSubmitting}>Agregar</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {equipment.map((eq, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full border border-slate-300 text-sm">
                        <span>{eq}</span>
                        <button type="button" onClick={() => handleRemoveEquipment(i)} className="text-slate-600 hover:text-slate-800" disabled={isSubmitting}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instrucciones con drag & drop */}
                <div className="bg-white rounded-lg border border-purple-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <label className="block text-base sm:text-lg font-semibold text-purple-700 flex items-center">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      Instrucciones <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">{instructions.filter(i => i.trim()).length} pasos</span>
                  </div>
                  {errors.instructions && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">{errors.instructions}</p>}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddInstruction)}
                      className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-purple-200 rounded-lg text-sm"
                      placeholder="Describe un paso..."
                      rows={2}
                      disabled={isSubmitting}
                    />
                    <button type="button" onClick={handleAddInstruction} className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm" disabled={isSubmitting}>Agregar</button>
                  </div>
                  {instructions.filter(i => i.trim()).length > 0 && (
                    <div className="mb-2 text-xs text-gray-500 flex items-center">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /> </svg>
                      Arrastra para reordenar los pasos
                    </div>
                  )}
                  <DragDropList
                    items={instructions}
                    renderItem={(instruction: string, index: number) => {
                      const isEditing = editingInstructionIndex === index;
                      return (
                        <div className="flex gap-2 sm:gap-4 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-purple-100 text-purple-800 rounded-full font-bold border-2 border-purple-300 text-xs sm:text-base">
                              {index + 1}
                            </div>
                          </div>
                          {isEditing ? (
                            <>
                              <div className="flex-1 w-full">
                                <textarea
                                  value={editingInstructionText}
                                  onChange={(e) => setEditingInstructionText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditInstruction(); } }}
                                  className="w-full px-2 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                  rows={2}
                                  autoFocus
                                  disabled={isSubmitting}
                                />
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button type="button" onClick={saveEditInstruction} className="text-green-500 hover:text-green-700 disabled:opacity-50 p-1" disabled={isSubmitting} aria-label="Guardar">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> </svg>
                                </button>
                                <button type="button" onClick={cancelEditInstruction} className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1" disabled={isSubmitting} aria-label="Cancelar">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg>
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className="text-gray-700 text-sm">{instruction}</p>
                              </div>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => startEditInstruction(index, instruction)} className="text-yellow-500 hover:text-yellow-700 disabled:opacity-50 p-1" disabled={isSubmitting} aria-label="Editar">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /> </svg>
                                </button>
                                <button type="button" onClick={() => handleRemoveInstruction(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1" disabled={isSubmitting} aria-label="Eliminar">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> </svg>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }}
                    onReorder={handleReorderInstructions}
                    disabled={isSubmitting}
                    className="max-h-48 sm:max-h-64 overflow-y-auto"
                  />
                </div>

                {/* Contraindicaciones */}
                <div className="bg-white rounded-lg border border-red-200 p-4 sm:p-6 shadow-sm">
                  <label className="block text-base sm:text-lg font-semibold text-red-700 mb-3 sm:mb-4 flex items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    Contraindicaciones
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={newContraindication}
                      onChange={(e) => setNewContraindication(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddContraindication)}
                      className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border border-red-200 rounded-lg text-sm"
                      placeholder="Ej: dolor de rodilla"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={handleAddContraindication}
                      className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                      disabled={isSubmitting}
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {contraindications.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 rounded-full border border-red-200 text-sm">
                        <span>{c}</span>
                        <button type="button" onClick={() => handleRemoveContraindication(i)} className="text-red-600 hover:text-red-800" disabled={isSubmitting}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="bg-white rounded-lg border border-pink-200 p-4 sm:p-6 shadow-sm">
                  <label className="block text-base sm:text-lg font-semibold text-pink-700 mb-3 sm:mb-4 flex items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    Etiquetas
                  </label>
                  <div className="mb-4">
                    <AutocompleteInput
                      suggestions={existingTags.filter(t => !tags.includes(t))}
                      value={newTag}
                      onChange={setNewTag}
                      onSelect={handleAddTag}
                      onItemCreate={handleCreateTag}
                      allowCreate={true}
                      separator="both"
                      placeholder="Escribe para buscar o agregar una etiqueta..."
                      disabled={isSubmitting}
                      maxSuggestions={5}
                      className="border-pink-300"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-pink-100 text-pink-800 rounded-full border border-pink-200 text-sm">
                        <span>#{tag}</span>
                        <button type="button" onClick={() => handleRemoveTag(index)} className="text-pink-600 hover:text-pink-800 disabled:opacity-50" disabled={isSubmitting}>
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Progresión - Full width outside the grid */}
            <div className="bg-white rounded-lg border border-indigo-200 p-4 sm:p-6 shadow-sm mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-indigo-700 mb-3 sm:mb-4 flex items-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                Progresión <span className="text-red-500">*</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-indigo-600 mb-2">
                    Cómo progresar <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={progression}
                    onChange={(e) => setProgression(e.target.value)}
                    rows={2}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.progression ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Ej: Aumentar peso gradualmente cada 1-2 semanas"
                    disabled={isSubmitting}
                  />
                  {errors.progression && <p className="mt-1 text-sm text-red-600">{errors.progression}</p>}
                </div>

                <div className="pt-3 border-t border-gray-200 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-600 mb-2">Progresión de (ejercicio anterior)</label>
                    <select value={progressionOf} onChange={(e) => setProgressionOf(e.target.value)} className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                      <option value="">Ninguno (ejercicio base)</option>
                      {easierExercises.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-600 mb-2">Progresa hacia (ejercicios avanzados)</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value && !progressesTo.includes(e.target.value)) {
                          setProgressesTo([...progressesTo, e.target.value]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Seleccionar ejercicio avanzado...</option>
                      {harderExercises.filter(h => !progressesTo.includes(h.id)).map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                    {progressesTo.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {progressesTo.map(id => {
                          const ex = allExercises.find(e => e.id === id);
                          return ex ? (
                            <span key={id} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs flex items-center gap-1">
                              {ex.name}
                              <button type="button" onClick={() => setProgressesTo(progressesTo.filter(p => p !== id))} className="text-red-400 hover:text-red-600">×</button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-medium shadow-sm text-sm sm:text-base"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition disabled:opacity-50 font-medium shadow-sm text-sm sm:text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    Guardando...
                  </span>
                ) : isEditing ? (
                  'Actualizar Ejercicio'
                ) : (
                  'Crear Ejercicio'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastComponent />
    </>
  );
}
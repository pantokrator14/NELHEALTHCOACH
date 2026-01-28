import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Recipe, RecipeFormData, RecipeImage } from '../../../../../packages/types/src/recipe-types';
import AutocompleteInput from '../ui/AutocompleteInput';
import DragDropList from '../ui/DragDropList';
import { NutritionTooltip } from '../ui/Tooltip';
import { apiClient } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onSave: (data: RecipeFormData) => Promise<void>;
  onSuccess?: () => void;
  existingCategories?: string[];
  existingTags?: string[];
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  recipe,
  onClose,
  onSave,
  onSuccess,
  existingCategories = [],
  existingTags = [],
}) => {
  const [formData, setFormData] = useState<RecipeFormData>({
    title: '',
    description: '',
    category: [],
    ingredients: [],
    instructions: [],
    nutrition: {
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0,
    },
    cookTime: 30,
    difficulty: 'medium',
    tags: [],
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  const [newCategory, setNewCategory] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estados para manejar sugerencias dinámicas
  const [availableCategories, setAvailableCategories] = useState<string[]>(existingCategories);
  const [availableTags, setAvailableTags] = useState<string[]>(existingTags);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  // Inicializar con datos de receta existente
  useEffect(() => {
    if (recipe) {
      setFormData({
        title: recipe.title,
        description: recipe.description,
        category: recipe.category,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutrition: recipe.nutrition,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
      });
      
      if (recipe.image && recipe.image.url) {
        setImagePreview(recipe.image.url);
      }
      
      // Actualizar listas disponibles con las de esta receta
      const allCategories = [...new Set([...existingCategories, ...recipe.category])];
      const allTags = [...new Set([...existingTags, ...recipe.tags])];
      setAvailableCategories(allCategories.sort());
      setAvailableTags(allTags.sort());
    } else {
      // Para nueva receta, usar las existentes
      setAvailableCategories(existingCategories);
      setAvailableTags(existingTags);
    }
  }, [recipe, existingCategories, existingTags]);

  // Función para agregar nueva categoría (y actualizar lista)
  const handleAddCategory = (category: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    
    if (!formData.category.includes(trimmedCategory)) {
      setFormData(prev => ({
        ...prev,
        category: [...prev.category, trimmedCategory],
      }));
      
      if (!availableCategories.includes(trimmedCategory)) {
        setAvailableCategories(prev => [...prev, trimmedCategory].sort());
      }
      
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  // Función para crear nueva categoría desde AutocompleteInput
  const handleCreateCategory = (category: string) => {
    const categories = category.split(/[, ]+/).map(cat => cat.trim()).filter(cat => cat);
    categories.forEach(cat => handleAddCategory(cat));
    setNewCategory('');
  };

  // Función para eliminar categoría
  const handleRemoveCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.filter((_, i) => i !== index),
    }));
  };

  // Función para agregar nueva etiqueta (y actualizar lista)
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    if (!formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      
      if (!availableTags.includes(trimmedTag)) {
        setAvailableTags(prev => [...prev, trimmedTag].sort());
      }
    }
  };

  // Función para crear nueva etiqueta desde AutocompleteInput
  const handleCreateTag = (tag: string) => {
    const tags = tag.split(/[, ]+/).map(t => t.trim()).filter(t => t);
    tags.forEach(t => handleAddTag(t));
    setNewTag('');
  };

  // Función para eliminar etiqueta
  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  // Manejar selección de archivo
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast('La imagen es demasiado grande (máximo 10MB)', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setImageFile(file);
      setErrors(prev => ({ ...prev, image: '' }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        setImagePreview(null);
        setImageFile(null);
        showToast('Error al leer el archivo', 'error');
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA SUBIR IMAGEN A S3 - CORREGIDA
  const uploadImageToS3 = useCallback(async (file: File, recipeId: string): Promise<RecipeImage> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 1. Generar URL de upload
      const uploadResponse = await apiClient.generateRecipeUploadURL(
        recipeId,
        file.name,
        file.type,
        file.size
      );

      // ✅ CORRECCIÓN: Acceder correctamente a los datos de la respuesta
      const { uploadURL, fileKey } = uploadResponse;
      
      // ✅ Obtener fileURL del servidor o construirla si no viene
      const fileURL = uploadResponse.fileURL;
      
      if (!fileURL) {
        // Si el servidor no proporciona fileURL, el endpoint PUT la generará
        console.log('⚠️ fileURL no proporcionado por el servidor, se generará en el backend');
      }

      // 2. Subir archivo a S3
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              // 3. Confirmar upload y guardar referencia
              // ✅ CORRECCIÓN: Enviar fileURL aunque pueda estar vacío
              await apiClient.confirmRecipeUpload(
                recipeId,
                fileKey,
                file.name,
                file.type,
                file.size,
                fileURL || ''
              );

              // El backend generará la URL completa si no se proporciona
              const imageData: RecipeImage = {
                url: fileURL || '', // Puede estar vacío, el backend lo manejará
                key: fileKey,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
              };

              resolve(imageData);
            } catch (confirmError) {
              reject(new Error(`Error confirmando upload: ${confirmError instanceof Error ? confirmError.message : 'Error desconocido'}`));
            }
          } else {
            reject(new Error(`Error subiendo archivo a S3: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Error de conexión al subir archivo'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });

        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } catch (error) {
      throw new Error(`Error generando URL de upload: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // ✅ FUNCIÓN PARA MANEJAR LA SUBIDA DE IMAGEN DURANTE CREACIÓN
  const handleImageUploadForNewRecipe = async (recipeId: string): Promise<RecipeImage | null> => {
    if (!imageFile) return null;
    
    try {
      showToast('Subiendo imagen...', 'info');
      const imageData = await uploadImageToS3(imageFile, recipeId);
      showToast('Imagen subida exitosamente', 'success');
      return imageData;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      showToast(`Error subiendo imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      return null;
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'El título es requerido';
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';
    if (formData.category.length === 0) newErrors.category = 'Agrega al menos una categoría';
    if (formData.ingredients.length === 0) newErrors.ingredients = 'Agrega al menos un ingrediente';
    if (formData.instructions.length === 0) newErrors.instructions = 'Agrega al menos una instrucción';
    if (formData.cookTime <= 0) newErrors.cookTime = 'El tiempo debe ser mayor a 0';
    if (formData.nutrition.calories < 0) newErrors.calories = 'Las calorías no pueden ser negativas';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ FLUJO CORREGIDO PARA MANEJAR ENVÍO DEL FORMULARIO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      let recipeData: RecipeFormData = { ...formData };
      
      if (recipe?.id) {
        // ✅ CASO EDICIÓN: Receta existente
        if (imageFile) {
          try {
            // Subir nueva imagen (esto eliminará automáticamente la anterior en el backend)
            const imageData = await uploadImageToS3(imageFile, recipe.id);
            recipeData = { ...recipeData, image: imageData };
          } catch (uploadError) {
            console.error('Error subiendo imagen:', uploadError);
            showToast('La receta se actualizó pero hubo un error subiendo la imagen', 'warning');
          }
        }
        
        await onSave(recipeData);
      } else {
        // ✅ CASO CREACIÓN: Nueva receta
        // 1. Crear receta primero para obtener ID
        const createResponse = await apiClient.createRecipe(recipeData);
        
        if (createResponse.success && createResponse.data.id) {
          const createdRecipeId = createResponse.data.id;
          
          // 2. Subir imagen si existe
          if (imageFile) {
            try {
              const uploadedImage = await uploadImageToS3(imageFile, createdRecipeId);
              
              if (uploadedImage) {
                // 3. Actualizar la receta con la imagen
                await apiClient.updateRecipe(createdRecipeId, { 
                  ...recipeData, 
                  image: uploadedImage 
                });
                recipeData = { ...recipeData, image: uploadedImage };
              }
            } catch (imageError) {
              console.error('Error en proceso de imagen:', imageError);
              showToast('Receta creada pero hubo un error subiendo la imagen', 'warning');
            }
          }
          
          // 4. Llamar a onSave con los datos completos
          await onSave(recipeData);
        } else {
          throw new Error('Error creando receta: No se pudo obtener el ID');
        }
      }
      
      // Llamar a onSuccess si existe (para recargar lista)
      if (onSuccess) {
        onSuccess();
      }
      
      showToast(
        recipe ? '¡Receta actualizada exitosamente!' : '¡Receta creada exitosamente!',
        'success'
      );
      
      // Pequeño delay para mostrar el mensaje antes de cerrar
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error guardando receta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la receta';
      showToast(errorMessage, 'error');
      setErrors(prev => ({ ...prev, form: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('nutrition.')) {
      const field = name.split('.')[1] as keyof typeof formData.nutrition;
      setFormData(prev => ({
        ...prev,
        nutrition: {
          ...prev.nutrition,
          [field]: parseFloat(value) || 0,
        },
      }));
      setErrors(prev => ({ ...prev, [field]: '' }));
    } else if (name === 'cookTime' || name === 'difficulty') {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'cookTime' ? parseInt(value, 10) || 0 : value,
      }));
      setErrors(prev => ({ ...prev, [name]: '' }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient.trim()],
      }));
      setNewIngredient('');
      setErrors(prev => ({ ...prev, ingredients: '' }));
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleReorderIngredients = (reorderedItems: string[]) => {
    setFormData(prev => ({
      ...prev,
      ingredients: reorderedItems,
    }));
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      setFormData(prev => ({
        ...prev,
        instructions: [...prev.instructions, newInstruction.trim()],
      }));
      setNewInstruction('');
      setErrors(prev => ({ ...prev, instructions: '' }));
    }
  };

  const handleRemoveInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const handleReorderInstructions = (reorderedItems: string[]) => {
    setFormData(prev => ({
      ...prev,
      instructions: reorderedItems,
    }));
  };

  // Manejar tecla Enter en inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, callback: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  // Obtener sugerencias únicas de categorías y tags
  const getUniqueSuggestions = (items: string[], existingItems: string[]) => {
    const allItems = [...new Set([...items, ...existingItems])];
    return allItems.filter(item => item.trim() !== '');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
            <h2 className="text-2xl font-bold">
              {recipe ? 'Editar Receta' : 'Nueva Receta'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-blue-800 rounded-full transition"
              aria-label="Cerrar"
              disabled={isSubmitting || isUploading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {/* Mensaje de error general */}
            {errors.form && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{errors.form}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Columna izquierda */}
              <div className="space-y-6">
                {/* Información básica */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${
                          errors.title ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Nombre de la receta"
                        disabled={isSubmitting || isUploading}
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className={`w-full px-4 py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${
                          errors.description ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Describe brevemente la receta..."
                        disabled={isSubmitting || isUploading}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tiempo (min) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="cookTime"
                          value={formData.cookTime}
                          onChange={handleInputChange}
                          min="1"
                          max="999"
                          required
                          className={`w-full px-4 py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${
                            errors.cookTime ? 'border-red-300' : 'border-gray-300'
                          }`}
                          disabled={isSubmitting || isUploading}
                        />
                        {errors.cookTime && (
                          <p className="mt-1 text-sm text-red-600">{errors.cookTime}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dificultad <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="difficulty"
                          value={formData.difficulty}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                          disabled={isSubmitting || isUploading}
                          required
                        >
                          <option value="easy">Fácil</option>
                          <option value="medium">Media</option>
                          <option value="hard">Difícil</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información nutricional */}
                <div className="bg-white rounded-lg border border-green-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Información Nutricional
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        Proteína (g) <NutritionTooltip term="protein" />
                      </label>
                      <input
                        type="number"
                        name="nutrition.protein"
                        value={formData.nutrition.protein}
                        onChange={handleInputChange}
                        min="0"
                        max="1000"
                        step="0.1"
                        className="w-full px-4 py-3 text-gray-700 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                        disabled={isSubmitting || isUploading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        Carbohidratos (g) <NutritionTooltip term="carbs" />
                      </label>
                      <input
                        type="number"
                        name="nutrition.carbs"
                        value={formData.nutrition.carbs}
                        onChange={handleInputChange}
                        min="0"
                        max="1000"
                        step="0.1"
                        className="w-full px-4 py-3 text-gray-700 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                        disabled={isSubmitting || isUploading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        Grasas (g) <NutritionTooltip term="fat" />
                      </label>
                      <input
                        type="number"
                        name="nutrition.fat"
                        value={formData.nutrition.fat}
                        onChange={handleInputChange}
                        min="0"
                        max="1000"
                        step="0.1"
                        className="w-full px-4 py-3 text-gray-700 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                        disabled={isSubmitting || isUploading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        Calorías <NutritionTooltip term="calories" />
                      </label>
                      <input
                        type="number"
                        name="nutrition.calories"
                        value={formData.nutrition.calories}
                        onChange={handleInputChange}
                        min="0"
                        max="10000"
                        className={`w-full px-4 py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 ${
                          errors.calories ? 'border-red-300' : 'border-green-300'
                        }`}
                        disabled={isSubmitting || isUploading}
                      />
                      {errors.calories && (
                        <p className="mt-1 text-sm text-red-600">{errors.calories}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Imagen */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Imagen de la Receta</h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition bg-gray-50">
                    {imagePreview ? (
                      <div className="relative">
                        <div 
                          className="w-full h-48 bg-cover bg-center rounded-lg border border-gray-200 mb-4"
                          style={{ backgroundImage: `url(${imagePreview})` }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setImageFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm"
                          disabled={isUploading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="py-8">
                        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-700 font-medium mb-2">
                          Haz clic para subir una imagen
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          PNG, JPG, GIF, WebP hasta 10MB
                        </p>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {imagePreview ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                    </label>
                  </div>
                  
                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-700 mb-1">
                        <span className="font-medium">Subiendo imagen...</span>
                        <span className="font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-6">
                {/* Categorías con autocompletado */}
                <div className="bg-white rounded-lg border border-indigo-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      Categorías <span className="text-red-500">*</span>
                    </label>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {formData.category.length} categorías
                    </span>
                  </div>
                  
                  {errors.category && (
                    <p className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{errors.category}</p>
                  )}
                  
                  <div className="mb-4">
                    {/* ✅ AGREGADO: allowCreate y onItemCreate */}
                    <AutocompleteInput
                      suggestions={getUniqueSuggestions(formData.category, availableCategories)}
                      value={newCategory}
                      onChange={setNewCategory}
                      onSelect={handleAddCategory}
                      onItemCreate={handleCreateCategory}
                      allowCreate={true}
                      separator="both"
                      placeholder="Escribe para buscar o agregar una categoría..."
                      disabled={isSubmitting || isUploading}
                      maxSuggestions={5}
                      className="border-indigo-300"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.category.map((cat, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(index)}
                          className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          disabled={isSubmitting || isUploading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ingredientes con drag & drop */}
                <div className="bg-white rounded-lg border border-orange-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      Ingredientes <span className="text-red-500">*</span>
                    </label>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {formData.ingredients.length} ingredientes
                    </span>
                  </div>
                  
                  {errors.ingredients && (
                    <p className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{errors.ingredients}</p>
                  )}
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddIngredient)}
                      className="flex-1 px-4 py-3 text-gray-700 border border-orange-200 rounded-lg disabled:opacity-50 bg-white"
                      placeholder="Ej: 200g de pechuga de pollo"
                      disabled={isSubmitting || isUploading}
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-5 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 shadow-sm"
                      disabled={isSubmitting || isUploading}
                    >
                      Agregar
                    </button>
                  </div>
                  
                  {formData.ingredients.length > 0 && (
                    <div className="mb-2 text-xs text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      Arrastra para reordenar los ingredientes
                    </div>
                  )}
                  
                  <DragDropList
                    items={formData.ingredients}
                    renderItem={(ingredient, index) => (
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <span className="flex-1 text-gray-700">{ingredient}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                          disabled={isSubmitting || isUploading}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                    onReorder={handleReorderIngredients}
                    disabled={isSubmitting || isUploading}
                    className="max-h-64 overflow-y-auto"
                  />
                </div>

                {/* Instrucciones con drag & drop */}
                <div className="bg-white rounded-lg border border-purple-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      Instrucciones <span className="text-red-500">*</span>
                    </label>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {formData.instructions.length} pasos
                    </span>
                  </div>
                  
                  {errors.instructions && (
                    <p className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{errors.instructions}</p>
                  )}
                  
                  <div className="flex gap-2 mb-4">
                    <textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      className="flex-1 px-4 py-3 text-gray-700 border border-purple-200 rounded-lg disabled:opacity-50 bg-white"
                      placeholder="Describe un paso de la preparación..."
                      rows={2}
                      disabled={isSubmitting || isUploading}
                    />
                    <button
                      type="button"
                      onClick={handleAddInstruction}
                      className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
                      disabled={isSubmitting || isUploading}
                    >
                      Agregar
                    </button>
                  </div>
                  
                  {formData.instructions.length > 0 && (
                    <div className="mb-2 text-xs text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      Arrastra para reordenar los pasos
                    </div>
                  )}
                  
                  <DragDropList
                    items={formData.instructions}
                    renderItem={(instruction, index) => (
                      <div className="flex gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-800 rounded-full font-bold border-2 border-purple-300">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700">{instruction}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveInstruction(index)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                          disabled={isSubmitting || isUploading}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                    onReorder={handleReorderInstructions}
                    disabled={isSubmitting || isUploading}
                    className="max-h-64 overflow-y-auto"
                  />
                </div>

                {/* Tags con autocompletado */}
                <div className="bg-white rounded-lg border border-pink-200 p-6 shadow-sm">
                  <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    Etiquetas
                  </label>
                  
                  <div className="mb-4">
                    {/* ✅ AGREGADO: allowCreate y onItemCreate */}
                    <AutocompleteInput
                      suggestions={getUniqueSuggestions(formData.tags, availableTags)}
                      value={newTag}
                      onChange={setNewTag}
                      onSelect={handleAddTag}
                      onItemCreate={handleCreateTag}
                      allowCreate={true}
                      separator="both"
                      placeholder="Escribe para buscar o agregar una etiqueta..."
                      disabled={isSubmitting || isUploading}
                      maxSuggestions={5}
                      className="border-pink-300"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-800 rounded-full border border-pink-200"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(index)}
                          className="text-pink-600 hover:text-pink-800 disabled:opacity-50"
                          disabled={isSubmitting || isUploading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                disabled={isSubmitting || isUploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting || isUploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isUploading ? 'Subiendo imagen...' : 'Guardando...'}
                  </span>
                ) : recipe ? (
                  'Actualizar Receta'
                ) : (
                  'Crear Receta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastComponent />
    </>
  );
};

export default RecipeModal;
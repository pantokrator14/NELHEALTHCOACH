import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Recipe, RecipeFormData, RecipeImage } from '../../../../../packages/types/src/recipe-types';
import Image from 'next/image'; // Para reemplazar <img>

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onSave: (data: RecipeFormData) => Promise<void>;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose, onSave }) => {
  const [formData, setFormData] = useState<RecipeFormData>({
    title: '',
    description: '',
    category: [],
    ingredients: [''],
    instructions: [''],
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Si la receta ya tiene imagen, establecer preview
      if (recipe.image && recipe.image.url) {
        setImagePreview(recipe.image.url);
      }
    }
  }, [recipe]);

  // Manejar selección de archivo
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validar tamaño (10MB máximo)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('La imagen es demasiado grande (máximo 10MB)');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setImageFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        console.error('Error al leer el archivo');
        setImagePreview(null);
        setImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para subir imagen a S3
  const uploadImageToS3 = useCallback(async (file: File, recipeId: string): Promise<RecipeImage> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 1. Generar URL de upload
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const uploadResponse = await fetch(`/api/recipes/${recipeId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error generando URL de upload');
      }

      const { data } = await uploadResponse.json();
      const { uploadURL, fileKey, fileURL } = data;

      // 2. Subir archivo directamente a S3
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
              // 3. Confirmar upload en nuestra API
              const confirmResponse = await fetch(`/api/recipes/${recipeId}/upload`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fileKey,
                  fileName: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                  fileURL,
                }),
              });

              if (!confirmResponse.ok) {
                const errorData = await confirmResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error confirmando upload');
              }

              const imageData: RecipeImage = {
                url: fileURL,
                key: fileKey,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
              };

              resolve(imageData);
            } catch (confirmError) {
              reject(confirmError);
            }
          } else {
            reject(new Error(`Error subiendo archivo a S3: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Error de conexión al subir archivo'));
        });

        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('El título y la descripción son requeridos');
      return;
    }

    if (formData.ingredients.length === 0) {
      alert('Debe agregar al menos un ingrediente');
      return;
    }

    if (formData.instructions.length === 0) {
      alert('Debe agregar al menos una instrucción');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let recipeData: RecipeFormData = { ...formData };
      
      // Si hay una nueva imagen y es una receta existente, subirla primero
      if (imageFile && recipe?.id) {
        try {
          const imageData = await uploadImageToS3(imageFile, recipe.id);
          recipeData = { ...recipeData, image: imageData };
        } catch (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          alert('Error subiendo imagen. La receta se guardará sin imagen.');
          // Continuamos sin la imagen
        }
      }
      
      await onSave(recipeData);
      onClose();
    } catch (error: unknown) {
      console.error('Error guardando receta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la receta';
      alert(errorMessage);
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
    } else if (name === 'cookTime' || name === 'difficulty') {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'cookTime' ? parseInt(value, 10) || 0 : value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !formData.category.includes(newCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        category: [...prev.category, newCategory.trim()],
      }));
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.filter((_, i) => i !== index),
    }));
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient.trim()],
      }));
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      setFormData(prev => ({
        ...prev,
        instructions: [...prev.instructions, newInstruction.trim()],
      }));
      setNewInstruction('');
    }
  };

  const handleRemoveInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  // Manejar tecla Enter en inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, callback: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {recipe ? 'Editar Receta' : 'Nueva Receta'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Cerrar"
            disabled={isSubmitting || isUploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Sección de Imagen */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Imagen de la Receta
            </label>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview de imagen */}
              <div className="flex-1">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition">
                  {imagePreview ? (
                    <div className="relative">
                      {/* Usamos div con background-image en lugar de img para evitar advertencia */}
                      <div 
                        className="w-full h-48 bg-cover bg-center rounded-lg"
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
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        disabled={isUploading}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Haz clic para subir una imagen
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
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
                    className="mt-4 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {imagePreview ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                  </label>
                </div>
                
                {/* Barra de progreso */}
                {isUploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Subiendo imagen...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Información de la imagen */}
              <div className="flex-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Recomendaciones:</h4>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Imágenes claras y bien iluminadas
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Resolución mínima: 800x600px
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Formato recomendado: JPG o PNG
                      </li>
                    </ul>
                  </div>
                  
                  {imageFile && !isUploading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Archivo seleccionado:</strong> {imageFile.name}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Tamaño: {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                placeholder="Nombre de la receta"
                disabled={isSubmitting || isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dificultad *
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                disabled={isSubmitting || isUploading}
                required
              >
                <option value="easy">Fácil</option>
                <option value="medium">Media</option>
                <option value="hard">Difícil</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo de preparación (minutos) *
              </label>
              <input
                type="number"
                name="cookTime"
                value={formData.cookTime}
                onChange={handleInputChange}
                min="1"
                max="999"
                required
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proteína (g) *
              </label>
              <input
                type="number"
                name="nutrition.protein"
                value={formData.nutrition.protein}
                onChange={handleInputChange}
                min="0"
                max="1000"
                step="0.1"
                required
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="Describe brevemente la receta..."
              disabled={isSubmitting || isUploading}
            />
          </div>

          {/* Categorías */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categorías
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleAddCategory)}
                className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                placeholder="Ej: Mexicana, Keto, Vegana"
                disabled={isSubmitting || isUploading}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.category.map((cat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(index)}
                    className="ml-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    disabled={isSubmitting || isUploading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredientes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredientes *
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleAddIngredient)}
                className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                placeholder="Ej: 200g de pechuga de pollo"
                disabled={isSubmitting || isUploading}
              />
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              >
                Agregar
              </button>
            </div>
            <div className="space-y-2">
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-700">•</span>
                  <span className="flex-1 text-gray-700">{ing}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    disabled={isSubmitting || isUploading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instrucciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucciones *
            </label>
            <div className="flex gap-2 mb-3">
              <textarea
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                placeholder="Describe un paso de la preparación..."
                rows={2}
                disabled={isSubmitting || isUploading}
              />
              <button
                type="button"
                onClick={handleAddInstruction}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              >
                Agregar
              </button>
            </div>
            <div className="space-y-3">
              {formData.instructions.map((inst, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">{inst}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstruction(index)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 disabled:opacity-50"
                    disabled={isSubmitting || isUploading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Información nutricional adicional */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carbohidratos (g)
              </label>
              <input
                type="number"
                name="nutrition.carbs"
                value={formData.nutrition.carbs}
                onChange={handleInputChange}
                min="0"
                max="1000"
                step="0.1"
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grasas (g)
              </label>
              <input
                type="number"
                name="nutrition.fat"
                value={formData.nutrition.fat}
                onChange={handleInputChange}
                min="0"
                max="1000"
                step="0.1"
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calorías
              </label>
              <input
                type="number"
                name="nutrition.calories"
                value={formData.nutrition.calories}
                onChange={handleInputChange}
                min="0"
                max="10000"
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etiquetas
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleAddTag)}
                className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
                placeholder="Ej: bajo en carbohidratos, vegano, rápido"
                disabled={isSubmitting || isUploading}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                disabled={isSubmitting || isUploading}
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="ml-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                    disabled={isSubmitting || isUploading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isUploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting || isUploading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
  );
};

export default RecipeModal;
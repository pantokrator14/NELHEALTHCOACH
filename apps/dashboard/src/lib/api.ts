import { AIRecommendationSession, ChecklistItem } from '../../../../packages/types/src/healthForm';
import { Recipe, RecipeFormData, RecipeImage } from '../../../../packages/types/src/recipe-types';
import { NutritionAnalysisResult } from '../../../../packages/types/src/nutrition-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CreateChecklistItemData {
  weekNumber: number;
  category: 'nutrition' | 'exercise' | 'habit';
  data: {
    description: string;
    type?: string;
    frequency?: number;
    recipeId?: string;
    details?: {
      frequency?: string;
      duration?: string;
      equipment?: string[];
      recipe?: {
        ingredients: Array<{name: string; quantity: string; notes?: string}>;
        preparation: string;
        tips?: string;
      };
    };
  };
}

interface UpdateChecklistItemData {
  description?: string;
  frequency?: number;
  recipeId?: string;
  details?: {
    frequency?: string;
    duration?: string;
    equipment?: string[];
    recipe?: {
      ingredients: Array<{name: string; quantity: string; notes?: string}>;
      preparation: string;
      tips?: string;
    };
  };
}

interface ImportableAISessionData {
  summary?: string;
  vision?: string;
  weeks?: unknown[];
  checklist?: unknown[];
  coachNotes?: string;
  monthNumber?: number;
  status?: 'draft' | 'approved' | 'sent';
  baselineMetrics?: {
    currentWeight?: number;
    targetWeight?: number;
    currentLifestyle?: string[];
    targetLifestyle?: string[];
  };
  [key: string]: unknown;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  success: boolean;
  message?: string;
}

// Eliminada: interface UploadRequest no utilizada

interface UploadResponse {
  uploadURL: string;
  fileKey: string;
  fileURL?: string;
}

interface AIRecommendationRequest {
  monthNumber: number;
  reprocessDocuments: boolean;
  coachNotes: string;
}

interface AIProgressResponse {
  success: boolean;
  data: {
    hasAIProgress: boolean;
    aiProgress: {
      sessions?: Array<{
        sessionId: string;
        summary?: string;
        vision?: string;
        weeks?: Array<{
          habits?: {
            checklistItems?: ChecklistItem[];
          };
        }>;
      }>;
    };
  };
}

interface AIActionRequest {
  action: string;
  sessionId: string;
  data?: {
    checklistItems?: ChecklistItem[];
    coachNotes?: string;
  };
}

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const apiClient = {
  async login(credentials: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error en el login');
    }

    return response.json();
  },

  async getClients() {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cargar clientes');
    }
    return response.json();
  },

  async getClient(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cargar cliente');
    }
    return response.json();
  },

  async updateClient(id: string, data: Partial<Client>): Promise<ApiResponse<Client>> {
    console.log('🔄 Enviando actualización para cliente:', id, data);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('❌ Error del servidor:', responseData);
        throw new Error(responseData.message || `Error ${response.status} al actualizar cliente`);
      }
      
      console.log('✅ Actualización exitosa:', responseData);
      return responseData as ApiResponse<Client>;
      
    } catch (error) {
      console.error('❌ Error en updateClient:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al actualizar cliente');
    }
  },

  async deleteClient(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al eliminar cliente');
    }
    return response.json();
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/api/stats`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cargar estadísticas');
    }
    return response.json();
  },

  async generateUploadURL(
    clientId: string, 
    fileName: string, 
    fileType: string, 
    fileSize: number, 
    fileCategory: 'profile' | 'document'
  ): Promise<UploadResponse> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileName,
        fileType,
        fileSize,
        fileCategory
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error generando URL de upload');
    }
    return response.json() as Promise<UploadResponse>;
  },

  async confirmUpload(
    clientId: string,
    fileKey: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileCategory: 'profile' | 'document',
    fileURL: string
  ): Promise<ApiResponse<unknown>> {
    console.log('🔵 Confirmando upload:', { clientId, fileName, fileKey });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fileKey,
          fileName,
          fileType,
          fileSize,
          fileCategory,
          fileURL
        }),
      });
      
      const responseData = await response.json();
      console.log('🔵 Respuesta de confirmación:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `Error ${response.status} confirmando upload`);
      }
      
      return responseData as ApiResponse<unknown>;
      
    } catch (error) {
      console.error('❌ Error en confirmUpload:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error confirmando upload');
    }
  },

  async deleteDocument(clientId: string, fileKey: string): Promise<ApiResponse<unknown>> {
    console.log('🗑️ Eliminando documento:', { clientId, fileKey });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fileKey }),
      });
      
      const responseData = await response.json();
      console.log('🗑️ Respuesta de eliminación:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `Error ${response.status} eliminando documento`);
      }
      
      return responseData as ApiResponse<unknown>;
    } catch (error) {
      console.error('❌ Error en deleteDocument:', error);
      throw error;
    }
  },

  // Métodos para IA
  async generateAIRecommendations(
    clientId: string, 
    monthNumber: number = 1, 
    reprocessDocuments: boolean = false,
    coachNotes: string = ''
  ): Promise<ApiResponse<unknown>> {
    console.log('🚀 generateAIRecommendations llamado:', {
      clientId,
      monthNumber,
      API_BASE_URL,
      endpoint: `${API_BASE_URL}/api/clients/${clientId}/ai`
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          monthNumber,
          reprocessDocuments,
          coachNotes
        } as AIRecommendationRequest),
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        let errorData: { message?: string };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Error desconocido' };
        }
        throw new Error(errorData.message || 'Error generando recomendaciones de IA');
      }
      
      const data = await response.json();
      console.log('✅ Response data:', data);
      return data as ApiResponse<unknown>;
      
    } catch (error) {
      console.error('💥 Error en generateAIRecommendations:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al generar recomendaciones de IA');
    }
  },

  async getAIProgress(clientId: string): Promise<AIProgressResponse> {
    console.log('🔍 getAIProgress llamado para cliente:', clientId);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
        headers: getAuthHeaders(),
      });
      
      console.log('📡 Status de getAIProgress:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar progreso de IA');
      }
      
      const result = await response.json();
      console.log('📦 Respuesta completa getAIProgress:', {
        success: result.success,
        hasData: !!result.data,
        hasAIProgress: result.data?.hasAIProgress,
        sessions: result.data?.aiProgress?.sessions?.length || 0,
        firstSession: result.data?.aiProgress?.sessions?.[0] ? {
          sessionId: result.data.aiProgress.sessions[0].sessionId,
          summary: result.data.aiProgress.sessions[0].summary?.substring(0, 50),
          vision: result.data.aiProgress.sessions[0].vision?.substring(0, 50),
          weeks: result.data.aiProgress.sessions[0].weeks?.length || 0,
          week1Habits: result.data.aiProgress.sessions[0].weeks?.[0]?.habits?.checklistItems?.length || 0
        } : null
      });
      
      return result as AIProgressResponse;
      
    } catch (error) {
      console.error('💥 Error en getAIProgress:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al cargar progreso de IA');
    }
  },

  updateAIChecklist: async (
    clientId: string, 
    sessionId: string, 
    checklistItems: ChecklistItem[]
  ): Promise<ApiResponse<unknown>> => {
    console.log('📝 Enviando checklist al backend...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update_checklist',
          sessionId,
          data: { checklistItems }
        } as AIActionRequest),
      });

      const responseData = await response.json();
      console.log('📦 Respuesta completa:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `Error ${response.status}`);
      }
      
      return responseData as ApiResponse<unknown>;
      
    } catch (error) {
      console.error('💥 Error en updateAIChecklist:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al actualizar checklist de IA');
    }
  },

  async approveAISession(clientId: string, sessionId: string): Promise<ApiResponse<unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'approve_session',
        sessionId
      } as AIActionRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error aprobando sesión');
    }
    return response.json() as Promise<ApiResponse<unknown>>;
  },

  async sendAISessionToClient(clientId: string, sessionId: string): Promise<ApiResponse<unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'send_to_client',
        sessionId
      } as AIActionRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error enviando sesión al cliente');
    }
    return response.json() as Promise<ApiResponse<unknown>>;
  },

  async regenerateAISession(
    clientId: string, 
    sessionId: string, 
    coachNotes: string = ''
  ): Promise<ApiResponse<unknown>> {
    console.log('🔄 regenerateAISession llamado:', {
      clientId,
      sessionId,
      hasCoachNotes: !!coachNotes && coachNotes.trim().length > 0
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'regenerate_session',
          sessionId,
          data: { 
            coachNotes: coachNotes || ''
          }
        } as AIActionRequest),
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        let errorData: { message?: string };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Error desconocido' };
        }
        throw new Error(errorData.message || 'Error regenerando sesión');
      }
      
      const data = await response.json();
      console.log('✅ Regeneración exitosa:', data);
      return data as ApiResponse<unknown>;
      
    } catch (error) {
      console.error('💥 Error en regenerateAISession:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al regenerar sesión de IA');
    }
  },

  async importAISession(
    clientId: string,
    sessionData: ImportableAISessionData,
    monthNumber: number = 1
  ): Promise<ApiResponse<unknown>> {
    console.log('📤 importAISession llamado:', {
      clientId,
      monthNumber,
      sessionDataKeys: Object.keys(sessionData)
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'import_session',
          sessionId: '', // El backend generará uno nuevo
          data: { 
            sessionData,
            monthNumber
          }
        } as AIActionRequest),
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        let errorData: { message?: string };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Error desconocido' };
        }
        throw new Error(errorData.message || 'Error importando sesión de IA');
      }
      
      const data = await response.json();
      console.log('✅ Importación exitosa:', data);
      return data as ApiResponse<unknown>;
      
    } catch (error) {
      console.error('💥 Error en importAISession:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al importar sesión de IA');
    }
  },

  async extractTextFromFile(file: File): Promise<ApiResponse<{ extractedText: string; fileName: string; fileType: string; fileSize: number; extractedLength: number }>> {
    console.log('📄 extractTextFromFile llamado:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/extract-text`, {
        method: 'POST',
        body: formData,
        // No incluir Content-Type header, FormData lo establece automáticamente con boundary
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        let errorData: { message?: string };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Error desconocido' };
        }
        throw new Error(errorData.message || 'Error extrayendo texto del archivo');
      }
      
      const data = await response.json();
      console.log('✅ Texto extraído exitosamente:', {
        fileName: data.data?.fileName,
        extractedLength: data.data?.extractedLength
      });
      return data as ApiResponse<{ extractedText: string; fileName: string; fileType: string; fileSize: number; extractedLength: number }>;
      
    } catch (error) {
      console.error('💥 Error en extractTextFromFile:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al extraer texto del archivo');
    }
  },

  // Métodos para Recetas - Tipos corregidos
  async getRecipes(search?: string, category?: string): Promise<ApiResponse<Recipe[]>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/api/recipes${query}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cargar recetas');
    }
    return response.json();
  },

  async generateRecipeUploadURL(
    recipeId: string, 
    fileName: string, 
    fileType: string, 
    fileSize: number
  ): Promise<UploadResponse> {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileName,
        fileType,
        fileSize,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error generando URL de upload');
    }
    
    const result = await response.json();
    
    // ✅ CORRECCIÓN: Extraer data de la respuesta del servidor
    if (result.success && result.data) {
      return {
        uploadURL: result.data.uploadURL,
        fileKey: result.data.fileKey,
        fileURL: result.data.fileURL // Puede ser undefined
      };
    }
    
    throw new Error('Respuesta del servidor inválida');
  },

  async confirmRecipeUpload(
    recipeId: string,
    fileKey: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileURL: string
  ): Promise<ApiResponse<unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/upload`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileKey,
        fileName,
        fileType,
        fileSize,
        fileURL
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error confirmando upload');
    }
    return response.json();
  },

  async deleteRecipeImage(recipeId: string, fileKey: string): Promise<ApiResponse<unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/upload`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fileKey }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error eliminando imagen');
    }
    return response.json();
  },

  // Método para obtener receta individual
  async getRecipe(id: string): Promise<ApiResponse<Recipe>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cargar receta');
    }
    return response.json();
  },

  // Método actualizado para crear receta
  async createRecipe(data: RecipeFormData & { image?: RecipeImage }): Promise<ApiResponse<Recipe>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error creando receta');
    }
    return response.json();
  },

  // Método actualizado para actualizar receta
  async updateRecipe(id: string, data: Partial<RecipeFormData> & { image?: RecipeImage }): Promise<ApiResponse<Recipe>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error actualizando receta');
    }
    return response.json();
  },

  // Método para eliminar receta
  async deleteRecipe(id: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error eliminando receta');
    }
    return response.json();
  },

  // Método para inicializar base de datos (para desarrollo)
  async initializeRecipesDatabase(): Promise<ApiResponse<unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/recipes`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error inicializando base de datos');
    }
    return response.json();
  }, 

  // Agregar al objeto apiClient
  analyzeRecipeNutrition: async (
    ingredients: string[], 
    servings: number = 1
  ): Promise<{ 
    success: boolean; 
    data: NutritionAnalysisResult; 
    source: 'ai' | 'local' | 'manual';
    warning?: string;
    timestamp: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/api/recipes/analyze-nutrition`, {
      method: 'POST',
      headers: getAuthHeaders(), // Usar la misma función que las demás llamadas
      body: JSON.stringify({ 
        ingredients, 
        servings,
        timestamp: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Error analizando nutrición');
    }
    
    return response.json();
  },

  // Buscar recetas
  async searchRecipes(query: string) {
    const response = await fetch(`${API_BASE_URL}/api/recipes?search=${encodeURIComponent(query)}&mode=search`);
    return response.json();
  },

  // Obtener receta por ID
  async getRecipeById(id: string) {
    const response = await fetch(`/api/recipes/${id}`);
    return response.json();
  },

  // Actualizar campo de sesión (summary/vision)
  async updateAISessionField(clientId: string, sessionId: string, field: string, value: string) {
    const response = await fetch(`/api/clients/${clientId}/ai/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value }),
    });
    return response.json();
  },

  // Crear nuevo ítem en checklist
  async createAIChecklistItem(clientId: string, sessionId: string, data: CreateChecklistItemData) {
    const response = await fetch(`/api/clients/${clientId}/ai/sessions/${sessionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Actualizar ítem existente
  async updateAIChecklistItem(clientId: string, sessionId: string, itemId: string, data: UpdateChecklistItemData) {
  // Puedes tipar data según lo que acepte tu backend
    const response = await fetch(`/api/clients/${clientId}/ai/sessions/${sessionId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Eliminar ítem
  async deleteAIChecklistItem(clientId: string, sessionId: string, itemId: string) {
    const response = await fetch(`/api/clients/${clientId}/ai/sessions/${sessionId}/items/${itemId}`, {
      method: 'DELETE',
    });
    return response.json();
  },
  async updateAISessionFields(
    clientId: string,
    sessionId: string,
    fields: { summary?: string; vision?: string }
  ): Promise<ApiResponse<{ session: AIRecommendationSession }>> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'update_session_fields',
        sessionId,
        data: { fields }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error actualizando campos de sesión');
    }
    return response.json();
  },

  async updateAIShoppingList(clientId: string, sessionId: string, weekNumber: number): Promise<ApiResponse<unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'generate_shopping_list',
        sessionId,
        data: { weekNumber }
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error actualizando lista de compras');
    }
    return response.json();
  }
};
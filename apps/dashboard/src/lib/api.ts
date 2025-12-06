const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token ? { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : { 'Content-Type': 'application/json' };
  }
  return { 'Content-Type': 'application/json' };
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

  async updateClient(id: string, data: any) {
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
      return responseData;
      
    } catch (error: any) {
      console.error('❌ Error en updateClient:', error);
      throw error;
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
  ) {
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
    return response.json();
  },

  async confirmUpload(
    clientId: string,
    fileKey: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileCategory: 'profile' | 'document',
    fileURL: string
  ) {
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
      
      return responseData;
      
    } catch (error: any) {
      console.error('❌ Error en confirmUpload:', error);
      throw new Error(error.message || 'Error confirmando upload');
    }
  },

  async deleteDocument(clientId: string, fileKey: string) {
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
      
      return responseData;
    } catch (error: any) {
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
  ) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        monthNumber,
        reprocessDocuments,
        coachNotes
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error generando recomendaciones de IA');
    }
    return response.json();
  },

  async getAIProgress(clientId: string) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cargar progreso de IA');
    }
    return response.json();
  },

  updateAIChecklist: async (
    clientId: string, 
    sessionId: string, 
    checklistItems: ChecklistItem[]
  ) => {
    const response = await fetch(`/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        action: 'update_checklist',
        sessionId,
        data: { checklistItems }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error actualizando checklist');
    }
    
    return response.json();
  },

  async approveAISession(clientId: string, sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'approve_session',
        sessionId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error aprobando sesión');
    }
    return response.json();
  },

  async sendAISessionToClient(clientId: string, sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'send_to_client',
        sessionId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error enviando sesión al cliente');
    }
    return response.json();
  },

  async regenerateAISession(clientId: string, sessionId: string, coachNotes: string = '') {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/ai`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'regenerate_session',
        sessionId,
        data: { coachNotes }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error regenerando sesión');
    }
    return response.json();
  }
};
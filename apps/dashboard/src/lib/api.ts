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
    const response = await fetch(`/api/clients/${clientId}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({
        fileName,
        fileType,
        fileSize,
        fileCategory
      }),
    });
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
    const response = await fetch(`/api/clients/${clientId}/upload`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({
        fileKey,
        fileName,
        fileType,
        fileSize,
        fileCategory,
        fileURL
      }),
    });
    return response.json();
  },

  async deleteDocument(clientId: string, fileKey: string) {
    const response = await fetch(`/api/clients/${clientId}/documents`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ fileKey }),
    });
    return response.json();
  }
};
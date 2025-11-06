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
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar cliente');
    }
    return response.json();
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
};
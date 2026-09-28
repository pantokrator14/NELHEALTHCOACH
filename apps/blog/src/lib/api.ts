// apps/blog/src/lib/api.ts
// Cliente único de la API del blog (mismo patrón que dashboard/form):
// objeto con métodos tipados + auth Bearer desde localStorage + X-Visitor-Id.
import { clearAuthToken, getAuthToken, setAuthToken } from './authSession';
import { getVisitorId } from './fingerprint';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface BlogCoverImage {
  url: string;
  key: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage: BlogCoverImage | null;
  author: string;
  isPublished: boolean;
  sourceLang: string;
  /** Idioma en el que vienen resueltos los campos de texto de esta respuesta. */
  lang?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  name: string;
  count: number;
}

export interface BlogPostInput {
  title: string;
  excerpt?: string;
  content: string;
  category?: string;
  tags?: string[];
  coverImage?: BlogCoverImage | null;
  isPublished: boolean;
}

export interface UploadUrlResponse {
  uploadURL: string;
  fileKey: string;
  fileURL: string;
}

/** Perfil del autor del blog (editable por el admin). */
export interface BlogAuthor {
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  yearsOfExperience: number;
  photo: BlogCoverImage | null;
  lang?: string;
}

export interface BlogAuthorInput {
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  yearsOfExperience: number;
  photo?: BlogCoverImage | null;
}

/** Total de visitas agregadas de una entrada (analytics sin cookies). */
export interface BlogViewStat {
  slug: string;
  total: number;
}

/** Comentario moderado del blog (público). */
export interface BlogComment {
  id: string;
  postSlug: string;
  authorName: string;
  content: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/** Entrada de un comentario nuevo. `website` es el honeypot anti-spam. */
export interface BlogCommentInput {
  postSlug: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  website?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Headers anti-bot para el fetch SERVER-SIDE (SSR/gSSP): el proxy de la API
 * (botDetector) bloquea User-Agents vacíos/cortos ('node') y exige
 * Accept-Language. En el navegador son headers PROHIBIDOS por fetch y se
 * ignoran automáticamente (el navegador manda los suyos reales).
 */
const SERVER_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const visitorId = getVisitorId();
  if (visitorId) headers['X-Visitor-Id'] = visitorId;
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  redirectOn401 = true,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...SERVER_FETCH_HEADERS, ...getAuthHeaders(), ...(options.headers ?? {}) },
  });

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    // respuesta sin cuerpo JSON
  }

  // Sesión vencida/inválida → limpiar y redirigir al login (solo en /admin)
  if (res.status === 401 && redirectOn401 && typeof window !== 'undefined') {
    clearAuthToken();
    const isAdminPage = window.location.pathname.startsWith('/admin');
    const isLoginPage = window.location.pathname.startsWith('/admin/login');
    if (isAdminPage && !isLoginPage) {
      window.location.href = '/admin/login';
    }
  }

  if (!res.ok) {
    throw new ApiError(
      (payload?.message as string) || `Error ${res.status}`,
      res.status,
      payload?.code as string | undefined,
    );
  }

  return (payload?.data ?? payload) as T;
}

// ── Cliente ──────────────────────────────────────────────────────────────────

export const apiClient = {
  /** Lista entradas públicas (o todas, si hay token de admin válido). */
  getPosts(lang?: string, category?: string): Promise<BlogPost[]> {
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    if (category) params.set('category', category);
    return request<BlogPost[]>(`/api/blog/posts?${params.toString()}`, {}, false);
  },

  /** Detalle de una entrada por slug. */
  getPost(slug: string, lang?: string): Promise<BlogPost> {
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    return request<BlogPost>(
      `/api/blog/posts/${encodeURIComponent(slug)}?${params.toString()}`,
      {},
      false,
    );
  },

  /** Categorías derivadas de las entradas publicadas. */
  getCategories(): Promise<BlogCategory[]> {
    return request<BlogCategory[]>('/api/blog/categories', {}, false);
  },

  /** Perfil público del autor (nombre, rol, bio y foto). */
  getAuthor(lang?: string): Promise<BlogAuthor> {
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    return request<BlogAuthor>(`/api/blog/author?${params.toString()}`, {}, false);
  },

  /** Guarda el perfil del autor (solo admin). */
  updateAuthor(input: BlogAuthorInput): Promise<BlogAuthor> {
    return request<BlogAuthor>('/api/blog/author', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /** URL prefirmada de S3 para la foto del autor (solo admin). */
  getAuthorUploadUrl(fileName: string, fileType: string, fileSize: number): Promise<UploadUrlResponse> {
    return request<UploadUrlResponse>('/api/blog/author/upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, fileSize }),
    });
  },

  // ── Descubrimiento y analíticas ────────────────────────────────────────────

  /** Entradas relacionadas de una entrada publicada (solo traducciones cacheadas). */
  getRelated(slug: string, lang?: string): Promise<BlogPost[]> {
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    const qs = params.toString();
    return request<BlogPost[]>(
      `/api/blog/posts/${encodeURIComponent(slug)}/related${qs ? `?${qs}` : ''}`,
      {},
      false,
    );
  },

  /** Registra una visita anónima (analytics sin cookies ni IP). */
  trackView(slug: string): Promise<unknown> {
    return request<unknown>(
      '/api/blog/views',
      { method: 'POST', body: JSON.stringify({ slug }) },
      false,
    );
  },

  /** Totales de visitas por entrada (solo admin). */
  getViewStats(): Promise<BlogViewStat[]> {
    return request<BlogViewStat[]>('/api/blog/views');
  },

  // ── Comentarios (con moderación) ──────────────────────────────────────────

  /** Comentarios APROBADOS de una entrada (público). */
  getComments(slug: string): Promise<BlogComment[]> {
    return request<BlogComment[]>(`/api/blog/comments?post=${encodeURIComponent(slug)}`, {}, false);
  },

  /** Envía un comentario (queda pendiente de moderación). */
  submitComment(input: BlogCommentInput): Promise<unknown> {
    return request<unknown>('/api/blog/comments', {
      method: 'POST',
      body: JSON.stringify(input),
    }, false);
  },

  /** Listado de moderación: pendientes o todos (solo admin). */
  getCommentsAdmin(scope: 'pending' | 'all'): Promise<BlogComment[]> {
    return request<BlogComment[]>(`/api/blog/comments?scope=${scope}`);
  },

  /** Aprueba o rechaza un comentario (solo admin). */
  moderateComment(id: string, status: 'approved' | 'rejected'): Promise<unknown> {
    return request<unknown>(`/api/blog/comments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /** Elimina un comentario (solo admin). */
  deleteComment(id: string): Promise<unknown> {
    return request<unknown>(`/api/blog/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── CRUD (solo admin) ──

  createPost(input: BlogPostInput): Promise<BlogPost> {
    return request<BlogPost>('/api/blog/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updatePost(id: string, input: BlogPostInput): Promise<BlogPost> {
    return request<BlogPost>(`/api/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deletePost(id: string): Promise<void> {
    return request<void>(`/api/blog/posts/${id}`, { method: 'DELETE' });
  },

  /** URL prefirmada de S3 para subir la imagen destacada. */
  getUploadUrl(id: string, fileName: string, fileType: string, fileSize: number): Promise<UploadUrlResponse> {
    return request<UploadUrlResponse>(`/api/blog/posts/${id}/upload`, {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, fileSize }),
    });
  },

  /**
   * Login del coach contra la API (POST /api/auth/login).
   * Devuelve el rol para verificar que es admin antes de entrar.
   */
  async login(email: string, password: string): Promise<{ token: string; role: string }> {
    const payload = await request<{ token?: string; coach?: { role?: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false,
    );
    if (!payload?.token) {
      throw new ApiError('Token ausente en la respuesta de login', 401);
    }
    setAuthToken(payload.token);
    return { token: payload.token, role: payload.coach?.role ?? '' };
  },

  logout(): void {
    clearAuthToken();
  },
};

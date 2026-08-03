// apps/dashboard/src/lib/aiVisibleText.ts
// Sanitización de textos visibles al usuario: los nombres de los proveedores
// de IA (Gemini, DeepSeek) NO deben aparecer en ninguna parte de la interfaz.

/**
 * Limpia nombres de proveedores de IA en mensajes de error que provienen
 * del backend (o de respuestas cacheadas) antes de mostrarlos en la UI.
 */
export const sanitizeProviderName = (message: string): string =>
  message
    .replace(/GEMINI_API_KEY|DEEPSEEK_API_KEY/gi, 'la API Key del servicio de IA')
    .replace(/GEMINI_MODEL|DEEPSEEK_MODEL/gi, 'el modelo de IA')
    .replace(/Gemini|DeepSeek/g, 'IA');

/**
 * Versión segura para toasts/alerias: devuelve cadena vacía si el valor
 * no es texto (protección ante datos inesperados del backend).
 */
export const sanitizeProviderText = (message: unknown): string => {
  if (typeof message !== 'string' || message.length === 0) return '';
  return sanitizeProviderName(message);
};
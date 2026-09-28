// apps/blog/src/lib/readingTime.ts
// Tiempo de lectura estimado a partir de Markdown (puro y testable).

export const WORDS_PER_MINUTE = 200;

/** Quita la sintaxis Markdown para contar solo el texto visible. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // bloques de código
    .replace(/`[^`]*`/g, ' ') // código inline
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // imágenes
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → conserva el texto
    .replace(/^#{1,6}\s+/gm, '') // encabezados
    .replace(/[*_~>|]+/g, ' ') // énfasis, citas, tablas
    .replace(/^\s*[-+]\s+/gm, '') // listas
    .replace(/\s+/g, ' ')
    .trim();
}

/** Número de palabras del texto visible de un Markdown. */
export function wordCount(markdown: string): number {
  const text = stripMarkdown(markdown);
  return text === '' ? 0 : text.split(' ').length;
}

/** Minutos de lectura (mínimo 1) a 200 palabras por minuto. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(wordCount(markdown) / WORDS_PER_MINUTE));
}

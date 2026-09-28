// apps/blog/src/lib/xml.ts
// Escape de XML compartido por RSS y sitemap (puro y testable).

/** Escapa los caracteres reservados de XML en un valor de texto. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

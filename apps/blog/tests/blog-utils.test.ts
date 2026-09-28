/**
 * Tests unitarios del frontend del blog (sin DOM ni red).
 *
 * Cubre:
 *  1. normalizeLang: normalización y fallback a 'es'.
 *  2. langFromAcceptLanguage: negociación de idioma en SSR.
 *  3. formatDate: fechas localizadas + entradas inválidas.
 *  4. Paridad i18n: los 6 idiomas tienen exactamente las mismas claves
 *     (una clave faltante en un idioma mostraría texto roto al usuario).
 *  5. Cobertura de claves: toda clave usada en t('...') del código existe
 *     en los 6 idiomas (evita mostrar 'admin.navPanel' en crudo).
 *
 * Correr: cd apps/blog && npx tsx tests/blog-utils.test.ts
 */
import fs from 'fs';
import path from 'path';
import { normalizeLang, langFromAcceptLanguage, formatDate, langFromQuery } from '../src/lib/utils';
import { en, es, fr, it, pt, de } from '../src/lib/translations';
import {
  absoluteUrl,
  buildAlternates,
  buildBlogJsonLd,
  buildPostJsonLd,
  localizedPath,
  ogLocale,
  serializeJsonLd,
} from '../src/lib/seo';
import { readingMinutes, wordCount } from '../src/lib/readingTime';
import { buildRssFeed } from '../src/lib/feed';
import { buildSitemapXml } from '../src/lib/sitemap';
import { landingContactUrl, LANDING_URL } from '../src/lib/links';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

// ── 1. normalizeLang ───────────────────────────────────────────────────────
section('1. normalizeLang');
check('en-US → en', normalizeLang('en-US') === 'en');
check('ES mayúsculas → es', normalizeLang('ES') === 'es');
check('de-DE → de', normalizeLang('de-DE') === 'de');
check('idioma no soportado → es', normalizeLang('ja') === 'es');
check('undefined → es', normalizeLang(undefined) === 'es');
check('no-string → es', normalizeLang(42) === 'es');

// ── 2. langFromAcceptLanguage ──────────────────────────────────────────────
section('2. langFromAcceptLanguage');
check('fr-FR,fr;q=0.9,en;q=0.8 → fr', langFromAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8') === 'fr');
check('pt-BR → pt', langFromAcceptLanguage('pt-BR,pt;q=0.9') === 'pt');
check('it-IT → it', langFromAcceptLanguage('it-IT') === 'it');
check('header ausente → es', langFromAcceptLanguage(undefined) === 'es');
check('header vacío → es', langFromAcceptLanguage('') === 'es');
check('solo idioma no soportado → es', langFromAcceptLanguage('ja-JP') === 'es');

// ── 3. formatDate ──────────────────────────────────────────────────────────
section('3. formatDate');
check('fecha ISO formatea con año', /\d{4}/.test(formatDate('2026-01-15T10:00:00.000Z', 'es')));
check('fecha Date formatea', formatDate(new Date('2026-01-15T10:00:00.000Z'), 'en').length > 0);
check('fecha inválida → vacío', formatDate('no-es-fecha', 'es') === '');
check('undefined → vacío', formatDate(undefined, 'es') === '');
check('null → vacío', formatDate(null, 'es') === '');

// ── 4. Paridad i18n (6 idiomas, mismas claves) ─────────────────────────────
section('4. Paridad i18n');
function leafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...leafPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths.sort();
}

const langs: Record<string, Record<string, unknown>> = { en, es, fr, it, pt, de };
const base = leafPaths(es);

for (const [code, obj] of Object.entries(langs)) {
  const paths = leafPaths(obj);
  const missing = base.filter((p) => !paths.includes(p));
  const extra = paths.filter((p) => !base.includes(p));
  check(
    `${code}: mismas claves que es`,
    missing.length === 0 && extra.length === 0,
    missing.length ? `faltan: ${missing.slice(0, 3).join(', ')}` : `sobran: ${extra.slice(0, 3).join(', ')}`,
  );
}

// ── 5. Cobertura de claves usadas en el código ─────────────────────────────
// Detecta el bug real: claves pedidas con t('admin.navPanel') que no existen
// en los objetos de traducción (se mostraría la clave en crudo al usuario).
section('5. Claves t() usadas en el código');

const srcCandidates = [
  path.resolve(process.cwd(), 'src'),
  path.resolve(process.cwd(), 'apps/blog/src'),
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../src') : '',
].filter((dir) => dir !== '' && fs.existsSync(dir));
const srcDir = srcCandidates[0] ?? '';

function collectSourceFiles(dir: string): string[] {
  if (dir === '') return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function collectUsedKeys(files: string[]): string[] {
  const keys = new Set<string>();
  // (?<![\w.]) evita falsos positivos tipo "apiClient.t('...')" o "format("
  const regex = /(?<![\w.])t\(\s*['"]([^'"]+)['"]/g;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(regex)) keys.add(match[1]);
  }
  return [...keys].sort();
}

function resolveKey(obj: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
      obj,
    );
}

const sourceFiles = collectSourceFiles(srcDir).filter((f) => !f.endsWith('lib/translations.ts'));
const usedKeys = collectUsedKeys(sourceFiles);

check('se escanearon archivos fuente', sourceFiles.length > 0, `srcDir=${srcDir || '(no encontrado)'}`);
check('se encontraron claves t() en el código', usedKeys.length > 0, `${usedKeys.length} claves`);

const missingByLang: Record<string, string[]> = {};
for (const [code, obj] of Object.entries(langs)) {
  const missing = usedKeys.filter((key) => {
    if (resolveKey(obj, key) !== undefined) return false;
    // Plurales i18next: t('author.experience', { count }) resuelve a _one/_other
    return (
      resolveKey(obj, `${key}_one`) === undefined &&
      resolveKey(obj, `${key}_other`) === undefined
    );
  });
  if (missing.length > 0) missingByLang[code] = missing;
}
const langsWithMissing = Object.keys(missingByLang);
check(
  `las ${usedKeys.length} claves usadas existen en los 6 idiomas`,
  langsWithMissing.length === 0,
  langsWithMissing
    .map((code) => `${code}: ${missingByLang[code].slice(0, 5).join(', ')}`)
    .join(' | '),
);

// ── 6. SEO: JSON-LD, canonical y locale ────────────────────────────────────
section('6. SEO');

check('absoluteUrl une base + ruta', absoluteUrl('/post/x') === 'https://blog.nelhealthcoach.com/post/x', absoluteUrl('/post/x'));
check('absoluteUrl no duplica slash', absoluteUrl('post/x') === 'https://blog.nelhealthcoach.com/post/x');
check('absoluteUrl portada', absoluteUrl('/') === 'https://blog.nelhealthcoach.com/');

check('ogLocale es → es_ES', ogLocale('es') === 'es_ES');
check('ogLocale en → en_US', ogLocale('en') === 'en_US');
check('ogLocale idioma desconocido → es_ES', ogLocale('ja') === 'es_ES');

const jsonLd = buildPostJsonLd({
  title: 'La hidratación es clave',
  excerpt: 'Beber agua es fundamental.',
  slug: 'la-hidratacion-es-clave',
  lang: 'es',
  authorName: 'Manuel Martínez',
  authorRole: 'Coach',
  category: 'nutricion',
  coverImageUrl: 'https://s3.example.com/cover.jpg',
  publishedAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-16T10:00:00.000Z',
});
check('post JSON-LD @type BlogPosting', jsonLd['@type'] === 'BlogPosting');
check('post JSON-LD headline', jsonLd.headline === 'La hidratación es clave');
check('post JSON-LD url canónica', jsonLd.mainEntityOfPage === 'https://blog.nelhealthcoach.com/post/la-hidratacion-es-clave' || (jsonLd.mainEntityOfPage as Record<string, unknown>)?.['@id'] === 'https://blog.nelhealthcoach.com/post/la-hidratacion-es-clave');
check('post JSON-LD autor Person', (jsonLd.author as Record<string, unknown>)['@type'] === 'Person' && (jsonLd.author as Record<string, unknown>).name === 'Manuel Martínez');
check('post JSON-LD fecha publicación', jsonLd.datePublished === '2026-01-15T10:00:00.000Z');
check('post JSON-LD fecha modificación', jsonLd.dateModified === '2026-01-16T10:00:00.000Z');
check('post JSON-LD imagen', Array.isArray(jsonLd.image) && (jsonLd.image as string[])[0] === 'https://s3.example.com/cover.jpg');
check('post JSON-LD publisher', (jsonLd.publisher as Record<string, unknown>).name === 'NELHEALTHCOACH');
check('post JSON-LD idioma', jsonLd.inLanguage === 'es');
check('post JSON-LD con categoría keyword', Array.isArray(jsonLd.keywords) && (jsonLd.keywords as string[]).includes('nutricion'));

const jsonLdNoCover = buildPostJsonLd({ title: 'T', excerpt: '', slug: 't', lang: 'en' });
check('post JSON-LD sin imagen no incluye image', jsonLdNoCover.image === undefined);

const blogLd = buildBlogJsonLd({ lang: 'es', authorName: 'Manuel Martínez', authorRole: 'Coach' });
check('blog JSON-LD @type Blog', blogLd['@type'] === 'Blog');
check('blog JSON-LD autor', (blogLd.author as Record<string, unknown>).name === 'Manuel Martínez');

// Seguridad: el JSON-LD nunca debe poder cerrar el <script> (XSS por contenido)
const malicious = serializeJsonLd({ x: '</script><script>alert(1)</script>' });
check('serializeJsonLd escapa < (sin XSS)', !malicious.includes('</script>') && !malicious.includes('<script'));

// ── 7. Descubrimiento: lectura, hreflang, RSS y sitemap ─────────────────────
section('7. Reading time, hreflang, RSS y sitemap');

check('lectura: texto vacío → 1 min', readingMinutes('') === 1);
check('lectura: 200 palabras → 1 min', readingMinutes(Array(200).fill('palabra').join(' ')) === 1);
check('lectura: 201 palabras → 2 min', readingMinutes(Array(201).fill('palabra').join(' ')) === 2);
check('lectura: 1000 palabras → 5 min', readingMinutes(Array(1000).fill('x').join(' ')) === 5);
check(
  'lectura: ignora markdown (imágenes, código) y conserva texto de links',
  wordCount('![img](url) [texto](url) `code` y más') === 3,
  String(wordCount('![img](url) [texto](url) `code` y más')),
);

check("langFromQuery('en') → en", langFromQuery('en') === 'en');
check("langFromQuery('FR') → fr", langFromQuery('FR') === 'fr');
check('langFromQuery no soportado → null', langFromQuery('ja') === null);
check('langFromQuery array → null', langFromQuery(['en']) === null);

check('localizedPath es sin parámetro', localizedPath('/post/x', 'es') === '/post/x');
check('localizedPath en con ?lang', localizedPath('/post/x', 'en') === '/post/x?lang=en');
check(
  'localizedPath respeta query existente',
  localizedPath('/?categoria=salud', 'en') === '/?categoria=salud&lang=en',
  localizedPath('/?categoria=salud', 'en'),
);
const alts = buildAlternates('/post/x');
check('alternates: 6 idiomas + x-default', alts.length === 7, `len=${alts.length}`);
check(
  'alternates: x-default apunta a la versión por defecto',
  alts.some((a) => a.hreflang === 'x-default' && a.href.endsWith('/post/x')),
);
check(
  'alternates: en apunta a ?lang=en',
  alts.some((a) => a.hreflang === 'en' && a.href.endsWith('/post/x?lang=en')),
);

const rss = buildRssFeed([
  {
    title: 'Título & especial <test>',
    excerpt: 'Resumen',
    slug: 'entrada',
    publishedAt: '2026-01-15T10:00:00.000Z',
  },
]);
check('RSS: cabecera rss version 2.0', rss.includes('<rss version="2.0"'));
check('RSS: canal con self atom', rss.includes('rel="self"') && rss.includes('/rss.xml'));
check('RSS: item con link absoluto', rss.includes('https://blog.nelhealthcoach.com/post/entrada'));
check(
  'RSS: XML escapado',
  rss.includes('Título &amp; especial &lt;test&gt;') && !rss.includes('<test>'),
);
check('RSS: pubDate en formato RFC', rss.includes(new Date('2026-01-15T10:00:00.000Z').toUTCString()));
check('RSS: sin entradas sigue siendo válido', buildRssFeed([]).includes('</channel>'));

const sitemap = buildSitemapXml([{ slug: 'entrada', updatedAt: '2026-01-16T10:00:00.000Z' }]);
check('sitemap: namespace xhtml', sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
check(
  'sitemap: 6 URLs de idioma por entrada + 6 de portada',
  (sitemap.match(/<loc>/g) ?? []).length === 12,
  String((sitemap.match(/<loc>/g) ?? []).length),
);
check(
  'sitemap: hreflang de los 6 idiomas',
  ['es', 'en', 'fr', 'it', 'pt', 'de'].every((l) => sitemap.includes(`hreflang="${l}"`)),
);
check('sitemap: lastmod de la entrada', sitemap.includes('<lastmod>2026-01-16T10:00:00.000Z</lastmod>'));
check('sitemap: escapa slugs', buildSitemapXml([{ slug: 'a&b' }]).includes('a&amp;b'));

// ── 8. Enlaces a la landing (sesión gratuita) ──────────────────────────────
section('8. Enlaces a la landing');

check('LANDING_URL sin slash final', !LANDING_URL.endsWith('/'));
check('landing URL por defecto es la landing de producción', LANDING_URL === 'https://nelhealthcoach.com', LANDING_URL);
check(
  'contacto: abre el formulario (?sesion=1) y ancla #contacto',
  landingContactUrl('https://nelhealthcoach.com') === 'https://nelhealthcoach.com/?sesion=1#contacto',
  landingContactUrl('https://nelhealthcoach.com'),
);
check(
  'contacto: tolera base con slash final',
  landingContactUrl('http://localhost:3000/') === 'http://localhost:3000/?sesion=1#contacto',
  landingContactUrl('http://localhost:3000/'),
);

console.log(`\n══════════════════════════════════════════════════════════`);
console.log(`🎉 BLOG FRONTEND: ${passes} checks pasaron, ${failures} fallaron`);
console.log(`══════════════════════════════════════════════════════════`);
process.exit(failures > 0 ? 1 : 0);

/**
 * SUITE DE BLOG — tests estrictos de funcionamiento + seguridad del blog.
 *
 * Cubre:
 *  1. Auth: solo el ADMIN puede crear/editar/borrar (401 sin token, 403 coach).
 *  2. Validación Zod (400 con datos inválidos).
 *  3. CRUD completo de entradas + slugs únicos.
 *  4. Borradores: ocultos en lecturas públicas, visibles para admin.
 *  5. Categorías derivadas de entradas publicadas.
 *  6. Traducción dinámica con LLM MOCKEADO (sin gastar tokens reales):
 *     caché por idioma, passthrough del idioma origen y fallback resiliente.
 *
 * PERFILES DESECHABLES: cada entrada creada se registra y se borra SIEMPRE
 * en `finally` vía runCleanup(). NUNCA quedan entradas de prueba en la DB.
 *
 * Correr: cd apps/api && npx tsx tests/blog.test.ts
 */
import 'dotenv/config';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { GET as getPosts, POST as createPost } from '../src/app/api/blog/posts/route';
import {
  GET as getPostBySlug,
  PUT as updatePost,
  DELETE as deletePost,
} from '../src/app/api/blog/posts/[slug]/route';
import { GET as getCategories } from '../src/app/api/blog/categories/route';
import { GET as getAuthor, PUT as updateAuthor } from '../src/app/api/blog/author/route';
import { GET as getRelated } from '../src/app/api/blog/posts/[slug]/related/route';
import { POST as trackView, GET as getViews } from '../src/app/api/blog/views/route';
import { GET as getComments, POST as createComment } from '../src/app/api/blog/comments/route';
import { PUT as moderateComment, DELETE as deleteComment } from '../src/app/api/blog/comments/[id]/route';
import { rankRelatedPosts } from '../src/app/lib/blog-related';
import {
  localizeBlogPost,
  localizeAuthorProfile,
  type BlogPostForLocalization,
  type BlogAuthorForLocalization,
} from '../src/app/lib/blog-translation';
import { isEncrypted } from '../src/app/lib/encryption';
import { encryptTranslations } from '../src/app/lib/blog';
import type { LLMFn } from '../src/app/lib/recommendation-translator';
import {
  connectDB,
  registerCleanup,
  runCleanup,
  authedRequest,
  coachToken,
  RATE_TEST_IP,
} from './helpers';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const base = 'http://localhost:3001/api/blog';

/** Devuelve un título único por test para evitar colisiones de slug. */
const uniqueTitle = (prefix = 'Entrada de prueba') =>
  `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;

/**
 * Los tests llaman a los handlers directamente: una IP única por request evita
 * chocar con el rate limiter real (keyea por IP + ruta) y mantiene la suite
 * repetible sin desactivar la seguridad en el código de producción.
 */
let testReqCounter = 0;
function testRequest(
  input: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json', ...(init?.headers ?? {}) });
  headers.set('x-forwarded-for', `test-blog-${Date.now()}-${testReqCounter++}`);
  return new NextRequest(input, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: init.body } : {}),
  });
}

async function createAsAdmin(title: string, overrides: Record<string, unknown> = {}) {
  const token = coachToken(new ObjectId().toString(), 'admin');
  const res = await createPost(authedRequest(`${base}/posts`, 'POST', token, {
    title,
    content: 'Contenido de la entrada de prueba con información de salud.',
    category: 'nutricion',
    tags: ['salud'],
    ...overrides,
  }), { params: Promise.resolve({}) });
  return { res, body: await res.json(), token };
}

async function main() {
  const { db } = await connectDB();
  // ═══ 1. AUTH: solo admin puede crear ═══
  section('1. Creación — autenticación y roles');
  let res = await createPost(testRequest(`${base}/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Sin token', content: 'x' }),
  }), { params: Promise.resolve({}) });
  check('POST sin token → 401', res.status === 401, `status=${res.status}`);

  const coachTok = coachToken(new ObjectId().toString(), 'coach');
  res = await createPost(authedRequest(`${base}/posts`, 'POST', coachTok, {
    title: 'De un coach normal',
    content: 'x',
  }), { params: Promise.resolve({}) });
  check('POST con coach (no admin) → 403', res.status === 403, `status=${res.status}`);

  // ═══ 2. VALIDACIÓN ZOD ═══
  section('2. Creación — validación de entrada');
  const adminTok = coachToken(new ObjectId().toString(), 'admin');
  res = await createPost(authedRequest(`${base}/posts`, 'POST', adminTok, { title: '', content: '' }), { params: Promise.resolve({}) });
  check('POST con title vacío → 400', res.status === 400, `status=${res.status}`);

  res = await createPost(authedRequest(`${base}/posts`, 'POST', adminTok, { title: 'Solo título' }), { params: Promise.resolve({}) });
  check('POST sin content → 400', res.status === 400, `status=${res.status}`);

  // ═══ 3. CREACIÓN ═══
  section('3. Creación — borrador y publicada');
  let { res: r1, body: b1 } = await createAsAdmin(uniqueTitle('Borrador test'), { isPublished: false });
  check('POST admin borrador → 201', r1.status === 201, `status=${r1.status}`);
  check('borrador isPublished=false', b1?.data?.isPublished === false);
  check('borrador con slug generado', /^[a-z0-9]+(-[a-z0-9]+)*$/.test(b1?.data?.slug || ''), b1?.data?.slug);
  check('borrador sin publishedAt', b1?.data?.publishedAt === null || b1?.data?.publishedAt === undefined);
  const draftId = b1?.data?.id;
  if (draftId) registerCleanup('entries', draftId);

  // ═══ 3b. ENCRIPTACIÓN: misma que recetas (v2 AES-256-GCM) ═══
  const rawDraft = await db.collection('entries').findOne({ _id: new ObjectId(draftId) });
  check('título guardado CIFRADO en DB', typeof rawDraft?.title === 'string' && isEncrypted(rawDraft.title as string), String(rawDraft?.title)?.slice(0, 24));
  check('contenido guardado CIFRADO en DB', typeof rawDraft?.content === 'string' && isEncrypted(rawDraft.content as string));
  check('categoría guardada CIFRADA en DB', typeof rawDraft?.category === 'string' && isEncrypted(rawDraft.category as string));
  check('autor guardado CIFRADO en DB', typeof rawDraft?.author === 'string' && isEncrypted(rawDraft.author as string));
  check('slug en TEXTO PLANO (para búsquedas)', rawDraft?.slug === b1?.data?.slug);
  check('isPublished en texto plano', rawDraft?.isPublished === false);
  check('borrador NO almacena el texto original', rawDraft?.title !== b1?.data?.title);
  check('autor de la entrada = Manuel Martínez', b1?.data?.author === 'Manuel Martínez', b1?.data?.author);

  let { res: r2, body: b2 } = await createAsAdmin(uniqueTitle('Publicada test'), { isPublished: true });
  check('POST admin publicada → 201', r2.status === 201, `status=${r2.status}`);
  check('publicada isPublished=true', b2?.data?.isPublished === true);
  check('publicada con publishedAt', !!b2?.data?.publishedAt);
  const publishedId = b2?.data?.id;
  const publishedSlug = b2?.data?.slug;
  if (publishedId) registerCleanup('entries', publishedId);

  // ═══ 4. LECTURA PÚBLICA: borradores ocultos ═══
  section('4. Lectura pública — borradores ocultos');
  res = await getPosts(testRequest(`${base}/posts`), { params: Promise.resolve({}) });
  let body = await res.json();
  check('GET público → 200', res.status === 200, `status=${res.status}`);
  const ids = (body?.data || []).map((p: { id: string }) => p.id);
  check('borrador NO visible en lista pública', !ids.includes(draftId), JSON.stringify(ids.slice(0, 5)));
  check('publicada SÍ visible en lista pública', ids.includes(publishedId));

  // Detalle del borrador: 404 público, 200 admin
  res = await getPostBySlug(testRequest(`${base}/posts/${b1?.data?.slug}`), { params: Promise.resolve({ slug: b1?.data?.slug }) });
  check('GET borrador sin auth → 404', res.status === 404, `status=${res.status}`);
  res = await getPostBySlug(authedRequest(`${base}/posts/${b1?.data?.slug}`, 'GET', adminTok), { params: Promise.resolve({ slug: b1?.data?.slug }) });
  check('GET borrador como admin → 200', res.status === 200, `status=${res.status}`);

  // Detalle de publicada
  res = await getPostBySlug(testRequest(`${base}/posts/${publishedSlug}`), { params: Promise.resolve({ slug: publishedSlug }) });
  body = await res.json();
  check('GET publicada → 200', res.status === 200, `status=${res.status}`);
  check('detalle incluye content', typeof body?.data?.content === 'string' && body.data.content.length > 0);

  // ═══ 5. FILTRO POR CATEGORÍA + CATEGORÍAS DERIVADAS ═══
  section('5. Categorías');
  const { body: catBody } = await createAsAdmin(uniqueTitle('Categoria otra test'), { isPublished: true, category: 'entrenamiento' });
  if (catBody?.data?.id) registerCleanup('entries', catBody.data.id);
  res = await getPosts(testRequest(`${base}/posts?category=nutricion`), { params: Promise.resolve({}) });
  body = await res.json();
  check('GET ?category= filtra', (body?.data || []).length >= 1 && body.data.every((p: { category: string }) => p.category === 'nutricion'));
  check('GET ?category= excluye otras categorías', (body?.data || []).every((p: { category: string }) => p.category !== 'entrenamiento'));

  res = await getCategories(testRequest(`${base}/categories`), { params: Promise.resolve({}) });
  body = await res.json();
  check('GET categories → 200', res.status === 200, `status=${res.status}`);
  const names = (body?.data || []).map((c: { name: string }) => c.name);
  check('categoría "nutricion" derivada', names.includes('nutricion'), JSON.stringify(names));
  check('categoría con count numérico', (body?.data || []).every((c: { count: number }) => typeof c.count === 'number'));

  // ═══ 6. UPDATE ═══
  section('6. Edición — solo admin, invalida traducciones');
  res = await updatePost(testRequest(`${base}/posts/${draftId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Sin token' }),
  }), { params: Promise.resolve({ slug: draftId }) });
  check('PUT sin token → 401', res.status === 401, `status=${res.status}`);

  res = await updatePost(authedRequest(`${base}/posts/${draftId}`, 'PUT', coachTok, { title: 'Cambio coach' }), { params: Promise.resolve({ slug: draftId }) });
  check('PUT con coach (no admin) → 403', res.status === 403, `status=${res.status}`);

  res = await updatePost(authedRequest(`${base}/posts/${draftId}`, 'PUT', adminTok, { title: 'Borrador editado', isPublished: true }), { params: Promise.resolve({ slug: draftId }) });
  body = await res.json();
  check('PUT admin → 200', res.status === 200, `status=${res.status}`);
  check('PUT aplica cambios (título)', body?.data?.title === 'Borrador editado', body?.data?.title);
  check('PUT publica (publishedAt seteado)', !!body?.data?.publishedAt);

  res = await updatePost(authedRequest(`${base}/posts/${'abc' + new ObjectId().toString().slice(3)}`, 'PUT', adminTok, { title: 'id inválido' }), { params: Promise.resolve({ slug: 'id-invalido' }) });
  check('PUT con id inválido → 400', res.status === 400, `status=${res.status}`);

  // ═══ 7. DELETE ═══
  section('7. Borrado — solo admin');
  res = await deletePost(authedRequest(`${base}/posts/${draftId}`, 'DELETE', coachTok), { params: Promise.resolve({ slug: draftId }) });
  check('DELETE con coach (no admin) → 403', res.status === 403, `status=${res.status}`);

  res = await deletePost(testRequest(`${base}/posts/${draftId}`, { method: 'DELETE' }), { params: Promise.resolve({ slug: draftId }) });
  check('DELETE sin token → 401', res.status === 401, `status=${res.status}`);

  res = await deletePost(authedRequest(`${base}/posts/${draftId}`, 'DELETE', adminTok), { params: Promise.resolve({ slug: draftId }) });
  check('DELETE admin → 200', res.status === 200, `status=${res.status}`);

  res = await getPostBySlug(authedRequest(`${base}/posts/${b1?.data?.slug}`, 'GET', adminTok), { params: Promise.resolve({ slug: b1?.data?.slug }) });
  check('entrada borrada → 404', res.status === 404, `status=${res.status}`);

  // ═══ 8. SLUGS ÚNICOS ═══
  section('8. Slugs únicos');
  const dupTitle = uniqueTitle('Título duplicado test');
  const c1 = await createAsAdmin(dupTitle, { isPublished: true });
  const c2 = await createAsAdmin(dupTitle, { isPublished: true });
  if (c1.body?.data?.id) registerCleanup('entries', c1.body.data.id);
  if (c2.body?.data?.id) registerCleanup('entries', c2.body.data.id);
  check('dos entradas con el mismo título tienen slugs distintos',
    c1.body?.data?.slug && c2.body?.data?.slug && c1.body.data.slug !== c2.body.data.slug,
    `${c1.body?.data?.slug} vs ${c2.body?.data?.slug}`);

  // ═══ 9. TRADUCCIÓN DINÁMICA (unit, LLM mock) ═══
  section('9. Traducción — LLM mockeado');
  let llmCalls = 0;
  const mockLLM: LLMFn = async (_system, human) => {
    llmCalls++;
    const parsed = JSON.parse(human);
    const mark = (v: unknown): unknown => {
      if (typeof v === 'string') return v === '' ? v : `[TR]${v}`;
      if (Array.isArray(v)) return v.map(mark);
      if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(v as Record<string, unknown>)) out[k] = mark((v as Record<string, unknown>)[k]);
        return out;
      }
      return v;
    };
    return JSON.stringify(mark(parsed));
  };

  const rawPost: BlogPostForLocalization = {
    title: 'Título original en español',
    excerpt: 'Extracto original',
    content: 'Contenido original del post',
    sourceLang: 'es',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    translations: {},
  };

  // 9a. Passthrough del idioma origen (sin LLM)
  let localized = await localizeBlogPost(rawPost, 'es', mockLLM);
  check('lang=sourceLang → sin llamada LLM', llmCalls === 0, `calls=${llmCalls}`);
  check('lang=sourceLang → texto original', localized.post.title === 'Título original en español');

  // 9b. Primera traducción → llama al LLM y cachea
  localized = await localizeBlogPost(rawPost, 'en', mockLLM);
  check('primera traducción → 1 llamada LLM', llmCalls === 1, `calls=${llmCalls}`);
  check('título traducido', localized.post.title === '[TR]Título original en español', localized.post.title);
  check('cache guardada para en', !!localized.post.translations?.en, JSON.stringify(localized.post.translations));
  check('lang devuelto = en', localized.post.lang === 'en');
  check('needsPersist=true al traducir', localized.needsPersist === true);

  // 9c. Segunda lectura con la caché persistida → sin nuevas llamadas
  const cachedPost: BlogPostForLocalization = {
    ...rawPost,
    translations: localized.post.translations || {},
  };
  localized = await localizeBlogPost(cachedPost, 'en', mockLLM);
  check('segunda lectura usa caché (0 llamadas extra)', llmCalls === 1, `calls=${llmCalls}`);
  check('segunda lectura devuelve lo cacheado', localized.post.title === '[TR]Título original en español');

  // 9d. Caché inválida (updatedAt cambió) → retraduce
  const stalePost: BlogPostForLocalization = {
    ...rawPost,
    updatedAt: new Date('2026-02-01T00:00:00Z'),
    translations: {
      en: {
        title: '[TR]Título original en español',
        excerpt: '[TR]Extracto original',
        content: '[TR]Contenido original del post',
        translatedAt: '2026-01-01T00:00:00.000Z',
        sourceUpdatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  };
  localized = await localizeBlogPost(stalePost, 'en', mockLLM);
  check('caché obsoleta → retraduce', llmCalls === 2, `calls=${llmCalls}`);

  // 9e. LLM falla → fallback al original (resiliencia)
  const failingPost: BlogPostForLocalization = { ...rawPost, translations: {} };
  const failingLLM: LLMFn = async () => { throw new Error('LLM caído'); };
  localized = await localizeBlogPost(failingPost, 'fr', failingLLM);
  check('LLM falla → devuelve original', localized.post.title === 'Título original en español', localized.post.title);
  check('LLM falla → no cachea', !localized.post.translations?.fr, JSON.stringify(localized.post.translations));

  // ═══ 10. PERFIL DEL AUTOR (singleton editable por el admin) ═══
  section('10. Perfil del autor');
  const authorCollection = db.collection('blog_author');
  // Guardar el estado original para restaurarlo SIEMPRE al final (la DB es compartida)
  const originalAuthor = await authorCollection.findOne({});
  const adminAuthorTok = coachToken(new ObjectId().toString(), 'admin');

  res = await getAuthor(testRequest(`${base}/author`), { params: Promise.resolve({}) });
  body = await res.json();
  check('GET author público → 200', res.status === 200, `status=${res.status}`);
  check('nombre por defecto = Manuel Martínez', body?.data?.name === 'Manuel Martínez', JSON.stringify(body?.data));
  check('rol vacío por defecto (el frontend usa textos i18n)', body?.data?.role === '', String(body?.data?.role));
  check('foto null por defecto', body?.data?.photo === null);

  res = await updateAuthor(testRequest(`${base}/author`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Sin token' }),
  }), { params: Promise.resolve({}) });
  check('PUT author sin token → 401', res.status === 401, `status=${res.status}`);

  res = await updateAuthor(authedRequest(`${base}/author`, 'PUT', coachTok, { name: 'Coach normal' }), { params: Promise.resolve({}) });
  check('PUT author coach (no admin) → 403', res.status === 403, `status=${res.status}`);

  res = await updateAuthor(authedRequest(`${base}/author`, 'PUT', adminAuthorTok, { name: '' }), { params: Promise.resolve({}) });
  check('PUT author sin nombre → 400', res.status === 400, `status=${res.status}`);

  res = await updateAuthor(authedRequest(`${base}/author`, 'PUT', adminAuthorTok, { name: 'X', yearsOfExperience: 150 }), { params: Promise.resolve({}) });
  check('PUT author años fuera de rango → 400', res.status === 400, `status=${res.status}`);

  res = await updateAuthor(authedRequest(`${base}/author`, 'PUT', adminAuthorTok, { name: 'X', specialties: 'no-es-array' }), { params: Promise.resolve({}) });
  check('PUT author especialidades inválidas → 400', res.status === 400, `status=${res.status}`);

  res = await updateAuthor(authedRequest(`${base}/author`, 'PUT', adminAuthorTok, {
    name: 'Manuel Test',
    role: 'Rol de prueba del coach',
    bio: 'Biografía breve de prueba.',
    specialties: ['Nutrición deportiva', 'Pérdida de peso'],
    yearsOfExperience: 12,
  }), { params: Promise.resolve({}) });
  body = await res.json();
  check('PUT author admin → 200', res.status === 200, `status=${res.status}`);
  check('datos guardados se devuelven descifrados', body?.data?.name === 'Manuel Test' && body?.data?.role === 'Rol de prueba del coach');
  check('especialidades guardadas (2)', Array.isArray(body?.data?.specialties) && body.data.specialties.length === 2, JSON.stringify(body?.data?.specialties));
  check('años de experiencia guardados (12)', body?.data?.yearsOfExperience === 12, String(body?.data?.yearsOfExperience));

  res = await getAuthor(testRequest(`${base}/author`), { params: Promise.resolve({}) });
  body = await res.json();
  check('GET público devuelve el perfil guardado', body?.data?.name === 'Manuel Test' && body?.data?.bio === 'Biografía breve de prueba.');
  check('GET público devuelve especialidades', body?.data?.specialties?.[0] === 'Nutrición deportiva' && body?.data?.specialties?.[1] === 'Pérdida de peso', JSON.stringify(body?.data?.specialties));
  check('GET público devuelve años de experiencia', body?.data?.yearsOfExperience === 12, String(body?.data?.yearsOfExperience));

  const rawAuthor = await authorCollection.findOne({});
  check('name del autor CIFRADO en DB', typeof rawAuthor?.name === 'string' && isEncrypted(rawAuthor.name as string));
  check('role del autor CIFRADO en DB', typeof rawAuthor?.role === 'string' && isEncrypted(rawAuthor.role as string));
  check('especialidades CIFRADAS en DB (array)', Array.isArray(rawAuthor?.specialties) && (rawAuthor.specialties as string[]).every((s) => isEncrypted(s)), JSON.stringify(rawAuthor?.specialties)?.slice(0, 60));
  check('años de experiencia en texto plano (número no sensible)', rawAuthor?.yearsOfExperience === 12);
  check('foto del autor en null (sin imagen)', rawAuthor?.photo === null);

  // 10b. Traducción del perfil (mock LLM)
  const rawAuthorProfile: BlogAuthorForLocalization = {
    role: 'Rol original del coach',
    bio: 'Biografía original',
    specialties: ['Nutrición', 'Deporte'],
    sourceLang: 'es',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    translations: {},
  };
  const callsBeforeAuthor = llmCalls;
  let localizedAuthor = await localizeAuthorProfile(rawAuthorProfile, 'es', mockLLM);
  check('author lang=source → sin LLM y original', llmCalls === callsBeforeAuthor && localizedAuthor.author.role === 'Rol original del coach');

  localizedAuthor = await localizeAuthorProfile(rawAuthorProfile, 'en', mockLLM);
  check('author traducción → 1 llamada LLM', llmCalls === callsBeforeAuthor + 1, `calls=${llmCalls}`);
  check('author rol traducido', localizedAuthor.author.role === '[TR]Rol original del coach', localizedAuthor.author.role);
  check('author especialidades traducidas', localizedAuthor.author.specialties?.[0] === '[TR]Nutrición' && localizedAuthor.author.specialties?.[1] === '[TR]Deporte', JSON.stringify(localizedAuthor.author.specialties));
  check('author cache guardada', !!localizedAuthor.author.translations?.en);
  check('author needsPersist=true', localizedAuthor.needsPersist === true);

  // 10c. Segunda lectura con caché → sin nuevas llamadas LLM
  const cachedAuthor = { ...rawAuthorProfile, translations: localizedAuthor.author.translations };
  const callsBeforeCache = llmCalls;
  localizedAuthor = await localizeAuthorProfile(cachedAuthor, 'en', mockLLM);
  check('author segunda lectura usa caché (0 llamadas)', llmCalls === callsBeforeCache, `calls=${llmCalls}`);
  check('author caché devuelve especialidades traducidas', localizedAuthor.author.specialties?.[0] === '[TR]Nutrición');

  // Restaurar el estado original del perfil (o vaciarlo si no existía)
  await authorCollection.deleteMany({});
  if (originalAuthor) {
    await authorCollection.insertOne(originalAuthor);
    check('estado original del autor restaurado', true);
  } else {
    check('perfil de test eliminado (no había perfil previo)', true);
  }

  // ═══ 11. RATE LIMITING del blog (A06/LLM10) ═══
  section('11. Rate limiting en el blog');
  let rateStatus = 0;
  let rateBody: { code?: string } = {};
  for (let i = 0; i < 70; i++) {
    const r = await getAuthor(
      new NextRequest(`${base}/author`, { headers: { 'x-forwarded-for': RATE_TEST_IP } }),
      { params: Promise.resolve({}) },
    );
    rateStatus = r.status;
    rateBody = await r.json();
    if (r.status === 429) break;
  }
  check('tras superar el límite → 429', rateStatus === 429, `status=${rateStatus}`);
  check('respuesta 429 con código RATE_LIMIT', rateBody?.code === 'RATE_LIMIT', JSON.stringify(rateBody));

  // ═══ 12. ENTRADAS RELACIONADAS ═══
  section('12. Entradas relacionadas');

  // 12a. Ranker puro (sin DB)
  const ranked = rankRelatedPosts(
    { slug: 'actual', category: 'nutricion', tags: ['salud', 'agua'] },
    [
      { slug: 'misma-cat', category: 'nutricion', tags: [], isPublished: true, createdAt: new Date('2026-01-01') },
      { slug: 'mismas-tags', category: 'deporte', tags: ['salud', 'agua'], isPublished: true, createdAt: new Date('2026-06-01') },
      { slug: 'borrador', category: 'nutricion', tags: ['salud'], isPublished: false, createdAt: new Date('2026-07-01') },
      { slug: 'sin-relacion', category: 'recetas', tags: ['postre'], isPublished: true, createdAt: new Date('2026-08-01') },
      { slug: 'actual', category: 'nutricion', tags: ['salud'], isPublished: true },
    ],
    3,
  );
  check('relacionadas: excluye la actual y los borradores', ranked.every((c) => c.slug !== 'actual' && c.slug !== 'borrador'), ranked.map((r) => r.slug).join(','));
  check('relacionadas: misma categoría primero', ranked[0]?.slug === 'misma-cat', ranked.map((r) => r.slug).join(','));
  check('relacionadas: etiquetas compartidas después', ranked[1]?.slug === 'mismas-tags');
  check('relacionadas: sin relación al final', ranked[2]?.slug === 'sin-relacion');
  check('relacionadas: límite respetado', ranked.length === 3);

  // 12b. Endpoint con datos reales (categoría/etiquetas únicas de este run para
  // que las entradas de otros tests no interfieran en el ranking)
  const uniqueCat = `test-cat-${Date.now()}`;
  const uniqueTags = ['test-tag-a', 'test-tag-b'];
  const relatedBase = await createAsAdmin(uniqueTitle('Base relacionadas'), { isPublished: true, category: uniqueCat, tags: uniqueTags });
  const sameCat = await createAsAdmin(uniqueTitle('Misma categoria'), { isPublished: true, category: uniqueCat, tags: [] });
  const sharedTags = await createAsAdmin(uniqueTitle('Mismas etiquetas'), { isPublished: true, category: `${uniqueCat}-otra`, tags: uniqueTags });
  const other = await createAsAdmin(uniqueTitle('Otra categoria'), { isPublished: true, category: `${uniqueCat}-otra2`, tags: [] });
  const draftRelated = await createAsAdmin(uniqueTitle('Borrador relacionadas'), { isPublished: false, category: uniqueCat, tags: uniqueTags });
  for (const created of [relatedBase, sameCat, sharedTags, other, draftRelated]) {
    if (created.body?.data?.id) registerCleanup('entries', created.body.data.id);
  }
  const baseSlug = relatedBase.body?.data?.slug as string;

  res = await getRelated(testRequest(`${base}/posts/${baseSlug}/related`), { params: Promise.resolve({ slug: baseSlug }) });
  body = await res.json();
  const relatedSlugs = (body?.data ?? []).map((p: { slug: string }) => p.slug);
  check('GET related → 200', res.status === 200, `status=${res.status}`);
  check('related devuelve la misma categoría primero', relatedSlugs[0] === sameCat.body?.data?.slug, relatedSlugs.join(','));
  check('related devuelve etiquetas compartidas segundo', relatedSlugs[1] === sharedTags.body?.data?.slug);
  check('related NO incluye la entrada actual', !relatedSlugs.includes(baseSlug));
  check('related NO incluye borradores', !relatedSlugs.includes(draftRelated.body?.data?.slug as string));
  check('related máximo 3', relatedSlugs.length <= 3);

  res = await getRelated(testRequest(`${base}/posts/${draftRelated.body?.data?.slug}/related`), { params: Promise.resolve({ slug: draftRelated.body?.data?.slug as string }) });
  check('related de un borrador → 404', res.status === 404, `status=${res.status}`);

  // 12c. Usa SOLO traducciones cacheadas (no dispara LLM en listados)
  const sameCatDoc = await db.collection('entries').findOne({ slug: sameCat.body?.data?.slug });
  await db.collection('entries').updateOne(
    { _id: sameCatDoc?._id },
    {
      $set: {
        translations: encryptTranslations({
          en: {
            title: '[TR]Titulo cacheado relacionadas',
            excerpt: '[TR]Extracto cacheado',
            content: '[TR]Contenido cacheado',
            translatedAt: new Date().toISOString(),
            sourceUpdatedAt: (sameCatDoc?.updatedAt as Date).toISOString(),
          },
        }),
      },
    },
  );
  res = await getRelated(testRequest(`${base}/posts/${baseSlug}/related?lang=en`), { params: Promise.resolve({ slug: baseSlug }) });
  body = await res.json();
  const cachedRelated = (body?.data ?? []).find((p: { slug: string }) => p.slug === sameCat.body?.data?.slug);
  const uncachedRelated = (body?.data ?? []).find((p: { slug: string }) => p.slug === sharedTags.body?.data?.slug);
  check('related usa la traducción cacheada', cachedRelated?.title === '[TR]Titulo cacheado relacionadas', cachedRelated?.title);
  check('related sin caché mantiene el original (sin LLM)', uncachedRelated?.title === sharedTags.body?.data?.title, uncachedRelated?.title);

  // ═══ 13. VISITAS (analytics sin cookies) ═══
  section('13. Contador de visitas');

  res = await trackView(testRequest(`${base}/views`, { method: 'POST', body: JSON.stringify({ slug: baseSlug }) }), { params: Promise.resolve({}) });
  check('POST visita → 200', res.status === 200, `status=${res.status}`);
  await trackView(testRequest(`${base}/views`, { method: 'POST', body: JSON.stringify({ slug: baseSlug }) }), { params: Promise.resolve({}) });

  const today = new Date().toISOString().slice(0, 10);
  const viewDoc = await db.collection('blog_views').findOne({ slug: baseSlug, day: today });
  check('visitas agregadas por día', viewDoc?.count === 2, `count=${viewDoc?.count}`);

  res = await trackView(testRequest(`${base}/views`, { method: 'POST', body: JSON.stringify({ slug: 'SLUG INVALIDO!!' }) }), { params: Promise.resolve({}) });
  check('visita con slug inválido → 400', res.status === 400, `status=${res.status}`);

  res = await trackView(testRequest(`${base}/views`, { method: 'POST', body: JSON.stringify({ slug: draftRelated.body?.data?.slug }) }), { params: Promise.resolve({}) });
  check('visita a un borrador → 404 (no se cuenta)', res.status === 404, `status=${res.status}`);

  res = await getViews(testRequest(`${base}/views`), { params: Promise.resolve({}) });
  check('GET visitas sin token → 401', res.status === 401, `status=${res.status}`);

  res = await getViews(authedRequest(`${base}/views`, 'GET', coachTok), { params: Promise.resolve({}) });
  check('GET visitas con coach (no admin) → 403', res.status === 403, `status=${res.status}`);

  res = await getViews(authedRequest(`${base}/views`, 'GET', adminTok), { params: Promise.resolve({}) });
  body = await res.json();
  const statsRow = (body?.data ?? []).find((row: { slug: string }) => row.slug === baseSlug);
  check('GET visitas admin → 200', res.status === 200, `status=${res.status}`);
  check('totales por entrada correctos', statsRow?.total === 2, JSON.stringify(statsRow));

  // Limpieza de las visitas de prueba (agregados sin _id registrable)
  await db.collection('blog_views').deleteMany({ slug: { $in: [baseSlug, draftRelated.body?.data?.slug as string] } });
  check('visitas de prueba limpiadas', (await db.collection('blog_views').countDocuments({ slug: baseSlug })) === 0);

  // ═══ 14. COMENTARIOS CON MODERACIÓN ═══
  section('14. Comentarios con moderación');

  const commentPost = await createAsAdmin(uniqueTitle('Post comentarios'), { isPublished: true, category: `${uniqueCat}-comentarios` });
  if (commentPost.body?.data?.id) registerCleanup('entries', commentPost.body.data.id);
  const commentSlug = commentPost.body?.data?.slug as string;
  const commentsCol = db.collection('blog_comments');

  const validComment = {
    postSlug: commentSlug,
    authorName: 'Lector de prueba',
    authorEmail: 'lector@test.local',
    content: '¡Excelente artículo! Me sirvió muchísimo.',
    website: '',
  };

  // 14a. Creación pública → pendiente (no visible aún)
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify(validComment) }), { params: Promise.resolve({}) });
  check('POST comentario → 201', res.status === 201, `status=${res.status}`);

  const rawComment = await commentsCol.findOne({ postSlug: commentSlug });
  check('comentario guardado PENDIENTE', rawComment?.status === 'pending', String(rawComment?.status));
  check('nombre del comentario CIFRADO en DB', typeof rawComment?.authorName === 'string' && isEncrypted(rawComment.authorName));
  check('contenido del comentario CIFRADO en DB', typeof rawComment?.content === 'string' && isEncrypted(rawComment.content));
  check('postSlug en claro (para consultas)', rawComment?.postSlug === commentSlug);
  if (rawComment?._id) registerCleanup('blog_comments', rawComment._id);

  res = await getComments(testRequest(`${base}/comments?post=${commentSlug}`), { params: Promise.resolve({}) });
  body = await res.json();
  check('GET público NO muestra pendientes', Array.isArray(body?.data) && body.data.length === 0, JSON.stringify(body?.data));

  // 14b. Honeypot: respuesta 201 pero NO se guarda
  const beforeHoneypot = await commentsCol.countDocuments({ postSlug: commentSlug });
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, website: 'http://spam.example.com' }) }), { params: Promise.resolve({}) });
  check('honeypot → 201 (silencioso)', res.status === 201, `status=${res.status}`);
  check('honeypot NO guarda el comentario', (await commentsCol.countDocuments({ postSlug: commentSlug })) === beforeHoneypot);

  // 14c. Validación
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, content: '' }) }), { params: Promise.resolve({}) });
  check('comentario vacío → 400', res.status === 400, `status=${res.status}`);
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, authorEmail: 'no-es-email' }) }), { params: Promise.resolve({}) });
  check('email inválido → 400', res.status === 400, `status=${res.status}`);
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, postSlug: 'NO VALE!!' }) }), { params: Promise.resolve({}) });
  check('slug inválido → 400', res.status === 400, `status=${res.status}`);
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, postSlug: 'entrada-que-no-existe' }) }), { params: Promise.resolve({}) });
  check('comentario en entrada inexistente → 404', res.status === 404, `status=${res.status}`);
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, postSlug: draftRelated.body?.data?.slug }) }), { params: Promise.resolve({}) });
  check('comentario en borrador → 404', res.status === 404, `status=${res.status}`);

  // 14d. Moderación: aprobar → visible públicamente
  const commentId = (rawComment?._id as ObjectId).toString();
  res = await moderateComment(testRequest(`${base}/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }), { params: Promise.resolve({ id: commentId }) });
  check('moderar sin token → 401', res.status === 401, `status=${res.status}`);
  res = await moderateComment(authedRequest(`${base}/comments/${commentId}`, 'PUT', coachTok, { status: 'approved' }), { params: Promise.resolve({ id: commentId }) });
  check('moderar con coach (no admin) → 403', res.status === 403, `status=${res.status}`);
  res = await moderateComment(authedRequest(`${base}/comments/${commentId}`, 'PUT', adminTok, { status: 'approved' }), { params: Promise.resolve({ id: commentId }) });
  check('aprobar admin → 200', res.status === 200, `status=${res.status}`);

  res = await getComments(testRequest(`${base}/comments?post=${commentSlug}`), { params: Promise.resolve({}) });
  body = await res.json();
  const visible = (body?.data ?? []).find((c: { id: string }) => c.id === commentId);
  check('GET público muestra APROBADOS', !!visible, JSON.stringify(body?.data));
  check('DTO sin email del lector (privacidad)', visible && !('authorEmail' in visible));

  // 14e. Rechazar otro comentario → sigue oculto
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, authorName: 'Spammer', content: 'Contenido spam' }) }), { params: Promise.resolve({}) });
  // En este punto el único pendiente es el comentario spam (el primero ya se aprobó)
  const rejectedDoc = await commentsCol.findOne({ postSlug: commentSlug, status: 'pending' });
  const rejectedId = (rejectedDoc?._id as ObjectId).toString();
  if (rejectedDoc?._id) registerCleanup('blog_comments', rejectedDoc._id);
  await moderateComment(authedRequest(`${base}/comments/${rejectedId}`, 'PUT', adminTok, { status: 'rejected' }), { params: Promise.resolve({ id: rejectedId }) });
  res = await getComments(testRequest(`${base}/comments?post=${commentSlug}`), { params: Promise.resolve({}) });
  body = await res.json();
  check('rechazados NO aparecen en público', !(body?.data ?? []).some((c: { id: string }) => c.id === rejectedId));

  // 14f. Listados de moderación (solo admin)
  // Tercer comentario que queda PENDIENTE para verificar el filtro
  res = await createComment(testRequest(`${base}/comments`, { method: 'POST', body: JSON.stringify({ ...validComment, authorName: 'Pendiente Test', content: 'Comentario que queda pendiente' }) }), { params: Promise.resolve({}) });
  const stillPending = await commentsCol.findOne({ postSlug: commentSlug, status: 'pending' });
  if (stillPending?._id) registerCleanup('blog_comments', stillPending._id);

  res = await getComments(testRequest(`${base}/comments?scope=pending`), { params: Promise.resolve({}) });
  check('scope sin token → 401', res.status === 401, `status=${res.status}`);
  res = await getComments(authedRequest(`${base}/comments?scope=all`, 'GET', coachTok), { params: Promise.resolve({}) });
  check('scope con coach → 403', res.status === 403, `status=${res.status}`);
  res = await getComments(authedRequest(`${base}/comments?scope=all`, 'GET', adminTok), { params: Promise.resolve({}) });
  body = await res.json();
  const adminList = (body?.data ?? []).filter((c: { postSlug: string }) => c.postSlug === commentSlug);
  check('scope=all admin → 200 con los 3 comentarios', res.status === 200 && adminList.length === 3, `status=${res.status}, n=${adminList.length}`);
  res = await getComments(authedRequest(`${base}/comments?scope=pending`, 'GET', adminTok), { params: Promise.resolve({}) });
  body = await res.json();
  const pendingList = (body?.data ?? []).filter((c: { postSlug: string }) => c.postSlug === commentSlug);
  check('scope=pending admin → solo pendientes', pendingList.length === 1 && pendingList[0]?.status === 'pending', JSON.stringify(pendingList));

  // 14g. Eliminar (solo admin)
  res = await deleteComment(authedRequest(`${base}/comments/${commentId}`, 'DELETE', coachTok), { params: Promise.resolve({ id: commentId }) });
  check('eliminar con coach → 403', res.status === 403, `status=${res.status}`);
  res = await deleteComment(authedRequest(`${base}/comments/${commentId}`, 'DELETE', adminTok), { params: Promise.resolve({ id: commentId }) });
  check('eliminar admin → 200', res.status === 200, `status=${res.status}`);
  res = await getComments(testRequest(`${base}/comments?post=${commentSlug}`), { params: Promise.resolve({}) });
  body = await res.json();
  check('eliminado ya no aparece en público', !(body?.data ?? []).some((c: { id: string }) => c.id === commentId));
}

main()
  .catch((e) => { console.error('💥 Blog suite falló:', e); failures++; })
  .finally(async () => {
    await runCleanup();
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🎉 BLOG: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

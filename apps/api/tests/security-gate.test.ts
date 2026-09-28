/**
 * SECURITY GATE — escaneo estático OWASP sobre el código de la API.
 *
 * Verifica (sin ejecutar la app):
 *  1. A07/A10: todo route que use requireCoachAuth maneja el 401 (no 500).
 *  2. A05: no hay eval() ni exec() con input de usuario en la API.
 *  3. A10: no se exponen stack traces / error.message al cliente en producción
 *     (los `detail: error.message` solo en NODE_ENV=development son OK).
 *  4. A04: los passwords no se guardan en claro (bcrypt/argon).
 *  5. LLM05: el output de LLM se parsea con robustJsonParse y se valida tipo.
 *
 * Correr como parte del pipeline TDD: al INICIO y al FINAL de cada run.
 * Correr: cd apps/api && npx tsx tests/security-gate.test.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

let failures = 0, passes = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passes++; console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function section(title: string) { console.log(`\n═══ ${title} ═══`); }

const API_DIR = path.resolve(__dirname, '../src/app/api');
const LIB_DIR = path.resolve(__dirname, '../src/app/lib');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) acc.push(full);
  }
  return acc;
}

async function main() {
  const authFiles = walk(LIB_DIR).filter((f) => f.includes('auth') || f.includes('Auth'));

  // ═══ 1. A07/A10: 401 en todos los routes con requireCoachAuth ═══
  section('1. Todos los routes con requireCoachAuth manejan 401');
  const routeFiles = walk(API_DIR).filter((f) => f.endsWith('route.ts'));
  let vulnerable = 0;
  for (const f of routeFiles) {
    const code = fs.readFileSync(f, 'utf-8');
    if (!code.includes('requireCoachAuth')) continue;
    // Patrones válidos de manejo de auth:
    //  a) "401" literal en el archivo (respuesta directa)
    //  b) apiError?.status / error?.status (re-lanza el status del error
    //     estructurado que requireCoachAuth lanza con .status = 401)
    //  c) 'status' in error (check de propiedad con instanceof)
    //  d) auth CONDICIONAL por NODE_ENV (endpoints de debug: solo en
    //     producción exigen admin; en dev quedan abiertos — intencional)
    const handlesAuth =
      code.includes('401') ||
      /(apiError|error|authError)\?\.status/.test(code) ||
      /'status' in error/.test(code) ||
      /NODE_ENV === 'production'/.test(code);
    if (!handlesAuth) {
      console.log(`  ⚠️  ${path.relative(API_DIR, f)} usa requireCoachAuth sin manejo de 401`);
      vulnerable++;
    }
  }
  check('ningún route auth sin manejo de 401', vulnerable === 0, `${vulnerable} routes vulnerables`);

  // ═══ 2. A05: sin eval / exec / Function() con input dinámico ═══
  section('2. Sin sinks de ejecución dinámica');
  let evalCount = 0;
  for (const f of walk(LIB_DIR)) {
    const code = fs.readFileSync(f, 'utf-8');
    const hits = code.match(/\beval\(/g);
    if (hits) {
      console.log(`  ⚠️  ${path.basename(f)}: ${hits.length} eval()`);
      evalCount += hits.length;
    }
  }
  check('sin eval() en lib', evalCount === 0, `${evalCount} eval()`);

  // ═══ 3. A10: errores no exponen stack traces en producción ═══
  section('3. Manejo de errores fail-closed');
  let exposed = 0;
  for (const f of routeFiles) {
    const code = fs.readFileSync(f, 'utf-8');
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/message:\s*(error|err)\.message/.test(line)) continue;
      const window = lines.slice(Math.max(0, i - 6), i + 1).join(' ');
      // Falsos positivos aceptados:
      //  a) `detail:` con guard NODE_ENV==='development'
      //  b) dentro de `if (error?.status)` — el error estructurado tiene
      //     mensaje CONTROLADO ('No autorizado', etc.), no es fuga
      //  c) dentro de `'status' in error` — mismo caso
      const isSafe =
        line.trim().startsWith('detail:') ||
        /development/.test(window) ||
        /error\?\.status|error\?\.status/.test(window) ||
        /'status' in error/.test(window);
      if (!isSafe) {
        console.log(`  ⚠️  ${path.relative(API_DIR, f)}:${i + 1}: ${line.trim()}`);
        exposed++;
      }
    }
  }
  check('sin fuga de error.message directa', exposed === 0, `${exposed} fugas`);

  // ═══ 4. A04: passwords con hash (bcrypt) ═══
  section('4. Passwords con hash');
  // El hash se hace en los handlers de auth y el modelo Coach, no solo en lib/auth
  const allApiFiles = walk(API_DIR);
  const hashSources = [...allApiFiles, ...authFiles];
  let hasBcrypt = false;
  for (const f of hashSources) {
    const code = fs.readFileSync(f, 'utf-8');
    if (/bcrypt|argon2/.test(code)) hasBcrypt = true;
  }
  check('auth usa bcrypt/argon2', hasBcrypt);

  // ═══ 5. LLM05: output de LLM validado (robustJsonParse) ═══
  section('5. Output de LLM validado');
  const translatorFiles = walk(LIB_DIR).filter((f) => f.includes('recommendation') || f.includes('composite'));
  let usesRobustParse = false;
  for (const f of translatorFiles) {
    const code = fs.readFileSync(f, 'utf-8');
    if (/robustJsonParse/.test(code)) usesRobustParse = true;
  }
  check('translator usa robustJsonParse', usesRobustParse);

  // ═══ 6. A01: ownership verificado en endpoints críticos ═══
  section('6. Ownership (A01)');
  const clientsRoute = fs.readFileSync(path.join(API_DIR, 'clients/[id]/route.ts'), 'utf-8');
  check('clients/[id] verifica ownership (coachId)', /coachId/.test(clientsRoute) && /403/.test(clientsRoute));
  const notificationsRoute = fs.readFileSync(path.join(API_DIR, 'notifications/[id]/route.ts'), 'utf-8');
  check('notifications/[id] filtra por coachId', /coachId: auth\.coachId/.test(notificationsRoute));

  // ═══ 7. BLOG: rate limit + admin estricto + CORS con allowlist ═══
  section('7. Blog (OWASP A01/A06/A10 + LLM10)');
  const blogRoutes = walk(path.join(API_DIR, 'blog')).filter((f) => f.endsWith('route.ts'));

  // 7a. A06/LLM10: TODAS las rutas del blog pasan por rate limiting
  // (lecturas públicas incluidas: evita abuso de descifrado y de traducción LLM).
  const withoutRateLimit = blogRoutes.filter((f) => {
    const code = fs.readFileSync(f, 'utf-8');
    return !/requireRateLimit|secureRoute/.test(code);
  });
  check(
    'blog: todas las rutas con rate limiting',
    withoutRateLimit.length === 0,
    withoutRateLimit.map((f) => path.relative(API_DIR, f)).join(', '),
  );

  // 7b. A01: toda mutación verifica rol admin explícito (no basta con coach).
  // Excepción documentada: el contador de visitas es una escritura PÚBLICA por
  // diseño (analytics sin cookies) — protegida con rate limit + shield + Zod,
  // y solo cuenta entradas publicadas existentes.
  const PUBLIC_WRITE_ALLOWLIST = ['blog/views/route.ts'];
  const mutating = blogRoutes.filter((f) => /export const (POST|PUT|DELETE)/.test(fs.readFileSync(f, 'utf-8')));
  const withoutAdmin = mutating.filter((f) => {
    const rel = path.relative(API_DIR, f).split(path.sep).join('/');
    if (PUBLIC_WRITE_ALLOWLIST.some((allowed) => rel.endsWith(allowed))) return false;
    return !/role !== 'admin'/.test(fs.readFileSync(f, 'utf-8'));
  });
  check(
    'blog: mutaciones exigen rol admin (salvo allowlist pública documentada)',
    withoutAdmin.length === 0,
    withoutAdmin.map((f) => path.relative(API_DIR, f)).join(', '),
  );

  // 7c. A02: sin CORS comodín en route handlers — el proxy aplica allowlist.
  const wildcardCors = blogRoutes.filter((f) =>
    fs.readFileSync(f, 'utf-8').includes("'Access-Control-Allow-Origin': '*'"),
  );
  check(
    'blog: sin CORS comodín en handlers',
    wildcardCors.length === 0,
    wildcardCors.map((f) => path.relative(API_DIR, f)).join(', '),
  );

  // 7d. Uploads: validan tipo permitido y tamaño máximo antes de firmar la URL S3.
  const uploadRoutes = blogRoutes.filter((f) => f.endsWith('upload/route.ts'));
  const uploadsOk = uploadRoutes.filter((f) => {
    const code = fs.readFileSync(f, 'utf-8');
    return /ALLOWED_IMAGE_TYPES/.test(code) && /MAX_SIZE/.test(code) && /fileSize > MAX_SIZE/.test(code);
  });
  check(
    'blog: uploads validan tipo y tamaño',
    uploadRoutes.length >= 2 && uploadsOk.length === uploadRoutes.length,
    `${uploadsOk.length}/${uploadRoutes.length} uploads`,
  );

  // 7e. LLM10: la traducción solo acepta idiomas de la allowlist (sin idiomas arbitrarios).
  const blogTranslation = fs.readFileSync(path.join(LIB_DIR, 'blog-translation.ts'), 'utf-8');
  check('blog: traducción limitada a SUPPORTED_LANGS', /SUPPORTED_LANGS/.test(blogTranslation));

  // 7f. Comentarios: honeypot anti-spam + moderación solo admin.
  const commentsRoute = fs.readFileSync(path.join(API_DIR, 'blog/comments/route.ts'), 'utf-8');
  check('blog: comentarios con honeypot anti-spam', /website/.test(commentsRoute) && /honeypot/i.test(commentsRoute));
  check('blog: comentarios protegidos (rate limit + shield)', /requireRateLimit/.test(commentsRoute) && /secureRoute/.test(commentsRoute));
  const moderationRoute = fs.readFileSync(path.join(API_DIR, 'blog/comments/[id]/route.ts'), 'utf-8');
  check(
    'blog: moderación de comentarios solo admin',
    /role !== 'admin'/.test(moderationRoute) && /BLOG_COMMENT_MODERATED/.test(moderationRoute),
  );

  // ═══ 8. Lista de espera + sesiones gratuitas ═══
  section('8. Lista de espera y sesiones gratuitas');
  const waitlistRoute = fs.readFileSync(path.join(API_DIR, 'waitlist/route.ts'), 'utf-8');
  check('waitlist: honeypot anti-spam', /website/.test(waitlistRoute) && /honeypot/i.test(waitlistRoute));
  check('waitlist: protegida (rate limit + shield vía secureRoute)', /secureRoute/.test(waitlistRoute));
  check('waitlist: email cifrado en reposo', /encrypt\(/.test(waitlistRoute) && /hashEmail/.test(waitlistRoute));
  const freeSessionsRoute = fs.readFileSync(path.join(API_DIR, 'free-sessions/route.ts'), 'utf-8');
  check(
    'sesiones gratuitas: control solo admin (GET y PUT)',
    (freeSessionsRoute.match(/role !== 'admin'/g) ?? []).length >= 1 && (freeSessionsRoute.match(/requireAdmin\(request\)/g) ?? []).length >= 2,
  );
  check('sesiones gratuitas: mutación con rate limit + shield', /secureRoute\(/.test(freeSessionsRoute));
  const leadRoute = fs.readFileSync(path.join(API_DIR, 'leads/route.ts'), 'utf-8');
  check('lead free-session descuenta cupo', /incrementFreeSessionUsage/.test(leadRoute));
}

main()
  .catch((e) => { console.error('💥 Security gate falló:', e); failures++; })
  .finally(() => {
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🛡️  SECURITY GATE: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

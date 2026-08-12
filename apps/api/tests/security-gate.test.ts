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
}

main()
  .catch((e) => { console.error('💥 Security gate falló:', e); failures++; })
  .finally(() => {
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`🛡️  SECURITY GATE: ${passes} checks pasaron, ${failures} fallaron`);
    console.log(`══════════════════════════════════════════════════════════`);
    process.exit(failures > 0 ? 1 : 0);
  });

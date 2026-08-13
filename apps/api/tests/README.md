# TDD — Suite de Tests del Proyecto

## Cómo correr los tests

```bash
# Desde apps/api — suite rápida (sin LLM real, ~1 min)
npm test

# Suite completa (incluye LLM real: translate-e2e, queue-e2e, regen-e2e, ~10 min)
npm run test:e2e

# Tests individuales
npm run test:security      # Security gate (OWASP estático)
npm run test:auth          # Auth + rate limit + validación
npm run test:clients       # Clients CRUD + ownership
npm run test:content       # Recipes + Exercises CRUD + roles
npm run test:notifications # Notifications + misc
npm run test:queue         # Cola propia (unit)
npm run test:translate     # Traducción (unit, mock LLM)
npm run test:pdf           # Route PDF real
npm run test:queue-e2e     # Cola E2E (LLM real)
npm run test:regen-e2e     # Regen E2E (LLM real)
npm run test:translate-e2e # Traducción E2E (LLM real)

# Desde apps/form
npm run test:lifestyle-schema
```

## Flujo TDD obligatorio

> **Regla**: cada vez que se implemente un cambio en una parte del proyecto,
> ejecutar el test o los tests correspondientes ANTES de dar el cambio por bueno.

1. **Al inicio del trabajo**: correr `npm run test:security` (gate OWASP) para
   tener la línea base de seguridad.
2. **Implementar el cambio** (con sus tests si es funcionalidad nueva).
3. **Al final**: correr el test del módulo tocado + `npm test` (suite rápida).
4. **Si el test falla**: corregir el código (no el test) hasta que pase.
5. **Verificación extra**: `npx tsc --noEmit` en las 3 apps (api, form, dashboard).

## Perfiles desechables (regla de oro)

- **Todo test que cree datos en la DB** (clientes, coaches, recetas, ejercicios,
  notificaciones, jobs) DEBE registrar esos datos en el registro de limpieza:
  `registerCleanup('healthforms', id)` / `registerClientWithJobs(id)`.
- La limpieza se ejecuta SIEMPRE en `finally` (`runCleanup()`), incluso si el
  test falla a mitad — así NUNCA quedan perfiles de prueba en la DB.
- Al final del runner, `db-clean.test.ts` verifica que la DB quedó limpia.
- Los tests usan marcadores únicos (`Test *`, `e2e_*`) para poder auditar.

## Seguridad (OWASP) integrada

- `tests/security-gate.test.ts` escanea el código de la API al inicio y al
  final de cada run: manejo de 401 en todos los routes con auth, ausencia de
  `eval()`, no-exposición de `error.message` (A10), bcrypt/argon2 (A04),
  validación de output de LLM (LLM05), ownership verificado (A01).
- Si el gate falla → NO mergear. Corregir el hallazgo antes de continuar.

## Cobertura actual

| Suite | Checks | Alcance |
|---|---|---|
| security-gate | 7 | Escaneo OWASP estático (A01, A04, A05, A07, A10, LLM05) |
| auth | 13 | Register/login/me/change-password, validación zod, rate limit 429, anti-enumeración |
| clients | 17 | CRUD, ownership (403/404), cifrado, gate de pago 402 |
| content | 30 | Recipes+Exercises CRUD, cifrado, roles (propuestas EditProposal), moderación |
| notifications | 16 | CRUD, ownership por coach, markAllRead, unread-count |
| queue | 32 | Cola propia: enqueue/claim/lease/reintentos/zombies |
| translate | 72 | Traducción FASE 4 (mock LLM): estructura, enums, IDs |
| pdf-route | 5 | Route PDF real: generación, headers, marca %PDF |
| db-clean | 5 | Verificación final: DB sin datos de prueba |
| translate-e2e (--e2e) | 37 | Traducción con LLM real |
| queue-e2e (--e2e) | 14 | Cola E2E con LLM real (POST→202→GET worker) |
| regen-e2e (--e2e) | 16 | Regeneración E2E con LLM real |

**Suite rápida: 192 checks. Suite completa: 259 checks.**

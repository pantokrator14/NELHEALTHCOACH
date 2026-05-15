# Implementación de Seguridad en NELHEALTHCOACH

## 📋 Resumen

Esta documentación describe las medidas de seguridad implementadas en NELHEALTHCOACH, con énfasis en protección de APIs, datos médicos sensibles, y aplicaciones de IA. El stack de seguridad es **100% opensource**, sin dependencias de SaaS pagas.

## 🎯 Objetivos de Seguridad

1. **Protección de API** — Prevenir ataques comunes (DDoS, inyección, bots, path traversal)
2. **Seguridad de IA** — Validar prompts y respuestas de modelos de lenguaje (LangChain/LangGraph)
3. **Protección de datos** — Encriptación AES-256 en reposo, validación de datos médicos
4. **Monitoreo** — Detección de comportamiento anómalo, rate limiting por IP/dispositivo
5. **Cumplimiento** — Adherencia a buenas prácticas de seguridad para datos de salud

## 🏗️ Arquitectura de Seguridad

```
                    ┌──────────────────────────────────────────┐
                    │        MIDDLEWARE (Edge Runtime)          │
                    │  • Shield — 28 patrones de ataque         │
Solicitud ──────────│  • Bot Detection — 55+ firmas de bots    │
                    │  • CORS — allowlist por origen            │
                    │  • Security Headers (CSP, HSTS, etc.)     │
                    │  • Request Logging                        │
                    └──────────────┬───────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────┐
                    │       ROUTE HANDLERS (Node.js Runtime)    │
                    │  • Rate Limiter — MongoDB con TTL index   │
                    │  • Shield Body Scan — XSS/SQLi/NoSQLi     │
                    │  • Prompt Injection — 21 patrones HTTP    │
                    │  • Auth/JWT — requireCoachAuth            │
                    │  • Encriptación — AES-256 en reposo       │
                    │  • AI Guardrails — validación entrada/salida│
                    └──────────────────────────────────────────┘
```

## 🔧 Componentes Implementados

### 1. Shield — Detección de Ataques Web

**Ubicación:** `apps/api/src/app/lib/security/shield.ts`  
**Tipo:** Edge-compatible (middleware) + Node.js (route handlers)

**Detecciones activas (28 patrones):**

| Categoría | Patrones | Ejemplos |
|---|---|---|
| SQL Injection | 8 | `' OR '1'='1`, `UNION SELECT`, `DROP TABLE`, `xp_cmdshell` |
| NoSQL Injection | 3 | `$gt`, `$ne`, `$where` operators |
| XSS | 8 | `<script>`, `onerror=`, `javascript:`, `eval()`, `<svg onload>` |
| Path Traversal | 4 | `../`, `..\\`, `%2e%2e%2f`, `/etc/passwd` |
| Shell Injection | 5 | backticks, `$(...)`, `|`, `&&`, `>/dev/null` |

**Funcionamiento:**
- En middleware: escanea URL, query params y headers críticos
- En route handlers: escanea el body del request (`scanRequestBody`)

### 2. Bot Detection

**Ubicación:** `apps/api/src/app/lib/security/botDetector.ts`  
**Tipo:** Edge-compatible

**55+ firmas de bots organizadas en categorías:**
- Crawlers conocidos (Googlebot, Bingbot, etc.)
- Headless browsers (HeadlessChrome, PhantomJS, Puppeteer, Playwright)
- Herramientas de scraping (Scrapy, wget, curl, node-fetch, axios)
- Escáneres de seguridad (nmap, Nikto, sqlmap, Burp Suite, Nessus)
- Spam y fuerza bruta

**Verificaciones adicionales:**
- Consistencia de headers del navegador (Sec-CH-UA)
- Headers sospechosos (User-Agent vacío, sin Accept-Language, Connection anómalo)
- Fingerprint del dispositivo (vía FingerprintJS — X-Visitor-Id header)

### 3. Rate Limiter — MongoDB con TTL Index

**Ubicación:** `apps/api/src/app/lib/security/rateLimiter.ts`  
**Tipo:** Node.js runtime (requiere MongoDB)

**Configuración por ruta:**

| Ruta | Ventana | Máx. requests |
|---|---|---|
| `/api/clients` | 10s | 10 |
| `/api/leads` | 10s | 5 |
| `/api/auth/login` | 60s | 5 |
| `/api/auth/register` | 60s | 3 |
| `/api/health` | 10s | 20 |
| `/api/exercises` | 10s | 10 |
| `/api/recipes` | 10s | 10 |
| Default | 10s | 10 |

**Características:**
- Clave por IP o por `X-Visitor-Id` (FingerprintJS)
- TTL index en MongoDB para limpieza automática
- Operación atómica `findOneAndUpdate` con `$inc`
- Fail-open: si MongoDB falla, permite el request

### 4. Prompt Injection — HTTP-Level

**Ubicación:** `apps/api/src/app/lib/security/promptInjection.ts`  
**Tipo:** Node.js runtime

**21 patrones organizados por severidad:**

| Severidad | Categorías | Ejemplos |
|---|---|---|
| **Critical** | Ignorar instrucciones, system prompt extraction, jailbreak, ethics bypass | `ignore previous instructions`, `DAN`, `developer mode`, `bypass ethical guidelines` |
| **High** | Persona override, fake authority, model confusion | `you are now a different AI`, `this is urgent/critical` |
| **Medium** | Output format hijack | `respond only with JSON` |

### 5. AI Guardrails (guard.ts)

**Ubicación:** `apps/api/src/app/lib/agents/guard.ts`

**7 guards específicos por agente LangGraph:**
- `nutritionPlannerGuard` — disclaimer médico + no medicamentos + ingredientes seguros
- `clientAnalyzerGuard` — prompt injection + validación de datos médicos
- `exercisePlannerGuard` — seguridad de ejercicios + disclaimer
- `habitDesignerGuard` — hábitos saludables + disclaimer
- `qualityValidatorGuard` — validación JSON
- `shoppingListGuard` — validación JSON
- `recipeMatcherGuard` — validación JSON

**Reglas de salida:**
- Disclaimer médico obligatorio en español
- Prohibición de recomendaciones de medicamentos
- Validación de seguridad en ejercicios
- Validación de hábitos saludables
- Validación de ingredientes seguros
- Validación de estructura JSON

### 6. Security Headers (Helmet-style)

**Ubicación:** `apps/api/next.config.ts`

| Header | Valor |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-XSS-Protection` | `0` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'self'; frame-ancestors 'none'` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `X-DNS-Prefetch-Control` | `off` |
| `Cross-Origin-Resource-Policy` | `cross-origin` |

### 7. FingerprintJS — Identificación de Dispositivo

**Ubicación:** `apps/{dashboard,form,landing}/src/lib/fingerprint.ts`  
**Versión:** `@fingerprintjs/fingerprintjs` (opensource, AGPL-3.0)

- Se inicializa al montar `_app.tsx` (no bloquea la app si falla)
- Visitor ID cacheado en localStorage + memoria
- Se envía como header `X-Visitor-Id` en todas las requests API
- Usado por el rate limiter (clave por dispositivo, no solo IP)
- Usado por el bot detector (señal adicional)

## 🔐 Autenticación y Autorización

### JWT Bearer Tokens

- **Duración:** 24 horas para coaches, 15 minutos para sesiones de cliente
- **Almacenamiento:** localStorage (dashboard) — stateless (sin cookies)
- **Middleware:** `requireCoachAuth()` extrae y verifica el token del header `Authorization`

### Roles

- `admin` — acceso total a todos los recursos
- `coach` — acceso solo a sus propios clientes y recursos

## 🔒 Encriptación de Datos

### AES-256 en reposo

**Ubicación:** `apps/api/src/app/lib/encryption.ts`

- Todos los datos personales y médicos se encriptan antes de guardar en MongoDB
- Campos encriptados: nombre, email, teléfono, dirección, historial médico
- La encriptación ocurre en el servidor (API) antes de la inserción en BD
- Los datos se desencriptan al leer para mostrarlos en el dashboard

## 📊 Monitoreo y Logging

### Request Logger

- Cada request recibe un `X-Request-ID` único
- Logs estructurados con contexto: endpoint, método, IP, User-Agent, duración
- Niveles: DEBUG, INFO, WARN, ERROR
- Contextos específicos: RATE_LIMITER, PROMPT_INJECTION, GUARDRAILS, AUTH, DATABASE

### Eventos de Seguridad

- Shield bloqueos — logueados con patrón específico y ruta
- Rate limit excedidos — logueados con contador y ventana
- Prompt injection detectados — logueados con severidad y preview del valor
- Validaciones de guardrails — logueadas con resultado y contexto

## 🚀 Despliegue

Todas las medidas de seguridad son **0 dependencias externas pagas**:
- ✅ Middleware: Edge Runtime (Vercel)
- ✅ Rate Limiter: MongoDB existente (reutiliza conexión)
- ✅ Shield + Bot Detection: Regex puro (sin APIs externas)
- ✅ Security Headers: Config estática de Next.js
- ✅ FingerprintJS: Biblioteca opensource client-side

## 📋 Checklist de Seguridad

- [x] Rate limiting por IP y dispositivo
- [x] Detección de ataques web (XSS, SQLi, NoSQLi, path traversal, shell)
- [x] Detección de bots (55+ firmas)
- [x] Prevención de prompt injection (HTTP + AI agents)
- [x] Validación de salidas de IA (guardrails médicos)
- [x] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] CORS con allowlist de orígenes
- [x] JWT autenticación con roles
- [x] Encriptación AES-256 de datos en reposo
- [x] Logging estructurado con request IDs
- [x] Fingerprint de dispositivo (FingerprintJS)
- [ ] Zod validation en todas las rutas API (próximo)
- [ ] `.env.example` con variables documentadas
- [ ] MFA para coaches (próximo)

## 🔄 Migración desde Arcjet

Este proyecto migró de **Arcjet** (SaaS pago) a un stack **100% opensource**:

| Funcionalidad | Antes (Arcjet) | Ahora (Opensource) |
|---|---|---|
| Rate Limiting | `tokenBucket` SaaS | MongoDB + TTL index (`rateLimiter.ts`) |
| WAF / Shield | `shield` SaaS | 28 patrones regex (`shield.ts`) |
| Bot Detection | `detectBot` SaaS | 55+ firmas + headers (`botDetector.ts`) |
| Prompt Injection | N/A | 21 patrones HTTP (`promptInjection.ts`) |
| Security Headers | N/A | CSP, HSTS, etc. (`next.config.ts`) |
| Dispositivo ID | N/A | FingerprintJS opensource |

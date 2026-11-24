# 🏥 NELHEALTHCOACH - Plataforma Integral de Coaching de Salud

<div align="center">

![NELHEALTHCOACH](https://img.shields.io/badge/NELHEALTHCOACH-Health%20Platform-blueviolet)
![Monorepo](https://img.shields.io/badge/Architecture-Monorepo-success)
![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0.0-47A248)
![Stripe](https://img.shields.io/badge/Payments-Stripe%20Checkout%20%26%20Connect-635BFF)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek%20V4%20Flash-blue)
![Gemini](https://img.shields.io/badge/AI%20Fallback-Google%20Gemini-4285F4)
![Deepgram](https://img.shields.io/badge/Audio-Deepgram%20SDK%205.0-13EF93)
![Compliance](https://img.shields.io/badge/Legal-RGPD%20%7C%20CCPA%20%7C%20JAMS-success)

**Una plataforma moderna para coaching de salud con portal de clientes, 5 programas comerciales, agentes de IA diferenciados por plan y flujos asíncronos**

</div>

## 📋 Tabla de Contenidos

- [✨ Características Principales](#-características-principales)
- [💳 Modelo Comercial y Portal de Clientes](#-modelo-comercial-y-portal-de-clientes)
- [🤖 Sistema de Agentes de IA](#-sistema-de-agentes-de-ia)
- [🔄 Flujos Asíncronos (Cola Propia)](#-flujos-asíncronos-cola-propia)
- [🌐 SEO Técnico, Sitemaps e Indexación](#-seo-técnico-sitemaps-e-indexación)
- [♿ Accesibilidad Web (WCAG 2.1 AA) & Skeletons](#-accesibilidad-web-wcag-21-aa--skeletons)
- [🏗️ Arquitectura del Proyecto](#️-arquitectura-del-proyecto)
- [🚀 Aplicaciones](#-aplicaciones)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [⚙️ Configuración y Desarrollo](#️-configuración-y-desarrollo)
- [🔧 Scripts Disponibles](#-scripts-disponibles)
- [🧪 Testing (TDD)](#-testing-tdd)
- [🌐 Despliegue](#-despliegue)
- [🤝 Contribución](#-contribución)
- [📄 Licencia](#-licencia)

## ✨ Características Principales

### ⚖️ **Blindaje Legal, Regulatorio y de Privacidad (Compliance)**
- **RGPD Art. 9 & CCPA/CPRA**: Casillas de consentimiento estrictamente desacopladas para el tratamiento de datos de salud y categorías especiales en el formulario de clientes (`apps/form` y `ClientHealthForm`).
- **Gestión de Cookies Conforme (ePrivacy & AEPD)**: Bloqueo preventivo de cookies analíticas de terceros, caducidad a 180 días, sin parpadeos vía `useSyncExternalStore` y respeto automático de señales de privacidad del navegador (*Global Privacy Control - GPC*).
- **Gobernanza de IA Segura**: Garantía contractual de no reentrenamiento de modelos comerciales con datos de salud y supervisión humana obligatoria del coach antes de aprobar y entregar planes al cliente.
- **Telecomunicaciones y Grabación**: Puerta de consentimiento previo (*Pre-call Consent Gate*) para participantes de videollamadas antes de activar la transcripción de LiveKit/Deepgram, junto con apertura controlada a 15 minutos antes de la cita.
- **Protección Laboral (California AB 5 / ABC Test)**: Contrato de coaches diseñado para blindar la condición de contratista independiente e indemnización cruzada a favor de la empresa.
- **Consumo y Cancelaciones (FTC & California ARL)**: Cancelación en 1 clic de suscripciones de prueba en `/dashboard/trial/cancel`.
- **Arbitraje Vinculante Individual (JAMS)**: Resolución de controversias mediante arbitraje administrado por JAMS en Riverside County, CA con renuncia a demandas colectivas (*Class Action Waiver*).

### 🎯 **Plataforma Integral**
- **Monorepo** con **5 aplicaciones independientes** (`landing`, `blog`, `form`, `dashboard`, `api`)
- **Arquitectura modular** con tipos compartidos en `@nel/types`
- **Experiencia dual Coach / Cliente** bajo autenticación JWT multi-rol (`coach`, `admin`, `client`)
- **i18n multi-idioma completo** en 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) tanto para interfaz administrativa como para todo el portal del cliente, planes IA y PDFs

### 💳 **Modelo Comercial y Portal de Clientes**
- **Catálogo de 5 Programas Comerciales** sincronizado desde `apps/api/src/app/lib/plans.ts`:
  - `consult_1on1` (*Consulta 1 a 1*): sesión diagnóstica individual con reserva directa sin exigir registro previo ni botones de WhatsApp post-sesión innecesarios.
  - `reto_tres_nel` (*Reto Tres NEL: Reinicio Ancestral y Circadiano*): programa intensivo de **3 semanas** con enfoque progresivo diferenciado (`weeklyPhases`), 1 videollamada y seguimiento.
  - `plan_1_reinicio` (*Plan 1 — Reinicio Metabólico*): acompañamiento mensual de **4 semanas** con WhatsApp semanal y **2 videollamadas 1 a 1** (inicial y cierre).
  - `plan_2_transformacion` (*Plan 2 — Transformación Celular*): seguimiento de 3 meses con evaluaciones, WhatsApp directo, comparativa de biomarcadores y **4 videollamadas 1 a 1** (1 inicial + 1 mensual).
  - `plan_3_maestria` (*Plan 3 — Maestría y Longevidad*): programa extendido de 6 meses con WhatsApp prioritario y **7 videollamadas 1 a 1** (1 inicial + 1 mensual).
- **Stripe Checkout & Acumulación de Créditos**: Pagos únicos vía `/api/payments/plan-checkout`, confirmación idempotente (`confirm-plan` + webhooks) y acumulación automática de meses/evaluaciones y videollamadas al renovar o cambiar de plan.
- **Control de Cupos en Tiempo Real (`plan_quotas`)**: El coach/administrador ajusta límites o pausa planes desde el dashboard de clientes; cuando el cupo se llena, la API responde `409 QUOTA_FULL` y la UI muestra **Cupos no disponibles** en Landing y `/dashboard/plans`.
- **Filtro por Plan en Dashboard**: Listado de clientes con agrupación y filtro por plan contratado (`planId`).
- **Portal de Clientes (`/dashboard`, `/dashboard/plans`, `/dashboard/my-profile`)**:
  - Registro verificado por **OTP de 6 dígitos** en `/register/client`.
  - Sidebar limpio para rol `client`: **Inicio**, **Planes** (más **Recetas**, **Ejercicios** en solo lectura y **Escáner Nutricional** exclusivamente en Plan 2/Plan 3 activos), acceso discreto al **Centro de Ayuda** (`/ayuda`), acceso único inferior **Ver mi perfil** y **Cerrar Sesión**.
  - **4 estados adaptativos** en `Inicio`: sin plan contratado, Consulta 1 a 1, historial clínico pendiente (`ClientHealthForm` embebido) y programa activo/completado.
  - **Cinta de finalización condicional**: visible únicamente cuando `programCompleted === true` (duración concluida y sin videollamadas pendientes).
  - **Recomendaciones de Salud en Solo Lectura + PDF**: Muestra estado en análisis por el asesor o recomendaciones ya aprobadas (`approved`/`sent`) con visor de solo lectura y descarga directa en PDF en 6 idiomas.

### 🏥 **Funcionalidades Clínicas y de Contenido**
- **Gestión de pacientes** y expedientes médicos cifrados (AES-256)
- **Selección inteligente de documentos (`document-selection.ts`)**: Analiza únicamente los archivos pertenecientes a la evaluación en curso (más resumen clínico de sesiones previas), evitando mezclar estudios antiguos; incluye **OCR fallback local** para PDFs escaneados.
- **Análisis nutricional por fotografía de recetas** (`/api/recipes/analyze-image`) y catálogo completo de recetas y ejercicios.

### 🤖 **IA Multi-Experto y Pipeline Diferenciado por Plan**
- **Motor Principal DeepSeek V4 Flash** + **Fallback automático a Google Gemini** en runtime.
- **Análisis médico con óptica de nutrición ancestral y optimización metabólica** — interpretación de laboratorios bajo rangos de referencia funcionales y adaptados a flexibilidad metabólica, con atención a electrolitos (sodio, potasio, magnesio).
- **Diferenciación automática según programa**:
  - **Reto Tres NEL (3 semanas)**: Genera `weeklyPhases` con enfoque distinto para cada una de las 3 semanas.
  - **Planes mensuales (`plan_1_reinicio`, `plan_2_transformacion`, `plan_3_maestria`)**: Mantiene ciclos completos de **4 semanas**.
- **Plan nutricional, ejercicios, hábitos y lista de compras** con validación y regeneración encolada.
- **Procesamiento de documentos**: extracción LOCAL de texto (PDF con `pdf-parse`, DOCX con `mammoth`, imágenes y PDFs escaneados con `tesseract.js`/OCR) + Gemini como secundario sobre el texto extraído.

### 🌍 **Traducción Dinámica Multi-Idioma (FASE 4)**
- El pipeline genera SIEMPRE el plan en español (para alinear títulos de recetas en DB) y traduce todo el contenido visible al **idioma del cliente** (`language` en `personalData`: `es`/`en`/`fr`/`it`/`pt`/`de`).
- **Detección heurística de idioma de origen** de recetas/ejercicios (stopwords, sin LLM).
- **Traducción por lotes JSON** conservando estructura, `weeklyPhases`, IDs, enums y unidades intactos.
- **Traducción en PDF** (`recommendation-pdf.ts`) y **banner informativo** cuando la sesión fue traducida, con resiliencia ante fallos.

### 🔄 **Flujos Asíncronos (Cola Propia sobre MongoDB)**
- **Cola de trabajos 100% propia** sobre MongoDB (`ai_jobs`, patrón *worker-on-poll*, sin servicios externos):
  - `POST/PUT /api/clients/[id]/ai` → **encola y responde 202** `{status:'queued', jobId}` en <1s.
  - El **polling del frontend** (`GET`) reclama el job atómicamente y ejecuta el pipeline como worker.
  - **Lease de 6 min + reintentos (máx 3)**: si el worker muere por timeout, el job se re-ejecuta; tras agotar intentos, error visible en la UI (oculto para el rol `client`).
  - **Idempotencia** y **regeneración de sesiones** encolada.
- **Transcripción de sesiones** con Deepgram SDK 5.0.

### 📹 **Videollamadas con LiveKit y Ventana de Acceso**
- **Agenda automática dual-timezone (`buildClientVideoSessionSchedule` + `timezone.ts`)**: Proyecta automáticamente las fechas de las videollamadas incluidas desde la fecha de inscripción y envía invitaciones, notificaciones al asesor y recordatorios automatizados (previo e inminente) adaptados a la zona horaria del coach (`America/Los_Angeles` en California) y a la zona horaria local del cliente.
- **Control temporal de ingreso (`/video/join` y `/api/video/token`)**: El botón *Unirse a Videollamada* permanece en gris deshabilitado y la API responde `403 SESSION_NOT_YET_STARTED` hasta **15 minutos antes** de la hora programada.
- **Pre-Call Consent Gate**: Consentimiento expreso previo de grabación y transcripción con Deepgram antes de entrar a la sala WebRTC.
- **Salas seguras** con DTLS-SRTP, tokens JWT temporales, grabación cifrada en AWS S3 y webhooks.

### 📖 **Gestión de Recetas y Ejercicios**
- **Recetas y Escáner Nutricional**: Catálogo con búsqueda/filtros, cálculo de macros, perfil energético metabólico y **escáner nutricional desde fotografía** (`POST /api/recipes/analyze-image`) habilitado en modo lectura/análisis con cuota mensual para Plan 2 (5/mes) y Plan 3 (30/mes), con validación por *magic bytes* y protección IDOR.
- **Ejercicios**: Biblioteca con categorías, grupos musculares, niveles de dificultad y CRUD con propuestas de edición entre coach y admin.

### 🔒 **Seguridad y Confiabilidad**
- **Autenticación JWT multi-rol y RBAC estricto** (`coach`, `admin`, `client`) + OTP de 6 dígitos, acceso autenticado obligatorio a catálogos (`401`/`403` según plan) y `Cache-Control: private, no-store`.
- **FingerprintJS** + detección de bots (User-Agent, headers, Client Hints, `Sec-Fetch-*`) + rate limiting en MongoDB.
- **Protección contra prompt injection** y guardrails clínicos para agentes IA.
- **Cifrado AES-256** de datos sensibles (PII, resultados médicos, sesiones) y subida segura a AWS S3 con URLs prefirmadas.
- **Zero Hardcoded Secrets**: Todas las credenciales de pruebas se generan dinámicamente en runtime.

#### 🛡️ Bot Detection — Notas Importantes

El bot detector se aplica a todas las rutas críticas (`/api/auth/*`, `/api/clients/*`, `/api/health/*`, etc.) y analiza:

| Check | Qué detecta | Por qué es seguro |
|---|---|---|
| `User-Agent` vacío/corto | Scripts sin identidad | Los navegadores siempre envían un UA largo |
| `Accept-Language` ausente | Scripts sin localización | Los navegadores siempre lo envían |
| `Accept-Encoding` sin gzip/br | Scripts sin compresión | Los navegadores siempre soportan compresión |
| `Connection: close` | Scripts sin keep-alive | Los navegadores usan `keep-alive` |
| `Accept: */*` **sin** `Sec-Fetch-*` | Scripts genéricos | Se omite si hay headers `Sec-Fetch-*` (todos los navegadores) o Client Hints (Chromium) |

> **⚠️ Nota**: El check `Accept: */*` se omite cuando la petición tiene headers `Sec-Fetch-*` (`sec-fetch-dest`, `sec-fetch-mode`, `sec-fetch-site`) o Client Hints (`sec-ch-ua`), evitando falsos positivos tanto en desarrollo local como en producción.

## 🤖 Sistema de Agentes de IA

La plataforma orquesta un flujo multi-experto para generar recomendaciones personalizadas (con nodos de referencia en LangGraph y ejecución optimizada en pipeline secuencial en `composite-recommendation.ts`):

```
┌─────────────────────────────────────────────────────────┐
│                    START                                 │
└────────────────────────┬────────────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Client Analyzer   │ ← Analiza perfil y documentos de sesión actual
              └────────┬────────────┘
                       │ (fases clínicas y estilo de vida)
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Medical   │ │Nutrition │ │ Exercise │ │  Habit   │
   │  Analyst   │ │ Planner  │ │ Planner  │ │ Designer │
   └─────┬──────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
         │             │            │             │
         └─────────────┼────────────┼─────────────┘
                       ▼
              ┌─────────────────────┐
              │   Recipe Matcher    │ ← Busca recetas compatibles (3 o 4 semanas)
              └────────┬────────────┘
                       ▼
              ┌─────────────────────┐
              │ Shopping List Gen   │ ← Genera lista de compras consolidada
              └────────┬────────────┘
                       ▼
              ┌─────────────────────┐
              │ Quality & FASE 4    │ ← Valida, traduce (6 idiomas) y cifra
              └────────┬────────────┘
                       ▼
                      END
```

### Perfil Completo del Cliente y Selección Documental
Todos los agentes reciben el expediente estructurado y **únicamente los documentos de la evaluación vigente** (`document-selection.ts`) más el resumen de sesiones anteriores:
- `personalData` — datos demográficos, antropométricos e idioma
- `medicalData` — condiciones médicas, laboratorios, suplementos actuales
- `healthAssessment` & `mentalHealth` — evaluaciones del formulario o `ClientHealthForm`
- `processedDocuments` — texto extraído localmente (`pdf-parse`/`mammoth`/OCR fallback) y analizado por Gemini
- `previousSessions` & `coachNotes` — continuidad longitudinal y notas clínicas

### LLM: DeepSeek V4 Flash + Google Gemini
- **DeepSeek V4 Flash** — modelo principal (`deepseek-chat`) para generación del plan compuesto (`composite-recommendation.ts`) y traducción dinámica FASE 4.
- **Google Gemini** (`gemini-2.5-flash` / `gemini-4-hydrogen`) — fallback automático en runtime ante fallos/timeout de DeepSeek, análisis de texto médico extraído localmente y análisis nutricional de fotografías de recetas.

## 🔄 Flujos Asíncronos (Cola Propia)

| Componente | Descripción |
|---|---|
| `ai-job-queue.ts` | Cola sobre MongoDB (`ai_jobs`) con estados `pending → running → done/failed`, claim atómico, lease de 6 min, reintentos (máx 3) y abandono de jobs zombie |
| `POST /api/clients/[id]/ai` | Encola la generación según `planId` y responde **202 queued** en <1s |
| `GET /api/clients/[id]/ai` | **Worker-on-poll**: reclama el job y ejecuta el pipeline completo (< 300s Vercel Hobby) |
| `PUT regenerate_session` | Regeneración encolada con validación fail-fast (sesión en `draft`) |
| `process-transcription` | Procesa transcripciones de sesiones de coaching (Deepgram) |

## 🌐 SEO Técnico, Sitemaps e Indexación Selectiva
- **Indexación Selectiva en `robots.txt`**:
  - **Públicas** (`apps/landing`, `apps/blog`): Permiso de rastreo (`Allow: /`), bloqueo de rutas privadas (`Disallow: /admin`) y sitemaps oficiales.
  - **Privadas** (`apps/dashboard`, `apps/form`): Bloqueo total (`User-agent: * Disallow: /`) y `<meta name="robots" content="noindex, nofollow, noarchive" />`.
- **Sitemaps Dinámicos XML y Centro de Ayuda (`/ayuda`)**: `/sitemap.xml` en `apps/landing` (incluye `/ayuda` con `Schema.org FAQPage` JSON-LD en 6 idiomas y canal exclusivo `support@nelhealthcoach.com` para casos extremos, sin WhatsApp) y `sitemap.ts` multilingüe (`hreflang`) en `apps/blog`.
- **Canonical Tags, Redirecciones 301 y Schema.org / JSON-LD**: `HealthAndBeautyBusiness`, `LocalBusiness`, `Person` y `BlogPosting`.

## ♿ Accesibilidad Web (WCAG 2.1 AA) & Skeletons (Principio Anti-AI)
- **Skeletons de Carga Asíncrona**: Reemplazo de spinners flotantes por skeletons pulsantes (`animate-pulse`) en clientes, perfil clínico, recetas, finanzas y blog.
- **Formularios Accesibles**: Vinculación explícita `id` ↔ `htmlFor`, soporte `Escape` en modales, `focus-visible:ring-2` y ratios de contraste >= 4.5:1.
- **Core Web Vitals**: `<Image fill sizes="...">`, carga diferida *below the fold* y `display: swap` en fuentes.

## 🏗️ Arquitectura del Proyecto

```bash
NELHEALTHCOACH/
├── 📁 apps/
│   ├── 🏠 landing/      # Portada comercial, 5 planes, leads y suite legal
│   ├── 📚 blog/         # Divulgación científica y nutrición evolutiva (SEO)
│   ├── 📝 form/         # Formularios de salud y contrato RGPD Art. 9
│   ├── 📊 dashboard/    # Panel dual: centro de mando Coach + Portal de Clientes
│   └── 🔌 api/          # Backend REST, Stripe, LiveKit, Cola propia y Agentes IA
├── 📁 packages/
│   └── 📦 types/        # Tipos TypeScript compartidos (incl. planes y healthForm)
├── 📁 docs/             # Documentación técnica y PRDs (v1.5.0)
├── 📄 package.json      # Configuración del monorepo
└── 📄 turbo.json        # Orquestación Turbo
```

## 🚀 Aplicaciones

El monorepo integra **5 aplicaciones** coordinadas en Next.js 16.3.6:

1. **🏠 Landing Page (`apps/landing`)**: Exhibición de propuesta de valor, comparativa en vivo de los 5 planes con estado de cupos, **Centro de Ayuda (`/ayuda`)** interactivo con FAQ buscable y Schema.org `FAQPage` (escalación exclusiva por correo `support@nelhealthcoach.com` sin WhatsApp), precalificación de leads (escala 1-10), suite legal completa, CMP GPC y multi-idioma en 6 idiomas.
2. **📚 Blog de Salud (`apps/blog`)**: Renderizado SSR/SSG con JSON-LD (`BlogPosting`), feeds RSS 2.0, sitemap multilingüe (`hreflang`), moderación de comentarios y suite de tests de 76 checks.
3. **📝 Formularios de Salud (`apps/form`)**: Captura multi-paso validada (React Hook Form + Yup), subida segura a AWS S3 y Paso 6 contractual desacoplado.
4. **📊 Dashboard & Portal de Clientes (`apps/dashboard`)**:
   - **Coaches/Admin**: Clientes (filtro por plan + control de cupos), expedientes clínicos, visor/editor de recomendaciones IA (`3` o `4` semanas), recetas con análisis por foto, ejercicios, finanzas Stripe Connect, contrato AB 5 y cancelación FTC (`/dashboard/trial/cancel`).
   - **Clientes**: Autoregistro OTP (`/register/client`), portal `/dashboard` en 4 estados (`Inicio`, `Planes`, `Ver mi perfil`), historial embebido `ClientHealthForm`, agenda de videollamadas con ventana 15 min (`/video/join`) y recomendaciones en solo lectura + PDF.
5. **🔌 API Backend (`apps/api`)**: Endpoints REST Next.js App Router, JWT multi-rol, Stripe Checkout & Webhooks, `plan-quotas`, `client-portal/me`, LiveKit + Deepgram, cola `ai_jobs`, DeepSeek + Gemini fallback, extracción/OCR local y generación PDF.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19.1.0, Next.js 16.3.6, TypeScript 5.8.3, Tailwind CSS, React Hook Form + Yup, `i18next` / `react-i18next`, FingerprintJS, `jsPDF` + `jspdf-autotable`.
- **Backend**: Node.js 18+, Next.js 16.3.6 App Router, MongoDB 6.0 + Mongoose 8.0, Zod, CryptoJS (AES-256), Resend + AWS SES, AWS S3, `pdf-parse`, `mammoth`, `tesseract.js`, `pdfkit`, `sharp`.
- **Pagos**: Stripe Checkout, Stripe Connect & Webhooks idempotentes.
- **Videollamadas & Audio**: LiveKit Cloud (`livekit-server-sdk`, `livekit-client`, `@livekit/components-react`) + Deepgram SDK 5.0.0.
- **IA**: DeepSeek V4 Flash (`deepseek-chat`) + Google Gemini (`gemini-2.5-flash` / `gemini-4-hydrogen`) + LangGraph 1.2.8.

## 📁 Estructura del Proyecto

```bash
NELHEALTHCOACH/
├── 📁 apps/
│   ├── 📂 api/
│   │   ├── 📂 src/app/
│   │   │   ├── 📂 api/
│   │   │   │   ├── 📂 auth/            # login, register, verify, reset y client/ (OTP + login)
│   │   │   │   ├── 📂 blog/            # artículos, comentarios y traducción
│   │   │   │   ├── 📂 client-portal/me/# estado consolidado, citas proyectadas y cierre
│   │   │   │   ├── 📂 clients/         # expedientes, upload S3, IA encolada y descarga PDF
│   │   │   │   ├── 📂 coaches/         # gestión y perfiles de coaches
│   │   │   │   ├── 📂 exercises/       # CRUD ejercicios + propuestas de edición
│   │   │   │   ├── 📂 free-sessions/   # disponibilidad y tope de sesiones gratuitas
│   │   │   │   ├── 📂 leads/           # captura de leads con compromiso (1-10)
│   │   │   │   ├── 📂 payments/        # Stripe Checkout por plan, confirm-plan, Connect, webhook
│   │   │   │   ├── 📂 plan-quotas/     # administración de cupos por plan (admin)
│   │   │   │   ├── 📂 plans/           # catálogo público de los 5 planes con cupo vivo
│   │   │   │   ├── 📂 recipes/         # CRUD recetas + analyze-image (IA por foto)
│   │   │   │   ├── 📂 video/           # LiveKit rooms, token (ventana 15 min), webhooks
│   │   │   │   └── 📂 waitlist/        # lista de espera unificada
│   │   │   └── 📂 lib/
│   │   │       ├── 📂 agents/          # nodos LangGraph y utils/llm.ts (DeepSeek + Gemini)
│   │   │       ├── 📂 security/        # bot detection, rate limiter, guardrails, AES-256
│   │   │       ├── 📄 composite-recommendation.ts  # pipeline 3 fases + weeklyPhases (Reto)
│   │   │       ├── 📄 document-selection.ts        # selección documental por sesión actual
│   │   │       ├── 📄 plans.ts                     # 5 planes, agenda video y finalización
│   │   │       ├── 📄 recommendation-pdf.ts        # PDF con weeklyPhases y traducciones
│   │   │       └── 📄 recommendation-translator.ts # traducción FASE 4 y cifrado
│   │   └── 📂 tests/                   # suite TDD completa y security gate OWASP
│   ├── 📂 dashboard/
│   │   └── 📂 src/
│   │       ├── 📂 components/
│   │       │   ├── 📂 dashboard/       # Layout, ClientHealthForm, ClientProfileView, AIRecommendationsModal, VideoCallRoom, RecipeModal, ExerciseModal
│   │       │   └── 📂 ui/
│   │       ├── 📂 lib/                 # api.ts, client-hooks.ts, locale.ts, i18n.ts (6 idiomas)
│   │       └── 📂 pages/
│   │           ├── 📂 dashboard/       # index.tsx, plans.tsx, my-profile.tsx, clients/, trial/cancel.tsx, recipes/, exercises/, finances.tsx
│   │           ├── 📂 register/        # index.tsx (coach) y client.tsx (OTP)
│   │           └── 📄 video/join.tsx   # sala pública con bloqueo previo 15 min y consentimiento
│   ├── 📂 form/                        # formularios de salud y contrato RGPD Art. 9
│   ├── 📂 landing/                     # portada pública, 5 planes, leads y páginas legales
│   └── 📂 blog/                        # blog científico multilingüe SSR/SSG
└── 📁 packages/types/                  # tipos TypeScript compartidos
```

## ⚙️ Configuración y Desarrollo

### **Prerrequisitos**
- Node.js 18+ y npm 9+
- MongoDB (local o Atlas)
- Cuenta AWS (S3 y SES opcional)
- API Keys de DeepSeek, Google Gemini, Stripe, LiveKit Cloud y Deepgram (opcional para transcripción)

### **Instalación**

```bash
git clone <repository-url>
cd NELHEALTHCOACH
npm install
cp .env.example .env
# Configurar las variables en .env con credenciales propias de entorno
```

### **Variables de Entorno (Plantilla de Referencia)**

```env
# ── Base de Datos ──
MONGODB_URI=mongodb://localhost:27017/nelhealthcoach
DB_NAME=nel-healthcoach

# ── Seguridad y Auth ──
JWT_SECRET=<tu_jwt_secret>
ENCRYPTION_KEY=<tu_clave_aes_32_caracteres>

# ── AWS ──
AWS_ACCESS_KEY_ID=<tu_aws_access_key>
AWS_SECRET_ACCESS_KEY=<tu_aws_secret_key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=<tu_bucket_s3>

# ── Email ──
RESEND_API_KEY=<tu_resend_api_key>
EMAIL_FROM_ADDRESS=noreply@nelhealthcoach.com
EMAIL_FROM_NAME=NELHealthCoach
EMAIL_ENABLED=true

# ── Inteligencia Artificial ──
DEEPSEEK_API_KEY=<tu_deepseek_api_key>
GEMINI_API_KEY=<tu_gemini_api_key>
GEMINI_MODEL=gemini-2.5-flash

# ── Stripe (Pagos y Planes) ──
STRIPE_SECRET_KEY=<tu_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<tu_stripe_webhook_secret>

# ── Deepgram & LiveKit ──
DEEPGRAM_API_KEY=<tu_deepgram_api_key>
LIVEKIT_API_KEY=<tu_livekit_api_key>
LIVEKIT_API_SECRET=<tu_livekit_api_secret>
LIVEKIT_URL=wss://tu-instancia.livekit.cloud

# ── URLs de Aplicaciones ──
WEBSITE_URL=https://nelhealthcoach.com
APP_URL=http://localhost:3000
FORM_URL=http://localhost:3003
DASHBOARD_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev:all        # Inicia las aplicaciones en paralelo
npm run dev:landing
npm run dev:blog
npm run dev:form
npm run dev:dashboard
npm run dev:api

# Build y verificación
npm run build
npm run lint
npm run security:check
```

## 🧪 Testing (TDD)

La plataforma cuenta con una **suite de tests de integración exhaustiva** en `apps/api/tests/` con perfiles desechables (creados dinámicamente en runtime, sin credenciales hardcodeadas, y eliminados en `finally`):

```bash
# Desde apps/api — suite rápida (sin LLM real)
npm test

# Suite completa (incluye E2E con LLM real)
npm run test:e2e

# Gate de seguridad OWASP (estático)
npm run test:security
```

**Cobertura principal** (detalle en `apps/api/tests/README.md`):
- **Security gate OWASP** (`security-gate.test.ts`, 29 checks) — 401 en rutas protegidas, prevención de fugas `error.message` (A10), bcrypt/argon2 (A04), ownership (A01) y validación LLM (LLM05).
- **Flujo completo de 5 Planes y Portal de Clientes** (`client-plans-flow.test.ts`, 81 checks) — catálogo, registro OTP 6 dígitos, aislamiento de cliente, ventana de videollamadas de 15 min, `programCompleted` y `weeklyPhases` del Reto Tres NEL.
- **Control de Cupos por Plan** (`plan-quotas.test.ts`, 21 checks) — disponibilidad en vivo, `409 QUOTA_FULL`, pausas y límites administrativos.
- **Auth, Clients, Content, Blog, Waitlist, Free Sessions & Document Selection** — CRUD cifrado, blog SSR/SEO (76 checks), lista de espera, sesiones gratuitas y selección documental por evaluación actual.
- **Cola propia, Traducción, PDF y E2E LLM real** — enqueue/claim/lease/reintentos, FASE 4 JSON, `%PDF` y regeneración.
- **db-clean** (`db-clean.test.ts`) — confirma 0 registros residuales de prueba en base de datos.

## 🌐 Despliegue

El monorepo está configurado para despliegue en **Vercel** (plan Hobby con `maxDuration` <= 300s en funciones serverless y cola propia `ai_jobs` con reintentos automáticos).

```bash
# Build general
npm run build
```

## 🤝 Contribución

1. **Fork** el repositorio y crea tu rama (`git checkout -b feature/AmazingFeature`).
2. Verifica tipos y tests (`npx tsc --noEmit`, `npx eslint`, suite TDD en `apps/api`).
3. **Commit** tus cambios y abre un **Pull Request** hacia `dev`.

---

<div align="center">

### **Desarrollado con ❤️ para ayudar a la humanidad**

**👨‍💻 Autor:** [pantokrator14](https://github.com/pantokrator14)  
**📧 Contacto:** [juliusjosepham@proton.me]

</div>

## 📄 Licencia

Este proyecto es software privado. Todos los derechos reservados.

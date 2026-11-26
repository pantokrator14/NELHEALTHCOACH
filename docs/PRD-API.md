# PRD - API (Backend y Agentes de IA)
## Documento de Requerimientos del Producto - NELHEALTHCOACH API

**Versión:** 1.5.0  
**Fecha:** Noviembre 2026  
**Estado:** Producción / Portal de Clientes, 5 Planes, Cupos, DeepSeek + Gemini + Deepgram

---

## 1. Visión General

### 1.1 Propósito
La API de NELHEALTHCOACH (`apps/api`) es el núcleo transaccional, clínico y de IA del ecosistema, proporcionando:
- Procesamiento y almacenamiento cifrado (AES-256) de historiales médicos, documentos clínicos y evaluaciones.
- Pipeline secuencial multi-fase de IA para generación de recomendaciones personalizadas (3 semanas con enfoque progresivo para *Reto 3S NEL* o ciclos de 4 semanas para los planes mensuales).
- Catálogo único de 5 planes comerciales, control de cupos por plan (`plan_quotas`), pagos únicos vía Stripe Checkout y webhooks idempotentes.
- Portal de clientes con registro OTP de 6 dígitos, login por rol (`client`), auto-gestión de perfil y agenda de videollamadas con LiveKit + Deepgram.
- Análisis de fotografías de recetas con Gemini y extracción/OCR local de documentos médicos por sesión.

### 1.2 Alcance
- Backend serverless optimizado en Next.js 16 (App Router) desplegado en Vercel Hobby (`maxDuration` <= 300s).
- API RESTful protegida con autenticación JWT multi-rol (`coach`, `admin`, `client`), `secureRoute`, detección de bots, rate limiting en MongoDB y cifrado AES-256 campo a campo.
- Procesamiento y extracción local de documentos médicos (`pdf-parse`, `mammoth`, `tesseract.js` / OCR fallback para PDFs escaneados) + Gemini para análisis clínico de biomarcadores.

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Seguridad y Confidencialidad Médica**: Cumplimiento con RGPD Art. 9 y aislamiento estricto por coach y cliente (OWASP A01/A04/A10).
2. **Razonamiento Clínico Adaptado por Plan**: Uso de **DeepSeek V4 Flash** como motor principal con fallback automático en runtime a **Google Gemini** (`gemini-2.5-flash` / `gemini-4-hydrogen` según tarea), adaptando duración y fases al plan contratado.
3. **Escalabilidad Asíncrona sin Servicios Terceros**: Cola propia sobre MongoDB (*worker-on-poll*) sin depender de servicios de cola externos.
4. **Control Comercial y de Capacidad**: Cobro seguro con Stripe Checkout, acumulación automática de créditos al renovar/cambiar de plan y bloqueo de cupos en tiempo real (`409 QUOTA_FULL`).

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (App Router)
- **Lenguaje**: TypeScript 5.8.3
- **Base de Datos**: MongoDB 6.0 + Mongoose 8.0 (`ClientAccount`, `Coach`, `Recipe`, `Exercise`, `BlogPost`, `Waitlist`, `PlanQuota`, `AIJob`)
- **Modelos de IA**:
  - **Motor Primario**: **DeepSeek V4 Flash** (`deepseek-chat`) para generación del plan compuesto (`composite-recommendation.ts`) y traducción dinámica FASE 4.
  - **Motor Secundario / Fallback y Visión**: **Google Gemini** (`gemini-2.5-flash` / `gemini-4-hydrogen`) como fallback automático de LLM en runtime, análisis clínico de texto médico extraído y análisis de imágenes de recetas (`/api/recipes/analyze-image`).
  - **Transcripción de Audio**: **Deepgram SDK 5.0** para transcripción en tiempo real de consultas de LiveKit.
- **Flujos Asíncronos**: Cola propia sobre MongoDB (`ai_jobs`, patrón *worker-on-poll*, idempotencia, lease de 6 min y hasta 3 reintentos).
- **Pagos**: Stripe Checkout (planes comerciales), Stripe Connect y Webhooks idempotentes.
- **Videollamadas**: LiveKit Cloud (WebRTC) con control de ventana temporal de acceso (`VIDEO_JOIN_EARLY_WINDOW_MS = 15 min`), grabación en AWS S3 y enlaces JWT por sesión.
- **Seguridad**: Cifrado AES-256 de campos sensibles, rate limiter sobre MongoDB, bot detector y guardrails de seguridad médica.
- **Email**: Resend con fallback a AWS SES (verificación OTP de clientes, invitaciones de videollamada, planes PDF, notificaciones).

### 3.2 Estructura de Directorios
```
apps/api/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── client/       # Registro OTP, verificación 6 dígitos y login de clientes
│   │   │   ├── blog/             # Artículos, moderación de comentarios y traducción
│   │   │   ├── client-portal/me/ # Estado consolidado del portal del cliente, plan, cupos y citas
│   │   │   ├── clients/          # Expedientes cifrados, upload S3, IA y descarga PDF
│   │   │   ├── coaches/          # Gestión y perfiles de coaches
│   │   │   ├── exercises/        # CRUD biblioteca de ejercicios
│   │   │   ├── free-sessions/    # Disponibilidad y tope de sesiones gratuitas
│   │   │   ├── leads/            # Captura de leads con nivel de compromiso (1-10)
│   │   │   ├── payments/         # Stripe Checkout por plan, confirm-plan, Connect y Webhooks
│   │   │   ├── plan-quotas/      # Administración de cupos por plan (admin)
│   │   │   ├── plans/            # Catálogo público de los 5 planes con disponibilidad calculada
│   │   │   ├── recipes/          # CRUD recetas + /analyze-image (análisis nutricional por foto)
│   │   │   ├── video/            # LiveKit rooms, /token (con ventana 15 min) y webhooks Deepgram
│   │   │   └── waitlist/         # Lista de espera unificada (libro y sesiones)
│   │   └── lib/
│   │       ├── agents/           # Nodos de referencia LangGraph y utils/llm.ts (DeepSeek + Gemini fallback)
│   │       ├── composite-recommendation.ts  # Pipeline secuencial 3 fases + weeklyPhases (Reto 3 semanas)
│   │       ├── document-selection.ts        # Selección de documentos por evaluación actual
│   │       ├── plans.ts                     # Source of truth de 5 planes, slots LiveKit y finalización
│   │       ├── recommendation-pdf.ts        # Generación PDF con weeklyPhases y traducciones
│   │       ├── recommendation-translator.ts # Traducción FASE 4 y cifrado campo a campo
│   │       └── security/                    # AES-256, rate limiting, bot detector, guardrails, secureRoute
│   └── models/                              # ClientAccount, Coach, PlanQuota, Recipe, Exercise, etc.
└── tests/                                   # Suite TDD (client-plans-flow, plan-quotas, security-gate, etc.)
```

---

## 4. Funcionalidades Principales

### 4.1 Catálogo Comercial, Pagos y Cupos (`plans.ts`, `/api/plans`, `/api/plan-quotas`, `/api/payments/*`)
- Define los 5 productos comerciales (`consult_1on1`, `reto_tres_nel`, `plan_1_reinicio`, `plan_2_transformacion`, `plan_3_maestria`) con sus límites de duración (`totalWeeks`, `maxMonths`), nivel de WhatsApp (`whatsappTier`) y sesiones LiveKit (`livekitSessionsIncluded`).
- `GET /api/plans` calcula disponibilidad en tiempo real por plan cruzando inscripciones activas y límites configurados en `PlanQuota`.
- `POST /api/payments/plan-checkout` valida disponibilidad (devuelve `409 QUOTA_FULL` si el cupo está lleno) y crea sesión de Stripe Checkout; `POST /api/payments/confirm-plan` y `/api/payments/webhook` aplican activación idempotente y acumulan meses/sesiones al renovar o cambiar de plan.

### 4.2 Portal de Cliente y Ventana de Videollamadas (`/api/client-portal/me`, `/api/video/token`)
- `buildClientVideoSessionSchedule()` proyecta automáticamente las fechas estimadas de todas las sesiones del plan según fecha de compra (1 sesión al día 21 en Reto; 2 sesiones en Plan 1 [inicial + día 30], 4 en Plan 2 y 7 en Plan 3 [inicial + 1 mensual cada 30 días]) o las cruza con las citas confirmadas por el coach.
- Solo genera `joinLink` y permite token LiveKit cuando la sesión está confirmada y dentro de la ventana válida (desde **15 minutos antes** hasta el margen posterior de cierre). Fuera de ventana responde `403 SESSION_NOT_YET_STARTED` con `scheduledAt` y `unlocksAt`.
- `evaluateProgramCompletionState()` determina si el ciclo del cliente concluyó realmente (`programCompleted`), evitando mostrar la cinta de finalización mientras queden días o videollamadas pendientes.

### 4.3 Pipeline de IA Multi-Fase, Documentos y Recetas
1. **Selección de Documentos (`document-selection.ts`)**: En evaluaciones nuevas/subsecuentes analiza únicamente los documentos de la evaluación en curso (más resumen clínico de sesiones previas), con fallback OCR para PDFs escaneados.
2. **Generación Secuencial (`composite-recommendation.ts`)**:
   - **Fase 1**: Analista clínico (biomarcadores metabólicos y nutrición ancestral/evolutiva con suplementación).
   - **Fase 2**: Estilo de vida, menú 7 días con recetas reales, ejercicios y hábitos. Cuando `planId === 'reto_tres_nel'` (`totalWeeks === 3`), genera `weeklyPhases` con enfoque progresivo específico por cada una de las 3 semanas; los planes mensuales (`plan_1_reinicio`, `plan_2_transformacion`, `plan_3_maestria`) mantienen la generación estándar de 4 semanas.
   - **Fase 3**: Lista de compras consolidada y priorizada.
   - **Fase 4**: Traducción dinámica JSON al idioma del cliente (`es`, `en`, `fr`, `it`, `pt`, `de`) y cifrado AES-256.
3. **Visibilidad del Cliente**: Los endpoints `GET /api/clients/[id]` y `GET /api/clients/[id]/ai` filtran recomendaciones para rol `client` devolviendo exclusivamente sesiones con estado `approved` o `sent` y ocultando errores internos de generación.
4. **Escáner Nutricional con IA (`POST /api/recipes/analyze-image`)**: Estima macronutrientes, ingredientes y perfil energético metabólico desde fotografías reales (validación de *magic bytes*, bloqueo IDOR para clientes, cuota atómica de **5/mes** en Plan 2 y **30/mes** en Plan 3 con rollback en caso de error 5xx).
5. **Catálogos RBAC (`GET /api/recipes`, `GET /api/recipes/[id]`, `GET /api/exercises`)**: Autenticación obligatoria (`requireAnyAuth`, `401` anónimo), `403` para planes sin biblioteca, límite de 15 ítems publicados para Plan 2 y catálogo completo publicado para Plan 3, con `Cache-Control: private, no-store`.
6. **Recordatorios Dual-Timezone (`timezone.ts`, `/api/video/rooms`, `session-reminders.ts`)**: Horario de California (`America/Los_Angeles` por defecto) para Manuel Martínez y zona IANA del navegador o inferida desde dirección para cada cliente en correos de invitación y cron de recordatorios (previo e inminente).

### 4.4 Generación de Documentos PDF (`recommendation-pdf.ts`)
- Generación de reportes clínicos en PDF mediante streams binarios (`Uint8Array`) compatibles con Next.js 16, incluyendo las fases semanales del Reto 3S NEL cuando aplican y disclaimers médicos localizados.

---

## 5. Medidas de Seguridad, Privacidad y Testing
- **Garantía Contractual de No Entrenamiento**: Llamadas a DeepSeek y Google Gemini vía APIs corporativas sin reentrenamiento público y con sanitización previa de PII.
- **Sin Secretos Hardcodeados**: Toda credencial y clave de prueba en tests automatizados se genera dinámicamente en runtime.
- **Suite TDD Automatizada (`apps/api/tests/`)**: Cobertura integral incluyendo `security-gate.test.ts` (21 checks OWASP), `client-plans-flow.test.ts` (81 checks de flujo completo de 5 planes, OTP, aislamiento, ventanas de video y `weeklyPhases`), `plan-quotas.test.ts` (21 checks), `document-selection.test.ts`, `blog.test.ts`, `waitlist.test.ts`, `free-sessions.test.ts` y `db-clean.test.ts`.

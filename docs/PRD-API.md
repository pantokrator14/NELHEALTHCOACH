# PRD - API (Backend y Agentes de IA)
## Documento de Requerimientos del Producto - NELHEALTHCOACH API

---

## 1. Visión General

### 1.1 Propósito
La API de NELHEALTHCOACH es el núcleo del sistema, proporcionando:
- Procesamiento de datos de formularios de salud
- Agentes de IA especializados para planes personalizados
- Gestión de clientes y datos médicos
- Integración con servicios externos (AWS, OpenAI, etc.)

### 1.2 Alcance
- Backend para formulario, dashboard y landing
- Sistema de agentes de IA para salud y fitness
- API RESTful con autenticación y seguridad
- Procesamiento de documentos médicos

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Procesamiento seguro** de datos médicos sensibles
2. **Generación automatizada** de planes personalizados
3. **Escalabilidad** para múltiples coaches y clientes
4. **Confiabilidad** en recomendaciones de salud

### 2.2 Métricas de Éxito
- < 500ms de respuesta en endpoints críticos
- > 99.5% uptime
- < 0.1% de errores en procesamiento de IA
- Capacidad para 1000+ clientes concurrentes

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 15.5 (App Router)
- **Lenguaje**: TypeScript
- **Base de datos**: MongoDB 6.0 + Mongoose 8.0
- **IA**: Pipeline compuesto secuencial (3 fases + FASE 4 traducción) con DeepSeek V4 Flash (modelo principal vía @langchain/openai) + Gemini 2.5 Flash (análisis de texto médico extraído localmente) + LangGraph 1.2.8 (implementación alternativa de referencia)
- **Flujos asíncronos**: Cola propia sobre MongoDB (worker-on-poll) — sin Inngest Cloud
- **Pagos**: Stripe (connect, checkout, webhooks, portal)
- **Videollamadas**: LiveKit Cloud (WebRTC, grabación S3)
- **Transcripción**: Deepgram SDK 5.0
- **Seguridad**: FingerprintJS, bot detection, rate limiting MongoDB, guardrails personalizados, cifrado AES campo a campo
- **Storage**: AWS S3 para documentos y grabaciones
- **Email**: Resend + AWS SES (fallback)
- **Logging**: Sistema personalizado con contextos

### 3.2 Estructura de Directorios
```
apps/api/
├── src/
│   ├── app/
│   │   ├── api/                  # Endpoints REST
│   │   │   ├── auth/             # Autenticación (login, register, verify, reset)
│   │   │   ├── clients/          # CRUD clientes + upload docs + recomendaciones IA
│   │   │   ├── coaches/          # CRUD coaches + gestión
│   │   │   ├── recipes/          # CRUD recetas + análisis nutricional IA
│   │   │   ├── exercises/        # CRUD ejercicios
│   │   │   ├── video/            # LiveKit (rooms, token, send-invite, webhook, health)
│   │   │   ├── payments/         # Stripe (checkouts, connect, webhooks, portal, finances)
│   │   │   ├── leads/            # Captura de leads
│   │   │   ├── admin/            # Panel admin
│   │   │   └── inngest/          # Webhook de Inngest
│   │   ├── lib/                  # Lógica de negocio
│   │   │   ├── agents/           # Agentes LangGraph (6 nodos especializados)
│   │   │   │   ├── nodes/        # client-analyzer, medical-analyst, nutrition-planner, etc.
│   │   │   │   ├── tools/        # Herramientas de agentes
│   │   │   │   └── utils/        # LLM (DeepSeek, Gemini), prompt-builders
│   │   │   ├── security/         # Bot detection, rate limiter, guardrails, shield
│   │   │   ├── schemas/          # Schemas Zod
│   │   │   └── services/         # email-service, video-service, etc.
│   │   ├── models/               # Modelos Mongoose
│   │   └── inngest/              # Funciones asíncronas
│   └── middleware.ts             # Middleware principal
```

---

## 4. Funcionalidades Principales

### 4.1 Gestión de Clientes
- **CRUD completo** de perfiles de clientes
- **Almacenamiento seguro** de datos médicos
- **Historial** de sesiones y progreso
- **Documentos médicos** (PDF, imágenes)

### 4.2 Generación de Recomendaciones

La generación de recomendaciones es **100% asíncrona vía cola propia sobre MongoDB** (patrón *worker-on-poll* — sin Inngest ni servicios externos):

#### 4.2.0 Flujo Asíncrono (Cola Propia)

```
POST /api/clients/[id]/ai (o PUT regenerate_session)
   │ 1. Valida auth + ownership + sesión en draft (regen)
   │ 2. Crea job en colección `ai_jobs` (status: pending)
   ▼ 3. Responde 202 { status: 'queued', jobId } en <1s
   
GET /api/clients/[id]/ai  ← polling del frontend (cada 10s)
   │ 1. Reclama el job ATOMICAMENTE (findOneAndUpdate con condición)
   │ 2. Ejecuta el pipeline completo (worker): prepareAIInput → composite
   │    → FASE 3 lista de compras → FASE 4 traducción → cifrar → persistir
   │ 3. Marca el job done / failed (reintentos máx 3, lease 6 min)
   ▼ 4. Devuelve aiProgress con la sesión nueva → frontend pasa a 'ready'
```

- **Lease**: si el worker muere por timeout (Vercel corta a 300s), otro poll re-ejecuta el job (reintento automático)
- **Idempotencia**: dobles clics reutilizan el mismo job (índice único parcial en Mongo)
- **Zombies**: jobs con attempts agotados se abandonan (failed) y no bloquean nuevas peticiones
- **Errores**: tras 3 intentos fallidos, `aiProgress.generationError` se persiste y la UI lo muestra
- **Regeneración** (`PUT regenerate_session`): validación fail-fast (404 si no existe, 400 si no está en `draft`) → encola → el worker reemplaza la sesión (nuevo `sessionId`, `regenerationCount+1`, historial preservado)

#### 4.2.1 Pipeline Secuencial (3 fases + FASE 4 traducción)

Ejecutado por el worker (`executeGenerationForClient`). Implementa un pipeline de fases para evitar degradación de atención en prompts masivos:

1. **Preparación de datos**: Recolecta y descifra toda la información del cliente (datos personales, médicos, evaluaciones de salud, salud mental, documentos procesados, notas del coach, sesiones previas)
2. **Consulta a base de datos**: Obtiene recetas y ejercicios disponibles (hasta 80 de cada uno)
3. **Fase 1 — Analista Clínico**: Extrae biomarcadores de documentos médicos (`structuredMedicalAnalysis`) usando DeepSeek V4 Flash
4. **Fase 2 — Health Coach**: Genera plan de nutrición (7 días), ejercicios y hábitos usando la Fase 1 como contexto
5. **Fase 3 — Asistente Logístico**: Extrae y consolida la lista de compras del weeklyPlan (100% código cuando los títulos matchean la DB — sin LLM)
6. **FASE 4 — Traducción dinámica**: si el cliente tiene `language` ≠ es, traduce TODO el contenido visible (resúmenes, análisis médico, semanas, lista de compras, hábitos, checklist) al idioma del cliente mediante lotes JSON con DeepSeek (concurrencia limitada 2 + maxTokens dinámico)
7. **Modelo**: DeepSeek V4 Flash (vía `@langchain/openai`) con `temperature: 0.3`, `maxTokens: 16000`
8. **Respuesta**: JSON estructurado con:
   - `clientInsights`: summary + visión + riesgos + oportunidades + nivel
   - `nutritionPlan`: weeklyPlan (7 días × desayuno/almuerzo/cena) + shoppingList
   - `exercisePlan`: weeklyRoutine + equipment + notes personalizadas
   - `habitPlan`: toAdopt + toEliminate + trackingMethod + motivationTip
   - `alternatives` (obligatorio: ≥3 alternativas de recetas)

#### 4.2.2 Regeneración de Recomendaciones
- Usa el **mismo prompt compuesto** que la generación inicial (encolada como type='regen')
- Incluye sesiones previas como contexto (excluyendo la sesión actual)
- Preserva historial de regeneración (`regenerationCount`, `regenerationHistory`)
- Notas del coach opcionales para influir en la regeneración
- La sesión nueva se detecta en el frontend por el cambio de `currentSessionId`

#### 4.2.3 Criterios de Selección de Ejercicios
- **Por nivel**: `clientLevel` del ejercicio debe coincidir con el nivel de experiencia del cliente
- **Por contexto**: Acceso a gimnasio, equipo disponible en casa vs peso corporal
- **Por limitaciones**: Respeta limitaciones físicas del cliente
- **Por preferencias**: Considera tipos de ejercicio preferidos y disponibilidad horaria
- **Notas personalizadas**: Incluye recomendaciones de horario según disponibilidad del cliente

### 4.3 Procesamiento de Documentos

**Extracción LOCAL con dependencias propias** (sin AWS Textract, sin API de visión):

1. **Extracción de texto local** (`lib/document-extractor.ts` — `extractTextFromBuffer`):
   - **PDF** → `pdf-parse` v1 (pdfjs-dist interno con `disableWorker=true` — funciona en serverless/Vercel sin workers externos)
   - **DOCX** → `mammoth`
   - **Imágenes (JPG/PNG/WebP)** → `tesseract.js` OCR + `PaddleOCR` (`ppu-paddle-ocr` + `onnxruntime-node`) como fallback
   - Trunca a ~50k caracteres (límite de contexto de Gemini)
   - Devuelve `{ text, method, pages, confidence }` — `method` identifica qué extractor se usó
2. **Gemini como SECUNDARIO** (análisis, no extracción): `analyzeFileWithGemini` / `analyzeS3FileWithGemini` reciben el texto YA extraído localmente y lo analizan para extraer biomarcadores, resúmenes médicos y hallazgos. El path `inlineData` (visión directa sobre el PDF) fue **eliminado** — Gemini nunca ve el archivo, solo el texto.
3. **Caché de análisis** (`medical_document_cache`): los documentos ya analizados no se re-extraen ni re-analizan
- **Almacenamiento dual**: 
  - `medicalData.documents`: Metadatos del archivo (url, key, nombre, tipo, tamaño) + estado de análisis
  - `medicalData.processedDocuments`: Contenido extraído (encriptado) con confidence, pageCount, extractionStatus
- **Procesamiento**: la extracción local es síncrona y rápida; el análisis con Gemini se ejecuta dentro del pipeline de generación (con caché)
- **Actualización de estado**: Al completar/fallecer el análisis, se actualiza el estado del documento original
- **Limpieza en eliminación**: Al borrar un documento, también se eliminan sus `processedDocuments` asociados
- **Vista previa**: URLs prefirmadas GET (1 hora de expiración) para visualizar documentos desde el frontend

### 4.4 Sistema de Seguridad
- **Guardrails personalizados** para IA
- **Rate limiting** (10 req/10 seg)
- **Protección contra bots**
- **Validación de inputs** (XSS, SQLi)
- **Logging detallado** con contextos

---

## 5. Endpoints API

### 5.1 Autenticación (`/api/auth`)
- `POST /register` - Registro de coach
- `POST /login` - Inicio de sesión
- `POST /verify` - Verificación de email
- `POST /forgot-password` - Solicitar recuperación
- `POST /reset-password` - Restablecer contraseña
- `GET /me` - Perfil del usuario autenticado

### 5.2 Clientes (`/api/clients`)
- `GET /` - Listar clientes (con filtros y paginación)
- `GET /[id]` - Obtener detalle de cliente
- `POST /` - Crear cliente
- `PUT /[id]` - Actualizar cliente
- `DELETE /[id]` - Eliminar cliente
- `POST /[id]/upload` - Subir documentos a S3
- `DELETE /[id]/documents/[docId]` - Eliminar documento
- `POST /[id]/ai` - Encolar generación de recomendaciones IA → **202 queued** (el worker ejecuta en el polling)
- `PUT /[id]/ai` - Acciones de sesión: `regenerate_session` (encolado → 202), `update_checklist`, `approve_session`, `send_to_client`, `update_weekly_plan`, `import_session`, `generate_shopping_list`
- `GET /[id]/ai` - Obtener progreso IA + **worker-on-poll** (ejecuta jobs encolados)
- `GET /[id]/ai/[sessionId]/pdf` - Descargar PDF de recomendaciones (con traducción de recetas/ejercicios al idioma del cliente)
- `GET /[id]/sessions` - Historial de sesiones de IA

### 5.3 Coaches (`/api/coaches`)
- `GET /` - Listar coaches (con filtros y paginación)
- `GET /[id]` - Obtener detalle
- `PUT /[id]` - Actualizar coach
- `DELETE /[id]` - Eliminar coach
- `PUT /[id]/status` - Cambiar estado (activo/inactivo/suspendido)

### 5.4 Recetas (`/api/recipes`)
- `GET /` - Listar recetas (con filtros, búsqueda, paginación)
- `GET /[id]` - Obtener detalle
- `POST /` - Crear receta
- `PUT /[id]` - Actualizar receta
- `DELETE /[id]` - Eliminar receta
- `POST /analyze-nutrition` - Análisis nutricional por IA

### 5.5 Ejercicios (`/api/exercises`)
- `GET /` - Listar ejercicios (con filtros, búsqueda, paginación)
- `GET /[id]` - Obtener detalle
- `POST /` - Crear ejercicio
- `PUT /[id]` - Actualizar ejercicio
- `DELETE /[id]` - Eliminar ejercicio

### 5.6 Videollamadas LiveKit (`/api/video`)
- `POST /rooms` - Crear sala de videollamada
- `POST /token` - Generar token JWT temporal para cliente
- `POST /send-invite` - Enviar invitación por email con enlace único
- `POST /webhook` - Webhooks de eventos de sala (iniciada, grabación lista, terminada)
- `GET /health` - Health check del servicio

### 5.7 Pagos Stripe (`/api/payments`)
- `POST /create-coach-checkout` - Checkout de suscripción para coach
- `POST /create-client-checkout` - Checkout de pago único para cliente
- `POST /create-connect-account` - Cuenta Connect para coaches
- `GET /connect-account-status` - Estado de cuenta Connect
- `POST /connect-onboarding-link` - Link de onboarding Connect
- `POST /webhook` - Webhooks de Stripe
- `GET /portal` - Customer portal de Stripe
- `GET /session-price` - Precio de sesión
- `GET /finances` - Reporte financiero del coach

### 5.8 Leads (`/api/leads`)
- `POST /` - Capturar lead desde landing page

### 5.9 Administración (`/api/admin`)
- `GET /stats` - Estadísticas del sistema
- Endpoints de gestión global

### 5.10 Utilidades
- `GET /api/health` - Health check
- `POST /api/extract-text` - Extraer texto de documentos
- `GET /api/inngest` - Webhook de Inngest para tareas asíncronas

---

## 6. Flujos de Datos

### 6.1 Proceso de Evaluación Completa
```
Formulario → API → Base de datos → Agentes IA → Dashboard
     ↓           ↓          ↓           ↓           ↓
  Datos      Validación  Almacenamiento  Planes    Visualización
  cliente    seguridad   seguro          personal.  coach
```

### 6.2 Pipeline de Generación de Recomendaciones

#### Ruta Síncrona (API directa)
```
prepareAIInput() → generateCompositeRecommendation() (3 fases)
      ↓                       ↓
  Descifrar datos        Fase 1: Analista Clínico (biomarcadores)
  + extraer salud         → DeepSeek V4 Flash
  + extraer mental       Fase 2: Health Coach (nutrición, ejercicio, hábitos)
  + procesar docs         → DeepSeek V4 Flash
  + recetas/ejerc. DB    Fase 3: Asistente Logístico (shopping list)
                           → DeepSeek V4 Flash
                         → JSON estructurado con todos los planes
```

#### Ruta Asíncrona (Cola Propia — worker-on-poll) ← **ruta de producción**
```
POST /ai → enqueue job (ai_jobs: pending) → 202 queued
   ↓
GET /ai (polling del frontend) → claim atómico → worker ejecuta:
   prepareAIInput → generateCompositeRecommendation (3 fases, DeepSeek)
   → FASE 3 shopping list (código) → FASE 4 traducción (DeepSeek, lotes JSON)
   → cifrar → persistir en aiProgress → job done
   ↓
Frontend detecta sesión nueva → 'ready'
```

> **Nota**: existe además una implementación alternativa con **LangGraph multi-agente** (`inngest/functions/generate-recommendations.ts`, 6 agentes especializados) que quedó como referencia/deprecada — la generación en producción usa el pipeline compuesto secuencial con la cola propia (más rápido y probado).

### 6.3 Pipeline de Documentos
```
Subida archivo → S3 (PUT presigned) → PUT /upload → MongoDB → Extracción LOCAL → análisis Gemini (caché)
      ↓                                                        ↓                    ↓
  Frontend sube a S3                                    pdf-parse v1 (PDF)     analyzeFileWithGemini
  + confirma upload                                    mammoth (DOCX)          (texto ya extraído,
                                                       tesseract/Paddle (IMG)   sin inlineData)
                                                                               → processedDocuments
                                                                               (encriptado + confidence)
```

> La extracción de texto es 100% LOCAL (dependencias propias, sin coste por página ni AWS Textract). Gemini solo ANALIZA el texto extraído. Caché en `medical_document_cache` para no re-procesar documentos.

---

## 7. Consideraciones de Seguridad

### 7.1 Protección de Datos
- **Encriptación** en tránsito (HTTPS) y en reposo
- **Acceso mínimo necesario** a datos médicos
- **Auditoría** de todos los accesos
- **Backups automáticos** diarios

### 7.2 Guardrails de IA
- **Prevención** de recomendaciones peligrosas
- **Validación** de disclaimer médico obligatorio
- **Detección** de prompt injection
- **Fallbacks seguros** en caso de error

### 7.3 Cumplimiento Normativo
- **HIPAA-ready** arquitectura
- **Consentimiento explícito** para datos médicos
- **Retención limitada** de datos
- **Derecho al olvido** implementado

---

## 8. Escalabilidad

### 8.1 Escalado Horizontal
- **Contenedores Docker** para cada servicio
- **Load balancing** automático
- **Cache Redis** para datos frecuentes
- **CDN** para documentos estáticos

### 8.2 Monitoreo
- **Logs estructurados** por contexto
- **Métricas** de rendimiento agentes IA
- **Alertas** automáticas por errores
- **Dashboard** de salud del sistema

---

## 9. Roadmap

### Fase 1 (Completado)
- [x] API básica con CRUD clientes
- [x] Sistema de autenticación (registro, login, verificación, recuperación)
- [x] Agentes IA LangGraph (6 nodos especializados)
- [x] Pipeline secuencial 3 fases (síncrono) para recomendaciones
- [x] Sistema de seguridad: FingerprintJS, bot detection, rate limiting, guardrails
- [x] Integración con formulario y dashboard
- [x] Generación de recomendaciones con DeepSeek V4 Flash
- [x] Regeneración de sesiones con historial
- [x] Procesamiento de documentos con extracción LOCAL (pdf-parse v1 + mammoth + tesseract/PaddleOCR) + Gemini secundario (análisis de texto)
- [x] Cache de recetas y ejercicios para envío a IA
- [x] Encriptación campo a campo de datos médicos (AES)
- [x] Subida/descarga/eliminación de documentos con S3 + URLs prefirmadas
- [x] CRUD completo de recetas y ejercicios
- [x] Análisis nutricional por IA
- [x] Gestión de coaches (CRUD + estados + Stripe)
- [x] Videollamadas con LiveKit (salas, tokens, invitaciones, grabación, webhooks)
- [x] Transcripción de audio con Deepgram
- [x] Flujos asíncronos con cola propia (worker-on-poll sobre MongoDB, 202 queued, lease/reintentos)
- [x] Traducción dinámica FASE 4 del contenido IA (6 idiomas, lotes JSON con DeepSeek, PDF incluido)
- [x] Regeneración encolada (type='regen' en la cola)
- [x] Suite de tests TDD con perfiles desechables (192 checks rápidos + 67 E2E con LLM real + security gate OWASP)
- [x] Fixes de seguridad: 401 estructurado en requireCoachAuth, A10 (sin fugas de error.message), rate limits correctos
- [x] Sistema de pagos con Stripe (suscripciones, Connect, webhooks)
- [x] Captura de leads desde landing
- [x] Análisis de documentos con Gemini (texto extraído localmente; el path de visión inlineData fue eliminado)

### Fase 2 (En progreso)
- [ ] Sistema de notificaciones push
- [ ] API para dispositivos wearables
- [ ] Dashboard analítico avanzado
- [ ] Chat en tiempo real coach-cliente

### Fase 3 (Futuro)
- [ ] Machine learning predictivo
- [ ] Comunidad de coaches
- [ ] Marketplace de planes
- [ ] App móvil nativa

---

## 10. Consideraciones Técnicas

### 10.1 Dependencias Críticas
- **OpenAI/DeepSeek**: Disponibilidad API (generación + traducción FASE 4)
- **Google Gemini**: Análisis del texto médico extraído localmente (nunca recibe el archivo; sin API de visión)
- **Extracción local (sin coste por página)**: pdf-parse v1 (PDF), mammoth (DOCX), tesseract.js + PaddleOCR (imágenes)
- **AWS Services**: Costos de almacenamiento
- **MongoDB Atlas**: Base de datos + **cola de trabajos propia** (colección `ai_jobs`)
- **Vercel**: Límites de funciones (maxDuration 1-300s en Hobby; la cola está diseñada para ese límite con reintentos)

### 10.2 Plan de Contingencia
- **Fallbacks** para servicios externos
- **Cache agresivo** en fallos de IA
- **Modo degradado** sin funciones premium
- **Backups manuales** de datos críticos

---

## 11. Equipo y Responsabilidades

### 11.1 Roles
- **Backend Lead**: Arquitectura API y agentes IA
- **DevOps**: Infraestructura y despliegue
- **Security Engineer**: Guardrails y compliance
- **Data Engineer**: Procesamiento documentos

### 11.2 SLA
- **Disponibilidad**: 99.5% mensual
- **Soporte**: 24/7 para issues críticos
- **Actualizaciones**: Mensuales (security), Trimestrales (features)
- **Backups**: Diarios automáticos, retención 30 días

---

*Documento actualizado: Junio 2026*
*Versión: 4.1*
*Propietario: Equipo Backend NELHEALTHCOACH*
*Última actualización: 2026-08-12 — cola propia (worker-on-poll), traducción FASE 4, regeneración encolada, tests TDD (259 checks + security gate OWASP), despliegue Vercel Hobby*
# PRD - API (Backend y Agentes de IA)
## Documento de Requerimientos del Producto - NELHEALTHCOACH API

**Versión:** 1.3.0  
**Fecha:** Octubre 2026  
**Estado:** Producción / DeepSeek + Google Gemini Fallback + Deepgram

---

## 1. Visión General

### 1.1 Propósito
La API de NELHEALTHCOACH es el núcleo del sistema, proporcionando:
- Procesamiento y almacenamiento seguro de datos de salud y expedientes clínicos.
- Pipeline secuencial multi-agente de IA para la generación personalizada de planes cetogénicos/bajos en carbohidratos.
- Gestión de clientes, leads con precalificación de compromiso, coaches y facturación.
- Integración de videollamadas con LiveKit y transcripciones automáticas con Deepgram.

### 1.2 Alcance
- Backend serverless optimizado en Next.js 16 (App Router).
- Pipeline de IA especializado en salud metabólica.
- API RESTful con autenticación JWT, rate limiting y cifrado AES-256.
- Procesamiento y extracción local de documentos médicos (sin costos externos de OCR).

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Seguridad y Confidencialidad Médica**: Cumplimiento con RGPD Art. 9 y estándares de privacidad en salud.
2. **Razonamiento de Alta Precisión con IA**: Uso de **DeepSeek V4 Flash** como motor principal de razonamiento clínico y dietético, con fallback de alta disponibilidad a **Google Gemini 2.5 Flash**.
3. **Escalabilidad Asíncrona sin Servicios Terceros**: Cola propia sobre MongoDB (*worker-on-poll*) sin depender de Inngest Cloud ni incurrir en costes por mensaje.
4. **Calificación Efectiva de Prospectos**: Recepción y reporte del nivel de compromiso del lead al coach antes de la llamada de evaluación.

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (App Router)
- **Lenguaje**: TypeScript 5.8.3
- **Base de Datos**: MongoDB 6.0 + Mongoose 8.0
- **Modelos de IA**:
  - **Motor Primario**: **DeepSeek V4 Flash** (`deepseek-chat` / `deepseek-v4-flash`), consumido vía `@langchain/openai` como transport adapter OpenAPI hacia `https://api.deepseek.com/v1`.
  - **Motor Secundario / Fallback**: **Google Gemini 2.5 Flash** (`gemini-2.5-flash`), activado automáticamente ante indisponibilidad o timeout de DeepSeek, y utilizado para análisis de biomarcadores extraídos localmente.
  - **Transcripción de Audio**: **Deepgram SDK 5.0** (WebSocket & REST) para transcripción en tiempo real de consultas de LiveKit.
- **Flujos Asíncronos**: Cola propia sobre MongoDB (`ai_jobs`, patrón *worker-on-poll*, idempotencia, lease de 6 min y hasta 3 reintentos).
- **Pagos**: Stripe (Connect, Checkout, Webhooks, Portal).
- **Videollamadas**: LiveKit Cloud (WebRTC) con grabación en AWS S3.
- **Seguridad**: Cifrado AES-256 de campos sensibles, rate limiter sobre MongoDB y guardrails de seguridad médica.
- **Email**: Resend con fallback a AWS SES.

### 3.2 Estructura de Directorios
```
apps/api/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # Autenticación JWT y recuperación de contraseñas
│   │   │   ├── clients/      # Expedientes, upload S3 y endpoints de IA
│   │   │   ├── coaches/      # Gestión y perfiles de coaches
│   │   │   ├── leads/        # Captura de leads con nivel de compromiso (1-10)
│   │   │   ├── payments/     # Stripe Connect y Webhooks
│   │   │   └── video/        # LiveKit tokens y webhook de Deepgram
│   │   └── lib/
│   │       ├── agents/       # Agentes especializados y utilidades LLM
│   │       │   ├── nodes/    # client-analyzer, medical-analyst, nutrition-planner, etc.
│   │       │   └── utils/    # llm.ts (DeepSeek + Gemini fallback)
│   │       ├── security/     # Cifrado AES-256, rate limiting y validaciones
│   │       └── services/     # email-service.ts, pdf-service.ts, video-service.ts
│   └── models/               # Modelos Mongoose (Client, Coach, Lead, AIJob)
```

---

## 4. Funcionalidades Principales

### 4.1 Captura y Calificación de Leads (`POST /api/leads`)
- Valida los datos del contacto y recibe el campo `commitmentScore` (1 a 10).
- Registra el lead en MongoDB con visitorId de FingerprintJS verificado.
- Despacha un correo inmediato al coach asignado a través de Resend/SES detallando:
  - Nombre, email y teléfono del prospecto.
  - Objetivo principal de salud declarado.
  - **Nivel de compromiso evaluado (1-10)** para guiar la conversación previa de encaje.

### 4.2 Pipeline de IA Multi-Experto
1. **Fase 1: Extracción de Documentos**:
   - Extracción local de texto mediante `pdf-parse` (PDFs), `mammoth` (Word) y OCR local (imágenes).
   - Análisis de biomarcadores y rangos de referencia adaptados a metabolismo cetogénico (electrolitos, insulina, lípidos).
2. **Fase 2: Generación Secuencial de Planes**:
   - `client-analyzer`: Perfil integral del cliente y restricciones.
   - `medical-analyst`: Factores de riesgo médico y suplementación necesaria.
   - `nutrition-planner`: Plan nutricional personalizado en ciclos de 4 semanas.
   - `exercise-planner`: Rutinas progresivas de fuerza y acondicionamiento.
   - `habits-designer`: Hábitos circadianos y de gestión del estrés.
3. **Fase 3: Lista de Compras**: Deduplicación por ingredientes y organización por categorías de alimentos reales.
4. **Fase 4: Traducción Dinámica**: Localización automática de todo el contenido generado al idioma natal del cliente (`es`, `en`, `fr`, `it`, `pt`, `de`).

### 4.3 Generación de Documentos PDF
- Generación de reportes clínicos en PDF mediante streams binarios (`Uint8Array`) compatibles con Next.js 16.
- Inclusión automática de disclaimers médicos obligatorios en el encabezado y pie de página en el idioma del paciente.

---

## 5. Medidas de Seguridad y Privacidad
- **Garantía Contractual de No Entrenamiento**: Las llamadas a DeepSeek y Google Gemini utilizan endpoints API corporativos con cláusula de confidencialidad y sin reentrenamiento público.
- **Desinfección de Prompts**: Los prompts eliminan datos de identificación directa innecesarios (nombres completos, números de documento) antes de enviar las métricas fisiológicas al modelo.
- **Audit Logs**: Trazabilidad completa de las solicitudes y cambios de estado en `ai_jobs`.

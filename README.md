# 🏥 NELHEALTHCOACH - Plataforma Integral de Coaching de Salud

<div align="center">

![NELHEALTHCOACH](https://img.shields.io/badge/NELHEALTHCOACH-Health%20Platform-blueviolet)
![Monorepo](https://img.shields.io/badge/Architecture-Monorepo-success)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0.0-47A248)
![AWS](https://img.shields.io/badge/AWS-Services-FF9900)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)
![LangGraph](https://img.shields.io/badge/Agents-LangGraph-00D4AA)

**Una plataforma moderna para coaching de salud con agentes de IA multi-experto y flujos de trabajo asíncronos**

</div>

## 📋 Tabla de Contenidos

- [✨ Características Principales](#-características-principales)
- [🤖 Sistema de Agentes de IA](#-sistema-de-agentes-de-ia)
- [🔄 Flujos Asíncronos (Inngest)](#-flujos-asíncronos-inngest)
- [🏗️ Arquitectura del Proyecto](#️-arquitectura-del-proyecto)
- [🚀 Aplicaciones](#-aplicaciones)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [⚙️ Configuración y Desarrollo](#️-configuración-y-desarrollo)
- [🔧 Scripts Disponibles](#️-scripts-disponibles)
- [🌐 Despliegue](#-despliegue)
- [🤝 Contribución](#-contribución)
- [📄 Licencia](#-licencia)

## ✨ Características Principales

### 🎯 **Plataforma Integral**
- **Monorepo** con múltiples aplicaciones independientes
- **Arquitectura modular** y escalable
- **Compartición de tipos** entre aplicaciones
- **Desarrollo simultáneo** de todas las apps

### 🏥 **Funcionalidades de Salud**
- **Gestión de pacientes** y seguimiento de salud
- **Formularios inteligentes** para evaluación médica
- **Dashboard analítico** para coaches con recomendaciones de IA
- **Landing page** profesional y atractiva
- **API RESTful** para integraciones

### 🤖 **IA Multi-Experto (LangGraph)**
- **6 agentes especializados** que colaboran en la generación de recomendaciones
- **Perfil completo del cliente** compartido entre todos los agentes
- **Análisis médico** con interpretación de laboratorios y hallazgos clínicos
- **Planificación nutricional** personalizada considerando suplementos existentes
- **Plan de ejercicios** adaptado al nivel y condiciones del cliente
- **Diseño de hábitos** progresivos y sostenibles
- **Validación de calidad** con loop de revisión automático
- **Análisis de documentos PDF** (laboratorios, estudios) directamente con Gemini

### 🔄 **Flujos Asíncronos**
- **Inngest** para procesamiento de tareas en background
- **Transcripción de sesiones** con Deepgram
- **Generación de recomendaciones** como proceso asíncrono
- **Reintento automático** ante fallos

### 🔒 **Seguridad y Confiabilidad**
- **Autenticación JWT** para usuarios
- **Detección de bots** con reglas de fingerprinting (User-Agent, headers, Client Hints)
- **Rate limiting** basado en MongoDB
- **Protección contra prompt injection** a nivel HTTP
- **Guardrails** para agentes de IA
- **Cifrado de datos** sensibles
- **Subida segura de archivos** a AWS S3
- **Security headers** configurados en Next.js

#### 🛡️ Bot Detection — Notas Importantes

El bot detector se aplica a todas las rutas críticas (`/api/auth/*`, `/api/clients/*`, `/api/health/*`, etc.) y analiza:

| Check | Qué detecta | Por qué es seguro |
|---|---|---|
| `User-Agent` vacío/corto | Scripts sin identidad | Los navegadores siempre envían un UA largo |
| `Accept-Language` ausente | Scripts sin localización | Los navegadores siempre lo envían |
| `Accept-Encoding` sin gzip/br | Scripts sin compresión | Los navegadores siempre soportan compresión |
| `Connection: close` | Scripts sin keep-alive | Los navegadores usan `keep-alive` |
| `Accept: */*` **sin** `Sec-Fetch-*` | Scripts genéricos | Se omite si hay headers `Sec-Fetch-*` (todos los navegadores) o Client Hints (Chromium) |

> **⚠️ Nota**: El check `Accept: */*` se omite cuando la petición tiene headers `Sec-Fetch-*` (`sec-fetch-dest`, `sec-fetch-mode`, `sec-fetch-site`) o Client Hints (`sec-ch-ua`). Los headers `Sec-Fetch-*` los envían **todos** los navegadores modernos (Chrome, Firefox, Safari, Edge), evitando falsos positivos tanto en desarrollo localhost como en producción con cualquier navegador.

## 🤖 Sistema de Agentes de IA

La plataforma utiliza **LangGraph** para orquestar un grafo de 6 agentes especializados que generan recomendaciones de salud personalizadas:

```
┌─────────────────────────────────────────────────────────┐
│                    START                                 │
└────────────────────────┬────────────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Client Analyzer   │ ← Analiza perfil completo del cliente
              └────────┬────────────┘
                       │ (paralelo)
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
              │   Recipe Matcher    │ ← Busca recetas compatibles
              └────────┬────────────┘
                       ▼
              ┌─────────────────────┐
              │ Shopping List Gen   │ ← Genera lista de compras
              └────────┬────────────┘
                       ▼
              ┌─────────────────────┐
              │ Quality Validator   │ ← Valida y revisa calidad
              └────────┬────────────┘
                       │
              ┌────────┴─────────┐
              │  needsRevision?  │───Sí──► Re-planifica nutrición
              └────────┬─────────┘
                       │ No
                       ▼
                    END
```

### Agentes

| Agente | Función |
|---|---|
| **Client Analyzer** | Analiza el perfil completo del cliente (datos personales, médicos, evaluación de salud, salud mental, documentos, notas del coach, sesiones previas) |
| **Medical Analyst** | Interpreta laboratorios, hallazgos clínicos, estudios recomendados y suplementos (solo si la nutrición no cubre la necesidad) |
| **Nutrition Planner** | Diseña plan nutricional personalizado considerando suplementos existentes para evitar duplicación |
| **Exercise Planner** | Crea plan de ejercicios adaptado al nivel, condiciones y objetivos del cliente |
| **Habit Designer** | Diseña hábitos progresivos y sostenibles basados en el perfil del cliente |
| **Quality Validator** | Valida la coherencia y calidad de todas las recomendaciones con loop de revisión |

### Perfil Completo del Cliente

Todos los agentes reciben **TODO** los datos del cliente mediante `formatFullClientProfile()`:
- `personalData` — datos demográficos y antropométricos
- `medicalData` — condiciones médicas, laboratorios, suplementos actuales
- `healthAssessment` — evaluación de salud del formulario
- `mentalHealth` — evaluación de salud mental
- `processedDocuments` — documentos PDF analizados por Gemini (laboratorios, estudios)
- `previousSessions` — sesiones anteriores de recomendaciones
- `coachNotes` — notas del coach

### LLM: Google Gemini

La plataforma utiliza **Google Gemini** como único modelo de lenguaje:
- **OpenAI Compatible API** (`/v1beta/openai/`) para generación de texto
- **Native REST API** (`/v1beta`) para análisis de PDFs con `inlineData`
- Manejo robusto de errores: SAFETY, MAX_TOKENS, RECITATION
- Sin dependencias de DeepSeek ni AWS Textract

## 🔄 Flujos Asíncronos (Inngest)

La plataforma usa **Inngest** para manejar tareas pesadas en background:

| Función | Descripción |
|---|---|
| `generate-recommendations` | Genera recomendaciones de IA para un cliente (grafo LangGraph + análisis PDF con Gemini) |
| `process-transcription` | Procesa transcripciones de sesiones de coaching |
| `transcribe-session` | Transcribe audio de sesiones usando Deepgram |

## 🏗️ Arquitectura del Proyecto

```
NELHEALTHCOACH/
├── 📁 apps/              # Aplicaciones principales
│   ├── 🏠 landing/      # Página de inicio
│   ├── 📝 form/         # Formularios de salud
│   ├── 📊 dashboard/    # Panel de control con IA
│   └── 🔌 api/          # API backend + agentes IA
├── 📁 packages/         # Paquetes compartidos
│   └── 📦 types/       # Tipos TypeScript compartidos
└── 📄 package.json     # Configuración del monorepo
```

## 🚀 Aplicaciones

### 1. **🏠 Landing Page** (`apps/landing`)
- **Propósito**: Presentación pública de la plataforma
- **Tecnologías**: Next.js, React, Tailwind CSS
- **Características**:
  - Diseño responsive y moderno
  - Información sobre servicios de coaching
  - Formulario de contacto
  - Call-to-action para registro

### 2. **📝 Formularios de Salud** (`apps/form`)
- **Propósito**: Captura de datos de pacientes
- **Tecnologías**: Next.js, React Hook Form, Yup
- **Características**:
  - Formularios validados en tiempo real
  - Subida de documentos médicos
  - Validación de datos de salud
  - Experiencia de usuario optimizada

### 3. **📊 Dashboard de Coaching** (`apps/dashboard`)
- **Propósito**: Gestión y análisis para coaches
- **Tecnologías**: Next.js, MongoDB, AWS S3, Google Gemini
- **Características**:
  - Visualización de pacientes
  - Seguimiento de progreso
  - Análisis estadísticos
  - Gestión de documentos
  - Panel administrativo
  - **Recomendaciones de IA** con modal interactivo
  - **Análisis médico** con tablas de laboratorios y hallazgos clínicos
  - Manejo de errores de Gemini con mensajes descriptivos

### 4. **🔌 API Backend** (`apps/api`)
- **Propósito**: Servicios backend, lógica de negocio y agentes de IA
- **Tecnologías**: Next.js API Routes, MongoDB, AWS S3, Google Gemini, LangGraph, Inngest
- **Características**:
  - Autenticación JWT
  - CRUD de pacientes y usuarios
  - **Agentes de IA con LangGraph** (6 nodos especializados)
  - **Análisis de PDFs con Gemini** (laboratorios, estudios médicos)
  - **Flujos asíncronos con Inngest**
  - **Transcripción de audio con Deepgram**
  - Envío de emails con Resend
  - Almacenamiento en AWS S3
  - **Seguridad**: bot detection, rate limiting, prompt injection protection, guardrails

## 🛠️ Stack Tecnológico

### **Frontend**
- **⚛️ React 19.1.0** - Biblioteca UI
- **🚀 Next.js 15.5.4** - Framework React con SSR
- **📘 TypeScript 5.8.3** - Tipado estático
- **🎨 Tailwind CSS 3.3.0** - Framework CSS utility-first
- **📋 React Hook Form** - Gestión de formularios
- **✅ Yup** - Validación de esquemas

### **Backend**
- **🗄️ MongoDB 6.0.0** - Base de datos NoSQL
- **🐘 Mongoose 8.0.0** - ODM para MongoDB
- **🔐 JSON Web Tokens** - Autenticación
- **🔒 CryptoJS** - Cifrado de datos
- **📧 Resend** - Envío de emails
- **📄 Multer** - Manejo de uploads

### **IA y Agentes**
- **🤖 Google Gemini** - Modelo de lenguaje principal (texto + análisis de PDFs)
- **🕸️ LangGraph 1.2.8** - Orquestación de agentes multi-experto
- **🔄 Inngest 4.2.1** - Flujos de trabajo asíncronos
- **🎙️ Deepgram SDK 5.0.0** - Transcripción de audio

### **Infraestructura Cloud**
- **☁️ AWS SDK** - Integración con servicios AWS
- **📦 AWS S3** - Almacenamiento de archivos
- **🚀 Vercel** - Despliegue y hosting

### **Herramientas de Desarrollo**
- **📦 Turbo** - Build system para monorepos
- **🔄 Concurrently** - Ejecución paralela de scripts
- **🧹 ESLint** - Linting de código
- **🎯 TypeScript** - Chequeo de tipos

## 📁 Estructura del Proyecto

```bash
NELHEALTHCOACH/
├── 📂 apps/                    # Aplicaciones principales
│   ├── 📂 api/                # API Backend + IA
│   │   ├── 📂 pages/          # Rutas API de Next.js
│   │   ├── 📂 src/
│   │   │   ├── 📂 app/
│   │   │   │   ├── 📂 lib/           # Utilidades y configuraciones
│   │   │   │   │   ├── 📂 agents/    # Agentes LangGraph
│   │   │   │   │   │   ├── 📂 nodes/ # Nodos del grafo
│   │   │   │   │   │   ├── 📂 tools/ # Herramientas de agentes
│   │   │   │   │   │   └── 📂 utils/ # Utilidades (LLM, prompts)
│   │   │   │   │   ├── 📂 security/  # Bot detection, rate limiter, guardrails
│   │   │   │   │   └── 📂 ...        # Otros servicios
│   │   │   │   └── 📂 inngest/       # Funciones asíncronas
│   │   │   └── 📂 models/        # Modelos de MongoDB
│   │   └── 📂 middleware/      # Middleware de autenticación
│   ├── 📂 dashboard/          # Panel de control
│   │   ├── 📂 components/    # Componentes React
│   │   ├── 📂 pages/         # Páginas de Next.js
│   │   └── 📂 styles/        # Estilos Tailwind
│   ├── 📂 form/              # Formularios
│   │   ├── 📂 components/    # Componentes de formulario
│   │   ├── 📂 schemas/       # Esquemas de validación
│   │   └── 📂 pages/         # Páginas de formularios
│   └── 📂 landing/           # Landing page
│       ├── 📂 components/    # Componentes de marketing
│       ├── 📂 sections/      # Secciones de la landing
│       └── 📂 public/        # Assets estáticos
├── 📂 packages/              # Paquetes compartidos
│   └── 📂 types/            # Tipos TypeScript compartidos
│       └── 📄 index.ts      # Exportación de tipos
├── 📄 package.json          # Configuración del monorepo
├── 📄 turbo.json           # Configuración de Turbo
├── 📄 .env                 # Variables de entorno
├── 📄 .gitignore          # Archivos ignorados por Git
└── 📄 vercel.json         # Configuración de Vercel
```

## ⚙️ Configuración y Desarrollo

### **Prerrequisitos**
- Node.js 18+
- npm 9+
- MongoDB (local o Atlas)
- Cuenta AWS (para S3)
- API Key de Google Gemini (obligatorio para IA)

### **Instalación**

```bash
# Clonar el repositorio
git clone <repository-url>
cd NELHEALTHCOACH

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

### **Variables de Entorno**
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/nelhealthcoach

# JWT
JWT_SECRET=tu_secreto_jwt

# AWS
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=tu_bucket_s3

# Email
RESEND_API_KEY=tu_api_key_resend

# Google Gemini (obligatorio para IA)
GEMINI_API_KEY=tu_api_key_gemini

# Inngest (para flujos asíncronos)
INNGEST_EVENT_KEY=tu_inngest_event_key
INNGEST_SIGNING_KEY=tu_inngest_signing_key

# Deepgram (para transcripción de audio)
DEEPGRAM_API_KEY=tu_deepgram_api_key
```

## 🔧 Scripts Disponibles

### **Desarrollo**
```bash
# Iniciar todas las aplicaciones en desarrollo
npm run dev:all

# Iniciar aplicación específica
npm run dev:landing    # Landing page
npm run dev:form       # Formularios
npm run dev:dashboard  # Dashboard
npm run dev:api        # API backend
```

### **Build y Producción**
```bash
# Build de todas las aplicaciones
npm run build

# Iniciar producción (después de build)
# En cada aplicación individual:
cd apps/[app-name]
npm start
```

### **Seguridad**
```bash
# Verificar configuración de seguridad
npm run security:check
```

### **Mantenimiento**
```bash
# Limpiar repositorios .git anidados (post-install)
npm run postinstall

# Linting (en cada aplicación)
cd apps/[app-name]
npm run lint
```

## 🌐 Despliegue

### **Vercel (Recomendado)**
El proyecto está configurado para despliegue en Vercel:

1. Conectar repositorio en Vercel
2. Configurar variables de entorno en el dashboard
3. Vercel detectará automáticamente las configuraciones de Next.js

### **Configuración Vercel**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev:all",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### **Despliegue Manual**
```bash
# Build para producción
npm run build

# Desplegar en tu servidor
# Copiar la carpeta .next de cada aplicación
```

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre un Pull Request**

### **Guías de Estilo**
- Usar TypeScript para todo el código nuevo
- Seguir convenciones de Next.js y React
- Documentar componentes y funciones
- Escribir tests cuando sea posible

---

<div align="center">

### **Desarrollado con ❤️ para ayudar a la humanidad**

**👨‍💻 Autor:** [pantokrator14](https://github.com/pantokrator14)
**📧 Contacto:** [juliusjosepham@proton.me]
**🌐 Sitio Web:** [Próximamente]

[![Star History Chart](https://api.star-history.com/svg?repos=pantokrator14/NELHEALTHCOACH&type=Date)](https://star-history.com/#pantokrator14/NELHEALTHCOACH&Date)

</div>

---

> **💡 Nota:** Este proyecto está en activo desarrollo. Las características pueden cambiar y mejorar continuamente.

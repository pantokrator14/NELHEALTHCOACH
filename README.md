# 🏥 NELHEALTHCOACH - Plataforma Integral de Coaching de Salud

<div align="center">

![NELHEALTHCOACH](https://img.shields.io/badge/NELHEALTHCOACH-Health%20Platform-blueviolet)
![Monorepo](https://img.shields.io/badge/Architecture-Monorepo-success)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0.0-47A248)
![AWS](https://img.shields.io/badge/AWS-Services-FF9900)

**Una plataforma moderna para coaching de salud con múltiples aplicaciones integradas**

</div>

## 📋 Tabla de Contenidos

- [✨ Características Principales](#-características-principales)
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
- **Dashboard analítico** para coaches
- **Landing page** profesional y atractiva
- **API RESTful** para integraciones

### 🔒 **Seguridad y Confiabilidad**
- **Autenticación JWT** para usuarios
- **Cifrado de datos** sensible
- **Subida segura de archivos** a AWS S3
- **Procesamiento de documentos** con AWS Textract
- **Envío de emails** con AWS SES y Resend

## 🏗️ Arquitectura del Proyecto

```
NELHEALTHCOACH/
├── 📁 apps/              # Aplicaciones principales
│   ├── 🏠 landing/      # Página de inicio
│   ├── 📝 form/         # Formularios de salud
│   ├── 📊 dashboard/    # Panel de control
│   └── 🔌 api/          # API backend
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
- **Tecnologías**: Next.js, MongoDB, AWS S3
- **Características**:
  - Visualización de pacientes
  - Seguimiento de progreso
  - Análisis estadísticos
  - Gestión de documentos
  - Panel administrativo

### 4. **🔌 API Backend** (`apps/api`)
- **Propósito**: Servicios backend y lógica de negocio
- **Tecnologías**: Next.js API Routes, MongoDB, AWS
- **Características**:
  - Autenticación JWT
  - CRUD de pacientes y usuarios
  - Procesamiento de documentos con AWS Textract
  - Envío de emails con AWS SES/Resend
  - Almacenamiento en AWS S3

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

### **Infraestructura Cloud**
- **☁️ AWS SDK** - Integración con servicios AWS
- **📦 AWS S3** - Almacenamiento de archivos
- **✉️ AWS SES** - Servicio de emails
- **🔍 AWS Textract** - Procesamiento de documentos
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
│   ├── 📂 api/                # API Backend
│   │   ├── 📂 pages/          # Rutas API de Next.js
│   │   ├── 📂 lib/           # Utilidades y configuraciones
│   │   ├── 📂 models/        # Modelos de MongoDB
│   │   └── 📂 middleware/    # Middleware de autenticación
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
- Cuenta AWS (opcional para funcionalidades cloud)

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

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

---

<div align="center">

### **Desarrollado con ❤️ para transformar el coaching de salud**

**👨‍💻 Autor:** [pantokrator14](https://github.com/pantokrator14)  
**📧 Contacto:** [juliusjosepham@proton.me]
**🌐 Sitio Web:** [Próximamente]

[![Star History Chart](https://api.star-history.com/svg?repos=pantokrator14/NELHEALTHCOACH&type=Date)](https://star-history.com/#pantokrator14/NELHEALTHCOACH&Date)

</div>

---

> **💡 Nota:** Este proyecto está en activo desarrollo. Las características pueden cambiar y mejorar continuamente.


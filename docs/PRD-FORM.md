# PRD - Formulario de Evaluación y Contratación
## Documento de Requerimientos del Producto - NELHEALTHCOACH Form

**Versión:** 1.5.0  
**Fecha:** Noviembre 2026  
**Estado:** Producción / Cumplimiento RGPD Art. 9 & Arbitraje JAMS

---

## 1. Visión General

### 1.1 Propósito
El formulario de evaluación de NELHEALTHCOACH (`apps/form`) captura de forma segura y estructurada el historial clínico de pacientes (tanto desde enlaces personalizados de coaches como en sincronía con la estructura compartida con `ClientHealthForm` dentro del portal de cliente del Dashboard), diseñado para:
- **Recopilar de forma segura y exhaustiva** el historial médico, hábitos de vida, salud emocional, biomarcadores y metas del cliente.
- **Formalizar el contrato de coaching** mediante consentimiento explícito y desacoplado (RGPD Art. 9).
- **Establecer protecciones legales sólidas** mediante asunción de riesgo médico, avisos de IA y arbitraje vinculante.
- **Nutrir el pipeline de IA multi-agente** para la generación de recomendaciones nutricionales y físicas personalizadas.

### 1.2 Alcance
- Formulario multi-paso interactivo (6 pasos) auditado bajo WCAG 2.1 AA con vinculación `id <-> htmlFor` en el 100% de campos y switches.
- Bloqueo total de indexación de motores de búsqueda vía `robots.txt` (`Disallow: /`) y meta `noindex, nofollow, noarchive`.
- Optimización de Core Web Vitals con atributo `sizes` en todos los logos e imágenes.
- Subida segura de analíticas médicas y documentos a AWS S3.
- Paso final de Contrato y Consentimiento con casillas desacopladas.
- Soporte multilingüe completo (6 idiomas: `es`, `en`, `fr`, `it`, `pt`, `de`) incluyendo preguntas actualizadas en `MentalHealthStep` y diccionario i18n sincronizado.
- Detección de bots y control de sesiones.

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Completitud y Rigor Clínico**: Recopilación del 100% de datos biomédicos necesarios para la personalización de planes de nutrición ancestral, evolutiva y optimización metabólica.
2. **Blindaje Regulatorio (RGPD Art. 9 / CCPA)**: Ningún dato de salud sensible se procesa sin consentimiento explícito, granular e inequívoco.
3. **Protección Civil de la Empresa**: Exoneración médica (*Hold Harmless*) ante omisiones de los pacientes y limitación de disputas a arbitraje individual (JAMS).
4. **Experiencia de Usuario Transparente**: Información clara sobre el uso de inteligencia artificial asistida (DeepSeek y Google Gemini).

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (Pages Router)
- **Runtime & UI**: React 19.1.0, TypeScript 5.8.3
- **Gestión de Formularios**: React Hook Form con Yup Schemas
- **Estilos**: Tailwind CSS
- **i18n**: `react-i18next` en 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) con detección automática
- **Almacenamiento de Documentos**: Subida a AWS S3 mediante URLs prefirmadas
- **Seguridad**: FingerprintJS condicionado a consentimiento, desinfección de inputs y validación estricta

### 3.2 Estructura de Directorios
```
apps/form/
├── src/
│   ├── components/
│   │   ├── ContractStep.tsx      # Paso 6: Contrato y casillas desacopladas
│   │   ├── CookieBanner.tsx      # CMP de cookies adaptado
│   │   ├── PersonalDataStep.tsx  # Datos personales e idioma
│   │   ├── MedicalDataStep.tsx   # Historial clínico y documentos
│   │   ├── MentalHealthStep.tsx  # Salud emocional y hábitos diarios
│   │   └── ObjectivesStep.tsx    # Objetivos y compromiso
│   ├── lib/
│   │   ├── i18n.ts               # Diccionarios de traducción y contrato completo
│   │   └── validation.ts         # Esquemas de validación Yup
│   └── pages/
│       ├── index.tsx             # Flujo principal multi-paso
│       ├── request-session.tsx   # Solicitud de sesión
│       └── thank-you.tsx         # Página de confirmación
```

---

## 4. Estructura del Formulario Multi-Paso

### 4.1 Paso 1: Datos Personales e Idioma
- Información básica: Nombre, email, teléfono, dirección explícita (`Calle, Ciudad, País`), zona horaria (`timezone` capturada silenciosamente desde `Intl.DateTimeFormat`) y fecha de nacimiento.
- Antropometría: Altura, peso actual, peso objetivo.
- Idioma de preferencia (`language`): Configura el idioma de entrega de recomendaciones generadas y traducidas dinámicamente (FASE 4).

### 4.2 Paso 2: Estilo de Vida y Actividad Física
- Frecuencia, tipo e intensidad de ejercicio.
- Acceso a equipamiento (gimnasio, casa, solo peso corporal).
- Rutina diaria de sueño, trabajo y horarios de comidas.

### 4.3 Paso 3: Historial Médico y Fisiológico
- Condiciones crónicas (resistencia a la insulina, diabetes, hipertensión, etc.).
- Lesiones previas, cirugías, alergias e intolerancias alimentarias.
- Medicación y suplementación habitual.
- Subida de analíticas sanguíneas recientes (PDF, imágenes) para extracción local + OCR fallback y análisis de biomarcadores.

### 4.4 Paso 4: Salud Mental, Estrés y Hábitos
- Calidad de sueño, niveles de estrés diurno, biorritmos, red de apoyo y energía.
- Motivaciones y barreras de cambio de hábitos.

### 4.5 Paso 5: Objetivos y Preferencias
- Objetivos principales (composición corporal, flexibilidad metabólica, reducción de inflamación).
- Preferencias nutricionales (nutrición ancestral, enfoque evolutivo, flexibilidad metabólica, ayuno intermitente).

### 4.6 Paso 6: Contrato de Coaching y Consentimiento Desacoplado (`ContractStep.tsx`)
Paso obligatorio de formalización contractual y cumplimiento de privacidad:
1. **Visualizador de Contrato Completo**: 14 secciones articuladas que rigen la relación:
   - **Naturaleza de la Relación y Asunción de Riesgo Médico (Sección 3)**: Exoneración (*Hold Harmless*) a favor de NELHEALTHCOACH LLC.
   - **Tratamiento de Datos de Salud e IA (Sección 6)**: Uso de **DeepSeek y Google Gemini como respaldo**, sin reentrenamiento público y con supervisión humana del asesor.
   - **Tope de Responsabilidad (Sección 11)** y **Arbitraje Individual Vinculante JAMS (Sección 12)** en Riverside County, California.
2. **Casillas Desacopladas Obligatorias (RGPD Art. 9)** y **Casilla Opcional de Marketing** sin premarcado.
3. **Firma Digital y Trazabilidad**: Confirmación por email, timestamp y registro en MongoDB.

---

## 5. Medidas de Seguridad y Privacidad
- **Cifrado de Datos Sensibles**: Cifrado AES-256 en reposo para datos de salud.
- **Validación Yup Estricta**: Bloquea el envío si las casillas legales obligatorias no están marcadas explícitamente.
- **Audit Trail**: Registro inmutable de la versión del contrato y consentimientos otorgados junto con el perfil del cliente en MongoDB.

# PRD - Formulario de Evaluación y Contratación
## Documento de Requerimientos del Producto - NELHEALTHCOACH Form

**Versión:** 1.4.0  
**Fecha:** Octubre 2026  
**Estado:** Producción / Cumplimiento RGPD Art. 9 & Arbitraje JAMS

---

## 1. Visión General

### 1.1 Propósito
El formulario de evaluación de NELHEALTHCOACH es el punto neurálgico de onboarding clínico y contratación de pacientes, diseñado para:
- **Recopilar de forma segura y exhaustiva** el historial médico, hábitos de vida, biomarcadores y metas del cliente.
- **Formalizar el contrato de coaching** mediante consentimiento explícito y desacoplado (RGPD Art. 9).
- **Establecer protecciones legales sólidas** mediante asunción de riesgo médico, avisos de IA y arbitraje vinculante.
- **Nutrir el pipeline de IA multi-agente** para la generación de recomendaciones nutricionales y físicas personalizadas.

### 1.2 Alcance
- Formulario multi-paso interactivo (6 pasos) auditado bajo WCAG 2.1 AA con vinculación id <-> htmlFor en el 100% de campos y switches.
- Bloqueo total de indexación de motores de búsqueda vía robots.txt (Disallow: /) y meta noindex, nofollow, noarchive.
- Optimización de Core Web Vitals con atributo sizes="192px" en todos los logos e imágenes.
- Subida segura de analíticas médicas y documentos a AWS S3.
- Paso final de Contrato y Consentimiento con casillas desacopladas.
- Soporte multilingüe completo (6 idiomas: ES, EN, FR, IT, PT, DE).
- Detección de bots y control de sesiones.

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Completitud y Rigor Clínico**: Recopilación del 100% de datos biomédicos necesarios para la personalización de planes cetogénicos/bajos en carbohidratos.
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
- **i18n**: react-i18next en 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) con detección automática
- **Almacenamiento de Documentos**: Subida a AWS S3 mediante URLs prefirmadas
- **Seguridad**: FingerprintJS condicionado a consentimiento, desinfección de inputs y validación estricta

### 3.2 Estructura de Directorios
```
apps/form/
├── src/
│   ├── components/
│   │   ├── ContractStep.tsx      # Paso 6: Contrato y casillas desacopladas
│   │   ├── CookieBanner.tsx      # CMP de cookies adaptado
│   │   ├── Step1Personal.tsx
│   │   ├── Step2Lifestyle.tsx
│   │   ├── Step3Medical.tsx
│   │   ├── Step4MentalHabits.tsx
│   │   └── Step5Goals.tsx
│   ├── lib/
│   │   ├── i18n.ts               # Diccionarios de traducción y contrato completo
│   │   ├── store.ts              # Estado global del formulario
│   │   └── validation.ts         # Esquemas de validación Yup
│   └── pages/
│       ├── index.tsx             # Flujo principal multi-paso
│       └── thank-you.tsx         # Página de confirmación
```

---

## 4. Estructura del Formulario Multi-Paso

### 4.1 Paso 1: Datos Personales e Idioma
- Información básica: Nombre, email, teléfono, fecha de nacimiento.
- Antropometría: Altura, peso actual, peso objetivo.
- Idioma de preferencia (`language`): Configura el idioma de entrega del plan generado por IA.

### 4.2 Paso 2: Estilo de Vida y Actividad Física
- Frecuencia, tipo e intensidad de ejercicio.
- Acceso a equipamiento (gimnasio, casa, solo peso corporal).
- Rutina diaria de sueño, trabajo y horarios de comidas.

### 4.3 Paso 3: Historial Médico y Fisiológico
- Condiciones crónicas (resistencia a la insulina, diabetes, hipertensión, etc.).
- Lesiones previas, cirugías, alergias e intolerancias alimentarias.
- Medicación y suplementación habitual.
- Subida de analíticas sanguíneas recientes (PDF, imágenes) para extracción de biomarcadores.

### 4.4 Paso 4: Salud Mental, Estrés y Hábitos
- Calidad de sueño, niveles de estrés diurno, biorritmos y energía.
- Motivaciones y barreras de cambio de hábitos.

### 4.5 Paso 5: Objetivos y Preferencias
- Objetivos principales (composición corporal, flexibilidad metabólica, reducción de inflamación).
- Preferencias nutricionales (enfoque cetogénico, low-carb, ayuno intermitente).

### 4.6 Paso 6: Contrato de Coaching y Consentimiento Desacoplado (`ContractStep.tsx`)
Paso obligatorio de formalización contractual y cumplimiento de privacidad:
1. **Visualizador de Contrato Completo**: 14 secciones articuladas que rigen la relación:
   - **Naturaleza de la Relación y Asunción de Riesgo Médico (Sección 3)**: El cliente asume voluntariamente el riesgo de los cambios de hábitos y declara haber consultado a su médico. Cláusula de exoneración (*Hold Harmless*) a favor de NELHEALTHCOACH LLC por omisiones en el cuestionario.
   - **Tratamiento de Datos de Salud e IA (Sección 6)**: Declaración expresa del uso de **DeepSeek y Google Gemini como respaldo**, con garantía de no reentrenamiento público y supervisión humana del asesor.
   - **Tope de Responsabilidad (Sección 11)**: Límite cuantitativo fijado en la cantidad mayor entre $50 USD o los pagos de los últimos 6 meses.
   - **Arbitraje Vinculante y Renuncia a Demandas Colectivas (Sección 12)**: Resolución de disputas mediante negociación previa de 45 días y arbitraje individual vinculado a **JAMS** en Riverside County, California (Class Action Waiver).
2. **Aviso Informativo sobre IA**:
   - Bloque destacado con cifrado AES-256, garantía contractual de privacidad y confirmación de que ninguna recomendación se emite sin validación del coach.
3. **Casillas Desacopladas de Consentimiento Obligatorias (RGPD Art. 9)**:
   - **Checkbox 1**: Aceptación de los Términos de Servicio y la Política de Privacidad.
   - **Checkbox 2**: Consentimiento explícito para el tratamiento de datos de salud y categorías especiales de datos personales.
   - **Checkbox 3**: Reconocimiento y renuncia informada al derecho de desistimiento por ejecución inmediata del servicio digital (Art. 103 TRLGDCU / FTC).
4. **Casilla Opcional**:
   - **Checkbox 4**: Consentimiento para comunicaciones comerciales, artículos del blog y novedades (no obligatoria para contratar).
5. **Firma Digital y Trazabilidad**:
   - Confirmación por email, timestamp y registro del hash de consentimiento en la base de datos.

---

## 5. Medidas de Seguridad y Privacidad
- **Cifrado de Datos Sensibles**: Cifrado AES-256 en reposo para datos de salud.
- **Validación Yup Estricta**: No permite avanzar al envío si las casillas legales obligatorias no están marcadas de forma explícita y consciente (sin casillas pre-marcadas).
- **Audit Trail**: Registro inmutable de la versión del contrato y consentimientos otorgados junto con el perfil del cliente en MongoDB.

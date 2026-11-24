# PRD - Dashboard
## Documento de Requerimientos del Producto - NELHEALTHCOACH Dashboard

**Versión:** 1.5.0  
**Fecha:** Noviembre 2026  
**Estado:** Producción / Portal de Clientes, 5 Planes Comerciales y Cumplimiento AB 5, FTC & JAMS

---

## 1. Visión General

### 1.1 Propósito
El Dashboard de NELHEALTHCOACH (`apps/dashboard`) integra dos experiencias diferenciadas bajo un mismo sistema de autenticación JWT basado en roles (`coach`, `admin`, `client`):
- **Centro de operaciones para Coaches/Admin**:
  - **Gestión integral de clientes**: Expedientes médicos cifrados, filtros por plan contratado, notas de evolución y control de cupos por plan (`plan_quotas`).
  - **Supervisión de IA**: Visualización, edición, regeneración, aprobación y envío de planes generados por el pipeline de IA (DeepSeek & Google Gemini), incluidos análisis de fotos de recetas.
  - **Consultas por videollamada**: Salas seguras con consentimiento previo de grabación y transcripción en tiempo real (LiveKit + Deepgram).
  - **Gestión financiera y suscripciones**: Cobros vía Stripe Connect y cancelación transparente de periodos de prueba conforme a la FTC.
  - **Onboarding blindado de coaches**: Contrato de contratista independiente bajo la legislación de California (AB 5).
- **Portal personalizado para Clientes (`/dashboard`, `/dashboard/plans`, `/dashboard/my-profile`)**:
  - **Inicio (`/dashboard`)**: Seguimiento de plan activo, ruta del programa, evolución de biomarcadores en planes multi-mes, estado de recomendaciones de salud, datos de contacto del asesor asignado y agenda de videollamadas con apertura automática 15 min antes.
  - **Planes (`/dashboard/plans`)**: Comparación alineada de los 5 planes comerciales con cupos en tiempo real, renovación y cambio de plan con acumulación automática de créditos.
  - **Perfil de Salud (`/dashboard/my-profile`)**: Historial médico completo, carga de estudios clínicos y visualización en **solo lectura + descarga PDF** de recomendaciones aprobadas por el asesor.

### 1.2 Alcance
- Panel protegido con autenticación JWT y roles (`coach`, `admin`, `client`), con login unificado (`/login`) y autoregistro de clientes con OTP de 6 dígitos (`/register/client`).
- Sidebar adaptativo por rol: para clientes muestra **Inicio**, **Planes**, módulos condicionales en Plan 2/Plan 3 (**Recetas**, **Ejercicios** y **Escáner Nutricional**), enlace discreto externo al **Centro de Ayuda** (`${LANDING_URL}/ayuda` con `rel="noopener noreferrer"`, también visible para coaches), acceso único de perfil inferior (`Ver mi perfil`) y **Cerrar Sesión** (6 idiomas).
- Módulos de clientes, recetas (incluyendo análisis de imagen por IA), ejercicios, finanzas y perfil profesional con estados de carga skeleton pulsantes (Principio Anti-AI).
- Blindaje de indexación con `robots.txt` (`Disallow: /`) y meta `noindex, nofollow, noarchive`.
- Accesibilidad WCAG 2.1 AA con navegación modal por Escape, `focus-visible` y emparejamiento `id`/`htmlFor`.
- Optimización de rendimiento eliminando advertencias de Next Image con `sizes` y cabeceras de seguridad HTTP con permisos LiveKit.
- Salas de videollamada interactivas (`/video/join`) con bloqueo temporal previo al inicio de la sesión (`403 SESSION_NOT_YET_STARTED`) y consentimiento previo para transcripción con Deepgram.
- Portal de gestión de suscripciones de coaches con cancelación en un clic (`/dashboard/trial/cancel`).

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Eficiencia del Profesional**: Reducir en un 60% el tiempo de elaboración de planes mediante borradores de IA de alta precisión supervisados por humanos.
2. **Autogestión y Conversión del Cliente**: Permitir registro verificado, pago único con Stripe, llenado de historial médico y acceso transparente al seguimiento según el plan contratado.
3. **Control Operativo de Cupos**: Dar al administrador/coach control directo de disponibilidad por plan para evitar sobreventa de sesiones 1 a 1 o acompañamientos.
4. **Blindaje Laboral (California AB 5) y Civil**: Salvaguardar a NELHEALTHCOACH LLC frente a reclamos laborales o por mala praxis mediante contrato de contratista independiente e indemnización cruzada.
5. **Cumplimiento de Telecomunicaciones**: Consentimiento informado explícito previo a cualquier grabación de voz o transcripción automatizada.

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (Pages Router)
- **Runtime & UI**: React 19.1.0, TypeScript 5.8.3
- **Estilos**: Tailwind CSS
- **i18n**: `react-i18next` en 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) con diccionarios completos tanto para coach como para todo el portal de cliente (`clientSidebar`, `clientPortal`, `clientPlans`, `clientProfile`, `clientRegister`, `videoJoin`, `planCatalog`)
- **Videollamadas**: LiveKit Cloud (WebRTC) + Deepgram para transcripción en tiempo real + control de ventana de acceso en `/video/join`
- **Pagos y Facturación**: Stripe Checkout (planes comerciales), Stripe Connect & Stripe Billing
- **Exportación de Documentos**: `jsPDF` + `jspdf-autotable` (ficha clínica) y descarga directa de PDF clínico/recomendaciones desde la API (`pdfkit`)

### 3.2 Estructura de Directorios
```
apps/dashboard/
├── src/
│   ├── components/
│   │   ├── CoachContractStep.tsx              # Contrato del coach con blindaje AB 5
│   │   ├── dashboard/
│   │   │   ├── AIRecommendationsModal.tsx     # Visor IA (coach editable / cliente solo lectura + PDF + 3 o 4 semanas)
│   │   │   ├── ClientHealthForm.tsx           # Historial clínico embebido en portal de cliente
│   │   │   ├── ClientProfileView.tsx          # Vista unificada de perfil (modos 'coach' y 'client')
│   │   │   ├── Layout.tsx                     # Sidebar condicional por rol (coach/admin vs client)
│   │   │   ├── VideoCallRoom.tsx              # Pre-call Consent Gate para Deepgram
│   │   │   ├── RecipeModal.tsx                # CRUD recetas + análisis de foto por IA
│   │   │   └── ExerciseModal.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── api.ts                             # Cliente API tipado (portal, planes, cupos, checkout, PDF)
│   │   ├── client-hooks.ts                    # Hooks JWT (rol, admin, clientId) y localStorage seguro
│   │   ├── locale.ts                          # Localización de fechas y campos de planes comerciales
│   │   └── i18n.ts                            # Diccionarios i18n en 6 idiomas
│   └── pages/
│       ├── dashboard/
│       │   ├── index.tsx                      # Inicio (Coach Dashboard / Portal de Cliente en 4 estados)
│       │   ├── plans.tsx                      # Comparador de 5 planes, cupos y renovación/cambio
│       │   ├── my-profile.tsx                 # Perfil de salud del cliente autenticado
│       │   ├── clients/                       # Listado con filtro por plan, control de cupos y perfil clínico
│       │   ├── trial/
│       │   │   └── cancel.tsx                 # Cancelación en 1 clic (FTC / California ARL)
│       │   ├── finances.tsx
│       │   ├── exercises/
│       │   └── recipes/
│       ├── register/
│       │   ├── index.tsx                      # Registro de coaches
│       │   └── client.tsx                     # Registro de clientes con verificación OTP de 6 dígitos
│       └── video/
│           └── join.tsx                       # Sala pública de videollamada con estados bloqueado/activo/finalizado
```

---

## 4. Módulos y Requerimientos Funcionales

### 4.1 Portal del Cliente (`index.tsx`, `plans.tsx`, `my-profile.tsx`, `register/client.tsx`)
1. **Registro y Verificación (`/register/client`)**:
   - Validación de contraseña robusta (12+ caracteres) y verificación por código OTP de 6 dígitos enviado por correo (15 min de vigencia).
   - Preserva plan preseleccionado (`pendingSelectedPlanId`), salvo en *Consulta 1 a 1*, que permite reserva directa sin crear cuenta obligatoria.
2. **Pantalla de Inicio (`/dashboard` para rol `client`)**:
   - **Estado 1 (Sin plan pagado)**: Resumen de plan preseleccionado (respetando disponibilidad de cupos) o enlace a `/dashboard/plans`, junto a la tarjeta del asesor asignado.
   - **Estado 2 (Consulta 1 a 1 sin formulario)**: Acceso directo al agendamiento de la sesión diagnóstica y toggle opcional de historial de salud.
   - **Estado 3 (Plan con historial pendiente)**: Renderiza `ClientHealthForm` integrado para desbloquear el expediente y la generación de recomendaciones.
   - **Estado 4 (Programa activo o completado)**:
     - **Cinta de finalización**: Solo aparece cuando `programCompleted` es `true` (duración del ciclo cumplida y sin videollamadas pendientes).
     - **Tarjeta de Plan Activo**: Duración, evaluaciones consumidas vs permitidas, soporte WhatsApp, videollamadas o seguimiento digital, ruta del programa y módulo de comparativa de biomarcadores en planes multi-mes.
     - **Mis Videollamadas**: Lista cronológica de sesiones incluidas en el plan (calculadas desde la inscripción o confirmadas por el coach). El botón *Unirse a Videollamada* permanece en gris deshabilitado hasta 15 minutos antes de la hora programada.
     - **Tu Perfil de Salud**: Indica si las recomendaciones de salud están en análisis por el asesor o ya aprobadas, con acceso directo (`Ir a perfil →`) sin duplicar enlaces redundantes.
     - **Tu Asesor**: Datos públicos del coach y botón único de WhatsApp (oculto en Consulta 1 a 1).
3. **Comparador y Renovación (`/dashboard/plans`)**:
   - Cuadrícula alineada responsive (5 columnas en escritorio) con disponibilidad en tiempo real, botón *Cupos no disponibles* cuando el plan está lleno y flujo Stripe Checkout para contratación, renovación o cambio de plan.

### 4.2 Registro y Contratación de Coaches (`CoachContractStep.tsx`)
Flujo de afiliación con 12 secciones legales adaptadas a la jurisprudencia de California:
- **Blindaje de Contratista Independiente (Sección 1)**: Conforme al test ABC / AB 5 de California, el coach declara operar como negocio autónomo e independiente. NELHEALTHCOACH LLC actúa exclusivamente como proveedor SaaS.
- **Tratamiento de Datos y Prohibición de IA Externa (Sección 5)**: Prohibición expresa de exportar datos de clientes a herramientas externas no autorizadas.
- **Deber de Supervisión Humana**: Toda recomendación generada por IA debe ser revisada y aprobada personalmente por el coach antes de hacerse visible al cliente.
- **Indemnización Cruzada Total (Sección 9) y Arbitraje JAMS (Sección 10)**: Defensa e indemnización a NELHEALTHCOACH LLC y arbitraje individual vinculante en Riverside County, California.

### 4.3 Gestión de Clientes y Cupos por Plan (`pages/dashboard/clients/index.tsx`)
- Filtro de clientes por plan contratado (`planId`) para agrupar el seguimiento según programa.
- Panel de control de cupos por plan (solo admin / Manuel Martínez) para pausar o limitar inscripciones activas por producto.

### 4.4 Pre-Call Consent Gate y Ventana de Videollamadas (`VideoCallRoom.tsx`, `video/join.tsx`)
- Bloqueo preventivo antes de 15 minutos previos a la cita (`not_started` con fecha programada y hora exacta de apertura).
- Pantalla modal obligatoria de consentimiento expreso para transcripción en tiempo real con **Deepgram** antes de entrar al stream WebRTC de LiveKit (California Cal. Penal Code § 632 y RGPD Art. 6/9).

### 4.5 Visor de Recomendaciones (`AIRecommendationsModal.tsx`)
- **Modo Coach**: Edición de textos, notas, checklist, regeneración y botones de *Aprobar* y *Enviar al cliente*. Incluye aviso médico visible en los 6 idiomas.
- **Modo Cliente (`readOnlyClientMode`)**: Cabecera *"Recomendaciones de Salud"*, badge *"Solo lectura • Descarga en PDF"*, botón de descarga PDF directa conectado al backend, ocultamiento de controles de edición/IA y soporte para bloques de **3 semanas (`weeklyPhases`)** en el Reto Tres NEL o estándar de **4 semanas** en los demás planes.

### 4.5b Bibliotecas de Solo Lectura y Escáner Nutricional (`/dashboard/recipes`, `/dashboard/exercises`, `/dashboard/scanner`)
- **Bibliotecas Plan 2 y Plan 3:** Plan 2 accede en solo lectura a 15 recetas y 15 ejercicios publicados; Plan 3 accede al catálogo completo en solo lectura; los demás planes quedan ocultos en el sidebar y redirigidos a `/dashboard`.
- **Escáner Nutricional (`/dashboard/scanner`):** Carga o captura fotográfica (JPG, PNG, WEBP, GIF hasta 10 MB) con barra de cuota mensual (5/mes Plan 2; 30/mes Plan 3) y desglose nutricional por porción y perfil energético metabólico.
- **Agenda Dual-Timezone Coach (`SessionScheduler.tsx`):** Programación desde el perfil del cliente con vista previa simultánea de horario del coach y horario del cliente.

### 4.6 Cancelación Transparente de Periodo de Prueba (`/dashboard/trial/cancel`)
Cumplimiento estricto con FTC (*Click to Cancel Rule*) y California ARL mediante cancelación en línea en un solo clic.

---

## 5. Medidas de Seguridad y Calidad
- **Autenticación JWT Robusta y Aislamiento RBAC**: Separación estricta entre rutas de `coach`/`admin` y `client`; el cliente solo accede a sus propios datos y sesiones de recomendaciones con estado `approved` o `sent`.
- **Zero Ingestion Leak**: Ningún dato sensible sale hacia LLMs no contractuales.
- **Verificación Continua**: Validado con `tsc --noEmit` (0 errores), `eslint` (0 errores / 0 warnings) y `next build` en producción.

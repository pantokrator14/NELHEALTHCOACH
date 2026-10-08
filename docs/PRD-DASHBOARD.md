# PRD - Dashboard
## Documento de Requerimientos del Producto - NELHEALTHCOACH Dashboard

**Versión:** 1.3.0  
**Fecha:** Octubre 2026  
**Estado:** Producción / Cumplimiento California AB 5, FTC & JAMS

---

## 1. Visión General

### 1.1 Propósito
El Dashboard de NELHEALTHCOACH es el centro de operaciones profesional para los coaches de salud, permitiendo:
- **Gestión integral de clientes**: Expedientes médicos, hábitos y seguimiento de progreso.
- **Supervisión de IA**: Visualización, ajuste y validación humana de planes generados por el pipeline de IA (DeepSeek & Google Gemini).
- **Consultas por videollamada**: Salas seguras con consentimiento previo de grabación y transcripción en tiempo real (LiveKit + Deepgram).
- **Gestión financiera y suscripciones**: Cobros vía Stripe Connect y cancelación transparente de periodos de prueba conforme a la FTC.
- **Onboarding blindado de coaches**: Contrato de contratista independiente bajo la legislación de California (AB 5).

### 1.2 Alcance
- Panel protegido con autenticación JWT y roles.
- Módulos de clientes, recetas, ejercicios, finanzas y perfil profesional.
- Flujo de registro de coaches con contrato legal blindado.
- Salas de videollamada interactivas con transcripción asistida por Deepgram.
- Portal de gestión de suscripciones de coaches con cancelación en un clic.

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Eficiencia del Profesional**: Reducir en un 60% el tiempo de elaboración de planes mediante borradores de IA de alta precisión supervisados por humanos.
2. **Blindaje Laboral (California AB 5)**: Salvaguardar a NELHEALTHCOACH LLC frente a reclamos de reclasificación laboral o subordinación de coaches.
3. **Protección Civil e Indemnización**: El coach indemniza totalmente a la plataforma ante reclamaciones por mala praxis o lesiones de sus clientes.
4. **Cumplimiento de Telecomunicaciones**: Consentimiento informado explícito previo a cualquier grabación de voz o transcripción automatizada.

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (Pages Router)
- **Runtime & UI**: React 19.1.0, TypeScript 5.8.3
- **Estilos**: Tailwind CSS
- **i18n**: react-i18next en 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) con diccionarios modulares
- **Videollamadas**: LiveKit Cloud (WebRTC) + Deepgram para transcripción en tiempo real
- **Pagos y Facturación**: Stripe Connect & Stripe Billing
- **Exportación de Documentos**: jsPDF + jspdf-autotable con disclaimers médicos integrados

### 3.2 Estructura de Directorios
```
apps/dashboard/
├── src/
│   ├── components/
│   │   ├── CoachContractStep.tsx    # Contrato del coach con blindaje AB 5
│   │   ├── dashboard/
│   │   │   ├── AIRecommendationsModal.tsx  # Visor de IA con supervisión humana
│   │   │   ├── VideoCallRoom.tsx           # Pre-call Consent Gate para Deepgram
│   │   │   ├── RecipeModal.tsx
│   │   │   └── ExerciseModal.tsx
│   │   └── ui/
│   ├── lib/
│   │   └── i18n.ts                  # Diccionarios i18n y contrato de coaches
│   └── pages/
│       ├── dashboard/
│       │   ├── clients/             # Expedientes de clientes
│       │   ├── trial/
│       │   │   └── cancel.tsx       # Cancelación en 1 clic (FTC / California ARL)
│       │   ├── finances.tsx
│       │   └── recipes.tsx
│       └── register/                # Registro de coaches
```

---

## 4. Módulos y Requerimientos Funcionales

### 4.1 Registro y Contratación de Coaches (`CoachContractStep.tsx`)
Flujo de afiliación con 12 secciones legales adaptadas a la jurisprudencia de California:
- **Blindaje de Contratista Independiente (Sección 1)**: Conforme al test ABC / AB 5 de California, el coach declara operar como negocio autónomo e independiente, con autonomía de horarios, métodos y criterios, siendo el único responsable de sus impuestos (Formulario 1099 o equivalente local). NELHEALTHCOACH LLC actúa exclusivamente como proveedor de software y plataforma SaaS.
- **Tratamiento de Datos y Prohibición de IA Externa (Sección 5)**: El coach actúa como encargado del tratamiento. Se le prohíbe taxativamente copiar, exportar o alimentar datos de salud de clientes en herramientas de IA externas no autorizadas (como chats personales de ChatGPT o Claude), bajo responsabilidad legal directa.
- **Deber de Supervisión Humana**: Toda recomendación originada en el motor de IA (DeepSeek / Gemini) debe ser revisada y aprobada personalmente por el coach antes de ser compartida con el cliente.
- **Indemnización Cruzada Total a Favor de la Plataforma (Sección 9)**: El coach se compromete a defender e indemnizar a NELHEALTHCOACH LLC y a sus directivos ante cualquier demanda de terceros derivada de negligencia profesional, pautas erróneas, lesiones físicas sufridas por clientes o falsedad en sus credenciales.
- **Arbitraje Individual Vinculante JAMS (Sección 10)**: Las controversias se resuelven mediante arbitraje individual bajo las reglas de JAMS en Riverside County, California, con renuncia a demandas colectivas laborales.

### 4.2 Pre-Call Consent Gate para Grabación y Transcripción (`VideoCallRoom.tsx`)
Cumplimiento estricto de las leyes de grabación de telecomunicaciones de dos partes (California Cal. Penal Code § 632 y RGPD Art. 6/9):
- Antes de ingresar al stream de audio/vídeo de LiveKit, se presenta una pantalla modal obligatoria donde los participantes deben marcar su consentimiento expreso para la transcripción en tiempo real mediante **Deepgram**.
- Se notifica que las notas generadas serán utilizadas con fines de seguimiento de coaching y no para comercialización ni reentrenamiento público.

### 4.3 Cancelación Transparente de Periodo de Prueba (`/dashboard/trial/cancel`)
Cumplimiento estricto con las directrices de la FTC (*Click to Cancel Rule*) y el Estatuto de Renovación Automática de California (California ARL):
- Permite a los coaches cancelar su suscripción o periodo de prueba de 30 días de forma inmediata, en línea, mediante un solo clic.
- Sin llamadas obligatorias, sin formularios de retención agresivos y con confirmación inmediata por email.

### 4.4 Visor de Recomendaciones de IA (`AIRecommendationsModal.tsx`)
- Muestra los planes generados por los agentes de IA (alimentados por DeepSeek y Google Gemini).
- Incluye aviso médico visible en los 6 idiomas: *"Estas recomendaciones son asistidas por IA y no sustituyen el criterio médico. Requieren validación del coach antes de su implementación"*.
- Permite al coach editar, añadir notas o regenerar secciones antes de publicar el plan al cliente.

---

## 5. Medidas de Seguridad y Calidad
- **Autenticación JWT Robusta**: Verificación de tokens y revocación en cierre de sesión.
- **Zero Ingestion Leak**: Ningún dato sensible de clientes sale del ecosistema de la plataforma hacia LLMs no contractuales.
- **Build y Pruebas**: Verificado con `next build` en producción con código 0 y 0 errores de ESLint.

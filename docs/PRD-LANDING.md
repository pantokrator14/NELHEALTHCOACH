# PRD - Landing Page
## Documento de Requerimientos del Producto - NELHEALTHCOACH Landing

**Versión:** 1.3.0  
**Fecha:** Octubre 2026  
**Estado:** Producción / Cumplimiento Legal y Conversión Inteligente

---

## 1. Visión General

### 1.1 Propósito
La landing page de NELHEALTHCOACH es la cara pública del negocio, diseñada para:
- **Presentar** la propuesta de valor del coaching de salud integral con enfoque evolutivo y metabólico.
- **Calificar y captar leads** comprometidos mediante un embudo de contacto inteligente con filtro de compromiso.
- **Establecer confianza y transparencia** mediante cumplimiento regulatorio de vanguardia (RGPD, CCPA/CPRA, arbitraje JAMS y políticas claras).
- **Proporcionar navegación contextual e informada** hacia las aplicaciones del ecosistema (Blog, Formulario de Onboarding y Dashboard).

### 1.2 Alcance
- Sitio web estático de alto rendimiento optimizado con Next.js 16.
- Formulario de captación interactivo con pre-calificación de compromiso (escala 1 a 10).
- Presentación de metodología, servicios y biblioteca científica (Blog Preview).
- Suite integral de páginas legales en 6 idiomas (`/politica-privacidad`, `/terminos-condiciones`, `/aviso-legal`, `/cookies`, `/reembolsos`).
- Navbar adaptativo dinámico para navegación legal y retorno a la portada.
- Consent Management Platform (CMP) de cookies con consentimiento previo y respeto de señales GPC.

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Calidad de Prospectos**: Filtrar y captar prospectos con alto nivel de compromiso (score >= 7) para maximizar la efectividad del tiempo del coach.
2. **Conversión Informada**: Guiar a prospectos en fases prematuras hacia recursos educativos (Blog y redes sociales).
3. **Blindaje Regulatorio**: Mitigar riesgos de multas o sanciones (RGPD, ePrivacy, CCPA/CPRA, FTC).
4. **Experiencia Omnicanal Fluida**: Transición natural entre la landing, el blog y el formulario de onboarding.

### 2.2 Métricas de Éxito
- **Tasa de conversión de leads calificados**: > 5% visitantes a leads con compromiso verificado.
- **Calidad de leads**: > 80% de leads agendados con score >= 7.
- **Cumplimiento legal**: 100% de consentimientos previos registrados antes de cargar scripts analíticos.
- **Performance Web**: Core Web Vitals en verde (LCP < 2.5s, CLS < 0.1, FID/INP < 100ms).

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (Pages Router)
- **Runtime & UI**: React 19.1.0, TypeScript 5.8.3
- **Estilos**: Tailwind CSS (paleta corporativa blanca/azul, tipografía accesible)
- **i18n**: react-i18next con 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) + detección de idioma del navegador
- **Gestión de Consentimiento**: `CookieBanner` con `useSyncExternalStore` (sin parpadeos ni violaciones de ESLint), almacenamiento con caducidad (180 días) y soporte de Global Privacy Control (GPC)
- **Seguridad**: FingerprintJS condicionado a consentimiento previo de analítica para mitigar bots
- **Hosting**: Vercel

### 3.2 Estructura de Directorios
```
apps/landing/
├── src/
│   ├── components/
│   │   ├── common/         # CookieBanner (CMP), modales, botones
│   │   ├── layout/         # Layout general, Navbar adaptativo, Footer, LegalPage
│   │   └── sections/       # Hero, Metodo, SobreMi, BlogPreview, ContactFormSection
│   ├── lib/
│   │   ├── fingerprint.ts  # Detección condicional anti-bots
│   │   ├── i18n.ts         # Diccionarios i18n (6 idiomas)
│   │   └── legalContent.ts # Textos normativos completos (Privacidad, Términos, Cookies, etc.)
│   ├── pages/
│   │   ├── aviso-legal.tsx
│   │   ├── cookies.tsx
│   │   ├── index.tsx
│   │   ├── politica-privacidad.tsx
│   │   ├── reembolsos.tsx
│   │   └── terminos-condiciones.tsx
│   └── styles/             # globals.css
```

---

## 4. Secciones y Componentes de la Landing Page

### 4.1 Header / Navbar Adaptativo
- **Logo corporativo**:
  - En la landing page (`/`): Clic realiza scroll suave a la sección `#inicio`.
  - En cualquier página legal: Clic redirige a `/` para volver a la portada.
- **Navegación Desktop contextual**:
  - **En portada (`/`)**: Muestra secciones principales (`Inicio`, `Método`, `Sobre mí`, `Blog`, `Secreto`, `Contacto`).
  - **En páginas legales**: Conmuta automáticamente para mostrar accesos directos a todas las páginas legales (`Privacidad`, `Términos`, `Aviso Legal`, `Cookies`, `Reembolsos`), resaltando la página activa y ofreciendo un botón destacado **`← Volver al Inicio`**.
- **Comportamiento visual (isOverHero)**:
  - Sobre hero azul: Logo blanco y tipografía blanca/azul claro.
  - Sobre secciones blancas: Logo azul con sombra sutil y tipografía gris/azul corporativo.
- **Navegación Móvil**: Menú desplegable hamburguesa que replica la navegación contextual y se cierra automáticamente al navegar.

### 4.2 Hero Section
- Carrusel de impacto con propuesta de valor clara y llamadas a la acción primarias hacia el formulario y el método.
- Adaptación responsive multi-resolución.

### 4.3 Metodo NEL & Sobre Mí
- Explicación de la metodología holística basada en biología evolutiva, nutrición cetogénica/baja en carbohidratos y sincronización circadiana.

### 4.4 Blog Preview Section
- Muestra una vista previa de la biblioteca científica y artículos del blog (`apps/blog`), educando al usuario antes de la contratación.

### 4.5 Formulario de Contacto y Calificador de Compromiso
- **Paso 1: Datos de Contacto**: Nombre, Email, Teléfono, Objetivo de salud.
- **Paso 2: Evaluación de Compromiso (Score 1 a 10)**:
  - Escala interactiva del 1 al 10 donde el usuario declara su nivel de determinación para transformar su salud.
- **Filtro Inteligente de 3 Pasos (Gate de Compromiso)**:
  - **Si el compromiso es >= 7**: El prospecto califica exitosamente y envía su solicitud.
  - **Si el compromiso es < 7**: Se presenta un aviso pedagógico y no excluyente (*"Cuéntame de ti, me gustaría conocer tus objetivos..."*), sugiriendo que puede ser prematuro para un proceso 1 a 1 intensivo, pero ofreciendo **dos caminos**:
    1. **Reconsiderar**: Botón para volver y ajustar sus respuestas con mayor reflexión.
    2. **Explorar Recursos**: Enlace a artículos del blog y redes sociales sin frustración.
  - **Notificación por Correo al Coach**: El correo que recibe el coach incluye el score exacto de compromiso (1-10) del prospecto para preparar la llamada inicial.

### 4.6 Páginas Legales Integradas (`LegalPage.tsx`)
Plantilla unificada, profesional y responsive para todas las políticas:
1. **Política de Privacidad (`/politica-privacidad`)**: Cumplimiento RGPD Art. 9, CCPA/CPRA *Notice at Collection*, no venta/intercambio de datos ("Do Not Sell or Share"), transferencias internacionales (DPF/SCCs), retención y garantías de IA (**DeepSeek y Google Gemini**, sin reentrenamiento público).
2. **Términos de Servicio (`/terminos-condiciones`)**: Ley de California, Arbitraje individual vinculante administrado por **JAMS** (Riverside County, CA) con renuncia a demandas colectivas (*Class Action Waiver*) y tope cuantitativo de responsabilidad.
3. **Aviso Legal (`/aviso-legal`)**: Datos registrales de NELHEALTHCOACH LLC (33450 Shifting Sands Trail, Cathedral City, CA 92234).
4. **Política de Cookies (`/cookies`)**: Distinción entre cookies esenciales y analíticas, almacenamiento HTML5 y señales GPC.
5. **Política de Reembolsos y Desistimiento (`/reembolsos`)**: Cancelación y excepciones de desistimiento por ejecución inmediata (Art. 103 TRLGDCU / FTC).

### 4.7 Cookie Banner (Consent Management Platform)
- Banner inferior con fondo blanco, acentos azules y botones corporativos.
- Bloqueo por defecto de analítica hasta que el usuario pulse "Aceptar todas" o configure preferencias.
- Persistencia por 180 días con evento global `nhc_consent_updated`.

---

## 5. Pruebas y Aseguramiento de Calidad
- **Linting**: Cumplimiento estricto de ESLint sin llamados directos a `setState` en efectos (`useSyncExternalStore` y event listeners).
- **Compilación**: Verificado con `next build` en producción con código 0.
- **i18n**: Paridad idiomática completa en los 6 idiomas soportados.

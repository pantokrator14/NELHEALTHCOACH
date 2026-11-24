# PRD - Landing Page
## Documento de Requerimientos del Producto - NELHEALTHCOACH Landing

**Versión:** 1.5.0  
**Fecha:** Noviembre 2026  
**Estado:** Producción / Catálogo de 5 Planes, Cupos en Vivo y Cumplimiento Legal

---

## 1. Visión General

### 1.1 Propósito
La landing page de NELHEALTHCOACH (`apps/landing`) es la cara pública del negocio, diseñada para:
- **Presentar** la propuesta de valor del coaching de salud integral con enfoque ancestral, metabólico y circadiano.
- **Mostrar y comercializar los 5 planes de acompañamiento** con tarifas de lanzamiento y disponibilidad real de cupos consultada desde la API.
- **Calificar y dirigir prospectos** hacia el registro de cliente, reserva directa de consulta 1 a 1 o contacto directo según disponibilidad.
- **Establecer confianza y transparencia** mediante cumplimiento regulatorio (RGPD, CCPA/CPRA, arbitraje JAMS, CMP de cookies y políticas claras).

### 1.2 Alcance
- Sitio web de alto rendimiento optimizado con Next.js 16 (Pages Router) y fuentes auto-hospedadas (`next/font` Inter para cumplimiento GDPR) + CSP endurecida.
- Secciones principales: Hero, Método NEL, Sobre Mí (texto canónico armonizado en los 6 idiomas), Biblioteca Científica (`BlogPreview`), Secreto/Lista de espera y Sección de Planes / Contratación (`ContactFormSection`).
- Catálogo interactivo de 5 productos comerciales (`plans-data.ts`) alineado con el backend (`GET /api/plans`): bloqueo automático de botones a *"Cupos no disponibles"* cuando un plan está lleno.
- Navbar adaptativo dinámico con botón destacado de acceso al portal/dashboard, toggle inteligente entre *Agendar* y *Contacto* según disponibilidad, navegación legal contextual y retorno a portada en 1 clic.
- Suite integral de páginas legales y **Centro de Ayuda (`/ayuda`)** en 6 idiomas (`/politica-privacidad`, `/terminos-condiciones`, `/aviso-legal`, `/cookies`, `/reembolsos`, `/ayuda` con FAQ interactivo, búsqueda/filtros, Schema.org `FAQPage` y bloque de soporte exclusivo por correo `support@nelhealthcoach.com` sin WhatsApp).
- SEO técnico integral: `robots.txt.tsx`, `sitemap.xml.tsx` dinámico, Schema.org JSON-LD (`HealthAndBeautyBusiness`, `LocalBusiness`, `Person`) y canonicals.
- Cumplimiento de accesibilidad WCAG 2.1 AA y Consent Management Platform (CMP) de cookies con respeto de señales GPC.

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Conversión Clara por Plan**: Permitir que el visitante compare los 5 niveles de servicio (desde consulta diagnóstica 1 a 1 hasta programas de 3 semanas y 1, 3 o 6 meses) y seleccione su plan directamente.
2. **Transparencia de Cupos**: Evitar frustración mostrando en tiempo real si algún programa tiene cupos cerrados o completos.
3. **Blindaje Regulatorio y Privacidad Web**: Consentimiento previo de analítica, fuentes auto-hospedadas sin llamadas externas a Google Fonts y cabeceras CSP estrictas.
4. **Experiencia Omnicanal Fluida**: Transición directa desde el plan elegido hacia `/register/client?plan=...` en el portal o hacia pago directo de la Consulta 1 a 1.

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 16.3.6 (Pages Router)
- **Runtime & UI**: React 19.1.0, TypeScript 5.8.3
- **Tipografía & Seguridad**: `next/font/google` auto-hospedada en servidor propio (GDPR) y Content Security Policy (CSP) endurecida (Cloudflare Turnstile / Stripe permitidos explícitamente).
- **Estilos**: Tailwind CSS (paleta corporativa blanca/azul/esmeralda)
- **i18n**: `react-i18next` con 6 idiomas (`es`, `en`, `fr`, `it`, `pt`, `de`) con prioridad de idioma y detección automática del navegador
- **Gestión de Consentimiento**: `CookieBanner` con `useSyncExternalStore`, expiración a 180 días y soporte GPC
- **Seguridad**: FingerprintJS condicionado a consentimiento previo de analítica
- **Hosting**: Vercel

### 3.2 Estructura de Directorios
```
apps/landing/
├── src/
│   ├── components/
│   │   ├── common/             # CookieBanner (CMP), modales, botones
│   │   ├── layout/             # Layout general, Navbar adaptativo, Footer, LegalPage
│   │   └── sections/           # Hero, Metodo, SobreMi, BlogPreview, ContactFormSection (5 planes)
│   ├── lib/
│   │   ├── fingerprint.ts      # Detección condicional anti-bots
│   │   ├── i18n.ts             # Diccionarios i18n (6 idiomas)
│   │   ├── helpContent.ts      # Preguntas frecuentes y soporte en 6 idiomas (/ayuda)
│   │   ├── legalContent.ts     # Textos normativos completos (correo support@ unificado)
│   │   └── plans-data.ts       # Definición localizada y estructura de los 5 planes comerciales
│   ├── pages/
│   │   ├── ayuda.tsx           # Centro de Ayuda interactivo con Schema.org FAQPage
│   │   ├── aviso-legal.tsx
│   │   ├── cookies.tsx
│   │   ├── index.tsx
│   │   ├── politica-privacidad.tsx
│   │   ├── reembolsos.tsx
│   │   └── terminos-condiciones.tsx
│   └── styles/                 # globals.css
```

---

## 4. Secciones y Componentes de la Landing Page

### 4.1 Header / Navbar Adaptativo (`Navbar.tsx`)
- **Logo corporativo**: Scroll suave a `#inicio` en portada; redirección a `/` desde páginas legales.
- **Navegación contextual y Footer**: Muestra secciones en `/` o enlaces secundarios (incluido `/ayuda` y páginas legales) con botón **`← Volver al Inicio`**. El Footer expone enlaces rápidos al Blog y `/ayuda` junto al correo unificado `support@nelhealthcoach.com`.
- **Botón dinámico de acción**: Consulta disponibilidad y alterna etiqueta/destino entre *Agendar* y *Contacto* según cupos, junto al acceso directo de **Login** hacia el portal.

### 4.2 Hero, Método NEL & Sobre Mí
- Carrusel de impacto (con flechas móviles optimizadas), propuesta de valor enfocada en mentalidad, salud ancestral y ritmos circadianos, y sección *Sobre Mí* estrictamente alineada al texto canónico de Manuel Martínez en los 6 idiomas.

### 4.3 Sección de Planes y Contratación (`ContactFormSection.tsx` + `plans-data.ts`)
Presenta las **5 opciones comerciales** en dos niveles alineados:
1. **Consulta Privada de Diagnóstico 1 a 1** ($60 USD · 45 min): Reserva directa mediante pago en Stripe y agenda en línea sin crear cuenta completa.
2. **Reto Tres NEL: Reinicio Ancestral y Circadiano** ($97 USD · 3 semanas): Programa guiado de 21 días con WhatsApp y 1 videollamada de cierre en la plataforma.
3. **Plan 1: Reinicio Metabólico** ($150 USD · 1 mes): Plataforma web + soporte semanal vía WhatsApp + 2 videollamadas 1 a 1 (inicial y cierre).
4. **Plan 2: Transformación Celular** ($340 USD · 3 meses · Recomendado): Plataforma web + WhatsApp directo + 4 videollamadas (1 inicial + 1 mensual) + seguimiento de biomarcadores + acceso limitado a bibliotecas (15 recetas y 15 ejercicios) y 5 escaneos nutricionales/mes.
5. **Plan 3: Maestría y Longevidad** ($590 USD · 6 meses): Plataforma web + WhatsApp prioritario + 7 videollamadas (1 inicial + 1 mensual) + seguimiento integral + bibliotecas completas de recetas y ejercicios + 30 escaneos nutricionales/mes.

- Consulta disponibilidad en tiempo real (`GET /api/plans`) y sustituye el CTA por *"Cupos no disponibles"* cuando un plan tiene cupo agotado o cerrado.
- Al seleccionar un plan de acompañamiento/reto, redirige a `/register/client?plan=<id>` para crear cuenta y completar el pago en el portal.

### 4.4 Páginas Legales Integradas (`LegalPage.tsx`) y Cookie Banner (`CookieBanner`)
1. **Política de Privacidad (`/politica-privacidad`)**: RGPD Art. 9, CCPA/CPRA, no venta de datos, garantías de IA (DeepSeek y Google Gemini).
2. **Términos de Servicio (`/terminos-condiciones`)**: Ley de California y arbitraje vinculante individual **JAMS** (Riverside County, CA).
3. **Aviso Legal (`/aviso-legal`)**, **Política de Cookies (`/cookies`)** y **Política de Reembolsos y Desistimiento (`/reembolsos`)** (con correo unificado `support@nelhealthcoach.com`).

### 4.5 Centro de Ayuda Público (`/ayuda`) y Sitemap XML (`sitemap.xml.tsx`)
- **Preguntas Frecuentes Interactivas (6 idiomas)**: Buscador en vivo y filtros por categoría (*Planes y Precios*, *Registro y Documentos*, *Videollamadas y Horarios*, *Bibliotecas y Escáner*, *Pagos y Cancelación*).
- **Soporte en Casos Extremos (Sin WhatsApp)**: Bloque dedicado que aclara explícitamente la ausencia de atención por WhatsApp en el Centro de Ayuda y canaliza incidencias urgentes únicamente hacia `support@nelhealthcoach.com`.
- **SEO & Sitemap**: Metadatos canonical, `robots: index, follow`, `Schema.org FAQPage` JSON-LD (con escape seguro `<` → `\u003c`) e indexación en `sitemap.xml.tsx`.

---

## 5. Pruebas y Aseguramiento de Calidad
- **Linting y Tipos**: Verificado con `tsc --noEmit` (0 errores) y ESLint estricto.
- **Compilación**: `next build` en producción con código 0 y cumplimiento de CSP (Mozilla Observatory).
- **i18n**: Paridad idiomática completa en los 6 idiomas soportados (`es`, `en`, `fr`, `it`, `pt`, `de`).

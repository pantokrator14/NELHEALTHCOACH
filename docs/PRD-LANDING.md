# PRD - Landing Page
## Documento de Requerimientos del Producto - NELHEALTHCOACH Landing

---

## 1. Visión General

### 1.1 Propósito
La landing page de NELHEALTHCOACH es la cara pública del negocio, diseñada para:
- **Presentar** los servicios de coaching de salud
- **Generar leads** calificados mediante formulario de contacto
- **Establecer credibilidad** y autoridad en el nicho
- **Dirigir tráfico** a las aplicaciones principales (formulario, dashboard)

### 1.2 Alcance
- Sitio web estático con contenido marketing
- Formulario de captación de leads
- Información sobre metodología y servicios
- Testimonios y casos de éxito
- Blog/recursos educativos (futuro)

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Conversión** de visitantes a leads (meta: 5%)
2. **Educación** sobre servicios de coaching de salud
3. **Posicionamiento** de marca en el mercado
4. **Reducción** de costo por lead adquirido

### 2.2 Métricas de Éxito
- **Tasa de conversión**: > 5% visitantes a leads
- **Tiempo en página**: > 2 minutos
- **Rebote**: < 40%
- **Leads/mes**: > 50 leads calificados
- **SEO**: Posición 1-3 para keywords principales

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 15.5 (Pages Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Animaciones**: Framer Motion
- **Formularios**: React Hook Form + Zod
- **i18n**: React i18next (ES/EN)
- **Analytics**: Google Analytics + Vercel Analytics
- **Hosting**: Vercel

### 3.2 Estructura de Directorios
```
apps/landing/
├── src/
│   ├── components/
│   │   ├── layout/          # Layout general
│   │   └── sections/        # Secciones de página
│   ├── lib/                 # Utilidades
│   ├── pages/               # Páginas Next.js
│   └── public/              # Assets estáticos
```

---

## 4. Secciones de la Landing Page

### 4.1 Header/Navbar
- **Logo** NELHEALTHCOACH
- **Menú de navegación** (Inicio, Servicios, Método, Testimonios, Contacto)
- **Selector de idioma** (ES/EN)
- **CTA principal** "Comienza tu evaluación"
- **Responsive** con menú hamburguesa móvil

### 4.2 Hero Section
- **Título principal**: "Transforma tu salud con coaching personalizado"
- **Subtítulo**: "Planificación 100% personalizada con IA"
- **Imagen/Vídeo** de presentación
- **Dos CTAs**: "Comienza ahora" (formulario) + "Ver servicios"
- **Estadísticas** de impacto (clientes, resultados, satisfacción)

### 4.3 Servicios Section
- **Coaching de Ejercicio**: Rutinas personalizadas
- **Planificación Nutricional**: Dietas adaptadas
- **Seguimiento de Hábitos**: Cambios sostenibles
- **Soporte 1:1**: Sesiones con coach certificado
- **Cada servicio incluye**: Icono, título, descripción, beneficios

### 4.4 Método NEL Section
- **Proceso paso a paso**:
  1. Evaluación integral
  2. Análisis IA personalizado
  3. Plan adaptado a tu vida
  4. Ajustes continuos
- **Diferenciales**: IA especializada, enfoque holístico, seguimiento constante
- **Infografía** del proceso

### 4.5 Testimonios Section
- **Carrusel** de testimonios reales
- **Fotos** de clientes (con consentimiento)
- **Métricas** de resultados (kg perdidos, % grasa, etc.)
- **Video testimonios** (opcional)
- **Sello de confianza** (certificaciones, afiliaciones)

### 4.6 Formulario de Contacto
- **Campos**: Nombre, Email, Teléfono, Objetivo principal
- **Preselección** de servicios de interés
- **Consentimiento** GDPR/privacidad
- **Submit** a API de leads
- **Confirmación** + redirección a formulario completo

### 4.7 Footer
- **Logo** y eslogan
- **Enlaces rápidos** (Políticas, Términos, Blog)
- **Información de contacto** (email, teléfono)
- **Redes sociales**
- **Copyright** y avisos legales

---

## 5. Experiencia de Usuario

### 5.1 Flujo de Conversión
```
Visitante → Hero (30s) → Servicios (45s) → Método (30s)
     ↓           ↓             ↓              ↓
  Entrada    Primer CTA    Valor prop.   Confianza
     ↓
  Testimonios → Formulario → Thank You
     ↓             ↓            ↓
  Social proof   Conversión   Redirección
```

### 5.2 Diseño Responsive
- **Mobile-first** approach
- **Breakpoints**: Mobile (< 640px), Tablet (641-1024px), Desktop (>1024px)
- **Imágenes optimizadas** por dispositivo
- **Touch-friendly** CTAs y formularios

### 5.3 Performance
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **Peso página**: < 1MB
- **Score Lighthouse**: > 90

---

## 6. Integraciones

### 6.1 Backend
- **API de leads**: `POST /api/leads`
- **Procesamiento**: Validación, almacenamiento, notificación
- **Seguridad**: Rate limiting, captcha (futuro)

### 6.2 Marketing
- **Google Analytics 4**: Tracking conversiones
- **Google Tag Manager**: Eventos personalizados
- **Email marketing**: Integración con Resend
- **CRM**: Futura integración con HubSpot/Salesforce

### 6.3 SEO
- **Meta tags** optimizados
- **Schema markup** para servicios locales
- **Sitemap.xml** automático
- **Robots.txt** configurado
- **Open Graph** para redes sociales

---

## 7. Contenido y Copywriting

### 7.1 Tone of Voice
- **Profesional** pero cercano
- **Empoderador** y motivacional
- **Basado en evidencia** científica
- **Claro** y directo

### 7.2 Keywords Principales
- **Primarias**: coaching salud, entrenador personal online, plan nutricional personalizado
- **Secundarias**: pérdida de peso, ganancia muscular, hábitos saludables
- **Locales**: coach salud Barcelona, nutricionista online España

### 7.3 Contenido Multimedia
- **Fotos** reales de sesiones (con consentimiento)
- **Vídeos** explicativos del método
- **Infografías** de resultados
- **Gráficos** de progreso (ejemplos anonimizados)

---

## 8. Seguridad y Privacidad

### 8.1 Protección de Datos
- **SSL/TLS** obligatorio
- **Formularios** con validación CSRF
- **Datos leads** encriptados en tránsito y reposo
- **Consentimiento explícito** para contacto

### 8.2 Cumplimiento Legal
- **GDPR/CCPA**: Banner de cookies, política privacidad
- **Términos de servicio** accesibles
- **Aviso legal** completo
- **Protección menores**: +18 años requerido

---

## 9. Analytics y Tracking

### 9.1 Métricas a Monitorear
- **Conversiones**: Leads por fuente/origen
- **Comportamiento**: Scroll depth, heatmaps
- **Técnicas**: Errores, performance, uptime
- **SEO**: Posiciones, tráfico orgánico

### 9.2 Dashboards
- **Google Analytics**: Conversiones y comportamiento
- **Vercel Analytics**: Performance y errores
- **Custom dashboard**: Leads en tiempo real
- **Reportes semanales** automáticos

---

## 10. Roadmap

### Fase 1 (Completado)
- [x] Landing básica con secciones principales
- [x] Formulario de contacto funcional
- [x] Diseño responsive
- [x] Integración con API de leads

### Fase 2 (En progreso)
- [ ] Blog/recursos educativos
- [ ] Calculadora de metas personalizada
- [ ] Chatbot de preguntas frecuentes
- [ ] Sistema de reservas online

### Fase 3 (Futuro)
- [ ] Landing pages específicas por servicio
- [ ] A/B testing automatizado
- [ ] Integración CRM completa
- [ ] Programa de afiliados

---

## 11. Consideraciones Técnicas

### 11.1 Dependencias Críticas
- **Vercel**: Hosting y deployment
- **API backend**: Disponibilidad para leads
- **Google Services**: Analytics y SEO
- **CDN**: Imágenes y assets

### 11.2 Plan de Contingencia
- **Formulario offline**: Email de contacto directo
- **Cache agresivo**: Página estática en CDN
- **Monitoring**: Alertas por caídas
- **Backup manual**: Contenido en CMS headless

---

## 12. Equipo y Responsabilidades

### 12.1 Roles
- **Frontend Lead**: Desarrollo y mantenimiento
- **UX/UI Designer**: Diseño y prototipos
- **Content Writer**: Copywriting y SEO
- **Marketing Specialist**: Conversión y analytics

### 12.2 SLA
- **Disponibilidad**: 99.9% mensual
- **Actualizaciones**: Contenido semanal, código mensual
- **Soporte**: Business hours para issues
- **Backups**: Diarios automáticos

---

## 13. Presupuesto y Recursos

### 13.1 Costos Operativos
- **Hosting**: Vercel Pro ($20/mes)
- **Dominio**: $15/año
- **CDN**: $10/mes (imágenes)
- **Herramientas**: $50/mes (analytics, email)

### 13.2 Recursos Humanos
- **Desarrollador**: 10h/semana (mantenimiento)
- **Diseñador**: 5h/semana (actualizaciones)
- **Content**: 5h/semana (blog/SEO)
- **Marketing**: 10h/semana (optimización)

---

*Documento actualizado: Abril 2026*
*Versión: 2.0*
*Propietario: Equipo Marketing NELHEALTHCOACH*
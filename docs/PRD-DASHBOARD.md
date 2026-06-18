# PRD - Dashboard
## Documento de Requerimientos del Producto - NELHEALTHCOACH Dashboard

---

## 1. Visión General

### 1.1 Propósito
El Dashboard de NELHEALTHCOACH es la herramienta principal para coaches, permitiendo:
- **Gestión centralizada** de todos los clientes
- **Visualización** de planes generados por IA
- **Seguimiento** de progreso y resultados
- **Comunicación** con clientes
- **Administración** de contenido (ejercicios, recetas)

### 1.2 Alcance
- Panel de administración para coaches certificados
- Visualización de datos de formularios de salud
- Gestión de planes de ejercicio y nutrición
- Sistema de notas y seguimiento
- Generación de reportes

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Eficiencia** en gestión de clientes (meta: 50% menos tiempo)
2. **Calidad** en recomendaciones personalizadas
3. **Retención** de clientes mediante seguimiento proactivo
4. **Escalabilidad** del negocio de coaching

### 2.2 Métricas de Éxito
- **Tiempo gestión/cliente**: < 15 minutos/semana
- **Satisfacción coach**: > 4.5/5
- **Retención clientes**: > 80% a 3 meses
- **Utilización features**: > 70% coaches usan todas las funciones

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 15.5 (Pages Router)
- **Lenguaje**: TypeScript 5.8.3
- **Estilos**: Tailwind CSS
- **Estado**: React Context + Local Storage
- **Gráficos**: Chart.js / react-chartjs-2
- **Internacionalización**: react-i18next + i18next-browser-languagedetector
- **Formularios**: React Hook Form + Zod
- **Autenticación**: JWT
- **Audio/Videollamadas**: LiveKit

### 3.2 Estructura de Directorios
```
apps/dashboard/
├── 📂 pages/              # Rutas de Next.js (Pages Router)
│   ├── 📂 api/            # API routes internas (proxy, upload)
│   ├── 📂 dashboard/      # Páginas protegidas del dashboard
│   │   ├── 📄 coaches.tsx       # Gestión de coaches (i18n namespace 'coaches')
│   │   ├── 📄 recipes.tsx       # Biblioteca de recetas (i18n namespace 'recipes')
│   │   └── 📄 exercises.tsx     # Biblioteca de ejercicios (i18n namespace 'exercises')
│   ├── 📄 index.tsx       # Login
│   └── 📄 dashboard.tsx   # Panel principal
├── 📂 components/         # Componentes React
│   ├── 📂 dashboard/      # Componentes del panel
│   │   ├── AIRecommendationsModal.tsx  # Modal de recomendaciones IA
│   │   ├── RecipeModal.tsx            # CRUD de recetas (i18n namespace 'recipes')
│   │   ├── ExerciseModal.tsx          # CRUD de ejercicios (i18n namespace 'exercises')
│   │   └── ...
│   └── 📂 ui/             # Componentes reutilizables
├── 📂 lib/
│   ├── 📄 i18n.ts         # Traducciones multi-idioma (~5150 líneas)
│   └── 📄 ...             # Utilidades y hooks
├── 📂 styles/             # Estilos globales
└── 📂 public/             # Assets estáticos
```

### 3.3 Internacionalización (i18n)

El dashboard está 100% internacionalizado mediante **react-i18next** con detección automática del idioma del navegador.

#### Idiomas soportados

| Idioma | Código | Estado |
|--------|--------|--------|
| Español | `es` | ✅ Completo |
| English | `en` | ✅ Completo |
| Français | `fr` | ✅ Completo |
| Italiano | `it` | ✅ Completo |
| Português | `pt` | ✅ Completo |
| Deutsch | `de` | ✅ Completo |

#### Namespaces y estructura

Las traducciones están organizadas en namespaces dentro de `lib/i18n.ts` (~5150 líneas total, ~250 keys por idioma):

| Namespace | Contenido | Archivos que lo usan |
|-----------|-----------|---------------------|
| `common` | Textos genéricos (loading, error, save, cancel) | Toda la app |
| `navigation` | Navegación y menús | Layout |
| `auth` | Autenticación | Login, registro |
| `clients` | Gestión de clientes | Páginas de clientes |
| `recipes` | Recetas + modal CRUD (~72 keys) | `recipes/index.tsx`, `RecipeModal.tsx` |
| `exercises` | Ejercicios + modal CRUD (~73 keys) | `exercises/index.tsx`, `ExerciseModal.tsx` |
| `coaches` | Gestión de coaches (~63 keys) | `coaches/index.tsx` |
| `dashboard` | Panel principal | `dashboard.tsx` |
| `filters` | Filtros y ordenamiento | Componentes de filtros |
| `register` | Registro de coaches | Página de registro |

No se usan keys genéricas `common.*` en las secciones específicas — cada una tiene su propio namespace con keys dedicadas.

---



## 4. Módulos Principales

### 4.1 Dashboard Principal
- **Resumen general**: Clientes activos, próximas sesiones, métricas
- **Actividad reciente**: Últimos planes generados, notas añadidas
- **Alertas**: Clientes con seguimiento pendiente, objetivos próximos
- **Quick actions**: Acciones frecuentes (nuevo cliente, generar plan)

### 4.2 Gestión de Clientes
#### 4.2.1 Lista de Clientes
- **Tabla filtrable**: Nombre, estado, último contacto, objetivos
- **Búsqueda**: Por nombre, email, características
- **Filtros**: Activos/inactivos, objetivos, fecha ingreso
- **Acciones rápidas**: Ver perfil, editar, generar plan, contacto

#### 4.2.2 Perfil de Cliente
- **Datos personales**: Información básica, contacto
- **Historial médico**: Condiciones, alergias, medicamentos
- **Evaluación de salud**: Datos del formulario completo
- **Documentos**: Archivos subidos, consentimientos
- **Historial de sesiones**: Notas, planes, progreso

### 4.3 Planes y Recomendaciones (Modal AIRecommendationsModal)

El modal de recomendaciones IA fue completamente rediseñado con un sistema de **tarjetas, drag & drop y búsqueda visual** para cada categoría:

#### 4.3.1 Planes de Nutrición
- **Visualización**: Columnas fijas Lunes→Domingo, cada columna contiene 3 tarjetas (Desayuno, Almuerzo, Cena)
- **Tarjetas**: Muestran foto de la receta (desde recipeCache), nombre, emoji de comida
- **Drag & drop**: Intercambiar (swap) recetas entre celdas de diferentes días
- **Click**: Abre RecipeDetailModal con la receta completa
- **✕ al hover**: Elimina la receta de la celda
- **Celda vacía**: Muestra botón + para buscar y agregar receta
- **Búsqueda de recetas**: Modal RecipeSearchModal con tarjetas grid (imagen, nombre, tiempo, dificultad, categoría)
- **Lista de compras**: Generada automáticamente con prioridades (alta/media/baja)
- **Alternativas**: Sección con tarjetas de recetas alternativas, botón + con borde dashed para agregar, ✕ al hover para eliminar

#### 4.3.2 Planes de Ejercicio
- **Visualización**: Columnas fijas Lunes→Domingo con tarjetas de ejercicios
- **Tarjetas**: Placeholder de imagen, nombre, series × repeticiones, equipo
- **Drag & drop**: Reordenar ejercicios dentro del mismo día (vertical) y mover entre días (horizontal)
- **Click**: Abre ExerciseDetailModal (carga ejercicio desde cache o BD)
- **✕ al hover**: Elimina el ejercicio de la columna
- **+ Ejercicio**: Botón con borde dashed al final de cada columna para agregar desde ExerciseSearchModal
- **Búsqueda de ejercicios**: Modal ExerciseSearchModal con tarjetas grid (imagen, nombre, dificultad, series, músculos)
- **Recomendaciones personalizadas**: Caja con notas generadas por IA según disponibilidad horaria del cliente

#### 4.3.3 Planes de Hábitos
- **Visualización**: Desktop side-by-side (toAdopt | toEliminate), mobile stacked
- **Items**: Cada hábito como card clickeable con ✏️ (editar) y ✕ (eliminar) al hover
- **+ Agregar**: Botón con borde dashed al final de cada lista (morado para adoptar, rojo para eliminar)
- **Recomendaciones**: Caja con trackingMethod y motivationTip generados por IA

#### 4.3.4 Características Generales del Modal
- **Maximizar**: Botón para expandir el modal a pantalla completa (solo desktop, persistido en localStorage)
- **Navegación por teclado**: ESC para cerrar, flechas para navegar entre documentos
- **Recarga automática**: Al cerrar/reabrir el modal se obtienen datos frescos de MongoDB
- **Persistencia**: Todos los cambios (add/edit/delete/drag-drop) se guardan vía `updateSessionItems` → MongoDB

### 4.4 Sistema de Notas y Seguimiento
- **Notas de sesión**: Fecha, contenido, objetivos discutidos
- **Notas médicas**: Actualizaciones condiciones, medicamentos
- **Notas personales**: Preferencias, motivaciones, desafíos
- **Recordatorios**: Tareas pendientes, seguimientos programados

### 4.5 Biblioteca de Contenido
#### 4.5.1 Ejercicios
- **Catálogo**: Ejercicios organizados por categoría
- **Detalles**: Descripción, músculos, equipamiento, vídeo
- **Búsqueda**: Por nombre, músculo, equipamiento
- **Favoritos**: Ejercicios usados frecuentemente

#### 4.5.2 Recetas
- **Catálogo**: Recetas organizadas por tipo/comida
- **Detalles**: Ingredientes, preparación, información nutricional
- **Filtros**: Por dieta, tiempo preparación, dificultad
- **Importar**: Desde API o manualmente

### 4.6 Reportes y Analytics
- **Progreso clientes**: Gráficos de métricas (peso, grasa, medidas)
- **Utilización sistema**: Features más usadas, tiempo de uso
- **Resultados**: Estadísticas de éxito por objetivo
- **Exportar**: Reportes en PDF/Excel

---

## 5. Flujos de Trabajo

### 5.1 Onboarding Nuevo Cliente
```
Formulario → Dashboard → Revisión datos → Generar planes → Primera sesión
    ↓           ↓           ↓           ↓           ↓
  Datos      Notificación  Validación  IA + ajuste  Planificación
  completos  nuevo cliente  coach      manual       seguimiento
```

### 5.2 Sesión Semanal con Cliente
```
Revisar progreso → Actualizar notas → Ajustar planes → Programar siguiente
      ↓               ↓               ↓               ↓
  Métricas       Observaciones    Modificaciones    Recordatorio
  semana         sesión actual    necesarias        automático
```

### 5.3 Generación de Planes
```
Dashboard → Click "Generar Recomendaciones" → POST /api/clients/[id]/ai → generateCompositeRecommendation()
    ↓                       ↓                           ↓                           ↓
  Seleccionar             Modal carga                  Prompt compuesto           DeepSeek V4 Flash
  mes y opciones          mientras procesa              + datos cliente            maxTokens 16000
                                                       + recetas DB               
                                                       + ejercicios DB            
                                                       → JSON con todos los planes
    ↓                       ↓                           ↓                           ↓
  Revisión en             Modal con tarjetas            Datos guardados             Recomendaciones
  AIRecommendationsModal  interactivas                  en MongoDB                  listas
                          (nutrición, ejercicio,         (aiProgress.sessions)
                          hábitos, alternativas)
```

---

## 6. Experiencia de Usuario

### 6.1 Diseño para Productividad
- **Shortcuts**: Teclado para acciones frecuentes
- **Bulk actions**: Operaciones múltiples en clientes
- **Templates**: Planes y notas reutilizables
- **Offline mode**: Funcionalidad básica sin conexión

### 6.2 Personalización
- **Temas**: Claro/oscuro
- **Vistas**: Compacta/detallada
- **Columnas**: Configurables en tablas
- **Dashboard widgets**: Reordenables

### 6.3 Responsive Design
- **Desktop**: Vista completa con sidebars
- **Tablet**: Layout adaptado, menú colapsable
- **Mobile**: App-like experience, navegación bottom

---

## 7. Integraciones

### 7.1 Backend API
- **Clientes**: CRUD completo con API
- **Planes IA**: Integración con agentes especializados
- **Documentos**: Upload/download con S3
- **Analytics**: Datos en tiempo real

### 7.2 Comunicación
- **Email**: Integración con Resend
- **Notificaciones**: Push (futuro)
- **Calendario**: Google Calendar/Outlook (futuro)
- **Mensajería**: WhatsApp/Telegram (futuro)

### 7.3 Wearables (Futuro)
- **Fitbit/Apple Health**: Sincronización datos
- **Smart scales**: Peso y composición corporal
- **Activity trackers**: Pasos, sueño, actividad

---

## 8. Seguridad y Privacidad

### 8.1 Control de Acceso
- **Autenticación**: Multi-factor (futuro)
- **Roles**: Coach admin, coach asistente, viewer
- **Permisos**: Granulares por módulo/función
- **Auditoría**: Log de todas las acciones

### 8.2 Protección de Datos
- **Encriptación**: Datos sensibles en tránsito/reposo
- **Session management**: Timeout automático
- **IP whitelisting**: Para accesos administrativos
- **Backup**: Diario automático

### 8.3 Cumplimiento
- **HIPAA**: Para datos médicos de clientes US
- **GDPR**: Para clientes UE
- **Consentimiento**: Registro de todos los consentimientos
- **Retención**: Políticas de eliminación de datos

---

## 9. Performance y Escalabilidad

### 9.1 Requisitos Técnicos
- **Tiempo carga**: < 2s página inicial
- **Interactividad**: < 100ms para acciones comunes
- **Concurrencia**: 50+ coaches simultáneos
- **Data loading**: Lazy loading + paginación

### 9.2 Optimizaciones
- **Cache**: Agresivo para datos estáticos
- **CDN**: Assets e imágenes
- **Compresión**: Gzip/Brotli para transferencia
- **Lazy loading**: Componentes y rutas

### 9.3 Monitoreo
- **Errores frontend**: Sentry/LogRocket
- **Performance**: Core Web Vitals
- **Uso features**: Analytics personalizado
- **Uptime**: > 99.5%

---

## 10. Roadmap

### Fase 1 (Completado)
- [x] Dashboard básico con lista clientes
- [x] Visualización de datos formulario
- [x] Generación planes IA básica → **rediseñado con modal de tarjetas interactivas**
- [x] Sistema de notas simple
- [x] Modal de recomendaciones IA con tarjetas, drag & drop y búsqueda visual
- [x] ExerciseSearchModal para búsqueda de ejercicios desde BD
- [x] RecipeSearchModal rediseñado con grid de tarjetas
- [x] ExerciseDetailModal y RecipeDetailModal para vista detallada
- [x] Drag & drop en nutrición (swap) y ejercicios (reordenar/mover)
- [x] Manejo de hábitos: adoptar/eliminar con edición en línea
- [x] Maximizar modal (persistido, solo desktop)
- [x] Visor de documentos con flechas de navegación y teclado
- [x] Descarga de documentos con URLs prefirmadas GET
- [x] **i18n multi-idioma completo** — Dashboard 100% internacionalizado (6 idiomas)
  - Namespace `coaches`: gestión de coaches con CRUD y tabla filtrable
  - Namespace `recipes`: biblioteca de recetas con CRUD completo vía modal
  - Namespace `exercises`: biblioteca de ejercicios con CRUD completo vía modal
  - Sin dependencia de keys `common.*` genéricas — cada sección tiene su propio namespace
- [x] **Gestión de coaches** — tabla con búsqueda, filtros, paginación y modal de detalle

### Fase 2 (En progreso)
- [ ] Reportes avanzados con exportación
- [ ] Sistema de comunicación integrado (chat coach-cliente)
- [ ] App móvil para coaches
- [ ] Integración con wearables (Fitbit, Apple Health)

### Fase 3 (Futuro)
- [ ] AI assistant para coaches
- [ ] Integración wearables
- [ ] Marketplace de planes
- [ ] Team collaboration features

---

## 11. Consideraciones Técnicas

### 11.1 Dependencias Críticas
- **API backend**: Disponibilidad y performance
- **Servicios IA**: Latencia en generación planes
- **Storage S3**: Para documentos e imágenes
- **Authentication service**: Seguridad acceso

### 11.2 Plan de Contingencia
- **Modo offline**: Datos cacheados localmente
- **Fallback UI**: Estados de carga/error elegantes
- **Degraded mode**: Funcionalidad básica sin IA
- **Manual overrides**: Todo editable manualmente

---

## 12. Equipo y Responsabilidades

### 12.1 Roles
- **Frontend Lead**: Desarrollo dashboard
- **UX Designer**: Experiencia coach
- **Product Manager**: Priorización features
- **QA Engineer**: Testing y calidad

### 12.2 SLA
- **Disponibilidad**: 99.5% horario laboral
- **Soporte**: 8x5 para coaches
- **Updates**: Semanales (hotfixes), Mensuales (features)
- **Training**: Onboarding nuevos coaches

---

## 13. Presupuesto y Recursos

### 13.1 Costos Operativos
- **Hosting**: Vercel Pro ($20/mes)
- **Storage**: AWS S3 ($15/mes estimado)
- **AI services**: DeepSeek/OpenAI ($50-200/mes)
- **Monitoring**: $30/mes (Sentry, analytics)

### 13.2 Recursos Humanos
- **Desarrollador**: 20h/semana (mantenimiento + features)
- **Designer**: 10h/semana (mejoras UX)
- **Support**: 15h/semana (soporte coaches)
- **Product**: 10h/semana (roadmap y feedback)

---

*Documento actualizado: Junio 2026*
*Versión: 3.1*
*Propietario: Equipo Producto NELHEALTHCOACH*
# PRD - API (Backend y Agentes de IA)
## Documento de Requerimientos del Producto - NELHEALTHCOACH API

---

## 1. Visión General

### 1.1 Propósito
La API de NELHEALTHCOACH es el núcleo del sistema, proporcionando:
- Procesamiento de datos de formularios de salud
- Agentes de IA especializados para planes personalizados
- Gestión de clientes y datos médicos
- Integración con servicios externos (AWS, OpenAI, etc.)

### 1.2 Alcance
- Backend para formulario, dashboard y landing
- Sistema de agentes de IA para salud y fitness
- API RESTful con autenticación y seguridad
- Procesamiento de documentos médicos

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Procesamiento seguro** de datos médicos sensibles
2. **Generación automatizada** de planes personalizados
3. **Escalabilidad** para múltiples coaches y clientes
4. **Confiabilidad** en recomendaciones de salud

### 2.2 Métricas de Éxito
- < 500ms de respuesta en endpoints críticos
- > 99.5% uptime
- < 0.1% de errores en procesamiento de IA
- Capacidad para 1000+ clientes concurrentes

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 15.5 (App Router)
- **Lenguaje**: TypeScript
- **Base de datos**: MongoDB + Mongoose
- **IA**: LangChain + DeepSeek
- **Seguridad**: Arcjet + Guardrails personalizados
- **Storage**: AWS S3 para documentos
- **Email**: Resend
- **Logging**: Sistema personalizado con contextos

### 3.2 Estructura de Directorios
```
apps/api/
├── src/
│   ├── app/
│   │   ├── api/              # Endpoints REST
│   │   ├── lib/              # Lógica de negocio
│   │   │   ├── agents/       # Agentes de IA
│   │   │   ├── middleware/   # Middlewares
│   │   │   └── services/     # Servicios
│   │   └── types/            # Tipos TypeScript
│   └── middleware.ts         # Middleware principal
```

---

## 4. Funcionalidades Principales

### 4.1 Gestión de Clientes
- **CRUD completo** de perfiles de clientes
- **Almacenamiento seguro** de datos médicos
- **Historial** de sesiones y progreso
- **Documentos médicos** (PDF, imágenes)

### 4.2 Generación de Recomendaciones (Sistema Compuesto)

> *Nota: El sistema actual utiliza un **prompt compuesto único** que reemplazó el pipeline multi-agente anterior (Client Analyzer, Exercise Planner, Nutrition Planner, Habit Designer, Quality Validator) por un enfoque más eficiente y fiable.*

#### 4.2.1 Proceso de Generación
1. **Preparación de datos**: El backend recolecta y descifra toda la información del cliente (datos personales, médicos, evaluaciones de salud, salud mental, documentos procesados, notas del coach, sesiones previas)
2. **Consulta a base de datos**: Obtiene recetas y ejercicios disponibles (hasta 80 de cada uno) para pasarlos como referencia a la IA
3. **Prompt compuesto único**: Se construye un prompt que incluye:
   - Datos personales y médicos del cliente (descifrados)
   - Evaluaciones de salud (7 preguntas con etiquetas legibles)
   - Salud mental (15 preguntas con etiquetas legibles)  
   - Documentos extraídos por Textract (o nombres de documentos fallidos como referencia)
   - Notas del coach
   - Número de sesiones previas para determinar nivel aproximado
   - Recetas disponibles en la BD (con IDs, títulos, tiempo de cocción)
   - Ejercicios disponibles en la BD (con IDs, nombres, nivel, equipo, grupos musculares)
4. **Modelo**: DeepSeek V4 Flash (vía LangChain ChatOpenAI) con `temperature: 0.3`, `maxTokens: 16000`
5. **Respuesta**: JSON único estructurado con:
   - `clientInsights`: summary extenso + vision igualmente extensa + riesgos + oportunidades + nivel
   - `nutritionPlan`: weeklyPlan (7 días × desayuno/almuerzo/cena) + shoppingList
   - `exercisePlan`: weeklyRoutine (días específicos con ejercicios) + equipment + notes personalizadas
   - `habitPlan`: toAdopt + toEliminate + trackingMethod + motivationTip
   - `alternatives` (obligatorio: ≥3 alternativas de recetas)

#### 4.2.2 Regeneración de Recomendaciones
- Usa el **mismo prompt compuesto** que la generación inicial
- Incluye sesiones previas como contexto (excluyendo la sesión actual)
- Preserva historial de regeneración (`regenerationCount`, `regenerationHistory`)
- Notas del coach opcionales para influir en la regeneración

#### 4.2.3 Criterios de Selección de Ejercicios
- **Por nivel**: `clientLevel` del ejercicio debe coincidir con el nivel de experiencia del cliente
- **Por contexto**: Acceso a gimnasio, equipo disponible en casa vs peso corporal
- **Por limitaciones**: Respeta limitaciones físicas del cliente
- **Por preferencias**: Considera tipos de ejercicio preferidos y disponibilidad horaria
- **Notas personalizadas**: Incluye recomendaciones de horario según disponibilidad del cliente

### 4.3 Procesamiento de Documentos
- **Extracción de texto** con AWS Textract (AnalyzeDocument con TABLES + FORMS)
- **Fallback futuro a Gemini** para documentos que Textract no soporta (UnsupportedDocumentException)
- **Almacenamiento dual**: 
  - `medicalData.documents`: Metadatos del archivo (url, key, nombre, tipo, tamaño) + `textractAnalysis` (estado)
  - `medicalData.processedDocuments`: Contenido extraído (encriptado) con confidence, pageCount, extractionStatus
- **Procesamiento asíncrono**: Textract corre en segundo plano (fire-and-forget) tras la subida
- **Actualización de estado**: Al completar/fallecer Textract, se actualiza el `textractAnalysis.extractionStatus` del documento original
- **Limpieza en eliminación**: Al borrar un documento, también se eliminan sus `processedDocuments` asociados
- **Vista previa**: URLs prefirmadas GET (1 hora de expiración) para visualizar documentos desde el frontend
- **Pendiente (Gemini)**: Para documentos no soportados por Textract, se usará Gemini API para extracción por visión

### 4.4 Sistema de Seguridad
- **Guardrails personalizados** para IA
- **Rate limiting** (10 req/10 seg)
- **Protección contra bots**
- **Validación de inputs** (XSS, SQLi)
- **Logging detallado** con contextos

---

## 5. Endpoints API

### 5.1 Clientes
- `POST /api/clients` - Crear cliente
- `GET /api/clients` - Listar clientes
- `GET /api/clients/[id]` - Obtener cliente
- `PUT /api/clients/[id]` - Actualizar cliente
- `POST /api/clients/[id]/upload` - Subir documentos
- `POST /api/clients/[id]/ai` - Generar planes IA

### 5.2 Ejercicios
- `GET /api/exercises` - Listar ejercicios
- `POST /api/exercises` - Crear ejercicio personalizado

### 5.3 Recetas
- `GET /api/recipes` - Listar recetas
- `POST /api/recipes` - Crear receta
- `POST /api/recipes/analyze-nutrition` - Análisis nutricional

### 5.4 Utilidades
- `POST /api/extract-text` - Extraer texto de documentos
- `GET /api/health` - Health check
- `POST /api/leads` - Procesar leads del formulario
- `GET /api/stats` - Estadísticas del sistema

---

## 6. Flujos de Datos

### 6.1 Proceso de Evaluación Completa
```
Formulario → API → Base de datos → Agentes IA → Dashboard
     ↓           ↓          ↓           ↓           ↓
  Datos      Validación  Almacenamiento  Planes    Visualización
  cliente    seguridad   seguro          personal.  coach
```

### 6.2 Pipeline de Generación de Recomendaciones (Actual)
```
prepareAIInput() → generateCompositeRecommendation()
      ↓                       ↓
  Descifrar datos        Prompt compuesto único
  + extraer salud         → DeepSeek V4 Flash
  + extraer mental          (maxTokens: 16000)
  + procesar docs        → JSON estructurado
  + recetas/ejerc. DB      con todos los planes
```

### 6.3 Pipeline de Documentos
```
Subida archivo → S3 (PUT presigned) → PUT /upload → MongoDB → Textract (background) → processedDocuments
      ↓                                                         ↓                    ↓
  Frontend sube a S3                                    Análisis con            Almacenamiento
  + confirma upload                                     AnalyzeDocument         contenido extraído
                                                                                 + actualización
                                                                                 badge status
```

---

## 7. Consideraciones de Seguridad

### 7.1 Protección de Datos
- **Encriptación** en tránsito (HTTPS) y en reposo
- **Acceso mínimo necesario** a datos médicos
- **Auditoría** de todos los accesos
- **Backups automáticos** diarios

### 7.2 Guardrails de IA
- **Prevención** de recomendaciones peligrosas
- **Validación** de disclaimer médico obligatorio
- **Detección** de prompt injection
- **Fallbacks seguros** en caso de error

### 7.3 Cumplimiento Normativo
- **HIPAA-ready** arquitectura
- **Consentimiento explícito** para datos médicos
- **Retención limitada** de datos
- **Derecho al olvido** implementado

---

## 8. Escalabilidad

### 8.1 Escalado Horizontal
- **Contenedores Docker** para cada servicio
- **Load balancing** automático
- **Cache Redis** para datos frecuentes
- **CDN** para documentos estáticos

### 8.2 Monitoreo
- **Logs estructurados** por contexto
- **Métricas** de rendimiento agentes IA
- **Alertas** automáticas por errores
- **Dashboard** de salud del sistema

---

## 9. Roadmap

### Fase 1 (Completado)
- [x] API básica con CRUD clientes
- [x] Agentes IA fundamentales → **reemplazados por prompt compuesto único**
- [x] Sistema de seguridad básico
- [x] Integración con formulario
- [x] Generación de recomendaciones con prompt compuesto (nutrition + exercise + habits + alternatives)
- [x] Regeneración de sesiones con historial
- [x] Procesamiento de documentos con Textract (extracción de texto, tablas, formularios)
- [x] Cache de recetas y ejercicios para envío a IA
- [x] Encriptación campo a campo de datos médicos
- [x] Subida/descarga/eliminación de documentos con S3 + URLs prefirmadas
- [x] Limpieza de processedDocuments al eliminar documentos
- [x] Badge de estado de Textract en UI

### Fase 2 (En progreso)
- [ ] Fallback a Gemini cuando Textract no soporte el formato
- [ ] Sistema de notificaciones push
- [ ] API para dispositivos wearables
- [ ] Análisis avanzado de progreso

### Fase 3 (Futuro)
- [ ] Machine learning predictivo
- [ ] Comunidad de coaches
- [ ] Marketplace de planes
- [ ] App móvil nativa

---

## 10. Consideraciones Técnicas

### 10.1 Dependencias Críticas
- **OpenAI/DeepSeek**: Disponibilidad API
- **AWS Services**: Costos de almacenamiento
- **MongoDB Atlas**: Escalabilidad base de datos
- **Vercel**: Límites de funciones Edge

### 10.2 Plan de Contingencia
- **Fallbacks** para servicios externos
- **Cache agresivo** en fallos de IA
- **Modo degradado** sin funciones premium
- **Backups manuales** de datos críticos

---

## 11. Equipo y Responsabilidades

### 11.1 Roles
- **Backend Lead**: Arquitectura API y agentes IA
- **DevOps**: Infraestructura y despliegue
- **Security Engineer**: Guardrails y compliance
- **Data Engineer**: Procesamiento documentos

### 11.2 SLA
- **Disponibilidad**: 99.5% mensual
- **Soporte**: 24/7 para issues críticos
- **Actualizaciones**: Mensuales (security), Trimestrales (features)
- **Backups**: Diarios automáticos, retención 30 días

---

*Documento actualizado: Mayo 2026*
*Versión: 3.0*
*Propietario: Equipo Backend NELHEALTHCOACH*
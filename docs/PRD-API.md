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

### 4.2 Agentes de IA Especializados

#### 4.2.1 Client Analyzer
- **Entrada**: Datos personales, médicos, objetivos
- **Proceso**: Análisis integral de perfil
- **Salida**: Insights, nivel de experiencia, riesgos, oportunidades
- **Uso**: Dashboard del coach

#### 4.2.2 Exercise Planner
- **Entrada**: Perfil del cliente + objetivos
- **Proceso**: Diseño de rutinas personalizadas
- **Salida**: Plan semanal de ejercicios
- **Características**: Considera acceso a equipos, lesiones, experiencia

#### 4.2.3 Nutrition Planner
- **Entrada**: Datos nutricionales, preferencias, restricciones
- **Proceso**: Creación de plan alimenticio
- **Salida**: Plan semanal de nutrición + lista de compras
- **Características**: Adaptado a objetivos (pérdida/ganancia peso)

#### 4.2.4 Habit Designer
- **Entrada**: Rutina actual, objetivos, desafíos
- **Proceso**: Diseño de hábitos progresivos
- **Salida**: Plan de implementación de hábitos
- **Características**: Enfoque en cambios sostenibles

#### 4.2.5 Quality Validator
- **Entrada**: Planes generados por otros agentes
- **Proceso**: Validación de calidad y seguridad
- **Salida**: Puntuación de calidad + sugerencias
- **Características**: Múltiples rondas de revisión

### 4.3 Procesamiento de Documentos
- **Extracción de texto** (Textract AWS)
- **Análisis de documentos médicos**
- **Almacenamiento seguro** en S3
- **Procesamiento asíncrono** con Inngest

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

### 6.2 Pipeline de Agentes IA
```
Client Analyzer → Exercise Planner → Nutrition Planner
        ↓               ↓                  ↓
   Análisis        Rutinas ejerc.    Plan alimenticio
   perfil          ↓                  ↓
              Habit Designer   Quality Validator
                    ↓                  ↓
              Plan hábitos      Validación calidad
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
- [x] Agentes IA fundamentales
- [x] Sistema de seguridad básico
- [x] Integración con formulario

### Fase 2 (En progreso)
- [ ] Sistema de notificaciones push
- [ ] API para dispositivos wearables
- [ ] Análisis avanzado de progreso
- [ ] Integración con calendarios

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

*Documento actualizado: Abril 2026*
*Versión: 2.0*
*Propietario: Equipo Backend NELHEALTHCOACH*
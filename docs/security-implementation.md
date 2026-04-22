# Implementación de Seguridad en NELHEALTHCOACH

## 📋 Resumen

Esta documentación describe las medidas de seguridad implementadas en el proyecto NELHEALTHCOACH, con especial énfasis en la protección de aplicaciones de IA y datos médicos sensibles.

## 🎯 Objetivos de Seguridad

1. **Protección de API** - Prevenir ataques comunes (DDoS, inyección, bots)
2. **Seguridad de IA** - Validar prompts y respuestas de modelos de lenguaje
3. **Protección de datos** - Encriptación y validación de datos médicos
4. **Monitoreo** - Detección de comportamiento anómalo
5. **Cumplimiento** - Adherencia a regulaciones de salud (HIPAA-compatible)

## 🏗️ Arquitectura de Seguridad

```
┌─────────────────────────────────────────────────────┐
│                 NELHEALTHCOACH API                   │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Arcjet    │  │  Guardrails │  │   Auth/JWT  │  │
│  │   (WAF)     │  │     (IA)    │  │  (Acceso)   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Rate Lim   │  │   CORS      │  │  Encript.   │  │
│  │  (10/10s)   │  │  (Orígenes) │  │  (AES-256)  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 🔧 Componentes Implementados

### 1. **Arcjet - Web Application Firewall**

**Ubicación:** `apps/api/src/middleware.ts`

**Funcionalidades:**
- ✅ **Shield** - Protección contra XSS, SQLi, y otros ataques web
- ✅ **Bot Detection** - Solo permite bots conocidos (Google, LinkedIn)
- ✅ **Rate Limiting** - 10 solicitudes por 10 segundos por IP
- ✅ **Modo LIVE** - Activado para producción

**Configuración:**
```typescript
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: ["GOOGLEBOT", "LINKEDINBOT"] }),
    tokenBucket({ mode: "LIVE", refillRate: 10, interval: 10, capacity: 10 }),
  ],
});
```

### 2. **Guardrails AI - Validación de IA**

**Ubicación:** `apps/api/src/app/lib/agents/guard.ts`

**Funcionalidades:**
- ✅ **Prevención de Prompt Injection** - Detecta intentos de manipulación
- ✅ **Disclaimer Médico Obligatorio** - Todas las respuestas deben incluirlo
- ✅ **Prohibición de Medicamentos** - No permite recomendaciones de fármacos
- ✅ **Validación de JSON** - Estructura correcta para planes de salud
- ✅ **Validación de Datos Médicos** - Formato apropiado para información sensible

**Guards Específicos:**
- `nutritionPlannerGuard` - Para el planificador nutricional
- `clientAnalyzerGuard` - Para el analizador de clientes

### 3. **Integración en Agentes de LangGraph**

**Ubicación:** `apps/api/src/app/lib/agents/nodes/nutrition-planner.ts`

**Implementación:**
```typescript
// Uso de guardrails en el planificador nutricional
const nutritionPlan = await applyGuardrails(
  nutritionPlannerGuard,
  { systemPrompt, userPrompt, clientData: state },
  async (validatedInput) => {
    // Procesamiento seguro con IA
    const response = await llm.invoke(messages);
    
    // Validación adicional
    const validation = validateAIResponse(response.content);
    
    return validation.isValid ? response : fallbackResponse;
  }
);
```

## ⚙️ Configuración Requerida

### Variables de Entorno

**En `apps/api/.env`:**
```bash
# Arcjet (obtén key gratuita en https://arcjet.com)
ARCJET_KEY=tu-key-de-arcjet-aquí

# DeepSeek AI
DEEPSEEK_API_KEY=tu-api-key-de-deepseek
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-reasoner

# Seguridad
JWT_SECRET=tu-secreto-jwt-seguro
ENCRYPTION_KEY=clave-de-32-caracteres-para-encriptacion
```

### 🗝️ Cómo Obtener la API Key de Arcjet

Arcjet es un Web Application Firewall (WAF) que protege tu aplicación contra ataques comunes. Para usar Arcjet en modo producción, necesitas obtener una API key gratuita:

#### **Paso 1: Registrarse en Arcjet**
1. Visita https://arcjet.com
2. Haz clic en "Get Started" o "Sign Up"
3. Regístrate con tu email, GitHub, o Google account

#### **Paso 2: Crear un Nuevo Proyecto**
1. Una vez registrado, haz clic en "Create Project"
2. Nombra tu proyecto (ej: "nelhealthcoach-api")
3. Selecciona "Next.js" como framework (funciona con cualquier framework Node.js)

#### **Paso 3: Obtener tu API Key**
1. En el dashboard, ve a "Settings" → "API Keys"
2. Haz clic en "Generate New Key"
3. Copia la key generada (comienza con `aj_`)

#### **Paso 4: Configurar en tu Proyecto**
1. Abre el archivo `apps/api/.env`
2. Reemplaza `tu-key-de-arcjet-aquí` con tu API key real:
   ```bash
   ARCJET_KEY=aj_live_tu_key_real_aquí
   ```

#### **Paso 5: Verificar Funcionamiento**
1. Reinicia tu servidor de desarrollo: `npm run dev`
2. Verifica los logs para confirmar que Arcjet se inicializa correctamente
3. Visita https://app.arcjet.com para ver métricas y ataques bloqueados

#### **Características Gratuitas de Arcjet:**
- ✅ 10,000 solicitudes/mes gratuitas
- ✅ Rate limiting configurable
- ✅ Bot detection
- ✅ Shield contra XSS, SQLi
- ✅ Dashboard con analytics
- ✅ Alertas por email

#### **Solución de Problemas:**
- **Error "Invalid API key"**: Verifica que copiaste toda la key (incluye `aj_live_`)
- **Arcjet no bloquea ataques**: Asegúrate de que `mode: "LIVE"` está configurado en middleware.ts
- **Problemas de rate limiting**: Ajusta `tokenBucket` en la configuración del middleware

### Dependencias Instaladas

```bash
# En apps/api/
npm install @arcjet/next @openai/guardrails

# Scripts de seguridad disponibles
npm run security:check        # Verificación general
```

## 🚀 Flujo de Solicitud Segura

```
1. Cliente → Solicitud HTTP
2. Arcjet Middleware → Validación (Rate Limit, Bots, Shield)
3. Si bloqueada → Respuesta 429/403 con JSON
4. Si permitida → Logging de solicitud
5. API Endpoint → Autenticación JWT
6. Agente de IA → Guardrails (validación entrada)
7. DeepSeek API → Procesamiento
8. Agente de IA → Guardrails (validación salida)
9. Respuesta → Encriptación de datos sensibles
10. Cliente ← Respuesta segura
```

## 🔍 Reglas de Validación Específicas

### Para Planificador Nutricional:
1. **Entrada:**
   - No contener comandos de sistema (`system:`, `sudo:`)
   - No intentar revelar el prompt del sistema
   - Datos médicos con formato apropiado

2. **Salida:**
   - Debe incluir: "Consulte con profesional médico"
   - No puede recomendar medicamentos específicos
   - JSON válido con estructura esperada
   - Macros nutricionales dentro de rangos seguros

### Para Analizador de Clientes:
1. **Entrada:**
   - Validación de datos personales
   - Prevención de inyección en documentos médicos

2. **Salida:**
   - Disclaimer médico obligatorio
   - No diagnósticos médicos
   - Recomendaciones educativas solamente

## 📊 Monitoreo y Logging

### Eventos Registrados:
- **Arcjet Denials** - Solicitudes bloqueadas (rate limit, bots, shield)
- **Guardrail Triggers** - Validaciones fallidas de IA
- **Prompt Injection Attempts** - Intentos de manipulación
- **Medical Data Access** - Acceso a información sensible

### Logs Estructurados:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "WARN",
  "category": "GUARDRAILS",
  "message": "Falta disclaimer médico en respuesta",
  "metadata": {
    "agent": "nutrition-planner",
    "clientId": "client_123",
    "responseLength": 2450
  }
}
```

## 🛠️ Herramientas de Desarrollo de Seguridad

### Scripts Disponibles:
```bash
# Verificación general de seguridad
npm run security:check

# En el futuro (cuando estén disponibles):
npm run security:scan-secrets   # Escaneo de secretos en código
npm run security:scan-code      # Análisis estático de seguridad
```

### GitHub Actions:
- **security.yml** - Escaneos automáticos en CI/CD
- Verificación semanal de configuraciones
- Auditoría de dependencias
- Validación de variables de entorno

## 🔒 Consideraciones de Cumplimiento (HIPAA)

### Datos Protegidos:
- ✅ **Información Personal** - Nombre, edad, dirección (encriptados)
- ✅ **Datos Médicos** - Condiciones, alergias, medicamentos (encriptados)
- ✅ **Documentos** - PDFs médicos (encriptados en S3)
- ✅ **Recomendaciones** - Planes de salud (validados por guardrails)

### Medidas Implementadas:
1. **Encriptación de extremo a extremo** - AES-256 para datos en reposo
2. **Validación de acceso** - JWT con expiración de 24h
3. **Auditoría** - Logging completo de acceso a datos
4. **Minimización** - Solo datos necesarios procesados
5. **Responsabilidad** - Guardrails para recomendaciones médicas

## 🆘 Troubleshooting

### Problemas Comunes:

#### 1. Arcjet bloquea solicitudes legítimas
```bash
# Verificar:
# - ARCJET_KEY configurada correctamente
# - Rate limiting no demasiado restrictivo
# - Bots permitidos configurados
```

#### 2. Guardrails rechazan respuestas válidas
```bash
# Verificar:
# - Disclaimer médico incluido
# - No menciones de medicamentos
# - JSON válido y bien formado
```

#### 3. Alta latencia por validaciones
```bash
# Considerar:
# - Modo desarrollo para testing
# - Cache de validaciones frecuentes
# - Sampling para alta carga
```

### Logs de Depuración:
```typescript
// Nivel DEBUG para troubleshooting
logger.debug('SECURITY', 'Detalle de validación', {
  input: input.substring(0, 100),
  rulesApplied: ['prompt-injection', 'medical-disclaimer'],
  duration: '45ms',
});
```

## 📈 Métricas de Seguridad

### Para Monitorear:
- **Tasa de bloqueo** - Solicitudes bloqueadas / totales
- **Intentos de inyección** - Prompt injection detectados
- **Tiempo de validación** - Overhead de seguridad
- **Falsos positivos** - Validaciones incorrectas

### Alertas Recomendadas:
- ⚠️ >5% de solicitudes bloqueadas
- ⚠️ >3 intentos de prompt injection por hora
- ⚠️ Validación >200ms de promedio
- 🔴 Fuga de datos médicos detectada

## 🔄 Mantenimiento y Actualizaciones

### Tareas Periódicas:
1. **Semanal:** Revisar logs de seguridad
2. **Mensual:** Actualizar reglas de Arcjet
3. **Trimestral:** Revisar y ajustar guardrails
4. **Anual:** Auditoría completa de seguridad

### Actualización de Dependencias:
```bash
# Actualizar herramientas de seguridad
npm update @arcjet/next @openai/guardrails

# Verificar cambios breaking
npm audit --audit-level=high
```

## 🤝 Soporte y Recursos

### Documentación:
- [Arcjet Documentation](https://arcjet.com/docs)
- [OpenAI Guardrails](https://github.com/openai/guardrails)
- [NELHEALTHCOACH Security Wiki](https://github.com/tu-repo/wiki/Security)

### Contacto:
- **Responsable de Seguridad:** [Nombre/Equipo]
- **Canal de Emergencias:** #security-emergency
- **Reporte de Vulnerabilidades:** security@nelhealthcoach.com

---

**Última Actualización:** $(date)
**Versión:** 1.0.0
**Estado:** ✅ Implementado y Activo
**Próxima Revisión:** 3 meses desde implementación
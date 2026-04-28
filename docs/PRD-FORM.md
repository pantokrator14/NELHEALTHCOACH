# PRD - Formulario de Evaluación
## Documento de Requerimientos del Producto - NELHEALTHCOACH Form

---

## 1. Visión General

### 1.1 Propósito
El formulario de evaluación de NELHEALTHCOACH es la puerta de entrada para nuevos clientes, diseñado para:
- **Recopilar información completa** sobre salud, estilo de vida y objetivos
- **Crear perfil detallado** para personalización de planes
- **Establecer línea base** para medir progreso futuro
- **Filtrar y calificar** leads para el servicio de coaching

### 1.2 Alcance
- Formulario multi-paso progresivo
- Validación en tiempo real de datos médicos
- Upload de documentos médicos
- Experiencia mobile-first optimizada
- Integración con backend para procesamiento IA

---

## 2. Objetivos del Negocio

### 2.1 Objetivos Principales
1. **Completitud**: > 90% de formularios completados
2. **Calidad datos**: < 5% de errores en datos médicos
3. **Experiencia usuario**: > 4.5/5 satisfacción
4. **Conversión**: > 70% de completados a clientes activos

### 2.2 Métricas de Éxito
- **Tasa abandono**: < 10%
- **Tiempo completado**: 15-25 minutos
- **Datos válidos**: > 95% de formularios procesables
- **Satisfacción UX**: > 4.5/5 en feedback
- **Mobile completion**: > 60% desde dispositivos móviles

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
- **Framework**: Next.js 15.5 (Pages Router)
- **Lenguaje**: TypeScript
- **Gestión estado**: React Hook Form + Zustand
- **Validación**: Zod schemas
- **Estilos**: Tailwind CSS
- **Upload archivos**: Custom implementation + AWS S3
- **i18n**: React i18next (ES/EN)
- **Progress tracking**: Custom hooks

### 3.2 Estructura de Directorios
```
apps/form/
├── src/
│   ├── components/
│   │   └── [StepComponents]  # Componentes por paso
│   ├── lib/
│   │   ├── validation.ts     # Esquemas Zod
│   │   └── store.ts          # Estado global
│   ├── pages/
│   │   └── index.tsx         # Formulario principal
│   └── types/
│       └── healthForm.ts     # Tipos TypeScript
```

---

## 4. Estructura del Formulario (Multi-paso)

### 4.1 Paso 1: Datos Personales
- **Información básica**: Nombre, email, teléfono, fecha nacimiento
- **Demográficos**: Género, altura, peso actual, peso objetivo
- **Medidas corporales**: Circunferencias (opcional)
- **Fotos progreso**: Upload opcional (antes/después motivación)
- **Validación**: Email válido, rangos peso/altura realistas

### 4.2 Paso 2: Contexto de Estilo de Vida
- **Actividad física actual**: Frecuencia, tipo, intensidad
- **Acceso a equipamiento**: 
  - Gimnasio/público/privado
  - Equipo en casa (pesas, bandas, máquinas)
  - Solo peso corporal
  - Sin acceso
- **Detalles equipamiento**: Descripción específica disponible
- **Tipos ejercicio preferidos**: Cardio, fuerza, flexibilidad, etc.
- **Disponibilidad tiempo**: Horas/semana para ejercicio
- **Rutina diaria**: Horarios trabajo, sueño, comidas

### 4.3 Paso 3: Evaluaciones de Salud
#### 4.3.1 Historial Médico
- **Condiciones crónicas**: Diabetes, hipertensión, etc.
- **Lesiones previas**: Tipo, fecha, tratamiento
- **Cirugías**: Tipo, fecha, recuperación
- **Alergias**: Alimentarias, medicamentos, ambientales
- **Medicación actual**: Nombre, dosis, frecuencia

#### 4.3.2 Evaluación Física
- **Movilidad**: Problemas articulares, flexibilidad
- **Fuerza**: Nivel actual, áreas fuertes/débiles
- **Resistencia**: Capacidad cardio, recuperación
- **Dolor**: Áreas, intensidad, frecuencia
- **Limitaciones**: Restricciones médicas permanentes

### 4.4 Paso 4: Salud Mental y Hábitos
- **Estrés**: Nivel, fuentes, manejo actual
- **Sueño**: Calidad, horas, rutina
- **Energía**: Nivales durante el día
- **Motivación**: Fuentes, desafíos, apoyo
- **Hábitos actuales**: Alimentación, ejercicio, descanso
- **Adicciones**: Tabaco, alcohol, otras (opcional)

### 4.5 Paso 5: Objetivos y Preferencias
#### 5.1 Objetivos Principales
- **Pérdida peso**: Kg objetivo, timeline
- **Ganancia muscular**: Áreas focus, medidas objetivo
- **Rendimiento**: Deportivo específico
- **Salud**: Mejora marcadores, reducción medicación
- **Bienestar**: Energía, sueño, estrés

#### 5.2 Preferencias Personales
- **Estilo coaching**: Directivo/colaborativo, frecuencia contacto
- **Comunicación**: Email/app/llamadas, horarios preferidos
- **Dieta preferida**: Omnivora/vegetariana/vegana/otra
- **Alimentos favoritos/odiados**: Para personalización recetas
- **Presupuesto**: Inversión mensual esperada

### 4.6 Paso 6: Documentos y Consentimiento
- **Documentos médicos**: Informes, análisis, prescripciones (PDF/IMG)
- **Consentimiento informado**: 
  - Tratamiento datos médicos
  - Contacto comercial
  - Compartir con coach asignado
  - Términos de servicio
- **Política privacidad**: Aceptación explícita
- **Expectativas realistas**: Confirmación entendimiento proceso

### 4.7 Paso 7: Revisión y Envío
- **Resumen completo**: Todos los datos ingresados
- **Edición rápida**: Volver a cualquier paso
- **Confirmación final**: Última revisión antes de enviar
- **Pantalla éxito**: Confirmación, próximos pasos, contacto

---

## 5. Experiencia de Usuario

### 5.1 Diseño Mobile-First
- **Inputs optimizados**: Teclados específicos por tipo dato
- **Gestos**: Swipe entre pasos (opcional)
- **Offline support**: Guardado automático en localStorage
- **Progreso visible**: Barra de progreso siempre visible

### 5.2 Validación en Tiempo Real
- **Inline validation**: Errores mostrados al salir del campo
- **Medical validation**: Rangos seguros para datos médicos
- **Conditional logic**: Preguntas que aparecen según respuestas anteriores
- **Warnings**: Alertas para datos inconsistentes

### 5.3 Accesibilidad
- **WCAG 2.1 AA**: Contraste, labels, keyboard navigation
- **Screen readers**: Compatibilidad completa
- **Text size**: Ajustable sin romper layout
- **Focus management**: Navegación lógica entre campos

### 5.4 Performance
- **Lazy loading**: Componentes cargan según progreso
- **Optimized images**: Compresión automática uploads
- **Bundle size**: < 500KB inicial
- **Time to interactive**: < 3s en conexiones lentas

---

## 6. Flujos Especiales

### 6.1 Guardado y Recuperación
- **Auto-save**: Cada 30 segundos o cambio de paso
- **Session recovery**: Volver días después con mismo dispositivo
- **Email recovery**: Link para continuar en otro dispositivo
- **Export datos**: PDF resumen para usuario

### 6.2 Manejo de Errores
- **Network issues**: Reintento automático, guardado local
- **Validation errors**: Explicación clara + sugerencias corrección
- **Server errors**: Mensajes amigables + alternativas
- **Timeout handling**: Notificación + opción continuar offline

### 6.3 Flujos Condicionales
- **Menos de 18 años**: Requiere tutor + formulario adicional
- **Condiciones médicas graves**: Alertas coach + preguntas adicionales
- **Objetivos extremos**: Advertencias realistas + confirmación
- **Sin experiencia ejercicio**: Preguntas más básicas + recursos educativos

---

## 7. Integraciones

### 7.1 Backend API
- **Submit final**: `POST /api/clients` con todos los datos
- **Document upload**: `POST /api/clients/[id]/upload` progresivo
- **Validation API**: Validación adicional server-side
- **Health check**: Verificación servicios antes de enviar

### 7.2 Servicios Externos
- **AWS S3**: Almacenamiento seguro documentos
- **AWS Textract**: OCR para documentos médicos
- **Resend**: Email confirmación al usuario
- **Analytics**: Tracking eventos (completado, abandonos, etc.)

### 7.3 Seguridad
- **CSRF protection**: Tokens en formularios
- **Rate limiting**: Prevención abuso
- **Data encryption**: En tránsito (HTTPS) y reposo
- **PII masking**: En logs y analytics

---

## 8. Validación y Calidad de Datos

### 8.1 Validación Cliente-side
- **Zod schemas**: Tipado estricto TypeScript
- **Range validation**: Valores médicos realistas
- **Consistency checks**: Peso vs altura, objetivos vs timeline
- **Required fields**: Mínimo para procesamiento IA

### 8.2 Validación Server-side
- **Medical safety**: Verificación rangos seguros
- **Duplicate detection**: Clientes existentes
- **Fraud detection**: Patrones sospechosos
- **Data completeness**: Verificación todos los pasos completos

### 8.3 Calidad de Datos
- **Completeness score**: Puntuación calidad formulario
- **Flagging system**: Alertas para datos problemáticos
- **Coach review**: Herramientas dashboard para revisión manual
- **Data enrichment**: Inferencia información adicional cuando posible

---

## 9. Internacionalización

### 9.1 Idiomas Soportados
- **Español**: Primario (ES-ES)
- **Inglés**: Secundario (EN-US)
- **Catalán**: Futuro (CA-ES)
- **Portugués**: Futuro (PT-BR)

### 9.2 Adaptaciones Culturales
- **Unidades**: Métrico/Imperial según ubicación
- **Formatos fecha**: DD/MM/YYYY vs MM/DD/YYYY
- **Términos médicos**: Localizados y apropiados
- **Ejemplos**: Relevantes culturalmente

### 9.3 Localización Técnica
- **RTL support**: Para árabe/hebreo (futuro)
- **Character sets**: Soporte completo Unicode
- **Font loading**: Optimizado por idioma
- **Translation management**: Sistema para updates

---

## 10. Roadmap

### Fase 1 (Completado)
- [x] Formulario básico 7 pasos
- [x] Validación cliente-side
- [x] Upload documentos
- [x] Integración con API

### Fase 2 (En progreso)
- [ ] Save & resume avanzado
- [ ] Analytics integrados
- [ ] A/B testing variantes
- [ ] Wizard inteligente (preguntas adaptativas)

### Fase 3 (Futuro)
- [ ] Video assessments (movilidad)
- [ ] Integración wearables (datos automáticos)
- [ ] AI assistant en formulario
- [ ] Formularios especializados (deportivos, geriátricos, etc.)

---

## 11. Consideraciones Técnicas

### 11.1 Dependencias Críticas
- **API backend**: Disponibilidad submit final
- **AWS S3**: Para upload documentos
- **Validation service**: Para datos médicos
- **i18n service**: Para traducciones

### 11.2 Plan de Contingencia
- **Offline mode**: Guardado local completo
- **Degraded validation**: Validación básica sin server
- **Alternative submit**: Email fallback
- **Manual processing**: Export datos para procesamiento manual

### 11.3 Performance Considerations
- **Bundle splitting**: Por paso del formulario
- **Image optimization**: Client-side compression
- **Lazy validation**: Solo cuando necesario
- **Progressive enhancement**: Funcionalidad básica siempre disponible

---

## 12. Equipo y Responsabilidades

### 12.1 Roles
- **Frontend Lead**: Desarrollo formulario
- **UX Researcher**: Testing con usuarios
- **Medical Advisor**: Validación preguntas médicas
- **QA Engineer**: Testing cross-device/browser

### 12.2 SLA
- **Uptime**: 99.9% (formulario siempre disponible)
- **Support**: 24/7 para issues críticos
- **Updates**: Hotfixes en 24h, features mensuales
- **Backup**: Datos guardados redundantes

---

## 13. Presupuesto y Recursos

### 13.1 Costos Operativos
- **Hosting**: Vercel Pro ($20/mes)
- **Storage**: AWS S3 ($10-50/mes según uso)
- **Processing**: AWS Textract ($1-5/1000 páginas)
- **Email**: Resend ($20/mes)

### 13.2 Recursos Humanos
- **Desarrollo**: 15h/semana (mantenimiento + mejoras)
- **Design/UX**: 10h/semana (optimización conversión)
- **Medical review**: 5h/semana (validación preguntas)
- **Testing**: 5h/semana (QA cross-platform)

---

*Documento actualizado: Abril 2026*
*Versión: 2.0*
*Propietario: Equipo UX/Producto NELHEALTHCOACH*
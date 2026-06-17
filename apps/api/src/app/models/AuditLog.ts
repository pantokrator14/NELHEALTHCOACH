// apps/api/src/app/models/AuditLog.ts
// Modelo de auditoría para eventos de seguridad y acciones críticas.
// Cada fila representa un evento inmutable que persiste en MongoDB.

import mongoose, { Schema, Document } from 'mongoose';

export type AuditEventType =
  // Autenticación
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'REGISTER_SUCCESS'
  | 'REGISTER_FAILURE'
  | 'PASSWORD_CHANGE_SUCCESS'
  | 'PASSWORD_CHANGE_FAILURE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_RESET_FAILURE'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'VERIFICATION_FAILURE'
  | 'TRIAL_CARD_VERIFIED'
  // Seguridad perimetral
  | 'RATE_LIMIT_HIT'
  | 'SHIELD_BLOCK'
  | 'BOT_DETECTED'
  | 'PROMPT_INJECTION_DETECTED'
  // Cuenta
  | 'ACCOUNT_SUSPEND'
  | 'ACCOUNT_REACTIVATE'
  | 'ACCOUNT_DELETE'
  | 'EMAIL_VERIFIED'
  | 'EMAIL_CHANGE'
  // Datos críticos
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_DELETED'
  | 'RECIPE_CREATED'
  | 'RECIPE_UPDATED'
  | 'RECIPE_DELETED'
  | 'EXERCISE_CREATED'
  | 'EXERCISE_UPDATED'
  | 'EXERCISE_DELETED'
  // Pagos
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_CHANGED'
  // Admin
  | 'ADMIN_ACTION';

export interface IAuditLog extends Document {
  eventType: AuditEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';

  // Actor
  coachId?: mongoose.Types.ObjectId;
  actorEmail?: string;     // solo para trazabilidad, no se muestra en reports
  actorRole?: string;

  // Request context
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  visitorId?: string;

  // Detalles del evento
  message: string;
  metadata?: Record<string, unknown>;

  // Timestamp
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS', 'LOGIN_FAILURE',
        'REGISTER_SUCCESS', 'REGISTER_FAILURE',
        'PASSWORD_CHANGE_SUCCESS', 'PASSWORD_CHANGE_FAILURE',
        'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'PASSWORD_RESET_FAILURE',
        'LOGOUT', 'TOKEN_REFRESH',
        'RATE_LIMIT_HIT', 'SHIELD_BLOCK', 'BOT_DETECTED', 'PROMPT_INJECTION_DETECTED',
        'ACCOUNT_SUSPEND', 'ACCOUNT_REACTIVATE', 'ACCOUNT_DELETE',
        'EMAIL_VERIFIED', 'EMAIL_CHANGE',
        'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED',
        'RECIPE_CREATED', 'RECIPE_UPDATED', 'RECIPE_DELETED',
        'EXERCISE_CREATED', 'EXERCISE_UPDATED', 'EXERCISE_DELETED',
        'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'SUBSCRIPTION_CHANGED',
        'ADMIN_ACTION',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info',
    },

    // Actor
    coachId: { type: Schema.Types.ObjectId, ref: 'Coach', index: true },
    actorEmail: { type: String },
    actorRole: { type: String },

    // Request context
    ip: { type: String },
    userAgent: { type: String },
    path: { type: String },
    method: { type: String },
    statusCode: { type: Number },
    requestId: { type: String, index: true },
    visitorId: { type: String },

    // Detalles
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },

    createdAt: { type: Date, default: Date.now },
  },
  {
    // No permitir actualizaciones ni eliminar — el audit log es inmutable
    // Usamos el _id como secuencia, createdAt nos da el orden
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Índices para consultas rápidas de auditoría
AuditLogSchema.index({ eventType: 1, createdAt: -1 });
AuditLogSchema.index({ coachId: 1, createdAt: -1 });
AuditLogSchema.index({ ip: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
// TTL: auto-expirar logs viejos después de 90 días
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export default mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

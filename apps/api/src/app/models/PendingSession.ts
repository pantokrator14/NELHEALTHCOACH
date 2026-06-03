// apps/api/src/app/models/PendingSession.ts
// Modelo para sesiones pendientes de pago (solicitadas por coach o cliente)

import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingSession extends Document {
  /** ID del cliente en MongoDB */
  clientId: string;
  /** Nombre del cliente (para notificaciones) */
  clientName: string;
  /** Email del cliente */
  clientEmail: string;
  /** ID del coach que solicitó (si fue el coach) */
  coachId: string;
  /** Fecha propuesta para la sesión */
  proposedDate: Date;
  /** Duración en minutos */
  duration: number;
  /** Notas del coach para la sesión */
  coachNotes?: string;
  /** Zona horaria */
  timezone?: string;
  /** Estado del pago */
  status: 'awaiting_payment' | 'paid' | 'completed' | 'cancelled';
  /** ID de la sesión de Stripe (se llena después del checkout) */
  stripeSessionId: string;
  /** ID del cliente de Stripe */
  stripeCustomerId: string;
  /** Fecha de confirmación del pago */
  paymentConfirmedAt: Date | null;
  /** Quién inició la solicitud: 'coach' | 'client' */
  requestedBy: 'coach' | 'client';
  /** Fecha de expiración (24h para pagar) */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingSessionSchema = new Schema<IPendingSession>(
  {
    clientId: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
      required: true,
    },
    coachId: {
      type: String,
      required: true,
    },
    proposedDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 60,
    },
    coachNotes: {
      type: String,
      default: '',
    },
    timezone: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['awaiting_payment', 'paid', 'completed', 'cancelled'],
      default: 'awaiting_payment',
    },
    stripeSessionId: {
      type: String,
      default: '',
    },
    stripeCustomerId: {
      type: String,
      default: '',
    },
    paymentConfirmedAt: {
      type: Date,
      default: null,
    },
    requestedBy: {
      type: String,
      enum: ['coach', 'client'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: borra automáticamente sesiones pendientes expiradas (24h)
PendingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingSession ||
  mongoose.model<IPendingSession>('PendingSession', PendingSessionSchema);

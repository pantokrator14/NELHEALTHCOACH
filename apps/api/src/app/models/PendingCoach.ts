// apps/api/src/app/models/PendingCoach.ts
// Modelo temporal para coaches que inician el registro pero aún no pagan

import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingCoach extends Document {
  /** Token único que identifica este registro pendiente */
  token: string;
  /** Email del coach (sin encriptar, solo para el checkout) */
  email: string;
  /** Contrato de coach aceptado */
  contractAccepted: boolean;
  /** Estado del pago */
  paymentStatus: 'pending' | 'completed' | 'expired';
  /** ID del cliente de Stripe (se llena después del checkout) */
  stripeCustomerId: string;
  /** ID de la suscripción en Stripe */
  subscriptionId: string;
  /** Fecha de expiración (el registro pendiente expira en 1 hora) */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingCoachSchema = new Schema<IPendingCoach>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    contractAccepted: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'expired'],
      default: 'pending',
    },
    stripeCustomerId: {
      type: String,
      default: '',
    },
    subscriptionId: {
      type: String,
      default: '',
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

// TTL index: borra automáticamente documentos expirados
PendingCoachSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingCoach ||
  mongoose.model<IPendingCoach>('PendingCoach', PendingCoachSchema);

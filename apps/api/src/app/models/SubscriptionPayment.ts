// apps/api/src/app/models/SubscriptionPayment.ts
// Historial de pagos de suscripción del coach (se llena desde webhook invoice.paid)

import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPayment extends Document {
  coachId: string;
  amount: number;
  invoiceId: string;
  subscriptionId: string;
  customerId: string;
  paidAt: Date;
  createdAt: Date;
}

const SubscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    coachId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    invoiceId: {
      type: String,
      required: true,
      unique: true,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    paidAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SubscriptionPaymentSchema.index({ coachId: 1, paidAt: -1 });

export default mongoose.models.SubscriptionPayment ||
  mongoose.model<ISubscriptionPayment>('SubscriptionPayment', SubscriptionPaymentSchema);

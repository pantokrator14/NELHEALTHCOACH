// apps/api/src/app/models/StripePayout.ts
// Historial de retiros de Stripe a la cuenta bancaria
// Admin: sin coachId (payouts de la cuenta principal)
// Coach: con coachId (payouts de su cuenta Stripe Connect)
// Se sincroniza desde la API de Stripe (payouts.list)

import mongoose, { Schema, Document } from 'mongoose';

export interface IStripePayout extends Document {
  payoutId: string;
  coachId?: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: Date;
  created: Date;
  description: string;
  bankAccount: string;
  failureMessage?: string;
  createdAt: Date;
}

const StripePayoutSchema = new Schema<IStripePayout>(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
    },
    coachId: {
      type: String,
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    status: {
      type: String,
      required: true,
      enum: ['paid', 'pending', 'in_transit', 'canceled', 'failed'],
    },
    arrivalDate: {
      type: Date,
      required: true,
    },
    created: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    bankAccount: {
      type: String,
      default: '',
    },
    failureMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StripePayoutSchema.index({ arrivalDate: -1 });
StripePayoutSchema.index({ coachId: 1, arrivalDate: -1 });

export default mongoose.models.StripePayout ||
  mongoose.model<IStripePayout>('StripePayout', StripePayoutSchema);

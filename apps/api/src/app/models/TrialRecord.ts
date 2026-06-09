// apps/api/src/app/models/TrialRecord.ts
// Registro mínimo de prueba gratuita para prevenir re-registro trial
// Solo almacena el hash del email (SHA-256, sin PII)
// NUNCA se elimina (persiste aunque la cuenta del coach se borre)

import mongoose, { Schema, Document } from 'mongoose';

export interface ITrialRecord extends Document {
  /** SHA-256 hash del email (único, indexed) */
  emailHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrialRecordSchema = new Schema<ITrialRecord>(
  {
    emailHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.TrialRecord ||
  mongoose.model<ITrialRecord>('TrialRecord', TrialRecordSchema);

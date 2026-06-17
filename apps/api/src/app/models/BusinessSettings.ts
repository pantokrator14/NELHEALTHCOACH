// apps/api/src/app/models/BusinessSettings.ts
// Configuración fiscal de NELHEALTHCOACH, LLC
// Solo existe un documento (singleton)

import mongoose, { Schema, Document } from 'mongoose';

export interface ICaliforniaLLC {
  fileNumber?: string;
  annualFee: number;
  annualFeePaid: boolean;
  lastFeeDate?: Date;
}

export interface IBusinessSettings extends Document {
  companyName: string;
  ein: string;              // Encriptado
  state: string;
  entityType: string;
  accountingMethod: 'cash' | 'accrual';
  fiscalYearStart: string;  // 'MM-DD'
  naicsCode?: string;
  registeredAgent?: string;
  californiaLLC: ICaliforniaLLC;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSettingsSchema = new Schema<IBusinessSettings>(
  {
    companyName: {
      type: String,
      required: true,
      default: 'NELHEALTHCOACH, LLC',
    },
    ein: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
      default: 'California',
    },
    entityType: {
      type: String,
      required: true,
      default: 'LLC',
    },
    accountingMethod: {
      type: String,
      enum: ['cash', 'accrual'],
      default: 'cash',
    },
    fiscalYearStart: {
      type: String,
      default: '01-01',
    },
    naicsCode: {
      type: String,
    },
    registeredAgent: {
      type: String,
    },
    californiaLLC: {
      type: {
        fileNumber: String,
        annualFee: { type: Number, default: 800 },
        annualFeePaid: { type: Boolean, default: false },
        lastFeeDate: Date,
      },
      default: {
        annualFee: 800,
        annualFeePaid: false,
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export default mongoose.models.BusinessSettings ||
  mongoose.model<IBusinessSettings>('BusinessSettings', BusinessSettingsSchema);

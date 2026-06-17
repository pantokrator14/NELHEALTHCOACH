// apps/api/src/app/models/BusinessTransaction.ts
// Registro unificado de ingresos y gastos del negocio NELHEALTHCOACH, LLC
//
// Admin: transacciones manuales (gastos, otros ingresos) + automáticas (de plataforma)
// Coach normal: no usa este modelo

import mongoose, { Schema, Document } from 'mongoose';

// ─── Categorías fiscales predefinidas (Schedule C + Form 568) ───

export const TAX_CATEGORIES = [
  {
    key: 'advertising',
    label: 'Advertising',
    scheduleCLine: 8,
    description: 'Advertising, marketing, promotions',
    type: 'expense' as const,
  },
  {
    key: 'commissions_fees',
    label: 'Commissions & Fees',
    scheduleCLine: 10,
    description: 'Stripe fees, payment processing, commissions',
    type: 'expense' as const,
  },
  {
    key: 'contract_labor',
    label: 'Contract Labor',
    scheduleCLine: 11,
    description: '1099 contractors, freelancers, developers',
    type: 'expense' as const,
  },
  {
    key: 'legal_professional',
    label: 'Legal & Professional',
    scheduleCLine: 17,
    description: 'Accountant, lawyer, CPA, consulting',
    type: 'expense' as const,
  },
  {
    key: 'office_expense',
    label: 'Office Expense',
    scheduleCLine: 18,
    description: 'Software subscriptions, SaaS tools, office supplies',
    type: 'expense' as const,
  },
  {
    key: 'supplies',
    label: 'Supplies',
    scheduleCLine: 22,
    description: 'Office supplies, materials',
    type: 'expense' as const,
  },
  {
    key: 'taxes_licenses',
    label: 'Taxes & Licenses',
    scheduleCLine: 23,
    description: 'CA LLC annual fee, business licenses, registered agent',
    type: 'expense' as const,
  },
  {
    key: 'travel',
    label: 'Travel',
    scheduleCLine: 24,
    description: 'Business travel, transportation, lodging',
    type: 'expense' as const,
  },
  {
    key: 'meals',
    label: 'Meals (50% deductible)',
    scheduleCLine: 24,
    description: 'Business meals — 50% deductible',
    type: 'expense' as const,
  },
  {
    key: 'utilities',
    label: 'Utilities',
    scheduleCLine: 25,
    description: 'Internet, phone, utilities',
    type: 'expense' as const,
  },
  {
    key: 'other_expense',
    label: 'Other Expenses',
    scheduleCLine: 27,
    description: 'Other business expenses (itemize on attachment)',
    type: 'expense' as const,
  },
  {
    key: 'platform_income',
    label: 'Platform Income',
    scheduleCLine: 1,
    description: 'Income from platform operations (sessions, subscriptions)',
    type: 'income' as const,
  },
  {
    key: 'other_income',
    label: 'Other Income',
    scheduleCLine: 6,
    description: 'Other business income not from platform',
    type: 'income' as const,
  },
] as const;

export type TaxCategoryKey = typeof TAX_CATEGORIES[number]['key'];

// ─── Subcategorías de gastos ───

export const EXPENSE_SUBCATEGORIES: Record<string, string[]> = {
  other_expense: [
    'ai_apis',
    'cloud_hosting',
    'database',
    'email_service',
    'video_service',
    'domain_names',
    'development',
    'dev_tools',
    'insurance',
    'bank_fees',
    'other',
  ],
  office_expense: [
    'software_saas',
    'office_supplies',
    'equipment',
    'other',
  ],
  commissions_fees: [
    'stripe_fees',
    'paypal_fees',
    'other',
  ],
  contract_labor: [
    'developers',
    'designers',
    'virtual_assistant',
    'other',
  ],
  advertising: [
    'google_ads',
    'facebook_ads',
    'seo',
    'social_media',
    'other',
  ],
};

// ─── Interface ───

export interface IReceiptFile {
  s3Key: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface IPlatformReference {
  model: 'PendingSession' | 'SubscriptionPayment' | 'StripePayout';
  modelId: string;
  stripeId?: string;
}

export interface IBusinessTransaction extends Document {
  type: 'income' | 'expense';
  source: 'platform_auto' | 'manual';
  amount: number;         // en cents
  currency: string;
  date: Date;
  description: string;
  category: TaxCategoryKey;
  subcategory: string;
  vendor?: string;
  paymentMethod?: string;
  notes?: string;
  isRecurring: boolean;
  recurringPeriod?: 'monthly' | 'quarterly' | 'annually';
  receiptFile?: IReceiptFile;
  platformReference?: IPlatformReference;
  isDeductible: boolean;
  deductionPercentage: number;  // 100 = full, 50 = meals
  taxYear: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───

const BusinessTransactionSchema = new Schema<IBusinessTransaction>(
  {
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['platform_auto', 'manual'],
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: TAX_CATEGORIES.map(c => c.key),
      index: true,
    },
    subcategory: {
      type: String,
      default: 'other',
    },
    vendor: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPeriod: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually'],
    },
    receiptFile: {
      type: Schema.Types.Mixed,
    },
    platformReference: {
      type: {
        model: {
          type: String,
          enum: ['PendingSession', 'SubscriptionPayment', 'StripePayout'],
        },
        modelId: String,
        stripeId: String,
      },
    },
    isDeductible: {
      type: Boolean,
      default: true,
    },
    deductionPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    taxYear: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// ─── Indexes ───

BusinessTransactionSchema.index({ taxYear: 1, type: 1, category: 1 });
BusinessTransactionSchema.index({ taxYear: 1, date: -1 });
BusinessTransactionSchema.index({ 'platformReference.modelId': 1 }, { sparse: true });

export default mongoose.models.BusinessTransaction ||
  mongoose.model<IBusinessTransaction>('BusinessTransaction', BusinessTransactionSchema);

// apps/api/src/app/models/ClientAccount.ts
import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import type { PlanId } from '@/app/lib/plans';

export interface IPurchasedPlan {
  planId: PlanId;
  planName: string;
  amountCents: number;
  stripeSessionId: string;
  status: 'paid' | 'refunded';
  purchasedAt: Date;
  livekitCreditsTotal: number;
  livekitCreditsUsed: number;
}

export interface IClientAccount extends Document {
  email: string;
  emailHash: string;
  passwordHash: string;
  coachId: string;
  emailVerified: boolean;
  verificationCodeHash: string | null;
  verificationCodeExpiresAt: Date | null;
  verificationCodeAttempts: number;
  verificationLastSentAt: Date | null;
  selectedPlanId: PlanId | null;
  activePlanId: PlanId | null;
  purchasedPlans: IPurchasedPlan[];
  healthFormId: string | null;
  lastCompletionEmailPlanCount?: number;
  lastCompletionEmailSentAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PurchasedPlanSchema = new Schema<IPurchasedPlan>(
  {
    planId: {
      type: String,
      enum: ['consult_1on1', 'reto_tres_nel', 'plan_1_reinicio', 'plan_2_transformacion', 'plan_3_maestria'],
      required: true,
    },
    planName: { type: String, required: true },
    amountCents: { type: Number, required: true },
    stripeSessionId: { type: String, required: true },
    status: { type: String, enum: ['paid', 'refunded'], default: 'paid' },
    purchasedAt: { type: Date, default: Date.now },
    livekitCreditsTotal: { type: Number, default: 0 },
    livekitCreditsUsed: { type: Number, default: 0 },
  },
  { _id: false }
);

const ClientAccountSchema = new Schema<IClientAccount>(
  {
    email: { type: String, required: true },
    emailHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    coachId: { type: String, required: true, index: true },
    emailVerified: { type: Boolean, default: false },
    verificationCodeHash: { type: String, default: null },
    verificationCodeExpiresAt: { type: Date, default: null },
    verificationCodeAttempts: { type: Number, default: 0 },
    verificationLastSentAt: { type: Date, default: null },
    selectedPlanId: { type: String, default: null },
    activePlanId: { type: String, default: null },
    purchasedPlans: { type: [PurchasedPlanSchema], default: [] },
    healthFormId: { type: String, default: null },
    lastCompletionEmailPlanCount: { type: Number, default: 0 },
    lastCompletionEmailSentAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'client_accounts',
  }
);

const OTP_SECRET =
  process.env.EMAIL_HASH_SECRET || process.env.JWT_SECRET || '';

export function hashVerificationCode(emailLower: string, code: string): string {
  const normalizedEmail = emailLower.toLowerCase().trim();
  const cleanCode = code.trim();
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${normalizedEmail}:${cleanCode}`)
    .digest('hex');
}

export function verifyHashedCode(
  emailLower: string,
  submittedCode: string,
  storedHash: string | null
): boolean {
  if (!storedHash) return false;
  const candidate = hashVerificationCode(emailLower, submittedCode);
  const bufA = Buffer.from(candidate, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default mongoose.models.ClientAccount ||
  mongoose.model<IClientAccount>('ClientAccount', ClientAccountSchema);

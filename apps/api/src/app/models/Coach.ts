import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface ICoach extends Document {
  email: string;
  emailHash: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhoto?: {
    url: string;
    key: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
  };
  role: 'admin' | 'coach';
  emailVerified: boolean;
  verificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  isActive: boolean;
  /** ID del cliente en Stripe (encriptado) */
  stripeCustomerId?: string;
  /** ID de la suscripción en Stripe */
  subscriptionId?: string;
  /** Estado de la suscripción: active, past_due, canceled, incomplete */
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'incomplete';
  /** ID de cuenta Connect Express en Stripe (no encriptado, es público) */
  stripeConnectAccountId?: string;
  /** El coach completó el onboarding de Stripe Connect */
  stripeOnboardingComplete?: boolean;
  /** Stripe habilitó los pagos para esta cuenta */
  stripePayoutsEnabled?: boolean;
  /** Precio por sesión en centavos USD (ej. 15000 = $150.00) */
  sessionPrice?: number;
  /** Estado del trial gratuito */
  trialStatus?: 'none' | 'active' | 'expired' | 'converted';
  /** Fecha de inicio del trial */
  trialStartDate?: Date | null;
  /** Fecha de fin del trial */
  trialEndDate?: Date | null;
  /** ID del PaymentMethod de Stripe guardado para cobros futuros (encriptado) */
  trialPaymentMethodId?: string;
  /** ID del PaymentIntent del $1 de verificación (para trackear reembolso) */
  trialPaymentIntentId?: string;
  /** Título profesional del coach (ej: "Coach certificado en nutrición") — encriptado */
  professionalTitle?: string;
  /** Especialidades del coach (ej: ["weightLoss", "sportsNutrition"]) — array encriptado (JSON string) */
  specialties?: string[];
  /** Años de experiencia */
  yearsOfExperience?: number;
  /** Biografía / resumen profesional — encriptado */
  bio?: string;
  /** Zona horaria del coach (ej: "America/Los_Angeles") */
  timezone?: string;
  /** Cuenta suspendida temporalmente por el coach */
  isSuspended?: boolean;
  /** Aceptación del acuerdo de asesor (evidencia de consentimiento) */
  contractAccepted?: boolean;
  /** Versión del acuerdo de asesor aceptada (ej. "1.0") */
  contractVersion?: string;
  /** Fecha y hora de aceptación del acuerdo */
  contractAcceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CoachSchema = new Schema<ICoach>(
  {
    email: {
      type: String,
      required: true,
    },
    emailHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    profilePhoto: {
      url: { type: String, default: '' },
      key: { type: String, default: '' },
      name: { type: String, default: '' },
      type: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: String, default: '' },
    },
    role: {
      type: String,
      enum: ['admin', 'coach'],
      default: 'coach',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stripeCustomerId: {
      type: String,
      default: '',
    },
    subscriptionId: {
      type: String,
      default: '',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'incomplete'],
      default: 'incomplete',
    },
    stripeConnectAccountId: {
      type: String,
      default: '',
    },
    stripeOnboardingComplete: {
      type: Boolean,
      default: false,
    },
    stripePayoutsEnabled: {
      type: Boolean,
      default: false,
    },
    sessionPrice: {
      type: Number,
      default: 15000, // $150 USD en centavos (valor por defecto)
    },
    trialStatus: {
      type: String,
      enum: ['none', 'active', 'expired', 'converted'],
      default: 'none',
    },
    trialStartDate: {
      type: Date,
      default: null,
    },
    trialEndDate: {
      type: Date,
      default: null,
    },
    trialPaymentMethodId: {
      type: String,
      default: '',
    },
    trialPaymentIntentId: {
      type: String,
      default: '',
    },
    professionalTitle: {
      type: String,
      default: '',
    },
    specialties: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    bio: {
      type: String,
      default: '',
    },
    timezone: {
      type: String,
      default: '',
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    contractAccepted: {
      type: Boolean,
      default: false,
    },
    contractVersion: {
      type: String,
      default: '',
    },
    contractAcceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// SEC-10: hash de email con HMAC-SHA256 + clave secreta (formato v2:).
// - hashEmail(): genera el hash NUEVO (v2) — usado para escrituras nuevas.
// - emailHashVariants(): [v2, legacy] para búsquedas duales ($in).
// - El formato legacy (sha256 plano) se mantiene solo para lectura de
//   registros creados antes del fix (formato dual, igual que SEC-03).
const EMAIL_HASH_SECRET =
  process.env.EMAIL_HASH_SECRET || process.env.JWT_SECRET || '';

export function hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  return `v2:${crypto
    .createHmac('sha256', EMAIL_HASH_SECRET)
    .update(normalized)
    .digest('hex')}`;
}

/** Hash legacy (sha256 plano) — solo para lecturas de datos pre-SEC-10 */
export function legacyHashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/** Variantes de hash para búsqueda dual (nuevo + legacy) */
export function emailHashVariants(email: string): string[] {
  return [hashEmail(email), legacyHashEmail(email)];
}

export default mongoose.models.Coach || mongoose.model<ICoach>('Coach', CoachSchema);

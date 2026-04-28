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
  },
  {
    timestamps: true,
  }
);

// Helper para generar hash de email
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

export default mongoose.models.Coach || mongoose.model<ICoach>('Coach', CoachSchema);

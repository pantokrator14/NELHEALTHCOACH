// apps/api/src/app/models/Notification.ts
// Modelo para notificaciones in-app del dashboard

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  coachId: mongoose.Types.ObjectId;
  type:
    | 'new_client'
    | 'payment_received'
    | 'session_scheduled'
    | 'session_reminder'
    | 'session_paid'
    | 'trial_ending'
    | 'trial_expired'
    | 'ai_recommendations_ready'
    // Retiros bancarios
    | 'payout_initiated'
    | 'payout_paid'
    | 'payout_failed'
    // Moderación de contenido
    | 'recipe_approved'
    | 'recipe_rejected'
    | 'exercise_approved'
    | 'exercise_rejected'
    // Cuenta
    | 'password_changed'
    | 'email_changed'
    | 'document_processed';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'new_client',
        'payment_received',
        'session_scheduled',
        'session_reminder',
        'session_paid',
        'trial_ending',
        'trial_expired',
        'ai_recommendations_ready',
        'payout_initiated',
        'payout_paid',
        'payout_failed',
        'recipe_approved',
        'recipe_rejected',
        'exercise_approved',
        'exercise_rejected',
        'password_changed',
        'email_changed',
        'document_processed',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

NotificationSchema.index({ coachId: 1, read: 1, createdAt: -1 });

export default (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);

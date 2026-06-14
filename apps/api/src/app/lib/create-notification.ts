// apps/api/src/app/lib/create-notification.ts
// Función auxiliar para crear notificaciones desde cualquier parte del backend

import { connectMongoose } from './database';
import Notification from '@/app/models/Notification';
import { logger } from './logger';

type NotificationType =
  | 'new_client'
  | 'payment_received'
  | 'session_scheduled'
  | 'session_reminder'
  | 'session_paid'
  | 'trial_ending'
  | 'trial_expired'
  | 'ai_recommendations_ready'
  | 'payout_initiated'
  | 'payout_paid'
  | 'payout_failed'
  | 'recipe_approved'
  | 'recipe_rejected'
  | 'exercise_approved'
  | 'exercise_rejected'
  | 'password_changed'
  | 'email_changed';

interface CreateNotificationParams {
  coachId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await connectMongoose();

    await Notification.create({
      coachId: params.coachId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || '',
    });
  } catch (error) {
    logger.error('NOTIFICATIONS', 'Error creating notification', error as Error);
  }
}

// apps/api/src/app/inngest/functions/session-reminders.ts
//
// Función Inngest que se ejecuta cada 5 minutos (cron: */5 * * * *)
// para revisar todas las sesiones de videollamada agendadas y enviar
// recordatorios:
//
// 1. Recordatorio matutino ("Hoy es tu videollamada")
//    → Si la sesión es hoy, entre 6-11 AM, y no se ha enviado antes.
//
// 2. Recordatorio 5 minutos antes ("Tu videollamada va a empezar")
//    → Si la sesión comienza en los próximos minutos.

import { inngest } from '../client';
import { getHealthFormsCollection } from '@/app/lib/database';
import { EmailService } from '@/app/lib/email-service';
import { decrypt } from '@/app/lib/encryption';
import type { VideoSession } from '../../../../../../packages/types';
import { logger } from '@/app/lib/logger';
import { ObjectId } from 'mongodb';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const FIVE_MIN_WINDOW_START = 2; // minutos
const FIVE_MIN_WINDOW_END = 8; // minutos
const MORNING_HOUR_START = 6; // 6 AM
const MORNING_HOUR_END = 11; // 11 AM

// ─────────────────────────────────────────────
// Helper: comparar si una fecha es "hoy"
// ─────────────────────────────────────────────

function isToday(date: Date, timezone?: string): boolean {
  const now = new Date();
  if (timezone) {
    const nowTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const dateTz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (
      nowTz.getFullYear() === dateTz.getFullYear() &&
      nowTz.getMonth() === dateTz.getMonth() &&
      nowTz.getDate() === dateTz.getDate()
    );
  }
  return (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  );
}

// ─────────────────────────────────────────────
// Inngest Function
// ─────────────────────────────────────────────

export const sendSessionRemindersFn = inngest.createFunction(
  {
    id: 'send-session-reminders',
    name: 'Enviar recordatorios de videollamadas',
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async ({ step }) => {
    const emailService = EmailService.getInstance();
    const collection = await getHealthFormsCollection();
    const now = new Date();

    let checkedSessions = 0;
    let morningSent = 0;
    let fiveMinSent = 0;

    logger.info('REMINDER', 'Ejecutando revisión de recordatorios');

    const cursor = collection.find(
      { 'videoSessions.status': 'scheduled' },
      { projection: { _id: 1, personalData: 1, videoSessions: 1 } }
    );

    for await (const doc of cursor) {
      const clientId = doc._id.toString();
      const rawPersonal = doc.personalData as Record<string, unknown> | undefined;
      const sessions = (doc.videoSessions as VideoSession[]) || [];
      const pendingSessions = sessions.filter((s) => s.status === 'scheduled');

      for (const session of pendingSessions) {
        checkedSessions++;

        try {
          const scheduledAt = new Date(session.scheduledAt);
          const diffMs = scheduledAt.getTime() - now.getTime();
          const diffMinutes = diffMs / 1000 / 60;

          // ── Recordatorio matutino ──
          const currentHour = now.getHours();
          if (
            isToday(scheduledAt, session.timezone) &&
            currentHour >= MORNING_HOUR_START &&
            currentHour < MORNING_HOUR_END &&
            !session.morningReminderSentAt &&
            diffMinutes > FIVE_MIN_WINDOW_END
          ) {
            const clientEmail = rawPersonal?.email ? decrypt(rawPersonal.email as string) : '';
            const clientName = rawPersonal?.name ? decrypt(rawPersonal.name as string) : 'Cliente';

            if (!clientEmail || !session.clientJoinLink) {
              logger.warn('REMINDER', 'Datos insuficientes para recordatorio matutino', { clientId });
              continue;
            }

            const timezone = session.timezone || 'UTC';
            const timeString = scheduledAt.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: timezone,
            });

            const sent = await emailService.sendSessionReminderToday(clientEmail, {
              clientName,
              sessionNumber: session.sessionNumber,
              scheduledDate: scheduledAt,
              scheduledTime: timeString,
              durationMinutes: session.durationMinutes,
              joinLink: session.clientJoinLink,
              timeZone: timezone,
            });

            if (sent) {
              await collection.updateOne(
                { _id: new ObjectId(clientId) },
                { $set: { 'videoSessions.$[s].morningReminderSentAt': new Date(), updatedAt: new Date() } },
                { arrayFilters: [{ 's.sessionId': session.sessionId }] }
              );
              morningSent++;
            }
          }

          // ── Recordatorio 5 minutos antes ──
          if (
            diffMinutes >= FIVE_MIN_WINDOW_START &&
            diffMinutes <= FIVE_MIN_WINDOW_END &&
            !session.fiveMinReminderSentAt
          ) {
            const clientEmail = rawPersonal?.email ? decrypt(rawPersonal.email as string) : '';
            const clientName = rawPersonal?.name ? decrypt(rawPersonal.name as string) : 'Cliente';

            if (!clientEmail || !session.clientJoinLink) {
              logger.warn('REMINDER', 'Datos insuficientes para recordatorio 5min', { clientId });
              continue;
            }

            const timezone = session.timezone || 'UTC';
            const timeString = scheduledAt.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: timezone,
            });

            const sent = await emailService.sendSessionReminderSoon(clientEmail, {
              clientName,
              sessionNumber: session.sessionNumber,
              scheduledDate: scheduledAt,
              scheduledTime: timeString,
              durationMinutes: session.durationMinutes,
              joinLink: session.clientJoinLink,
              timeZone: timezone,
            });

            if (sent) {
              await collection.updateOne(
                { _id: new ObjectId(clientId) },
                {
                  $set: {
                    'videoSessions.$[s].fiveMinReminderSentAt': new Date(),
                    'videoSessions.$[s].clientRemindedAt': new Date(),
                    updatedAt: new Date(),
                  },
                },
                { arrayFilters: [{ 's.sessionId': session.sessionId }] }
              );
              fiveMinSent++;
            }
          }
        } catch (sessionError: unknown) {
          const errMsg = sessionError instanceof Error ? sessionError.message : 'Error desconocido';
          logger.error('REMINDER', `Error en sesión ${session.sessionId}: ${errMsg}`);
        }
      }
    }

    logger.info('REMINDER', 'Revisión completada', { checkedSessions, morningSent, fiveMinSent });
    return { checkedSessions, morningSent, fiveMinSent };
  }
) as unknown as ReturnType<typeof inngest.createFunction<never>>;

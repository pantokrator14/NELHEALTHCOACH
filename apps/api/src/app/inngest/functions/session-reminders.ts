// apps/api/src/app/inngest/functions/session-reminders.ts
//
// Función Inngest que se ejecuta cada 5 minutos (cron: */5 * * * *)
// para revisar todas las sesiones de videollamada agendadas y enviar
// recordatorios con adaptación de zona horaria independiente para:
//   - El cliente (su zona horaria registrada o inferida de su dirección)
//   - El asesor Manuel Martínez (California: America/Los_Angeles por defecto)
//
// 1. Recordatorio anticipado ("Hoy es tu videollamada"):
//    → En el día local del destinatario (6–11 AM local, o dentro de las 2h previas si se agendó tarde),
//      reclamado atómicamente en MongoDB para evitar duplicados.
//
// 2. Recordatorio inminente ("Tu videollamada va a empezar"):
//    → Dentro de los 15 minutos previos al inicio (0 <= diffMinutes <= 15),
//      para cliente (email) y asesor (email + notificación in-app).

import { inngest } from '../client';
import { getHealthFormsCollection, connectMongoose } from '@/app/lib/database';
import { EmailService } from '@/app/lib/email-service';
import { decrypt } from '@/app/lib/encryption';
import Coach from '@/app/models/Coach';
import type { VideoSession } from '../../../../../../packages/types';
import { logger } from '@/app/lib/logger';
import { ObjectId } from 'mongodb';
import { createNotification } from '@/app/lib/create-notification';
import {
  DEFAULT_COACH_TIMEZONE,
  resolveClientTimezone,
  resolveCoachTimezone,
  getLocalTimeParts,
  isSameLocalDay,
  formatTimeInTimezone,
  formatTimeWithZoneLabel,
} from '@/app/lib/timezone';

const IMMINENT_WINDOW_MINUTES = 15;
const MORNING_HOUR_START = 6;
const MORNING_HOUR_END = 11;

interface CoachLookupInfo {
  email: string;
  name: string;
  timezone: string;
}

export const sendSessionRemindersFn = inngest.createFunction(
  {
    id: 'send-session-reminders',
    name: 'Enviar recordatorios de videollamadas',
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async () => {
    await connectMongoose();
    const emailService = EmailService.getInstance();
    const collection = await getHealthFormsCollection();
    const now = new Date();
    const appUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

    let checkedSessions = 0;
    let clientMorningSent = 0;
    let coachMorningSent = 0;
    let clientImminentSent = 0;
    let coachImminentSent = 0;

    const coachCache = new Map<string, CoachLookupInfo | null>();

    const getCoachInfo = async (rawCoachId: unknown): Promise<CoachLookupInfo | null> => {
      if (!rawCoachId) return null;
      const coachIdStr =
        typeof rawCoachId === 'object' && rawCoachId !== null
          ? rawCoachId.toString()
          : String(rawCoachId);
      if (coachCache.has(coachIdStr)) {
        return coachCache.get(coachIdStr) ?? null;
      }
      try {
        const coachDoc = (await Coach.findById(coachIdStr)
          .select('email firstName timezone')
          .lean()) as Record<string, unknown> | null;
        if (!coachDoc || !coachDoc.email) {
          coachCache.set(coachIdStr, null);
          return null;
        }
        const info: CoachLookupInfo = {
          email: decrypt(String(coachDoc.email)),
          name: coachDoc.firstName ? decrypt(String(coachDoc.firstName)) : 'Manuel',
          timezone: resolveCoachTimezone(coachDoc.timezone as string | undefined),
        };
        coachCache.set(coachIdStr, info);
        return info;
      } catch {
        coachCache.set(coachIdStr, null);
        return null;
      }
    };

    logger.info('REMINDER', 'Ejecutando revisión de recordatorios dual-timezone');

    const cursor = collection.find(
      { 'videoSessions.status': 'scheduled' },
      { projection: { _id: 1, coachId: 1, personalData: 1, videoSessions: 1 } }
    );

    for await (const doc of cursor) {
      const clientId = doc._id.toString();
      const rawPersonal = doc.personalData as Record<string, unknown> | undefined;
      const sessions = (doc.videoSessions as VideoSession[]) || [];
      const pendingSessions = sessions.filter((s) => s.status === 'scheduled');

      if (pendingSessions.length === 0) continue;

      const clientEmail = rawPersonal?.email ? decrypt(String(rawPersonal.email)) : '';
      const clientName = rawPersonal?.name ? decrypt(String(rawPersonal.name)) : 'Cliente';
      const clientExplicitTz = rawPersonal?.timezone ? decrypt(String(rawPersonal.timezone)) : null;
      const clientAddress = rawPersonal?.address ? decrypt(String(rawPersonal.address)) : null;

      const coachInfo = await getCoachInfo(doc.coachId);
      const coachIdStr = doc.coachId
        ? typeof doc.coachId === 'object' && doc.coachId !== null
          ? doc.coachId.toString()
          : String(doc.coachId)
        : '';
      const coachTz = coachInfo?.timezone || DEFAULT_COACH_TIMEZONE;

      for (const session of pendingSessions) {
        checkedSessions++;

        try {
          const scheduledAt = new Date(session.scheduledAt);
          if (Number.isNaN(scheduledAt.getTime())) continue;

          const diffMs = scheduledAt.getTime() - now.getTime();
          const diffMinutes = diffMs / 60000;
          if (diffMinutes < 0) continue; // Sesión pasada

          const clientTz = resolveClientTimezone({
            explicitTimezone: clientExplicitTz,
            address: clientAddress,
            sessionTimezone: session.timezone,
          });

          const clientTimeStr = formatTimeInTimezone(scheduledAt, clientTz);
          const coachTimeStr = formatTimeInTimezone(scheduledAt, coachTz);
          const coachSecondaryLabel =
            coachTz !== clientTz ? formatTimeWithZoneLabel(scheduledAt, coachTz) : undefined;
          const clientSecondaryLabel =
            coachTz !== clientTz ? formatTimeWithZoneLabel(scheduledAt, clientTz) : undefined;
          const dashboardUrl = `${appUrl}/dashboard/clients/${clientId}`;

          // ── 1A. Recordatorio anticipado para CLIENTE (hora local del cliente) ──
          const clientLocalNow = getLocalTimeParts(now, clientTz);
          const isClientToday = isSameLocalDay(scheduledAt, now, clientTz);
          const clientAdvanceEligible =
            diffMinutes > IMMINENT_WINDOW_MINUTES &&
            diffMinutes <= 24 * 60 &&
            !session.morningReminderSentAt &&
            ((isClientToday &&
              clientLocalNow.hour >= MORNING_HOUR_START &&
              clientLocalNow.hour < MORNING_HOUR_END) ||
              diffMinutes <= 120);

          if (clientAdvanceEligible && clientEmail && session.clientJoinLink) {
            const claim = await collection.updateOne(
              {
                _id: new ObjectId(clientId),
                videoSessions: {
                  $elemMatch: {
                    sessionId: session.sessionId,
                    status: 'scheduled',
                    morningReminderSentAt: { $exists: false },
                  },
                },
              },
              {
                $set: {
                  'videoSessions.$[s].morningReminderSentAt': new Date(),
                  updatedAt: new Date(),
                },
              } as Record<string, unknown>,
              { arrayFilters: [{ 's.sessionId': session.sessionId }] }
            );

            if (claim.modifiedCount === 1) {
              const sent = await emailService.sendSessionReminderToday(clientEmail, {
                clientName,
                sessionNumber: session.sessionNumber,
                scheduledDate: scheduledAt,
                scheduledTime: clientTimeStr,
                durationMinutes: session.durationMinutes,
                joinLink: session.clientJoinLink,
                coachName: coachInfo?.name,
                coachEmail: coachInfo?.email,
                timeZone: clientTz,
                secondaryTimeLabel: coachSecondaryLabel,
              });

              if (sent) {
                clientMorningSent++;
              } else {
                await collection.updateOne(
                  { _id: new ObjectId(clientId) },
                  { $unset: { 'videoSessions.$[s].morningReminderSentAt': '' } } as Record<string, unknown>,
                  { arrayFilters: [{ 's.sessionId': session.sessionId }] }
                );
              }
            }
          }

          // ── 1B. Recordatorio anticipado para COACH (hora local de Manuel en California) ──
          const coachLocalNow = getLocalTimeParts(now, coachTz);
          const isCoachToday = isSameLocalDay(scheduledAt, now, coachTz);
          const coachAdvanceEligible =
            diffMinutes > IMMINENT_WINDOW_MINUTES &&
            diffMinutes <= 24 * 60 &&
            !session.coachMorningReminderSentAt &&
            ((isCoachToday &&
              coachLocalNow.hour >= MORNING_HOUR_START &&
              coachLocalNow.hour < MORNING_HOUR_END) ||
              diffMinutes <= 120);

          if (coachAdvanceEligible && coachIdStr) {
            const claimCoach = await collection.updateOne(
              {
                _id: new ObjectId(clientId),
                videoSessions: {
                  $elemMatch: {
                    sessionId: session.sessionId,
                    status: 'scheduled',
                    coachMorningReminderSentAt: { $exists: false },
                  },
                },
              },
              {
                $set: {
                  'videoSessions.$[s].coachMorningReminderSentAt': new Date(),
                  updatedAt: new Date(),
                },
              } as Record<string, unknown>,
              { arrayFilters: [{ 's.sessionId': session.sessionId }] }
            );

            if (claimCoach.modifiedCount === 1) {
              if (coachInfo?.email) {
                await emailService.sendCoachSessionReminder(coachInfo.email, {
                  type: 'today',
                  coachName: coachInfo.name,
                  clientName,
                  sessionNumber: session.sessionNumber,
                  scheduledDate: scheduledAt,
                  coachTimeStr,
                  coachTimeZone: coachTz,
                  clientTimeStr: clientSecondaryLabel ? clientTimeStr : undefined,
                  clientTimeZone: clientSecondaryLabel ? clientTz : undefined,
                  durationMinutes: session.durationMinutes,
                  joinLink: session.clientJoinLink,
                  dashboardUrl,
                });
              }

              try {
                await createNotification({
                  coachId: coachIdStr,
                  type: 'session_reminder',
                  title: '📹 Videollamada hoy',
                  message: `Tienes la Sesión #${session.sessionNumber} con ${clientName} hoy a las ${formatTimeWithZoneLabel(scheduledAt, coachTz)}.`,
                  link: `/dashboard/clients/${clientId}`,
                });
              } catch {
                // Silencioso
              }

              coachMorningSent++;
            }
          }

          // ── 2A. Recordatorio inminente para CLIENTE (<= 15 min) ──
          const imminentWindow = diffMinutes >= 0 && diffMinutes <= IMMINENT_WINDOW_MINUTES;

          if (imminentWindow && !session.fiveMinReminderSentAt && clientEmail && session.clientJoinLink) {
            const claimImminent = await collection.updateOne(
              {
                _id: new ObjectId(clientId),
                videoSessions: {
                  $elemMatch: {
                    sessionId: session.sessionId,
                    status: 'scheduled',
                    fiveMinReminderSentAt: { $exists: false },
                  },
                },
              },
              {
                $set: {
                  'videoSessions.$[s].fiveMinReminderSentAt': new Date(),
                  'videoSessions.$[s].clientRemindedAt': new Date(),
                  updatedAt: new Date(),
                },
              } as Record<string, unknown>,
              { arrayFilters: [{ 's.sessionId': session.sessionId }] }
            );

            if (claimImminent.modifiedCount === 1) {
              const sent = await emailService.sendSessionReminderSoon(clientEmail, {
                clientName,
                sessionNumber: session.sessionNumber,
                scheduledDate: scheduledAt,
                scheduledTime: clientTimeStr,
                durationMinutes: session.durationMinutes,
                joinLink: session.clientJoinLink,
                coachName: coachInfo?.name,
                coachEmail: coachInfo?.email,
                timeZone: clientTz,
                secondaryTimeLabel: coachSecondaryLabel,
              });

              if (sent) {
                clientImminentSent++;
              } else {
                await collection.updateOne(
                  { _id: new ObjectId(clientId) },
                  { $unset: { 'videoSessions.$[s].fiveMinReminderSentAt': '' } } as Record<string, unknown>,
                  { arrayFilters: [{ 's.sessionId': session.sessionId }] }
                );
              }
            }
          }

          // ── 2B. Recordatorio inminente para COACH (<= 15 min) ──
          if (imminentWindow && !session.coachFiveMinReminderSentAt && coachIdStr) {
            const claimCoachImminent = await collection.updateOne(
              {
                _id: new ObjectId(clientId),
                videoSessions: {
                  $elemMatch: {
                    sessionId: session.sessionId,
                    status: 'scheduled',
                    coachFiveMinReminderSentAt: { $exists: false },
                  },
                },
              },
              {
                $set: {
                  'videoSessions.$[s].coachFiveMinReminderSentAt': new Date(),
                  'videoSessions.$[s].coachRemindedAt': new Date(),
                  updatedAt: new Date(),
                },
              } as Record<string, unknown>,
              { arrayFilters: [{ 's.sessionId': session.sessionId }] }
            );

            if (claimCoachImminent.modifiedCount === 1) {
              if (coachInfo?.email) {
                await emailService.sendCoachSessionReminder(coachInfo.email, {
                  type: 'soon',
                  coachName: coachInfo.name,
                  clientName,
                  sessionNumber: session.sessionNumber,
                  scheduledDate: scheduledAt,
                  coachTimeStr,
                  coachTimeZone: coachTz,
                  clientTimeStr: clientSecondaryLabel ? clientTimeStr : undefined,
                  clientTimeZone: clientSecondaryLabel ? clientTz : undefined,
                  durationMinutes: session.durationMinutes,
                  joinLink: session.clientJoinLink,
                  dashboardUrl,
                });
              }

              try {
                await createNotification({
                  coachId: coachIdStr,
                  type: 'session_reminder',
                  title: '🔔 Videollamada por comenzar',
                  message: `Tu Sesión #${session.sessionNumber} con ${clientName} comienza pronto (${formatTimeWithZoneLabel(scheduledAt, coachTz)}).`,
                  link: `/dashboard/clients/${clientId}`,
                });
              } catch {
                // Silencioso
              }

              coachImminentSent++;
            }
          }
        } catch (sessionError: unknown) {
          const errMsg = sessionError instanceof Error ? sessionError.message : 'Error desconocido';
          logger.error('REMINDER', `Error en sesión ${session.sessionId}: ${errMsg}`);
        }
      }
    }

    logger.info('REMINDER', 'Revisión completada', {
      checkedSessions,
      clientMorningSent,
      coachMorningSent,
      clientImminentSent,
      coachImminentSent,
    });
    return {
      checkedSessions,
      clientMorningSent,
      coachMorningSent,
      clientImminentSent,
      coachImminentSent,
    };
  }
) as unknown as ReturnType<typeof inngest.createFunction<never>>;

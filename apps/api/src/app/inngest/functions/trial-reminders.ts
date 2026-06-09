// apps/api/src/app/inngest/functions/trial-reminders.ts
//
// Función Inngest que se ejecuta diariamente para:
// 1. Enviar recordatorios de trial (días 21 y 27)
// 2. Marcar trials como expirados (día 30)
// 3. Eliminar cuentas expiradas (día 30 + 1)

import { inngest } from '../client';
import { connectMongoose } from '@/app/lib/database';
import { EmailService } from '@/app/lib/email-service';
import { decrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';

interface LeanCoach {
  _id: { toString(): string };
  email: string;
  firstName: string;
  trialStatus: string;
  trialStartDate?: Date;
  trialEndDate?: Date;
  trialPaymentIntentId?: string;
  trialPaymentMethodId?: string;
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  isActive?: boolean;
}

export const trialRemindersFn = inngest.createFunction(
  {
    id: 'send-trial-reminders',
    name: 'Enviar recordatorios de trial y limpiar cuentas expiradas',
    triggers: [{ cron: '0 8 * * *' }], // Todos los días a las 8:00 AM
  },
  async ({ step }) => {
    await connectMongoose();
    const { default: Coach } = await import('@/app/models/Coach');
    const { getHealthFormsCollection } = await import('@/app/lib/database');

    const emailService = EmailService.getInstance();
    const now = new Date();
    let remindersSent = 0;
    let expiredMarked = 0;
    let deletedAccounts = 0;

    logger.info('TRIAL_REMINDER', 'Ejecutando recordatorios de trial', {
      date: now.toISOString(),
    });

    // Buscar todos los coaches con trial activo
    const cursor = Coach.find({
      trialStatus: 'active',
      trialEndDate: { $ne: null },
      isActive: true,
    }).lean();

    const coaches = await cursor.exec() as unknown as LeanCoach[];

    for (const coach of coaches) {
      try {
        const endDate = coach.trialEndDate
          ? new Date(coach.trialEndDate)
          : null;

        if (!endDate) continue;

        const daysRemaining = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const coachEmail = coach.email ? decrypt(coach.email as string) : '';
        const coachName = coach.firstName ? decrypt(coach.firstName as string) : 'Coach';

        if (!coachEmail) continue;

        // ── Día 21 (9 días restantes) ──
        if (daysRemaining === 9) {
          await emailService.sendTrialEndingSoonEmail(coachEmail, coachName, daysRemaining);
          remindersSent++;
          logger.info('TRIAL_REMINDER', 'Recordatorio día 21 enviado', {
            coachId: coach._id.toString(),
            daysRemaining,
          });
        }

        // ── Día 27 (3 días restantes) ──
        if (daysRemaining === 3) {
          await emailService.sendTrialEndingSoonEmail(coachEmail, coachName, daysRemaining);
          remindersSent++;
          logger.info('TRIAL_REMINDER', 'Recordatorio día 27 enviado', {
            coachId: coach._id.toString(),
            daysRemaining,
          });
        }

        // ── Día 30 (expirado) ──
        if (daysRemaining <= 0) {
          // Marcar como expirado si no lo está ya
          await Coach.updateOne(
            { _id: coach._id },
            {
              $set: {
                trialStatus: 'expired',
                isActive: false,
              },
            }
          );
          expiredMarked++;

          // Enviar email de expiración
          await emailService.sendTrialExpiredEmail(coachEmail, coachName);
          remindersSent++;

          logger.info('TRIAL_REMINDER', 'Trial marcado como expirado', {
            coachId: coach._id.toString(),
          });
        }
      } catch (coachError: unknown) {
        const errMsg = coachError instanceof Error ? coachError.message : 'Error desconocido';
        logger.error('TRIAL_REMINDER', `Error procesando coach: ${errMsg}`, {
          coachId: coach._id.toString(),
        });
      }
    }

    // ── Eliminar cuentas expiradas +24h ──
    const expirationThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expiredCoaches = await Coach.find({
      trialStatus: 'expired',
      trialEndDate: { $lte: expirationThreshold },
      isActive: false,
    }).lean() as unknown as LeanCoach[];

    for (const coach of expiredCoaches) {
      try {
        // Eliminar clientes de este coach
        const healthForms = await getHealthFormsCollection();
        await healthForms.deleteMany({ coachId: coach._id.toString() });

        // Eliminar coach
        await Coach.findByIdAndDelete(coach._id);
        deletedAccounts++;

        logger.info('TRIAL_REMINDER', 'Cuenta trial eliminada por expiración', {
          coachId: coach._id.toString(),
        });
      } catch (deleteError: unknown) {
        const errMsg = deleteError instanceof Error ? deleteError.message : 'Error desconocido';
        logger.error('TRIAL_REMINDER', `Error eliminando cuenta expirada: ${errMsg}`, {
          coachId: coach._id.toString(),
        });
      }
    }

    logger.info('TRIAL_REMINDER', 'Proceso de trial completado', {
      remindersSent,
      expiredMarked,
      deletedAccounts,
    });

    return { remindersSent, expiredMarked, deletedAccounts };
  }
) as unknown as ReturnType<typeof inngest.createFunction<never>>;

// apps/api/src/app/inngest/functions/monthly-reminders.ts
//
// Función Inngest que se ejecuta cada sábado a las 10:00 AM (cron: 0 10 * * 6)
// para enviar recordatorios motivacionales a los clientes:
//
// Semana 1-3: Emails motivacionales con tips de salud, nutrición y hábitos.
// Semana 4 (o 4to email): Incluye CTA "Solicitar mi siguiente sesión".
//
// El seguimiento se hace por clientId + mes (YYYY-MM) en la colección monthly_reminders.

import { inngest } from '../client';
import { getHealthFormsCollection, connectToDatabase } from '@/app/lib/database';
import { EmailService } from '@/app/lib/email-service';
import { decrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import { ObjectId } from 'mongodb';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const MAX_REMINDERS_PER_MONTH = 4;

// Temas motivacionales para cada semana
const WEEKLY_THEMES = [
  {
    title: '¡Sigue así! Pequeños cambios, grandes resultados',
    tip: 'Recuerda que la constancia en pequeños hábitos diarios es la clave para transformar tu salud a largo plazo.',
    habitSuggestion: 'Esta semana, enfócate en agregar una porción extra de vegetales a tu comida principal.',
  },
  {
    title: 'Escucha a tu cuerpo — El descanso también es progreso',
    tip: 'Dormir bien es tan importante como la alimentación y el ejercicio. Tu cuerpo se repara mientras descansas.',
    habitSuggestion: 'Intenta establecer una rutina para acostarte 30 minutos antes esta semana.',
  },
  {
    title: 'Hidratación: El combustible de tu cuerpo',
    tip: 'Mantenerse hidratado mejora tu energía, concentración y hasta tu estado de ánimo. ¡No esperes a tener sed!',
    habitSuggestion: 'Comienza tu día con un vaso de agua y lleva una botella contigo a todas partes.',
  },
  {
    title: '¿Listo para tu siguiente nivel?',
    tip: 'Has estado trabajando duro. Es momento de evaluar tu progreso y dar el siguiente paso en tu viaje de bienestar.',
    habitSuggestion: 'Tómate 5 minutos para reflexionar sobre lo que has logrado este mes.',
    isSessionRequest: true, // Este email incluye CTA para solicitar sesión
  },
];

// ─────────────────────────────────────────────
// Template HTML para email motivacional
// ─────────────────────────────────────────────

function generateMotivationalEmailHTML(data: {
  clientName: string;
  coachName: string;
  title: string;
  tip: string;
  habitSuggestion: string;
  sessionLink?: string;
  emailNumber: number;
  totalEmails: number;
}): string {
  const currentYear = new Date().getFullYear();
  const logoWhiteUrl = 'https://nelhealthcoach.com/images/logo-white.png';
  const progressPercent = Math.round((data.emailNumber / data.totalEmails) * 100);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} — NELHEALTHCOACH</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 15px !important; }
      .header { padding: 25px !important; }
      .button { display: block !important; width: 100% !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 40px 30px; text-align: center;">
      <img src="${logoWhiteUrl}" alt="NELHEALTHCOACH" style="max-width: 160px; height: auto;">
    </div>

    <!-- Contenido -->
    <div style="padding: 35px 30px;">
      <!-- Barra de progreso mensual -->
      <div style="margin-bottom: 25px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #999; margin-bottom: 5px;">
          <span>Inicio del mes</span>
          <span>Semana ${data.emailNumber} de ${data.totalEmails}</span>
        </div>
        <div style="background: #e0e0e0; border-radius: 10px; height: 8px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #4CAF50, #2196F3); width: ${progressPercent}%; height: 100%; border-radius: 10px;"></div>
        </div>
      </div>

      <h1 style="margin: 0 0 15px; color: #1976D2; font-size: 22px;">
        ${data.title}
      </h1>

      <p style="font-size: 15px; color: #555; margin-bottom: 20px;">
        Hola <strong>${data.clientName}</strong>,
      </p>

      <!-- Tarjeta de tip motivacional -->
      <div style="background: #e3f2fd; border-radius: 10px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
        <h3 style="margin: 0 0 10px; color: #1976D2; font-size: 16px;">💡 Tip de la semana</h3>
        <p style="margin: 0; color: #555;">${data.tip}</p>
      </div>

      <!-- Sugerencia de hábito -->
      <div style="background: #e8f5e9; border-radius: 10px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #4CAF50;">
        <h3 style="margin: 0 0 10px; color: #2E7D32; font-size: 16px;">🎯 Hábito recomendado</h3>
        <p style="margin: 0; color: #555;">${data.habitSuggestion}</p>
      </div>

      <!-- CTA de sesión (solo en el 4to email) -->
      ${data.sessionLink ? `
      <div style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); border-radius: 12px; padding: 25px; margin-bottom: 20px; border: 2px solid #FFB300; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 10px;">🚀</div>
        <h2 style="margin: 0 0 10px; color: #F57F17; font-size: 20px;">¿Listo para avanzar?</h2>
        <p style="color: #795548; margin-bottom: 20px;">
          Ha llegado el momento de solicitar tu siguiente sesión de coaching.
          Tu asesor está listo para ayudarte a dar el siguiente paso.
        </p>
        <a href="${data.sessionLink}" class="button" style="
          display: inline-block;
          padding: 14px 40px;
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          color: white;
          text-decoration: none;
          font-size: 16px;
          font-weight: 700;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(255,152,0,0.3);
        ">
          📅 Solicitar mi siguiente sesión
        </a>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          Serás redirigido a nuestra plataforma segura de pagos.
        </p>
      </div>
      ` : ''}

      <p style="color: #999; font-size: 13px; text-align: center;">
        Sigue así, cada paso cuenta. ¡Tu asesor ${data.coachName} cree en ti!
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #263238; color: white; padding: 25px; text-align: center; font-size: 12px;">
      <div style="opacity: 0.7; margin-bottom: 10px;">NELHEALTHCOACH</div>
      <div style="opacity: 0.5;">
        &copy; ${currentYear} NELHEALTHCOACH, LLC. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Inngest Function
// ─────────────────────────────────────────────

export const monthlyRemindersFn = inngest.createFunction(
  {
    id: 'send-monthly-reminders',
    name: 'Enviar recordatorios motivacionales mensuales',
    triggers: [{ cron: '0 10 * * 6' }], // Sábados a las 10:00 AM
  },
  async ({ step }) => {
    const emailService = EmailService.getInstance();
    const collection = await getHealthFormsCollection();
    const { db } = await connectToDatabase();

    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-06"
    let sentCount = 0;
    let skippedCount = 0;

    logger.info('REMINDER', 'Ejecutando recordatorios motivacionales mensuales', { currentMonth });

    // Obtener todos los clientes con coach asignado
    const cursor = collection.find(
      { coachId: { $exists: true, $ne: '' } },
      { projection: { _id: 1, personalData: 1, coachId: 1 } }
    );

    for await (const doc of cursor) {
      try {
        const clientId = doc._id.toString();
        const rawPersonal = doc.personalData as Record<string, unknown> | undefined;

        if (!rawPersonal) {
          skippedCount++;
          continue;
        }

        // Desencriptar datos del cliente
        const clientEmail = rawPersonal.email ? decrypt(rawPersonal.email as string) : '';
        const clientName = rawPersonal.name ? decrypt(rawPersonal.name as string) : 'Cliente';

        if (!clientEmail) {
          skippedCount++;
          continue;
        }

        // Obtener conteo de reminders enviados este mes
        const remindersCol = db.collection('monthly_reminders');
        const reminderDoc = await remindersCol.findOne({ clientId, month: currentMonth });

        const currentCount = reminderDoc?.sentCount || 0;

        // Si ya enviamos los 4, saltar
        if (currentCount >= MAX_REMINDERS_PER_MONTH) {
          skippedCount++;
          continue;
        }

        const themeIndex = Math.min(currentCount, WEEKLY_THEMES.length - 1);
        const theme = WEEKLY_THEMES[themeIndex];

        // Generar link de sesión si es el email de solicitud
        let sessionLink: string | undefined;
        if (theme.isSessionRequest) {
          const formUrl = process.env.FORM_URL || process.env.APP_URL || 'http://localhost:3000';
          sessionLink = `${formUrl}/request-session?clientId=${clientId}`;
        }

        // Obtener nombre del coach
        let coachName = 'Tu asesor';
        try {
          const { default: Coach } = await import('@/app/models/Coach');
          const coach = await Coach.findById(doc.coachId).lean() as Record<string, unknown> | null;
          if (coach) {
            coachName = coach.firstName ? decrypt(coach.firstName as string) : 'Tu asesor';
          }
        } catch {
          // Ignorar error al obtener coach
        }

        // Generar y enviar email
        const htmlContent = generateMotivationalEmailHTML({
          clientName,
          coachName,
          title: theme.title,
          tip: theme.tip,
          habitSuggestion: theme.habitSuggestion,
          sessionLink,
          emailNumber: currentCount + 1,
          totalEmails: MAX_REMINDERS_PER_MONTH,
        });

        const subject = `✨ ${theme.isSessionRequest ? '🚀 ' : ''}${theme.title} — NELHealthCoach`;

        const sent = await emailService.sendEmail({
          to: [clientEmail],
          subject,
          htmlBody: htmlContent,
        });

        if (sent) {
          // Actualizar conteo
          await remindersCol.updateOne(
            { clientId, month: currentMonth },
            {
              $set: {
                clientId,
                month: currentMonth,
                lastSentAt: new Date(),
              },
              $inc: { sentCount: 1 },
            },
            { upsert: true }
          );

          sentCount++;
          logger.info('REMINDER', 'Recordatorio motivacional enviado', {
            clientId,
            emailNumber: currentCount + 1,
            isSessionRequest: !!theme.isSessionRequest,
          });
        }
      } catch (clientError: unknown) {
        const errMsg = clientError instanceof Error ? clientError.message : 'Error desconocido';
        logger.error('REMINDER', `Error procesando cliente: ${errMsg}`);
      }
    }

    logger.info('REMINDER', 'Recordatorios motivacionales completados', { sentCount, skippedCount });
    return { sentCount, skippedCount, currentMonth };
  }
) as unknown as ReturnType<typeof inngest.createFunction<never>>;

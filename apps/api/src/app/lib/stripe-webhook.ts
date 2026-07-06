// apps/api/src/app/lib/stripe-webhook.ts
// Utilidades para verificar y procesar webhooks de Stripe
//
// NOTA: Stripe v22 tiene tipos diferentes entre CJS (StripeConstructor) y ESM (Stripe).
// Usamos Record<string, unknown> para los objetos del webhook para evitar conflictos.

import { stripeClient } from './stripe';
import { logger } from './logger';
import { createNotification } from './create-notification';

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!webhookSecret) {
  logger.error('PAYMENTS', 'STRIPE_WEBHOOK_SECRET no definida en las variables de entorno');
  throw new Error('STRIPE_WEBHOOK_SECRET no definida');
}

/**
 * Verifica y construye un evento de Stripe a partir del raw body y la firma.
 */
export function constructStripeEvent(
  rawBody: string,
  signature: string | null
) {
  if (!signature) {
    throw new Error('Falta el header stripe-signature');
  }

  return stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Extrae metadatos comunes de un Checkout Session.
 */
export function extractCheckoutMetadata(
  session: Record<string, unknown>
): {
  type: 'coach_subscription' | 'client_session' | 'client_onboarding' | 'trial_verification' | 'unknown';
  coachEmail?: string;
  clientId?: string;
  pendingCoachToken?: string;
  pendingSessionId?: string;
  clientEmail?: string;
  coachId?: string;
} {
  const metadata = (session.metadata as Record<string, string>) || {};
  const type = (metadata.type as
    | 'coach_subscription'
    | 'client_session'
    | 'client_onboarding'
    | 'trial_verification'
    | 'unknown') || 'unknown';

  return {
    type,
    coachEmail: metadata.coachEmail || undefined,
    clientId: metadata.clientId || undefined,
    pendingCoachToken: metadata.pendingCoachToken || undefined,
    pendingSessionId: metadata.pendingSessionId || undefined,
    clientEmail: metadata.clientEmail || undefined,
    coachId: metadata.coachId || undefined,
  };
}

/**
 * Maneja checkout.session.completed según el tipo de metadata.
 */
export async function handleCheckoutCompleted(
  session: Record<string, unknown>
): Promise<void> {
  const metadata = extractCheckoutMetadata(session);
  const customerId = session.customer as string | null;

  logger.info('PAYMENTS', 'Checkout completado', {
    type: metadata.type,
    customerId,
    sessionId: session.id as string,
  });

  switch (metadata.type) {
    case 'coach_subscription':
      await handleCoachSubscriptionCheckout(session, metadata, customerId);
      break;
    case 'client_session':
      await handleClientSessionCheckout(session, metadata, customerId);
      break;
    case 'client_onboarding':
      await handleClientOnboardingCheckout(session, metadata, customerId);
      break;
    case 'trial_verification':
      await handleTrialVerificationCheckout(session, metadata, customerId);
      break;
    default:
      logger.warn('PAYMENTS', 'Tipo de checkout desconocido', { metadata });
  }
}

// ─────────────────────────────────────────────
// Handlers específicos
// ─────────────────────────────────────────────

async function handleCoachSubscriptionCheckout(
  session: Record<string, unknown>,
  metadata: ReturnType<typeof extractCheckoutMetadata>,
  customerId: string | null
): Promise<void> {
  const { pendingCoachToken } = metadata;

  if (!pendingCoachToken) {
    logger.error('PAYMENTS', 'Falta pendingCoachToken en metadata del checkout');
    return;
  }

  const { default: PendingCoach } = await import('@/app/models/PendingCoach');
  const pending = await PendingCoach.findOne({ token: pendingCoachToken });

  if (!pending) {
    logger.error('PAYMENTS', 'PendingCoach no encontrado', { pendingCoachToken });
    return;
  }

  // Guardar stripeCustomerId en el documento pendiente
  if (customerId) {
    pending.stripeCustomerId = customerId;
  }
  pending.subscriptionId = String(session.subscription || '');
  pending.paymentStatus = 'completed';
  await pending.save();

  logger.info('PAYMENTS', 'PendingCoach actualizado con datos de Stripe', {
    pendingCoachToken,
    customerId,
    subscriptionId: pending.subscriptionId,
  });
}

async function handleClientSessionCheckout(
  _session: Record<string, unknown>,
  metadata: ReturnType<typeof extractCheckoutMetadata>,
  customerId: string | null
): Promise<void> {
  const { pendingSessionId } = metadata;

  if (!pendingSessionId) {
    logger.error('PAYMENTS', 'Falta pendingSessionId en metadata del checkout');
    return;
  }

  const { default: PendingSession } = await import('@/app/models/PendingSession');
  const { default: Coach } = await import('@/app/models/Coach');
  const pending = await PendingSession.findById(pendingSessionId);

  if (!pending) {
    logger.error('PAYMENTS', 'PendingSession no encontrada', { pendingSessionId });
    return;
  }

  // Actualizar el estado a paid
  pending.status = 'paid';
  pending.stripeSessionId = _session.id as string;
  if (customerId) {
    pending.stripeCustomerId = customerId;
  }
  pending.paymentConfirmedAt = new Date();
  await pending.save();

  logger.info('PAYMENTS', 'PendingSession marcada como pagada', {
    pendingSessionId,
    customerId,
  });

  // Obtener coach para las notificaciones
  const coach = await Coach.findById(pending.coachId).lean() as Record<string, unknown> | null;
  const coachName = coach?.firstName
    ? (await import('@/app/lib/encryption')).safeDecrypt(coach.firstName as string)
    : 'Tu asesor';
  const coachFirstName = coach?.firstName
    ? (await import('@/app/lib/encryption')).safeDecrypt(coach.firstName as string)
    : 'Coach';

  // Enviar confirmación al cliente
  try {
    const emailService = (await import('@/app/lib/email-service')).EmailService.getInstance();
    const { generateSessionPaymentClientConfirmationHTML } = await import('@/app/lib/email-templates');

    await emailService.sendEmail({
      to: [pending.clientEmail],
      subject: `✅ Pago confirmado — Tu sesión de coaching está asegurada | NELHealthCoach`,
      htmlBody: generateSessionPaymentClientConfirmationHTML({
        clientName: pending.clientName || 'Cliente',
        coachName,
        amount: Number(process.env.CLIENT_SESSION_AMOUNT) || 150,
      }),
    });
  } catch (emailError) {
    logger.error('PAYMENTS', 'Error enviando confirmación de pago al cliente', emailError as Error);
  }

  // Enviar notificación al coach
  try {
    const emailService = (await import('@/app/lib/email-service')).EmailService.getInstance();

    if (coach) {
      const coachEmail = coach.email
        ? (await import('@/app/lib/encryption')).safeDecrypt(coach.email as string)
        : null;

      if (coachEmail) {
        const clientName = pending.clientName || 'Cliente';
        const dashboardUrl =
          (process.env.DASHBOARD_URL || 'http://localhost:3000') + '/dashboard/clients/' + pending.clientId;

        const paymentNotificationHTML = generatePaymentReceivedCoachHTML({
          coachName: coachFirstName,
          clientName,
          amount: Number(process.env.CLIENT_SESSION_AMOUNT) || 150,
          dashboardUrl,
        });

        await emailService.sendEmail({
          to: [coachEmail],
          subject: `💰 Pago recibido — ${clientName} ha pagado su sesión | NELHealthCoach`,
          htmlBody: paymentNotificationHTML,
        });
      }
    }
  } catch (emailError) {
    logger.error('PAYMENTS', 'Error enviando notificación de pago al coach', emailError as Error);
  }

  // Notificación in-app para el coach
  const notificationCoachId = coach?._id?.toString() || metadata.coachId;
  if (notificationCoachId) {
    try {
      await createNotification({
        coachId: notificationCoachId,
        type: 'session_paid',
        title: '💰 Pago de sesión recibido',
        message: `${pending.clientName || 'Un cliente'} ha pagado su sesión de coaching.`,
        link: `/dashboard/clients/${pending.clientId}`,
      });
    } catch (notifError) {
      logger.error('NOTIFICATIONS', 'Error creando notificación de pago', notifError as Error);
    }
  }
}

async function handleClientOnboardingCheckout(
  session: Record<string, unknown>,
  metadata: ReturnType<typeof extractCheckoutMetadata>,
  customerId: string | null
): Promise<void> {
  // Para el onboarding del cliente, marcamos en una colección temporal
  // o podemos usar el mismo PendingSession si es una sesión inicial
  const { clientEmail } = metadata;

  if (!clientEmail) {
    logger.error('PAYMENTS', 'Falta clientEmail en metadata del checkout de onboarding');
    return;
  }

  // Registrar el pago de onboarding (se vincula cuando el cliente completa el formulario)
  const { connectToDatabase } = await import('@/app/lib/database');
  const { db } = await connectToDatabase();
  await db.collection('onboarding_payments').insertOne({
    email: clientEmail,
    stripeCustomerId: customerId,
    stripeSessionId: session.id as string,
    amount: (session.amount_total as number) || 0,
    paidAt: new Date(),
    used: false,
  });

  logger.info('PAYMENTS', 'Pago de onboarding registrado', {
    clientEmail,
    customerId,
  });

  // Notificar al coach del pago de onboarding (si coachId está disponible en metadata)
  const coachId = metadata.coachId;
  if (coachId) {
    try {
      const { default: Coach } = await import('@/app/models/Coach');
      const emailService = (await import('@/app/lib/email-service')).EmailService.getInstance();
      const { generateOnboardingPaymentCoachNotificationHTML } = await import('@/app/lib/email-templates');

      const coach = await Coach.findById(coachId).lean() as Record<string, unknown> | null;
      if (coach) {
        const coachEmail = coach.email
          ? (await import('@/app/lib/encryption')).safeDecrypt(coach.email as string)
          : null;
        const coachName = coach.firstName
          ? (await import('@/app/lib/encryption')).safeDecrypt(coach.firstName as string)
          : 'Coach';

        if (coachEmail) {
          await emailService.sendEmail({
            to: [coachEmail],
            subject: `🎉 Nuevo pago de onboarding — ${clientEmail} está listo para registrarse | NELHealthCoach`,
            htmlBody: generateOnboardingPaymentCoachNotificationHTML({
              coachName,
              clientName: clientEmail,
              clientEmail,
              dashboardUrl: (process.env.DASHBOARD_URL || 'http://localhost:3000') + '/dashboard/clients',
            }),
          });
        }
      }
    } catch (emailError) {
      logger.error('PAYMENTS', 'Error enviando notificación de onboarding al coach', emailError as Error);
    }

    // Notificación in-app para el coach
    try {
      await createNotification({
        coachId,
        type: 'new_client',
        title: '🎉 Nuevo cliente registrado',
        message: `${clientEmail} ha completado el pago de onboarding y está listo para registrarse.`,
        link: '/dashboard/clients',
      });
    } catch (notifError) {
      logger.error('NOTIFICATIONS', 'Error creando notificación de nuevo cliente', notifError as Error);
    }
  }
}

/**
 * Maneja checkout completado de verificación de trial ($1).
 * Reembolsa inmediatamente y activa la cuenta del coach.
 */
async function handleTrialVerificationCheckout(
  session: Record<string, unknown>,
  metadata: ReturnType<typeof extractCheckoutMetadata>,
  customerId: string | null
): Promise<void> {
  const { coachEmail } = metadata;
  const paymentIntentId = session.payment_intent as string | null;

  if (!coachEmail) {
    logger.error('PAYMENTS', 'Falta coachEmail en metadata de trial_verification');
    return;
  }

  // Validar que el monto total sea al menos $1 (100 centavos)
  const amountTotal = (session.amount_total as number) || 0;
  if (amountTotal < 100) {
    logger.warn('PAYMENTS',
      `Checkout trial ignorado: amount_total ${amountTotal} es menor a $1 USD mínimo requerido`,
      { sessionId: session.id as string }
    );
    return;
  }

  const { default: Coach } = await import('@/app/models/Coach');
  const { hashEmail } = await import('@/app/models/Coach');
  const { refundTrialPayment } = await import('@/app/lib/stripe');
  const { EmailService } = await import('@/app/lib/email-service');
  const { decrypt } = await import('@/app/lib/encryption');

  const emailHash = hashEmail(coachEmail.toLowerCase().trim());
  const coach = await Coach.findOne({ emailHash });

  if (!coach) {
    logger.error('PAYMENTS', 'Coach no encontrado para trial_verification', { coachEmail });
    return;
  }

  // Reembolsar los $1 inmediatamente
  if (paymentIntentId) {
    try {
      await refundTrialPayment(paymentIntentId);
      logger.info('PAYMENTS', 'Reembolso de verificación trial emitido', {
        coachId: coach._id.toString(),
        paymentIntentId,
      });
    } catch (refundError) {
      logger.error('PAYMENTS', 'Error al reembolsar verificación trial', refundError as Error);
      // Continuamos aunque falle el reembolso (se puede hacer manual)
    }
  }

  // Guardar PaymentMethod del checkout
  let paymentMethodId = '';
  if (paymentIntentId) {
    try {
      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.payment_method) {
        paymentMethodId = String(paymentIntent.payment_method);
      }
    } catch {
      logger.warn('PAYMENTS', 'No se pudo obtener PaymentMethod del checkout trial');
    }
  }

  // Stripe Customer: normalmente Stripe ya creó uno automáticamente
  // al usar customer_email en el Checkout Session
  if (!customerId && paymentIntentId) {
    try {
      const retrievedPI = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      if (retrievedPI.customer) {
        customerId = String(retrievedPI.customer);
      }
    } catch {
      logger.warn('PAYMENTS', 'No se pudo obtener Customer del PaymentIntent');
    }
  }

  // Adjuntar PaymentMethod al Customer (para cobros futuros)
  if (paymentMethodId && customerId) {
    try {
      await stripeClient.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      // Establecer como método de pago por defecto
      await stripeClient.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      logger.info('PAYMENTS', 'PaymentMethod adjuntado al Customer', {
        customerId,
        paymentMethodId,
      });
    } catch (pmError) {
      logger.error('PAYMENTS', 'Error adjuntando PaymentMethod al Customer', pmError as Error);
    }
  }

  // Activar la cuenta del coach y marcar email como verificado
  const { encrypt } = await import('@/app/lib/encryption');

  coach.isActive = true;
  coach.emailVerified = true;
  coach.verificationToken = null;
  if (customerId) {
    coach.stripeCustomerId = encrypt(customerId);
  }
  if (paymentMethodId) {
    coach.trialPaymentMethodId = encrypt(paymentMethodId);
  }
  await coach.save();

  logger.info('PAYMENTS', 'Coach activado después de verificación trial', {
    coachId: coach._id.toString(),
    hasPaymentMethod: !!paymentMethodId,
  });

  // Enviar email de bienvenida al trial
  try {
    const emailService = EmailService.getInstance();
    const coachName = coach.firstName ? decrypt(coach.firstName as string) : 'Coach';

    await emailService.sendTrialWelcomeEmail(
      coachEmail,
      coachName,
      coach.trialEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
  } catch (emailError) {
    logger.error('PAYMENTS', 'Error enviando email de bienvenida trial', emailError as Error);
  }
}

// ─────────────────────────────────────────────
// Handlers de payout (retiros bancarios)
// ─────────────────────────────────────────────

/**
 * Maneja payout.created — un retiro bancario ha sido iniciado.
 * Para Connect accounts, busca al coach por el ID de cuenta conectada.
 * Para la cuenta de la plataforma, notifica al admin.
 */
export async function handlePayoutCreated(
  payout: Record<string, unknown>
): Promise<void> {
  const payoutId = payout.id as string;
  const amountCents = (payout.amount as number) || 0;
  const amount = (amountCents / 100).toFixed(2);
  const currency = ((payout.currency as string) || 'usd').toUpperCase();
  const arrivalDate = payout.arrival_date
    ? new Date((payout.arrival_date as number) * 1000)
    : null;
  const status = payout.status as string;
  const description = (payout.description as string) || 'Retiro bancario';

  logger.info('PAYMENTS', `Payout creado: ${payoutId} — $${amount} ${currency}`, {
    payoutId,
    amount,
    currency,
    status,
  });

  // Determinar a qué coach pertenece este payout (si es de una Connect account)
  const connectAccountId = (payout as Record<string, unknown>).destination as string | undefined;
  if (connectAccountId) {
    const { default: Coach } = await import('@/app/models/Coach');
    const coach = await Coach.findOne({ stripeConnectAccountId: connectAccountId });

    if (coach) {
      const arrivalStr = arrivalDate
        ? ` — llegará el ${arrivalDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`
        : '';

      await createNotification({
        coachId: coach._id.toString(),
        type: 'payout_initiated',
        title: `🏦 Retiro iniciado — $${amount} ${currency}`,
        message: `Se ha iniciado un retiro bancario de $${amount}${arrivalStr}.`,
        link: '/dashboard/finances',
      });
    }
  }
}

/**
 * Maneja payout.paid — el dinero ya llegó a la cuenta bancaria.
 */
export async function handlePayoutPaid(
  payout: Record<string, unknown>
): Promise<void> {
  const payoutId = payout.id as string;
  const amountCents = (payout.amount as number) || 0;
  const amount = (amountCents / 100).toFixed(2);
  const currency = ((payout.currency as string) || 'usd').toUpperCase();
  const arrivalDate = payout.arrival_date
    ? new Date((payout.arrival_date as number) * 1000)
    : null;

  logger.info('PAYMENTS', `Payout pagado: ${payoutId} — $${amount} ${currency}`);

  const connectAccountId = (payout as Record<string, unknown>).destination as string | undefined;
  if (connectAccountId) {
    const { default: Coach } = await import('@/app/models/Coach');
    const coach = await Coach.findOne({ stripeConnectAccountId: connectAccountId });

    if (coach) {
      const arrivalStr = arrivalDate
        ? ` el ${arrivalDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`
        : '';

      await createNotification({
        coachId: coach._id.toString(),
        type: 'payout_paid',
        title: `✅ Retiro completado — $${amount}`,
        message: `$${amount} ${currency} depositado en tu cuenta bancaria${arrivalStr}.`,
        link: '/dashboard/finances',
      });
    }
  }
}

/**
 * Maneja payout.failed — el retiro bancário falló.
 */
export async function handlePayoutFailed(
  payout: Record<string, unknown>
): Promise<void> {
  const payoutId = payout.id as string;
  const amountCents = (payout.amount as number) || 0;
  const amount = (amountCents / 100).toFixed(2);
  const currency = ((payout.currency as string) || 'usd').toUpperCase();
  const failureMessage = (payout.failure_message as string) || 'Error desconocido';
  const failureCode = (payout.failure_code as string) || '';

  logger.warn('PAYMENTS', `Payout fallido: ${payoutId} — $${amount} ${currency}`, {
    failureCode,
    failureMessage,
  });

  const connectAccountId = (payout as Record<string, unknown>).destination as string | undefined;
  if (connectAccountId) {
    const { default: Coach } = await import('@/app/models/Coach');
    const coach = await Coach.findOne({ stripeConnectAccountId: connectAccountId });

    if (coach) {
      await createNotification({
        coachId: coach._id.toString(),
        type: 'payout_failed',
        title: `❌ Retiro fallido — $${amount}`,
        message: `El retiro de $${amount} ${currency} falló: ${failureMessage}. Actualiza tu información bancaria en Stripe.`,
        link: '/dashboard/profile',
      });
    }
  }
}

// ─────────────────────────────────────────────
// Template email para notificar al coach del pago
// ─────────────────────────────────────────────

function generatePaymentReceivedCoachHTML(data: {
  coachName: string;
  clientName: string;
  amount: number;
  dashboardUrl: string;
}): string {
  const currentYear = new Date().getFullYear();
  const logoWhiteUrl = 'https://app.nelhealthcoach.com/logo.png';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago recibido - NELHEALTHCOACH</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
      <img src="${logoWhiteUrl}" alt="NELHEALTHCOACH" style="max-width: 160px; height: auto;">
    </div>
    <div style="padding: 30px;">
      <h1 style="margin: 0 0 10px; font-size: 22px; color: #2E7D32;">✅ Pago Recibido</h1>
      <p style="color: #555;">Hola <strong>${data.coachName}</strong>,</p>
      <p style="color: #555;">
        <strong>${data.clientName}</strong> ha realizado el pago de su sesión
        exitosamente (<strong>$${data.amount} USD</strong>).
      </p>
      <div style="background: #e8f5e9; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;">
        <p style="margin: 0; color: #2E7D32;">
          El sistema ha registrado el pago. Ahora puedes proceder a agendar la videollamada desde el panel.
        </p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          👤 Ver perfil del cliente
        </a>
      </div>
    </div>
    <div style="background: #263238; color: white; padding: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
      NELHEALTHCOACH &copy; ${currentYear}
    </div>
  </div>
</body>
</html>`;
}

// apps/api/src/app/api/payments/webhook/route.ts
// Webhook de Stripe para procesar eventos de pago
//
// NOTA: Stripe v22 usa módulo ESM con tipos en Stripe namespace,
// y CJS usa StripeConstructor namespace. Next.js puede resolver a CJS
// en algunos contextos, por lo que usamos aserciones de tipo directas.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import {
  constructStripeEvent,
  handleCheckoutCompleted,
} from '@/app/lib/stripe-webhook';

/**
 * POST /api/payments/webhook
 *
 * Recibe eventos de Stripe:
 * - checkout.session.completed
 * - invoice.paid
 * - customer.subscription.deleted
 * - account.updated (Stripe Connect)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    const event = constructStripeEvent(rawBody, signature);

    logger.info('PAYMENTS', `Webhook recibido: ${event.type}`, {
      eventId: event.id,
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as Record<string, unknown>;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as Record<string, unknown>;
        await handleSubscriptionChange(subscription, event.type);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as unknown as Record<string, unknown>;
        await handleAccountUpdated(account);
        break;
      }

      default:
        logger.debug('PAYMENTS', `Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    logger.error('PAYMENTS', 'Error procesando webhook de Stripe', error as Error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
}

/**
 * Maneja invoice.paid — actualiza estado de suscripción del coach.
 */
async function handleInvoicePaid(invoice: Record<string, unknown>): Promise<void> {
  const subscriptionId = invoice.subscription as string | null;
  const customerId = invoice.customer as string | null;

  if (!subscriptionId || !customerId) {
    logger.warn('PAYMENTS', 'Invoice sin subscription o customer', { invoiceId: invoice.id as string });
    return;
  }

  const { default: Coach } = await import('@/app/models/Coach');
  const { decrypt } = await import('@/app/lib/encryption');

  // Buscar coach por stripeCustomerId
  const coaches = await Coach.find({
    stripeCustomerId: { $exists: true, $ne: '' },
  }).lean() as Array<Record<string, unknown>>;

  const coachDoc = coaches.find((c) => {
    try {
      return decrypt((c as Record<string, unknown>).stripeCustomerId as string || '') === customerId;
    } catch {
      return false;
    }
  });

  if (!coachDoc) {
    logger.warn('PAYMENTS', 'No se encontró coach para el customer', { customerId });
    return;
  }

  await Coach.updateOne(
    { _id: (coachDoc as Record<string, unknown>)._id },
    {
      $set: {
        subscriptionStatus: 'active',
        isActive: true,
      },
    }
  );

  logger.info('PAYMENTS', 'Suscripción de coach actualizada por invoice.paid', {
    coachId: String((coachDoc as Record<string, unknown>)._id),
    subscriptionId,
  });
}

/**
 * Maneja cambios en la suscripción (cancelación, actualización).
 */
async function handleSubscriptionChange(
  subscription: Record<string, unknown>,
  eventType: string
): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionStatus = subscription.status as string;

  const { default: Coach } = await import('@/app/models/Coach');
  const { decrypt } = await import('@/app/lib/encryption');

  const coaches = await Coach.find({
    stripeCustomerId: { $exists: true, $ne: '' },
  }).lean() as Array<Record<string, unknown>>;

  const coachDoc = coaches.find((c) => {
    try {
      return decrypt((c as Record<string, unknown>).stripeCustomerId as string || '') === customerId;
    } catch {
      return false;
    }
  });

  if (!coachDoc) {
    logger.warn('PAYMENTS', 'Coach no encontrado para cambio de suscripción', { customerId });
    return;
  }

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const statusMap: Record<string, 'active' | 'past_due' | 'canceled' | 'incomplete'> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    trialing: 'active',
    unpaid: 'past_due',
  };

  await Coach.updateOne(
    { _id: (coachDoc as Record<string, unknown>)._id },
    {
      $set: {
        subscriptionStatus: statusMap[subscriptionStatus] || 'canceled',
        isActive,
      },
    }
  );

  logger.info('PAYMENTS', `Suscripción de coach actualizada: ${eventType}`, {
    coachId: String((coachDoc as Record<string, unknown>)._id),
    subscriptionStatus,
    isActive,
  });
}

/**
 * Maneja account.updated — actualiza el estado de onboarding de Stripe Connect
 * para el coach asociado a la cuenta.
 */
async function handleAccountUpdated(account: Record<string, unknown>): Promise<void> {
  const accountId = account.id as string;
  const detailsSubmitted = account.details_submitted as boolean;
  const payoutsEnabled = account.payouts_enabled as boolean;
  const chargesEnabled = account.charges_enabled as boolean;

  if (!accountId) {
    logger.warn('STRIPE_CONNECT', 'Account.updated sin accountId');
    return;
  }

  logger.info('STRIPE_CONNECT', 'Account.updated recibido', {
    accountId,
    detailsSubmitted,
    payoutsEnabled,
  });

  const { default: Coach } = await import('@/app/models/Coach');

  await Coach.updateOne(
    { stripeConnectAccountId: accountId },
    {
      $set: {
        stripeOnboardingComplete: detailsSubmitted,
        stripePayoutsEnabled: payoutsEnabled && chargesEnabled,
      },
    }
  );

  logger.info('STRIPE_CONNECT', 'Estado de Connect actualizado en coach', {
    accountId,
    detailsSubmitted,
    payoutsEnabled,
  });
}

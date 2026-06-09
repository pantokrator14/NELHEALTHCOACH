// apps/api/src/app/lib/stripe.ts
// Cliente singleton de Stripe para TypeScript estricto

import Stripe from 'stripe';
import { logger } from './logger';

const secretKey: string = process.env.STRIPE_SECRET_KEY || '';

if (!secretKey) {
  logger.error('PAYMENTS', 'STRIPE_SECRET_KEY no definida en las variables de entorno');
  throw new Error('STRIPE_SECRET_KEY no definida');
}

export const stripeClient = new Stripe(secretKey, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
});

/**
 * Obtiene el monto en centavos para la sesión de un cliente.
 * Lee de env var CLIENT_SESSION_AMOUNT (en dólares), default 150.
 */
export function getClientSessionAmount(): number {
  const dollars = Number(process.env.CLIENT_SESSION_AMOUNT) || 150;
  return Math.round(dollars * 100);
}

/**
 * Obtiene el monto en centavos para la suscripción de un coach.
 * Lee de env var COACH_SUBSCRIPTION_AMOUNT (en dólares), default 150.
 */
export function getCoachSubscriptionAmount(): number {
  const dollars = Number(process.env.COACH_SUBSCRIPTION_AMOUNT) || 150;
  return Math.round(dollars * 100);
}

/**
 * Crea un Checkout Session de $1 USD para verificar la tarjeta del coach en el trial.
 * Se reembolsa inmediatamente después de confirmar el pago.
 */
export async function createTrialCheckoutSession(
  coachEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<Record<string, unknown>> {
  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: coachEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Verificación de tarjeta — Prueba gratuita NELHealthCoach',
            description: 'Este cargo de $1 USD será reembolsado inmediatamente. Es solo para verificar tu método de pago.',
          },
          unit_amount: 100, // $1.00 USD
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'trial_verification',
      coachEmail,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session as unknown as Record<string, unknown>;
}

/**
 * Reembolsa completamente un pago de trial a partir del PaymentIntent ID.
 */
export async function refundTrialPayment(
  paymentIntentId: string
): Promise<Record<string, unknown>> {
  const refund = await stripeClient.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      type: 'trial_verification_refund',
    },
  });
  return refund as unknown as Record<string, unknown>;
}

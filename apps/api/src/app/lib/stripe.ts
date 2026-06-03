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

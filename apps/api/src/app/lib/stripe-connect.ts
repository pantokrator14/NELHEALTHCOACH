// apps/api/src/app/lib/stripe-connect.ts
// Utilidades para Stripe Connect Express — cuentas de cobro para coaches

import { stripeClient } from './stripe';
import { logger } from './logger';

/**
 * Crea una cuenta Connect Express para un coach.
 */
export async function createConnectAccount(
  coachId: string,
  email: string,
  firstName: string,
  lastName: string
) {
  logger.info('STRIPE_CONNECT', 'Creando cuenta Connect Express', { coachId, email });

  const account = await stripeClient.accounts.create({
    type: 'express',
    business_type: 'individual',
    email,
    individual: {
      first_name: firstName,
      last_name: lastName,
    },
    metadata: {
      coachId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  logger.info('STRIPE_CONNECT', 'Cuenta Connect Express creada', {
    coachId,
    accountId: account.id,
  });

  return account;
}

/**
 * Genera un Account Link para que el coach complete el onboarding en Stripe.
 */
export async function generateOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  logger.info('STRIPE_CONNECT', 'Generando onboarding link', { accountId });

  const accountLink = await stripeClient.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Obtiene el estado actual de una cuenta Connect.
 */
export async function retrieveAccountStatus(accountId: string): Promise<{
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
}> {
  const account = await stripeClient.accounts.retrieve(accountId);

  return {
    onboardingComplete: account.details_submitted,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
  };
}

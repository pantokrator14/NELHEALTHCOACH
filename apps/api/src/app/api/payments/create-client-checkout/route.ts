// apps/api/src/app/api/payments/create-client-checkout/route.ts
// Crea un Checkout Session de Stripe para pago de onboarding / sesión de cliente,
// respetando la tarifa configurada del coach (sessionPrice) y Stripe Connect cuando aplique.

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { stripeClient, getClientSessionAmount } from '@/app/lib/stripe';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';
import { apiHandler } from '@/app/lib/apiHandler';
import { requireRateLimit, secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import Coach from '@/app/models/Coach';
import { safeDecrypt } from '@/app/lib/encryption';

function sanitizeReturnUrl(rawUrl: string | undefined, fallbackBase: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl);
    const allowedOrigins = new Set<string>([
      new URL(fallbackBase).origin,
      'https://form.nelhealthcoach.com',
      'https://app.nelhealthcoach.com',
    ]);
    if (process.env.FORM_URL) {
      try {
        allowedOrigins.add(new URL(process.env.FORM_URL).origin);
      } catch {
        /* ignore invalid env */
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return `${parsed.origin}${parsed.pathname}`;
      }
    }
    if (allowedOrigins.has(parsed.origin)) {
      return `${parsed.origin}${parsed.pathname}`;
    }
  } catch {
    /* fallback below */
  }
  return null;
}

/**
 * GET /api/payments/create-client-checkout?coachId=...
 *
 * Devuelve el monto configurado (sin PII) para mostrar la tarifa correcta en PaymentStep.
 */
async function getHandler(request: NextRequest) {
  try {
    const rateCheck = await requireRateLimit(request);
    if (!rateCheck.passed) {
      return securityBlockResponse(rateCheck);
    }

    await connectMongoose();

    const coachId = request.nextUrl.searchParams.get('coachId');
    const defaultAmountCents = getClientSessionAmount();

    if (!coachId) {
      return NextResponse.json(
        {
          success: true,
          data: {
            amountCents: defaultAmountCents,
            amountUsd: Math.round(defaultAmountCents / 100),
            currency: 'usd',
          },
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(coachId)) {
      return NextResponse.json(
        { success: false, message: 'ID de coach inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const coach = await Coach.findById(coachId).select('role sessionPrice').lean() as {
      role?: string;
      sessionPrice?: number;
    } | null;

    const isAdmin = coach?.role === 'admin';
    const amountCents =
      coach && !isAdmin && typeof coach.sessionPrice === 'number' && coach.sessionPrice >= 5000
        ? coach.sessionPrice
        : defaultAmountCents;

    return NextResponse.json(
      {
        success: true,
        data: {
          amountCents,
          amountUsd: Math.round(amountCents / 100),
          currency: 'usd',
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    logger.error('PAYMENTS', 'Error consultando tarifa de onboarding del coach', error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error al consultar la tarifa',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/create-client-checkout
 *
 * Body:
 *   - type: 'onboarding' | 'session_renewal'
 *   - clientId?: string (para session_renewal)
 *   - clientEmail?: string
 *   - pendingSessionId?: string (para session_renewal)
 *   - returnUrl?: string (opcional, URL de retorno validada)
 *   - coachId?: string (ID del coach referido para aplicar su tarifa y Connect)
 *
 * Crea un Checkout Session de Stripe (one-time payment).
 */
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const securityCheck = await secureRoute(request, body);
    if (!securityCheck.passed) {
      return securityBlockResponse(securityCheck);
    }

    await connectMongoose();

    const {
      type,
      clientId,
      clientEmail,
      pendingSessionId,
      returnUrl,
      coachId,
    } = body as {
      type?: 'onboarding' | 'session_renewal';
      clientId?: string;
      clientEmail?: string;
      pendingSessionId?: string;
      returnUrl?: string;
      coachId?: string;
    };

    const paymentType = type || 'onboarding';

    if (paymentType !== 'onboarding' && paymentType !== 'session_renewal') {
      return NextResponse.json(
        { success: false, message: 'Tipo de pago inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    // Validaciones
    if (paymentType === 'session_renewal' && !pendingSessionId) {
      return NextResponse.json(
        { success: false, message: 'pendingSessionId es requerido para renovación', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    if (coachId && !mongoose.Types.ObjectId.isValid(coachId)) {
      return NextResponse.json(
        { success: false, message: 'coachId inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const defaultAmountCents = getClientSessionAmount();
    let amountCents = defaultAmountCents;
    let coachName = 'NELHEALTHCOACH';
    let connectAccountId: string | null = null;
    let isCoachAdmin = false;

    if (coachId) {
      const coach = await Coach.findById(coachId)
        .select('role sessionPrice firstName stripeConnectAccountId stripePayoutsEnabled')
        .lean() as {
          role?: string;
          sessionPrice?: number;
          firstName?: string;
          stripeConnectAccountId?: string;
          stripePayoutsEnabled?: boolean;
        } | null;

      if (!coach) {
        return NextResponse.json(
          { success: false, message: 'Coach no encontrado', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      isCoachAdmin = coach.role === 'admin';
      if (!isCoachAdmin) {
        amountCents =
          typeof coach.sessionPrice === 'number' && coach.sessionPrice >= 5000
            ? coach.sessionPrice
            : defaultAmountCents;
        if (coach.firstName) {
          const decryptedName = safeDecrypt(coach.firstName);
          if (decryptedName) coachName = decryptedName;
        }
        if (coach.stripeConnectAccountId && coach.stripePayoutsEnabled) {
          connectAccountId = coach.stripeConnectAccountId;
        }
      }
    }

    // Construir metadata según el tipo
    const metadata: Record<string, string> = {
      type: paymentType === 'onboarding' ? 'client_onboarding' : 'client_session',
    };

    if (paymentType === 'session_renewal' && pendingSessionId) {
      metadata.pendingSessionId = pendingSessionId;
    }

    if (clientEmail) {
      metadata.clientEmail = clientEmail;
    }

    if (coachId) {
      metadata.coachId = coachId;
    }

    if (clientId) {
      metadata.clientId = clientId;
    }

    // Obtener URLs base (con validación anti open-redirect)
    const formUrl = process.env.FORM_URL || 'http://localhost:3002';
    const safeBaseReturn = sanitizeReturnUrl(returnUrl, formUrl);

    const successUrl = safeBaseReturn
      ? `${safeBaseReturn}?payment=success&session_id={CHECKOUT_SESSION_ID}`
      : `${formUrl}/thank-you?payment=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = safeBaseReturn
      ? `${safeBaseReturn}?payment=canceled`
      : `${formUrl}/?payment=canceled`;

    const clientPriceId = process.env.STRIPE_CLIENT_PRICE_ID;
    const useDynamicPrice = Boolean(coachId && !isCoachAdmin) || !clientPriceId;

    const lineItems = useDynamicPrice
      ? [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Sesión de coaching con ${coachName}`,
                description: 'Consulta inicial y registro de historial de salud',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ]
      : [
          {
            price: clientPriceId,
            quantity: 1,
          },
        ];

    const sessionConfig: Record<string, unknown> = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: clientEmail || undefined,
      line_items: lineItems,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    if (connectAccountId) {
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: connectAccountId,
        },
      };
    }

    // Crear Checkout Session
    const session = await stripeClient.checkout.sessions.create(
      sessionConfig as unknown as Parameters<typeof stripeClient.checkout.sessions.create>[0]
    );

    logger.info('PAYMENTS', 'Checkout de cliente creado', {
      type: paymentType,
      sessionId: session.id,
      amount: amountCents,
      coachId: coachId || null,
      hasConnectTransfer: Boolean(connectAccountId),
      pendingSessionId: pendingSessionId || null,
    });

    return NextResponse.json(
      {
        success: true,
        url: session.url,
        sessionId: session.id,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error('PAYMENTS', 'Error creando checkout de cliente', error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error al iniciar el pago',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const GET = apiHandler(getHandler);
export const POST = apiHandler(postHandler);

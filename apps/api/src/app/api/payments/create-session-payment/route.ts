// apps/api/src/app/api/payments/create-session-payment/route.ts
// Crea un Checkout Session para pagar una sesión pendiente (Flow A y B)

import { NextRequest, NextResponse } from 'next/server';
import { stripeClient, getClientSessionAmount } from '@/app/lib/stripe';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';
import PendingSession from '@/app/models/PendingSession';
import { requireCoachAuth } from '@/app/lib/auth';

/**
 * POST /api/payments/create-session-payment
 *
 * Body: { pendingSessionId }
 *
 * Crea un Checkout Session de Stripe para que el cliente pague
 * la sesión pendiente. Usado tanto en Flow A (coach inicia)
 * como en Flow B (cliente inicia).
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose();

    // Solo coaches autenticados pueden crear pagos de sesión
    requireCoachAuth(request);

    const body = await request.json();
    const { pendingSessionId } = body as { pendingSessionId?: string };

    if (!pendingSessionId || typeof pendingSessionId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'pendingSessionId es requerido' },
        { status: 400 }
      );
    }

    // Buscar la sesión pendiente
    const pending = await PendingSession.findById(pendingSessionId);

    if (!pending) {
      return NextResponse.json(
        { success: false, message: 'Sesión pendiente no encontrada' },
        { status: 404 }
      );
    }

    if (pending.status !== 'awaiting_payment') {
      return NextResponse.json(
        { success: false, message: 'Esta sesión ya no está pendiente de pago' },
        { status: 400 }
      );
    }

    if (pending.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: 'El tiempo para pagar esta sesión ha expirado' },
        { status: 410 }
      );
    }

    const clientPriceId = process.env.STRIPE_CLIENT_PRICE_ID;
    if (!clientPriceId) {
      logger.error('PAYMENTS', 'STRIPE_CLIENT_PRICE_ID no definida');
      return NextResponse.json(
        { success: false, message: 'Error de configuración de pagos' },
        { status: 500 }
      );
    }

    // Obtener URLs base
    const formUrl = process.env.FORM_URL || process.env.APP_URL || 'http://localhost:3000';

    // Crear Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: pending.clientEmail || undefined,
      line_items: [
        {
          price: clientPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        type: 'client_session',
        pendingSessionId: pending._id.toString(),
        clientId: pending.clientId,
        clientEmail: pending.clientEmail,
      },
      success_url: `${formUrl}/thank-you?payment=success&pendingSessionId=${pending._id}`,
      cancel_url: `${formUrl}/request-session?canceled=true`,
    });

    logger.info('PAYMENTS', 'Checkout de sesión creado', {
      pendingSessionId,
      sessionId: session.id,
      amount: getClientSessionAmount(),
    });

    return NextResponse.json(
      {
        success: true,
        url: session.url,
        sessionId: session.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Si es un error estructurado (auth), devolver su status específico
    if (error?.status) {
      return NextResponse.json(
        { success: false, message: error.message || 'Error' },
        { status: error.status }
      );
    }
    logger.error('PAYMENTS', 'Error creando checkout de sesión', error as Error);
    return NextResponse.json(
      { success: false, message: 'Error al iniciar el pago' },
      { status: 500 }
    );
  }
}

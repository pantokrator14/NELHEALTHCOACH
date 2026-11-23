import { NextRequest, NextResponse } from 'next/server';
import { requireClientAuth } from '@/app/lib/auth';
import { connectMongoose } from '@/app/lib/database';
import { stripeClient } from '@/app/lib/stripe';
import { recordClientPlanPurchase } from '@/app/lib/plan-fulfillment';
import { apiHandler } from '@/app/lib/apiHandler';
import { logger } from '@/app/lib/logger';

async function postHandler(request: NextRequest) {
  try {
    const auth = requireClientAuth(request);
    await connectMongoose();

    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'sessionId requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, message: 'El pago aún no ha sido confirmado', code: 'PAYMENT_REQUIRED' },
        { status: 402 }
      );
    }

    const metadata = (session.metadata || {}) as Record<string, string>;
    if (
      metadata.type !== 'client_plan_purchase' ||
      metadata.clientAccountId !== auth.clientAccountId ||
      !metadata.planId
    ) {
      return NextResponse.json(
        { success: false, message: 'Sesión de pago no corresponde a tu cuenta', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const account = await recordClientPlanPurchase({
      clientAccountId: auth.clientAccountId,
      planId: metadata.planId,
      stripeSessionId: session.id,
      amountCents: session.amount_total ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Plan confirmado y activado exitosamente',
      data: {
        activePlanId: account.activePlanId,
        selectedPlanId: account.selectedPlanId,
        purchasedPlans: account.purchasedPlans,
      },
    });
  } catch (error: unknown) {
    const structured = error as { status?: number; message?: string };
    if (structured?.status === 401 || structured?.status === 403) {
      return NextResponse.json(
        {
          success: false,
          message: structured.message || 'No autorizado',
          code: structured.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
        },
        { status: structured.status }
      );
    }

    logger.error('PAYMENTS', 'Error confirmando pago de plan', error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error confirmando pago',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

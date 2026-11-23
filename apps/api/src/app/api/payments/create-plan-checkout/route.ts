import { NextRequest, NextResponse } from 'next/server';
import { requireClientAuth } from '@/app/lib/auth';
import { connectMongoose } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';
import ClientAccount from '@/app/models/ClientAccount';
import { getPlanById, getPlanStripePriceId } from '@/app/lib/plans';
import { isPlanAvailable } from '@/app/lib/plan-quotas';
import { stripeClient } from '@/app/lib/stripe';
import { apiHandler } from '@/app/lib/apiHandler';
import { logger } from '@/app/lib/logger';

async function postHandler(request: NextRequest) {
  try {
    const auth = requireClientAuth(request);
    await connectMongoose();

    const body = await request.json();
    const { planId } = body as { planId?: string };

    const plan = planId ? getPlanById(planId) : null;
    if (!plan) {
      return NextResponse.json(
        { success: false, message: 'Plan seleccionado no válido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const availability = await isPlanAvailable(plan.id);
    if (!availability.available) {
      return NextResponse.json(
        { success: false, message: 'Cupos no disponibles para este plan', code: 'QUOTA_FULL' },
        { status: 409 }
      );
    }

    const account = await ClientAccount.findById(auth.clientAccountId);
    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Cuenta de cliente no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    account.selectedPlanId = plan.id;
    await account.save();

    const clientEmail = decrypt(account.email);
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    const stripePriceId = getPlanStripePriceId(plan);

    const lineItem = stripePriceId
      ? { price: stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} (${plan.durationLabel})`,
              description: plan.modalitySummary,
            },
            unit_amount: plan.priceCents,
          },
          quantity: 1,
        };

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: clientEmail,
      line_items: [lineItem],
      metadata: {
        type: 'client_plan_purchase',
        clientAccountId: account._id.toString(),
        planId: plan.id,
        coachId: account.coachId,
        clientEmail,
      },
      success_url: `${dashboardUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan.id}`,
      cancel_url: `${dashboardUrl}/dashboard/plans?payment=cancelled&plan=${plan.id}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        planId: plan.id,
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

    logger.error('PAYMENTS', 'Error creando checkout de plan para cliente', error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error creando sesión de pago',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

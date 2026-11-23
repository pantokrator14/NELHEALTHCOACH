// apps/api/src/app/api/payments/create-consult-checkout/route.ts
// Checkout público para Consulta Privada 1 a 1 ($60 USD):
// El usuario NO crea cuenta ni accede al dashboard; queda registrado únicamente
// como lead, paga vía Stripe Checkout y es redirigido directamente a Calendly.

import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { getLeadsCollection } from '@/app/lib/database';
import { getPlanById, getPlanStripePriceId, DEFAULT_CALENDLY_URL } from '@/app/lib/plans';
import { isPlanAvailable } from '@/app/lib/plan-quotas';
import { stripeClient } from '@/app/lib/stripe';
import { secureRoute } from '@/app/lib/security/index';
import { consultCheckoutSchema } from '@/app/lib/schemas/index';
import { apiHandler } from '@/app/lib/apiHandler';
import { logger } from '@/app/lib/logger';

async function postHandler(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'JSON inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const securityCheck = await secureRoute(request, body);
    if (!securityCheck.passed) {
      return NextResponse.json(
        { success: false, message: securityCheck.message ?? 'Solicitud bloqueada por seguridad' },
        {
          status: securityCheck.statusCode ?? 429,
          ...(securityCheck.retryAfter && { headers: { 'Retry-After': String(securityCheck.retryAfter) } }),
        }
      );
    }

    const parsed = consultCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: firstError?.message ?? 'Datos inválidos',
          errors: parsed.error.issues.map((i: z.core.$ZodIssue) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
          code: 'VALIDATION',
        },
        { status: 400 }
      );
    }

    const consultPlan = getPlanById('consult_1on1');
    if (!consultPlan) {
      return NextResponse.json(
        { success: false, message: 'Plan de consulta no disponible', code: 'INTERNAL' },
        { status: 500 }
      );
    }

    const availability = await isPlanAvailable(consultPlan.id);
    if (!availability.available) {
      return NextResponse.json(
        { success: false, message: 'Cupos no disponibles para este plan', code: 'QUOTA_FULL' },
        { status: 409 }
      );
    }

    const { name, email, phone, objective } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const leadsCollection = await getLeadsCollection();
    const leadInsert = await leadsCollection.insertOne({
      name,
      email: normalizedEmail,
      phone: phone || '',
      objective: objective || 'Consulta diagnóstica 1 a 1',
      source: 'consult_1on1',
      planId: consultPlan.id,
      paymentStatus: 'pending',
      amountCents: consultPlan.priceCents,
      createdAt: new Date(),
    });

    const leadId = leadInsert.insertedId.toString();
    const calendlyUrl = consultPlan.calendlyUrl || DEFAULT_CALENDLY_URL;
    const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3000';
    const stripePriceId = getPlanStripePriceId(consultPlan);

    const lineItem = stripePriceId
      ? { price: stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${consultPlan.name} (${consultPlan.durationLabel})`,
              description: consultPlan.modalitySummary,
            },
            unit_amount: consultPlan.priceCents,
          },
          quantity: 1,
        };

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: normalizedEmail,
      line_items: [lineItem],
      metadata: {
        type: 'consult_1on1_lead',
        leadId,
        planId: consultPlan.id,
        clientEmail: normalizedEmail,
        clientName: name,
      },
      success_url: calendlyUrl,
      cancel_url: `${websiteUrl}/#planes`,
    });

    await leadsCollection.updateOne(
      { _id: leadInsert.insertedId },
      { $set: { stripeSessionId: session.id } }
    );

    logger.info('PAYMENTS', 'Checkout público Consulta 1 a 1 creado', {
      leadId,
      sessionId: session.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        leadId,
        calendlyUrl,
      },
    });
  } catch (error: unknown) {
    logger.error('PAYMENTS', 'Error creando checkout de Consulta 1 a 1', error as Error);
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

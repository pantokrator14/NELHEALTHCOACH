// apps/api/src/app/api/video/rooms/route.ts
//
// POST: Agenda una videollamada LiveKit.
// Si el cliente tiene créditos de LiveKit incluidos en su plan activo (Reto 3S NEL, Plan 1, Plan 2, Plan 3),
// consume 1 crédito y agenda la sala LiveKit inmediatamente sin cobrar de nuevo.
// Si no tiene créditos incluidos, crea PendingSession y envía link de pago al cliente.
// GET: Lista las sesiones pendientes (para que el coach vea estado de pagos).

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { connectMongoose, getHealthFormsCollection } from '@/app/lib/database';
import PendingSession from '@/app/models/PendingSession';
import ClientAccount from '@/app/models/ClientAccount';
import { encrypt, decrypt } from '@/app/lib/encryption';
import { EmailService } from '@/app/lib/email-service';
import {
  generatePaymentRequestEmailHTML,
  generateSessionInviteHTML,
} from '@/app/lib/email-templates';
import { createNotification } from '@/app/lib/create-notification';
import {
  createVideoSession,
  generateClientSessionLink,
} from '@/app/lib/video-service';
import { apiHandler } from '@/app/lib/apiHandler';
import {
  resolveClientTimezone,
  resolveCoachTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  formatTimeWithZoneLabel,
} from '@/app/lib/timezone';

interface CreateRoomRequestBody {
  clientId: string;
  clientName: string;
  clientEmail: string;
  scheduledAt: string;
  durationMinutes?: number;
  coachNotes?: string;
  timezone?: string;
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const coachPayload = requireCoachAuth(request);

    await connectMongoose();

    const body = (await request.json()) as CreateRoomRequestBody;

    if (!body.clientId || !body.scheduledAt) {
      return NextResponse.json(
        { success: false, message: 'clientId y scheduledAt son requeridos', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(body.clientId)) {
      return NextResponse.json(
        { success: false, message: 'clientId inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    if (!body.clientName || !body.clientEmail) {
      return NextResponse.json(
        { success: false, message: 'clientName y clientEmail son requeridos', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(body.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Fecha inválida', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    if (scheduledDate < new Date()) {
      return NextResponse.json(
        { success: false, message: 'La fecha debe ser futura', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    // Obtener datos y zona horaria del coach (California por defecto)
    let coachName = 'Tu asesor';
    let coachEmail: string | undefined;
    let coachTz = resolveCoachTimezone();
    try {
      const { default: Coach } = await import('@/app/models/Coach');
      const coachDoc = await Coach.findById(coachPayload.coachId).lean() as Record<string, unknown> | null;
      if (coachDoc?.firstName) {
        coachName = decrypt(coachDoc.firstName as string);
      }
      if (coachDoc?.email) {
        const decryptedEmail = decrypt(coachDoc.email as string);
        if (decryptedEmail && decryptedEmail.includes('@')) {
          coachEmail = decryptedEmail;
        }
      }
      coachTz = resolveCoachTimezone(coachDoc?.timezone as string | undefined);
    } catch {
      // fallback al nombre genérico y America/Los_Angeles
    }

    // Resolver zona horaria del cliente desde perfil/dirección o payload
    let clientExplicitTz: string | null = null;
    let clientAddress: string | null = null;
    try {
      const healthForms = await getHealthFormsCollection();
      const healthDoc = await healthForms.findOne(
        { _id: new ObjectId(body.clientId) },
        { projection: { 'personalData.timezone': 1, 'personalData.address': 1 } }
      );
      const rawPersonal = healthDoc?.personalData as Record<string, unknown> | undefined;
      clientExplicitTz = rawPersonal?.timezone ? decrypt(String(rawPersonal.timezone)) : null;
      clientAddress = rawPersonal?.address ? decrypt(String(rawPersonal.address)) : null;
    } catch {
      // Silencioso
    }

    const clientTz = resolveClientTimezone({
      explicitTimezone: clientExplicitTz,
      address: clientAddress,
      sessionTimezone: body.timezone,
    });

    // ── Verificar si el cliente tiene créditos LiveKit incluidos en su plan ──
    const clientAccount = await ClientAccount.findOne({ healthFormId: body.clientId });
    if (clientAccount) {
      const creditIndex = (clientAccount.purchasedPlans || []).findIndex(
        (p: { status: string; livekitCreditsTotal: number; livekitCreditsUsed: number }) =>
          p.status === 'paid' && (p.livekitCreditsTotal || 0) > (p.livekitCreditsUsed || 0)
      );

      if (creditIndex !== -1) {
        const duration = body.durationMinutes ?? 60;
        const result = await createVideoSession(
          body.clientId,
          scheduledDate.toISOString(),
          duration,
          body.coachNotes || undefined,
          clientTz
        );

        clientAccount.purchasedPlans[creditIndex].livekitCreditsUsed =
          (clientAccount.purchasedPlans[creditIndex].livekitCreditsUsed || 0) + 1;
        await clientAccount.save();

        const { joinLink } = generateClientSessionLink(
          body.clientId,
          result.session.sessionId,
          body.clientEmail
        );

        // Guardar enlace de cliente en la sesión para que los recordatorios cron lo tengan disponible
        try {
          const healthForms = await getHealthFormsCollection();
          await healthForms.updateOne(
            { _id: new ObjectId(body.clientId) },
            {
              $set: {
                'videoSessions.$[session].clientJoinLink': joinLink,
                updatedAt: new Date(),
              },
            } as Record<string, unknown>,
            { arrayFilters: [{ 'session.sessionId': result.session.sessionId }] }
          );
        } catch (linkErr) {
          logger.warn('VIDEO', 'No se pudo persistir clientJoinLink inicial', linkErr as Error);
        }

        const emailService = EmailService.getInstance();
        const clientFormattedDate = formatDateInTimezone(scheduledDate, clientTz);
        const clientTimeStr = formatTimeInTimezone(scheduledDate, clientTz);
        const coachTimeLabel = `${formatDateInTimezone(scheduledDate, coachTz)} · ${formatTimeWithZoneLabel(scheduledDate, coachTz)}`;
        const clientTimeLabel = `${clientFormattedDate} · ${formatTimeWithZoneLabel(scheduledDate, clientTz)}`;

        try {
          await emailService.sendEmail({
            to: [body.clientEmail],
            subject: `📹 Sesión #${result.session.sessionNumber} Agendada — ${clientFormattedDate} | NELHealthCoach`,
            htmlBody: generateSessionInviteHTML({
              clientName: body.clientName,
              sessionNumber: result.session.sessionNumber,
              scheduledDate,
              scheduledTime: clientTimeStr,
              durationMinutes: duration,
              joinLink,
              coachName,
              coachEmail,
              timeZone: clientTz,
              secondaryTimeLabel: coachTz !== clientTz ? coachTimeLabel : undefined,
            }),
          });
        } catch (emailError) {
          logger.error('VIDEO', 'Error enviando email de invitación al cliente', emailError as Error);
        }

        // Confirmación por correo para Manuel en su zona horaria (California)
        if (coachEmail) {
          try {
            await emailService.sendCoachSessionNotification(coachEmail, {
              clientName: body.clientName,
              sessionNumber: result.session.sessionNumber,
              scheduledDate,
              scheduledTime: formatTimeInTimezone(scheduledDate, coachTz),
              durationMinutes: duration,
              progressNotes: body.coachNotes,
              joinLink,
              dashboardUrl: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard/clients/${body.clientId}`,
              timeZone: coachTz,
              secondaryTimeLabel: coachTz !== clientTz ? clientTimeLabel : undefined,
            });
          } catch (coachEmailErr) {
            logger.warn('VIDEO', 'Error enviando confirmación de sesión al coach', coachEmailErr as Error);
          }
        }

        try {
          await createNotification({
            coachId: coachPayload.coachId,
            type: 'session_scheduled',
            title: '📹 Videollamada agendada (plan incluido)',
            message: `Agendaste una sesión incluida con ${body.clientName} para el ${formatDateInTimezone(scheduledDate, coachTz)} a las ${formatTimeWithZoneLabel(scheduledDate, coachTz)}.`,
            link: `/dashboard/clients/${body.clientId}`,
          });
        } catch (notifError) {
          logger.error('NOTIFICATIONS', 'Error creando notificación de sesión incluida', notifError as Error);
        }

        return NextResponse.json(
          {
            success: true,
            data: {
              pendingSessionId: result.session.sessionId,
              sessionId: result.session.sessionId,
              roomName: result.roomName,
              status: 'scheduled',
              usedPlanCredit: true,
              proposedDate: body.scheduledAt,
              duration,
              clientTimezone: clientTz,
              coachTimezone: coachTz,
              joinLink,
              message: 'Videollamada agendada usando crédito incluido en el plan del cliente.',
            },
          },
          { status: 201 }
        );
      }
    }

    // ── Flujo legacy: crear PendingSession con cobro por sesión ──
    const existingPending = await PendingSession.findOne({
      clientId: body.clientId,
      status: 'awaiting_payment',
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ya hay una solicitud de sesión pendiente de pago para este cliente',
          pendingSessionId: existingPending._id.toString(),
          code: 'CONFLICT',
        },
        { status: 409 }
      );
    }

    const pending = await PendingSession.create({
      clientId: body.clientId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      coachId: coachPayload?.coachId || '',
      proposedDate: scheduledDate,
      duration: body.durationMinutes ?? 60,
      coachNotes: body.coachNotes ? encrypt(body.coachNotes) : '',
      timezone: clientTz,
      status: 'awaiting_payment',
      requestedBy: 'coach',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      const emailService = EmailService.getInstance();
      const formUrl = process.env.FORM_URL || 'http://localhost:3002';

      const paymentLink = `${formUrl}/request-session?pendingSessionId=${pending._id}`;

      const htmlContent = generatePaymentRequestEmailHTML({
        coachName,
        clientName: body.clientName,
        scheduledDate,
        scheduledTime: formatTimeWithZoneLabel(scheduledDate, clientTz),
        durationMinutes: body.durationMinutes ?? 60,
        paymentLink,
        coachEmail,
      });

      await emailService.sendEmail({
        to: [body.clientEmail],
        subject: '📹 Tu asesor ha solicitado una videollamada — NELHealthCoach',
        htmlBody: htmlContent,
      });
    } catch (emailError) {
      logger.error('VIDEO', 'Error enviando email de solicitud de pago', emailError as Error);
    }

    try {
      await createNotification({
        coachId: coachPayload.coachId,
        type: 'session_scheduled',
        title: '📹 Sesión de videollamada agendada',
        message: `Has agendado una sesión con ${body.clientName} para el ${formatDateInTimezone(scheduledDate, coachTz)} a las ${formatTimeWithZoneLabel(scheduledDate, coachTz)}. Pendiente de pago.`,
        link: `/dashboard/clients/${body.clientId}`,
      });
    } catch (notifError) {
      logger.error('NOTIFICATIONS', 'Error creando notificación de sesión', notifError as Error);
    }

    logger.info('VIDEO', 'Pending session created (awaiting payment)', {
      clientId: body.clientId,
      pendingId: pending._id.toString(),
      proposedDate: body.scheduledAt,
      duration: body.durationMinutes ?? 60,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          pendingSessionId: pending._id.toString(),
          status: 'awaiting_payment',
          proposedDate: body.scheduledAt,
          duration: body.durationMinutes ?? 60,
          message: 'Solicitud de sesión creada. Se ha enviado un email al cliente para realizar el pago.',
        },
      },
      { status: 201 }
    );
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

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    if (errorMessage.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    logger.error('VIDEO', 'Failed to create pending session', error as Error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { detail: errorMessage }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    requireCoachAuth(request);

    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    const pendings = await PendingSession.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: pendings,
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
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { detail: errorMessage }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const GET = apiHandler(getHandler);

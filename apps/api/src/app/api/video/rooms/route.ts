// apps/api/src/app/api/video/rooms/route.ts
//
// POST: Agenda una videollamada LiveKit.
// Si el cliente tiene créditos de LiveKit incluidos en su plan activo (Reto Tres NEL, Plan 2, Plan 3),
// consume 1 crédito y agenda la sala LiveKit inmediatamente sin cobrar de nuevo.
// Si no tiene créditos incluidos, crea PendingSession y envía link de pago al cliente.
// GET: Lista las sesiones pendientes (para que el coach vea estado de pagos).

import { NextRequest, NextResponse } from 'next/server';
import { requireCoachAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { connectMongoose } from '@/app/lib/database';
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
        { success: false, message: 'clientId y scheduledAt son requeridos', code: 'VALIDATION'},
        { status: 400 }
      );
    }

    if (!body.clientName || !body.clientEmail) {
      return NextResponse.json(
        { success: false, message: 'clientName y clientEmail son requeridos', code: 'VALIDATION'},
        { status: 400 }
      );
    }

    const scheduledDate = new Date(body.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Fecha inválida', code: 'VALIDATION'},
        { status: 400 }
      );
    }

    if (scheduledDate < new Date()) {
      return NextResponse.json(
        { success: false, message: 'La fecha debe ser futura', code: 'VALIDATION'},
        { status: 400 }
      );
    }

    // Obtener datos del coach para el email
    let coachName = 'Tu asesor';
    let coachEmail: string | undefined;
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
    } catch {
      // fallback al nombre genérico
    }

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
          body.timezone || undefined
        );

        clientAccount.purchasedPlans[creditIndex].livekitCreditsUsed =
          (clientAccount.purchasedPlans[creditIndex].livekitCreditsUsed || 0) + 1;
        await clientAccount.save();

        const { joinLink } = generateClientSessionLink(
          body.clientId,
          result.session.sessionId,
          body.clientEmail
        );

        try {
          const emailService = EmailService.getInstance();
          const formattedDate = scheduledDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const timeStr = scheduledDate.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await emailService.sendEmail({
            to: [body.clientEmail],
            subject: `📹 Sesión #${result.session.sessionNumber} Agendada — ${formattedDate} | NELHealthCoach`,
            htmlBody: generateSessionInviteHTML({
              clientName: body.clientName,
              sessionNumber: result.session.sessionNumber,
              scheduledDate,
              scheduledTime: timeStr,
              durationMinutes: duration,
              joinLink,
              timeZone: body.timezone || undefined,
            }),
          });
        } catch (emailError) {
          logger.error('VIDEO', 'Error enviando email de invitación de videollamada', emailError as Error);
        }

        try {
          await createNotification({
            coachId: coachPayload.coachId,
            type: 'session_scheduled',
            title: '📹 Videollamada agendada (plan incluido)',
            message: `Agendaste una sesión incluida con ${body.clientName} para el ${scheduledDate.toLocaleDateString('es-MX')}.`,
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
      timezone: body.timezone || '',
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
        scheduledTime: scheduledDate.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        }),
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
        message: `Has agendado una sesión con ${body.clientName} para el ${scheduledDate.toLocaleDateString('es-MX')}. Pendiente de pago.`,
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
        { success: false, message: 'No autorizado', code: 'UNAUTHORIZED'},
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

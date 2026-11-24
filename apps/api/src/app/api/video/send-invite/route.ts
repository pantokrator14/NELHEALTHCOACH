// apps/api/src/app/api/video/send-invite/route.ts
//
// POST: Envía el email de invitación a la videollamada al cliente y notificación al coach
// adaptados a la zona horaria de cada uno.
// Solo accesible por el coach autenticado.

import { NextRequest, NextResponse } from 'next/server';
import { requireCoachAuth } from '@/app/lib/auth';
import { generateClientSessionLink, getVideoSession } from '@/app/lib/video-service';
import { EmailService } from '@/app/lib/email-service';
import { getHealthFormsCollection, connectToDatabase } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { logger } from '@/app/lib/logger';
import { apiHandler } from '@/app/lib/apiHandler';
import {
  resolveClientTimezone,
  resolveCoachTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  formatTimeWithZoneLabel,
} from '@/app/lib/timezone';

interface SendInviteRequest {
  clientId: string;
  sessionId: string;
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth — coach autenticado
    const auth = requireCoachAuth(request);

    const body = (await request.json()) as SendInviteRequest;

    if (!body.clientId || !body.sessionId) {
      return NextResponse.json(
        { success: false, message: 'clientId y sessionId son requeridos', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(body.clientId)) {
      return NextResponse.json(
        { success: false, message: 'clientId inválido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    // Obtener datos del cliente
    const collection = await getHealthFormsCollection();
    const doc = await collection.findOne(
      { _id: new ObjectId(body.clientId) },
      { projection: { personalData: 1, videoSessions: 1 } }
    );

    if (!doc) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Obtener email, nombre, dirección y timezone del cliente
    const rawPersonal = doc.personalData as Record<string, unknown> | undefined;
    const clientEmail = rawPersonal?.email ? decrypt(rawPersonal.email as string) : '';
    const clientName = rawPersonal?.name ? decrypt(rawPersonal.name as string) : 'Cliente';
    const clientExplicitTz = rawPersonal?.timezone ? decrypt(rawPersonal.timezone as string) : null;
    const clientAddress = rawPersonal?.address ? decrypt(rawPersonal.address as string) : null;

    if (!clientEmail) {
      return NextResponse.json(
        { success: false, message: 'El cliente no tiene email registrado', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    // Obtener la sesión de video
    const session = await getVideoSession(body.clientId, body.sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesión no encontrada', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Generar enlace para el cliente
    const { joinLink } = generateClientSessionLink(
      body.clientId,
      body.sessionId,
      clientEmail
    );

    // Resolver zonas horarias del coach (California por defecto) y del cliente
    let coachTz = resolveCoachTimezone();
    let coachName = 'Tu asesor';
    try {
      const { db } = await connectToDatabase();
      const coachDoc = await db.collection('coaches').findOne({
        emailHash: crypto.createHash('sha256').update((auth.email || '').toLowerCase().trim()).digest('hex'),
      });
      coachTz = resolveCoachTimezone(coachDoc?.timezone as string | undefined);
      if (coachDoc?.firstName) {
        coachName = decrypt(String(coachDoc.firstName));
      }
    } catch {
      // Fallback a DEFAULT_COACH_TIMEZONE
    }

    const clientTimezone = resolveClientTimezone({
      explicitTimezone: clientExplicitTz,
      address: clientAddress,
      sessionTimezone: session.timezone,
    });

    // Guardar el enlace en la sesión
    await collection.updateOne(
      { _id: new ObjectId(body.clientId) },
      {
        $set: {
          'videoSessions.$[session].clientJoinLink': joinLink,
          updatedAt: new Date(),
        },
      } as Record<string, unknown>,
      {
        arrayFilters: [{ 'session.sessionId': body.sessionId }],
      }
    );

    const emailService = EmailService.getInstance();
    const scheduledDate = new Date(session.scheduledAt);
    const clientTimeString = formatTimeInTimezone(scheduledDate, clientTimezone);
    const coachTimeString = formatTimeInTimezone(scheduledDate, coachTz);
    const coachTimeLabel = `${formatDateInTimezone(scheduledDate, coachTz)} · ${formatTimeWithZoneLabel(scheduledDate, coachTz)}`;
    const clientTimeLabel = `${formatDateInTimezone(scheduledDate, clientTimezone)} · ${formatTimeWithZoneLabel(scheduledDate, clientTimezone)}`;

    const emailSent = await emailService.sendSessionInviteEmail(clientEmail, {
      clientName,
      sessionNumber: session.sessionNumber,
      scheduledDate,
      scheduledTime: clientTimeString,
      durationMinutes: session.durationMinutes,
      joinLink,
      coachName,
      coachEmail: auth.email,
      timeZone: clientTimezone,
      secondaryTimeLabel: coachTz !== clientTimezone ? coachTimeLabel : undefined,
    });

    logger.info('VIDEO', 'Session invite email sent', {
      clientId: body.clientId,
      sessionId: body.sessionId,
      emailSent,
      clientTimezone,
    });

    let coachEmailSent = false;

    // Enviar notificación al coach en su zona horaria (California por defecto)
    try {
      const coachEmail = auth.email;
      if (coachEmail) {
        coachEmailSent = await emailService.sendCoachSessionNotification(coachEmail, {
          clientName,
          sessionNumber: session.sessionNumber,
          scheduledDate,
          scheduledTime: coachTimeString,
          durationMinutes: session.durationMinutes,
          joinLink,
          dashboardUrl: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard/clients/${body.clientId}`,
          timeZone: coachTz,
          secondaryTimeLabel: coachTz !== clientTimezone ? clientTimeLabel : undefined,
        });

        logger.info('VIDEO', 'Coach notification email sent', {
          coachEmail,
          sessionId: body.sessionId,
          coachEmailSent,
          coachTz,
        });
      }
    } catch (coachError: unknown) {
      logger.warn('VIDEO', 'Failed to send coach notification', coachError as Error);
    }

    return NextResponse.json({
      success: true,
      data: {
        emailSent,
        coachEmailSent,
        joinLink,
        clientEmail,
        clientTimezone,
        coachTimezone: coachTz,
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

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    if (errorMessage.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    logger.error('VIDEO', 'Failed to send session invite', error as Error);

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

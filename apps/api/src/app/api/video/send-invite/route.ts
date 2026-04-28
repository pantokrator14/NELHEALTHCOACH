// apps/api/src/app/api/video/send-invite/route.ts
//
// POST: Envía el email de invitación a la videollamada al cliente.
// Genera el enlace con token temporal y lo incluye en el email.
// Solo accesible por el coach autenticado.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { generateClientSessionLink, getVideoSession } from '@/app/lib/video-service';
import { EmailService } from '@/app/lib/email-service';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';
import { ObjectId } from 'mongodb';
import { logger } from '@/app/lib/logger';

interface SendInviteRequest {
  clientId: string;
  sessionId: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const body = (await request.json()) as SendInviteRequest;

    if (!body.clientId || !body.sessionId) {
      return NextResponse.json(
        { success: false, message: 'clientId y sessionId son requeridos' },
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
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener email y nombre del cliente
    const rawPersonal = doc.personalData as Record<string, unknown> | undefined;
    const clientEmail = rawPersonal?.email
      ? decrypt(rawPersonal.email as string)
      : '';
    const clientName = rawPersonal?.name
      ? decrypt(rawPersonal.name as string)
      : 'Cliente';

    if (!clientEmail) {
      return NextResponse.json(
        { success: false, message: 'El cliente no tiene email registrado' },
        { status: 400 }
      );
    }

    // Obtener la sesión de video
    const session = await getVideoSession(body.clientId, body.sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Generar enlace para el cliente
    const { joinLink } = generateClientSessionLink(
      body.clientId,
      body.sessionId,
      clientEmail
    );

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

    // Enviar email con Resend
    const emailService = EmailService.getInstance();

    const scheduledDate = new Date(session.scheduledAt);
    const timeString = scheduledDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailSent = await emailService.sendSessionInviteEmail(clientEmail, {
      clientName,
      sessionNumber: session.sessionNumber,
      scheduledDate,
      scheduledTime: timeString,
      durationMinutes: session.durationMinutes,
      joinLink,
    });

    logger.info('VIDEO', 'Session invite email sent', {
      clientId: body.clientId,
      sessionId: body.sessionId,
      emailSent,
    });

    return NextResponse.json({
      success: true,
      data: {
        emailSent,
        joinLink,
        clientEmail,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    if (errorMessage.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.error('VIDEO', 'Failed to send session invite', error as Error);

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// apps/api/src/app/api/video/session-link/route.ts
//
// POST: Genera el enlace con token temporal para enviar al cliente por email.
// Solo el coach autenticado puede generar estos enlaces.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { generateClientSessionLink } from '@/app/lib/video-service';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt } from '@/app/lib/encryption';
import { ObjectId } from 'mongodb';
import { logger } from '@/app/lib/logger';

interface SessionLinkRequest {
  clientId: string;
  sessionId: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const body = (await request.json()) as SessionLinkRequest;

    if (!body.clientId || !body.sessionId) {
      return NextResponse.json(
        { success: false, message: 'clientId y sessionId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener email del cliente
    const collection = await getHealthFormsCollection();
    const doc = await collection.findOne(
      { _id: new ObjectId(body.clientId) },
      { projection: { personalData: 1 } }
    );

    if (!doc) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    const rawPersonal = doc.personalData as { email?: string } | undefined;
    const clientEmail = rawPersonal?.email
      ? decrypt(rawPersonal.email)
      : '';

    if (!clientEmail) {
      return NextResponse.json(
        { success: false, message: 'El cliente no tiene email registrado' },
        { status: 400 }
      );
    }

    const { joinLink } = generateClientSessionLink(
      body.clientId,
      body.sessionId,
      clientEmail
    );

    logger.info('VIDEO', 'Client session link generated', {
      clientId: body.clientId,
      sessionId: body.sessionId,
    });

    return NextResponse.json({
      success: true,
      data: { joinLink },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    if (errorMessage.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.error('VIDEO', 'Failed to generate session link', error as Error);

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

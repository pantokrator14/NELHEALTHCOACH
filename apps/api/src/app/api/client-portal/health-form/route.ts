import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import {
  getHealthFormsCollection,
  getLeadsCollection,
  connectMongoose,
} from '@/app/lib/database';
import { encrypt, decrypt } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import { requireClientAuth, generateToken } from '@/app/lib/auth';
import { secureRoute } from '@/app/lib/security/index';
import { clientFormSchema } from '@/app/lib/schemas/index';
import ClientAccount from '@/app/models/ClientAccount';
import Coach from '@/app/models/Coach';
import { EmailService } from '@/app/lib/email-service';
import {
  generateNewClientClientNotificationHTML,
  generateNewClientCoachNotificationHTML,
} from '@/app/lib/email-templates';
import { createNotification } from '@/app/lib/create-notification';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

const EXPECTED_ARRAY_LENGTHS: Record<string, number> = {
  carbohydrateAddiction: 11,
  leptinResistance: 8,
  circadianRhythms: 11,
  sleepHygiene: 12,
  electrosmogExposure: 10,
  generalToxicity: 10,
  microbiotaHealth: 12,
};

const ARRAY_FIELDS = Object.keys(EXPECTED_ARRAY_LENGTHS);

function encryptObject(obj: Record<string, unknown>): Record<string, unknown> {
  const encrypted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'documents' && Array.isArray(value)) {
      encrypted[key] = value;
      continue;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      encrypted[key] = encrypt(value);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        encrypted[key] = encrypt(
          JSON.stringify(
            value.map((item: unknown) =>
              typeof item === 'object' && item !== null
                ? encryptObject(item as Record<string, unknown>)
                : item
            )
          )
        );
      } else {
        encrypted[key] = encrypt(
          JSON.stringify(encryptObject(value as Record<string, unknown>))
        );
      }
    } else {
      encrypted[key] = value;
    }
  }
  return encrypted;
}

async function postHandler(request: NextRequest) {
  try {
    const auth = requireClientAuth(request);
    await connectMongoose();

    const data = await request.json();
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'Unknown';

    const securityCheck = await secureRoute(request, data);
    if (!securityCheck.passed) {
      return NextResponse.json(
        {
          success: false,
          message: securityCheck.message ?? 'Solicitud bloqueada por seguridad',
        },
        {
          status: securityCheck.statusCode ?? 429,
          ...(securityCheck.retryAfter && {
            headers: { 'Retry-After': String(securityCheck.retryAfter) },
          }),
        }
      );
    }

    const account = await ClientAccount.findById(auth.clientAccountId);
    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Cuenta de cliente no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!account.emailVerified) {
      return NextResponse.json(
        { success: false, message: 'Debes verificar tu correo primero', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const hasPaidPlan = (account.purchasedPlans || []).some(
      (p: { status: string }) => p.status === 'paid'
    );
    if (!hasPaidPlan) {
      return NextResponse.json(
        {
          success: false,
          message: 'Debes completar el pago de un plan antes de registrar tu historial de salud.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 }
      );
    }

    if (account.healthFormId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ya completaste tu historial de salud. Puedes editarlo desde tu perfil.',
          healthFormId: account.healthFormId,
          code: 'CONFLICT',
        },
        { status: 409 }
      );
    }

    const accountEmail = decrypt(account.email);

    // Forzar correo de la cuenta verificada y coachId de Manuel Martínez
    const normalizedPayload = {
      ...data,
      coachId: account.coachId,
      personalData: {
        ...(data.personalData || {}),
        email: accountEmail,
      },
    };

    const parsed = clientFormSchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: firstError?.message ?? 'Datos del formulario inválidos',
          errors: parsed.error.issues.map((i: z.core.$ZodIssue) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
          code: 'VALIDATION',
        },
        { status: 400 }
      );
    }

    const processedMedicalData: Record<string, unknown> = {
      ...(normalizedPayload.medicalData as Record<string, unknown>),
    };

    for (const field of ARRAY_FIELDS) {
      const arrayData = processedMedicalData[field];
      const expectedLength = EXPECTED_ARRAY_LENGTHS[field];

      if (!arrayData || !Array.isArray(arrayData)) {
        processedMedicalData[field] = JSON.stringify([]);
        continue;
      }

      const cleanedArray = arrayData.map((value: unknown) => {
        if (typeof value === 'string') return value;
        if (typeof value === 'boolean') return value ? 'si' : 'no';
        if (typeof value === 'number') return value.toString();
        return '';
      });

      while (cleanedArray.length < expectedLength) cleanedArray.push('');
      if (cleanedArray.length > expectedLength) cleanedArray.length = expectedLength;

      processedMedicalData[field] = JSON.stringify(cleanedArray);
    }

    processedMedicalData.documents = [];

    const encryptedPersonalData = encryptObject(
      normalizedPayload.personalData as Record<string, unknown>
    );
    const encryptedMedicalData = encryptObject(processedMedicalData);

    const healthForms = await getHealthFormsCollection();
    const newClient = {
      personalData: encryptedPersonalData,
      medicalData: encryptedMedicalData,
      contractAccepted: encrypt(Boolean(parsed.data.contractAccepted).toString()),
      contractVersion: parsed.data.contractVersion || null,
      contractAcceptedAt: parsed.data.contractAccepted ? new Date() : null,
      ipAddress: encrypt(clientIP),
      coachId: account.coachId,
      clientAccountId: account._id.toString(),
      planId: account.activePlanId || account.selectedPlanId || null,
      submissionDate: new Date(),
    };

    const result = await healthForms.insertOne(newClient);
    const newClientId = result.insertedId.toString();

    account.healthFormId = newClientId;
    await account.save();

    // Eliminar lead si existía
    try {
      const leadsCollection = await getLeadsCollection();
      await leadsCollection.deleteOne({ email: accountEmail });
    } catch (leadError) {
      logger.error('CLIENT_PORTAL', 'Error eliminando lead tras onboarding', leadError);
    }

    // Notificar a Manuel Martínez y enviar bienvenida al cliente
    const clientName = String(parsed.data.personalData.name || 'Cliente');
    try {
      const coach = await Coach.findById(account.coachId);
      if (coach) {
        const emailService = EmailService.getInstance();
        const appUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
        const coachName = `${decrypt(coach.firstName)} ${decrypt(coach.lastName)}`.trim();
        const coachEmail = decrypt(coach.email);
        const coachPhone = coach.phone ? decrypt(coach.phone) : '';
        const coachPhotoUrl = coach.profilePhoto?.url
          ? decrypt(coach.profilePhoto.url)
          : null;

        await emailService.sendEmail({
          to: [accountEmail],
          subject: '¡Bienvenido a NELHEALTHCOACH!',
          htmlBody: generateNewClientClientNotificationHTML({
            clientName,
            coachName,
            coachEmail,
            coachPhone,
            coachPhoto: coachPhotoUrl,
          }),
        });

        await emailService.sendEmail({
          to: [coachEmail],
          subject: `Nuevo cliente registrado: ${clientName} | NELHEALTHCOACH`,
          htmlBody: generateNewClientCoachNotificationHTML({
            coachName: decrypt(coach.firstName),
            clientName,
            clientEmail: accountEmail,
            clientPhone: parsed.data.personalData.phone || 'No disponible',
            clientId: newClientId,
            dashboardUrl: `${appUrl}/dashboard/clients/${newClientId}`,
          }),
        });
      }

      await createNotification({
        coachId: account.coachId,
        type: 'new_client',
        title: '👤 Nuevo cliente completó su perfil',
        message: `${clientName} completó su historial de salud y está asignado a tu lista.`,
        link: `/dashboard/clients/${newClientId}`,
      });
    } catch (notifyErr) {
      logger.error('CLIENT_PORTAL', 'Error enviando notificaciones de onboarding', notifyErr);
    }

    const refreshedToken = generateToken({
      clientAccountId: account._id.toString(),
      clientId: newClientId,
      coachId: account.coachId,
      email: accountEmail,
      role: 'client',
    });

    const uploadToken = generateToken({
      type: 'client-upload',
      clientId: newClientId,
    });

    logAuditEvent({
      eventType: 'CLIENT_CREATED',
      severity: 'info',
      message: `Cliente autoregistrado completó perfil: ${clientName}`,
      coachId: account.coachId,
      actorEmail: accountEmail,
      actorRole: 'client',
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
      path: '/api/client-portal/health-form',
      method: 'POST',
      statusCode: 201,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Perfil de salud creado exitosamente',
        data: {
          _id: newClientId,
          token: refreshedToken,
          uploadToken,
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

    logger.error('CLIENT_PORTAL', 'Error creando formulario de cliente', error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor al guardar tu historial',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

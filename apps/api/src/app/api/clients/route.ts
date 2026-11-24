import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { z } from 'zod';
import { getHealthFormsCollection, getLeadsCollection, connectMongoose } from '@/app/lib/database';
import { encrypt, decrypt, decryptFileObject, isEncrypted } from '@/app/lib/encryption';
import { logger } from '@/app/lib/logger';
import { requireCoachAuth, generateToken } from '@/app/lib/auth';
import { secureRoute } from '@/app/lib/security/index';
import { clientFormSchema } from '@/app/lib/schemas/index';
import Coach from '@/app/models/Coach';
import ClientAccount from '@/app/models/ClientAccount';
import { getPlanById, type PlanId } from '@/app/lib/plans';
import { resolveClientTimezone, isValidTimeZone } from '@/app/lib/timezone';
import { EmailService } from '@/app/lib/email-service';
import {
  generateNewClientClientNotificationHTML,
  generateNewClientCoachNotificationHTML,
} from '@/app/lib/email-templates';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

interface ClientAccountPlanRow {
  _id: ObjectId | string;
  activePlanId?: string | null;
  healthFormId?: string | null;
}

// GET: Listar clientes (dashboard, filtrado por coach)
async function getHandler(request: NextRequest) {
  return logger.time('CLIENTS', 'Obtener lista de clientes', async () => {
    try {
      logger.info('CLIENTS', 'Solicitud GET /api/clients recibida', undefined, {
        endpoint: '/api/clients',
        method: 'GET'
      });

      // Autenticar coach (obligatorio)
      const auth = requireCoachAuth(request);

      const healthForms = await getHealthFormsCollection();

      // Construir filtro
      const filter: Record<string, unknown> = {};
      if (auth.role === 'coach') {
        // Coach solo ve sus clientes
        filter.coachId = auth.coachId;
      }
      // Admin ve todos (no filtra)

      const totalCount = await healthForms.countDocuments(filter);
      logger.debug('CLIENTS', `Total documentos en BD para este filtro: ${totalCount}`);

      const clients = await healthForms
        .find(filter)
        .sort({ submissionDate: -1 })
        .toArray();

      logger.info('CLIENTS', `Documentos obtenidos: ${clients.length}`, {
        firstClientId: clients[0]?._id?.toString()
      });

      // Resolver plan activo por lotes desde ClientAccount (manteniendo compatibilidad con healthforms.planId)
      const byAccountId = new Map<string, ClientAccountPlanRow>();
      const byHealthFormId = new Map<string, ClientAccountPlanRow>();
      if (clients.length > 0) {
        try {
          await connectMongoose();
          const accountIds = clients
            .map((c) => (typeof c.clientAccountId === 'string' ? c.clientAccountId : ''))
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id));
          const healthFormIds = clients.map((c) => c._id.toString());

          const orFilters: Record<string, unknown>[] = [];
          if (accountIds.length > 0) {
            orFilters.push({ _id: { $in: accountIds } });
          }
          if (healthFormIds.length > 0) {
            orFilters.push({ healthFormId: { $in: healthFormIds } });
          }

          if (orFilters.length > 0) {
            const accountRows = (await ClientAccount.find({ $or: orFilters })
              .select('_id activePlanId healthFormId')
              .lean()) as ClientAccountPlanRow[];

            for (const row of accountRows) {
              byAccountId.set(String(row._id), row);
              if (row.healthFormId) {
                byHealthFormId.set(String(row.healthFormId), row);
              }
            }
          }
        } catch (planErr) {
          logger.warn('CLIENTS', 'No se pudo resolver planId en lote desde ClientAccount', planErr as Error);
        }
      }

      // ✅ FUNCIÓN MEJORADA PARA DESENCRIPTAR CAMPOS DE TEXTO
      const decryptTextField = (text: string): string => {
        if (!text) return text;
        return decrypt(text);
      };

      // Procesar y desencriptar clientes
      const clientList = clients.map(client => {
        const linkedAccount =
          (typeof client.clientAccountId === 'string' ? byAccountId.get(client.clientAccountId) : undefined) ??
          byHealthFormId.get(client._id.toString());
        const candidatePlanId =
          linkedAccount?.activePlanId || (typeof client.planId === 'string' ? client.planId : '');
        const resolvedPlan = candidatePlanId ? getPlanById(candidatePlanId) : null;
        const planId: PlanId | null = resolvedPlan ? resolvedPlan.id : null;
        const planName: string | null = resolvedPlan ? resolvedPlan.name : null;

        try {
          const decryptedName = decryptTextField(client.personalData?.name || '');
          const names = decryptedName.split(' ');
          
          let decryptedProfilePhoto = null;
          if (client.personalData?.profilePhoto) {
            try {
              decryptedProfilePhoto = decryptFileObject(client.personalData.profilePhoto);
            } catch (error) {
              logger.warn('CLIENTS', `Error desencriptando profilePhoto para cliente ${client._id}`, error as Error);
              decryptedProfilePhoto = null;
            }
          }

          const result = {
            _id: client._id.toString(),
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            email: decryptTextField(client.personalData?.email || ''),
            phone: decryptTextField(client.personalData?.phone || ''),
            createdAt: client.submissionDate,
            profilePhoto: decryptedProfilePhoto,
            planId,
            planName,
          };

          logger.debug('CLIENTS', 'Cliente procesado', {
            clientId: client._id.toString(),
            nameRaw: client.personalData?.name?.substring(0, 30) || 'N/A',
            nameDecrypted: result.firstName + ' ' + result.lastName,
            emailDecrypted: result.email?.substring(0, 30) || 'N/A',
            wasEncrypted: isEncrypted(client.personalData?.name || '')
          });

          return result;
        } catch (error) {
          logger.error('CLIENTS', `Error procesando cliente ${client._id}`, error as Error, {
            clientId: client._id.toString(),
            personalDataKeys: Object.keys(client.personalData || {})
          });
          
          return {
            _id: client._id.toString(),
            firstName: 'Error',
            lastName: 'Desencriptación',
            email: 'error@example.com',
            phone: 'N/A',
            createdAt: client.submissionDate,
            profilePhoto: null,
            planId,
            planName,
          };
        }
      });

      logger.info('CLIENTS', `Procesamiento completado: ${clientList.length} clientes`, {
        successCount: clientList.filter(c => c.firstName !== 'Error').length,
        errorCount: clientList.filter(c => c.firstName === 'Error').length
      });

      return NextResponse.json({
        success: true,
        data: clientList,
        metadata: {
          total: clientList.length,
          processed: clientList.length
        }
      });

    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string };
      if (apiError?.status) {
        return NextResponse.json(
          { 
            success: false, 
            message: apiError.message || 'Error',
            ...(process.env.NODE_ENV === 'development' && { detail: (error as Error).message })
          },
          { status: apiError.status }
        );
      }

      logger.error('CLIENTS', 'Error obteniendo lista de clientes', error, {
        endpoint: '/api/clients',
        method: 'GET'
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error interno del servidor',
          ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }), code: 'INTERNAL'},
        { status: 500 }
      );
    }
  }, { endpoint: '/api/clients' });
}

export const GET = apiHandler(getHandler);

// POST: Crear nuevo cliente (desde formulario)
async function postHandler(request: NextRequest) {
  try {
    const data = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'Unknown';

    const reqCtx = {
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
    };

    const securityCheck = await secureRoute(request, data);
    if (!securityCheck.passed) {
      return NextResponse.json(
        { success: false, message: securityCheck.message ?? 'Solicitud bloqueada por seguridad' },
        {
          status: securityCheck.statusCode ?? 429,
          ...(securityCheck.retryAfter && { headers: { 'Retry-After': String(securityCheck.retryAfter) } }),
        }
      );
    }

    const coachId = data.coachId || null;
    const isFree = data.free === true;
    const stripeSessionId = data.stripeSessionId as string | undefined;

    if (isFree) {
      if (!coachId) {
        logger.warn('CLIENTS', 'Intento de registro gratuito sin coachId — posible manipulación', {
          isFree,
        });
        return NextResponse.json(
          { success: false, message: 'Acción no autorizada. El enlace gratuito solo es válido con un coach administrador.', code: 'FORBIDDEN'},
          { status: 403 }
        );
      }

      await connectMongoose();
      const coach = await Coach.findById(coachId).select('role').lean() as { role: string } | null;
      if (!coach || coach.role !== 'admin') {
        logger.warn('CLIENTS', 'Intento de registro gratuito con coach no autorizado', {
          coachId,
        });
        return NextResponse.json(
          { success: false, message: 'Acción no autorizada. El enlace gratuito solo puede ser generado por un administrador.', code: 'FORBIDDEN'},
          { status: 403 }
        );
      }
      logger.info('CLIENTS', 'Registro gratuito autorizado — coach admin verificado', { coachId });
    } else {
      if (!stripeSessionId) {
        logger.warn('CLIENTS', 'Intento de registro sin pago y sin stripeSessionId', {
          hasCoachId: !!coachId,
        });
        return NextResponse.json(
          { success: false, message: 'No se puede completar el registro sin un pago válido.', code: 'VALIDATION'},
          { status: 402 }
        );
      }

      try {
        const { stripeClient } = await import('@/app/lib/stripe');
        const session = await stripeClient.checkout.sessions.retrieve(stripeSessionId);

        if (session.payment_status !== 'paid') {
          logger.warn('CLIENTS', 'Sesión de Stripe no pagada', {
            stripeSessionId,
            paymentStatus: session.payment_status,
          });
          return NextResponse.json(
            { success: false, message: 'El pago no fue completado. Por favor intenta de nuevo.', code: 'VALIDATION'},
            { status: 402 }
          );
        }

        logger.info('CLIENTS', 'Pago verificado con Stripe exitosamente', {
          stripeSessionId,
        });
      } catch (stripeError) {
        logger.error('CLIENTS', 'Error verificando sesión de Stripe', stripeError as Error, {
          stripeSessionId,
        });
        return NextResponse.json(
          { success: false, message: 'Error verificando el pago. Contacta a soporte.', code: 'INTERNAL'},
          { status: 500 }
        );
      }
    }

    const parsed = clientFormSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      console.error('❌ Validación Zod fallida al crear cliente:', JSON.stringify({
        issues: parsed.error.issues.map((i: z.core.$ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
        coachId,
        clientIP,
      }, null, 2));
      logger.warn('CLIENTS', 'Validación Zod fallida al crear cliente', undefined, {
        issues: parsed.error.issues.length,
        firstField: firstError?.path?.join('.'),
        coachId,
      });
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
        { status: 400 },
      );
    }

    const healthForms = await getHealthFormsCollection();

    const encryptObject = (obj: Record<string, unknown>): Record<string, unknown> => {
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
            encrypted[key] = encrypt(JSON.stringify(value.map((item: unknown) => 
              typeof item === 'object' && item !== null ? encryptObject(item as Record<string, unknown>) : item
            )));
          } else {
            encrypted[key] = encrypt(JSON.stringify(encryptObject(value as Record<string, unknown>)));
          }
        } else {
          encrypted[key] = value;
        }
      }
      return encrypted;
    };

    const processedMedicalData = { ...data.medicalData };

    const expectedLengths: Record<string, number> = {
      carbohydrateAddiction: 11,
      leptinResistance: 8,
      circadianRhythms: 11,
      sleepHygiene: 12,
      electrosmogExposure: 10,
      generalToxicity: 10,
      microbiotaHealth: 12,
    };

    const typedMedicalData = processedMedicalData as Record<string, unknown>;
    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    arrayFields.forEach(field => {
      const arrayData = typedMedicalData[field];
      const expectedLength = expectedLengths[field];
      
      if (!arrayData || !Array.isArray(arrayData)) {
        typedMedicalData[field] = JSON.stringify([]);
        return;
      }

      const cleanedArray = arrayData.map((value: unknown) => {
        if (typeof value === 'string') return value;
        if (typeof value === 'boolean') return value ? 'si' : 'no';
        if (typeof value === 'number') return value.toString();
        return '';
      });

      if (cleanedArray.length < expectedLength) {
        while (cleanedArray.length < expectedLength) {
          cleanedArray.push('');
        }
      } else if (cleanedArray.length > expectedLength) {
        cleanedArray.length = expectedLength;
      }

      typedMedicalData[field] = JSON.stringify(cleanedArray);
    });

    processedMedicalData.documents = [];

    // Capturar/inferir zona horaria IANA si no viene explícita
    const rawPersonalData = { ...(data.personalData as Record<string, unknown>) };
    const explicitTz =
      typeof rawPersonalData.timezone === 'string' && isValidTimeZone(rawPersonalData.timezone)
        ? rawPersonalData.timezone.trim()
        : '';
    const resolvedTz = resolveClientTimezone({
      explicitTimezone: explicitTz || null,
      address: typeof rawPersonalData.address === 'string' ? rawPersonalData.address : null,
    });
    if (explicitTz || rawPersonalData.address) {
      rawPersonalData.timezone = explicitTz || resolvedTz;
    }

    const encryptedPersonalData = encryptObject(rawPersonalData);
    const encryptedMedicalData = encryptObject(processedMedicalData);

    const newClient = {
      personalData: encryptedPersonalData,
      medicalData: encryptedMedicalData,
      contractAccepted: encrypt(data.contractAccepted.toString()),
      contractVersion: data.contractVersion || null,
      contractAcceptedAt: data.contractAccepted ? new Date() : null,
      ipAddress: encrypt(clientIP),
      coachId: coachId || null,
      submissionDate: new Date()
    };

    console.log('🆕 Insertando nuevo cliente en MongoDB...');
    logger.info('CLIENTS', 'Insertando nuevo cliente en MongoDB');
    const result = await healthForms.insertOne(newClient);
    
    console.log('✅ Cliente insertado:', {
      insertedId: result.insertedId,
      insertedIdString: result.insertedId.toString(),
      acknowledged: result.acknowledged
    });
    logger.info('CLIENTS', 'Cliente insertado exitosamente', {
      insertedId: result.insertedId.toString(),
      acknowledged: result.acknowledged
    });

    if (result.acknowledged) {
      try {
        const leadsCollection = await getLeadsCollection();
        const emailToMatch = data.personalData.email;
        const deleteResult = await leadsCollection.deleteOne({ email: emailToMatch });
        if (deleteResult.deletedCount > 0) {
          console.log(`✅ Lead con email ${emailToMatch} eliminado correctamente.`);
          logger.info('CLIENTS', `Lead con email ${emailToMatch} eliminado correctamente`);
        } else {
          console.log(`ℹ️ No se encontró lead con email ${emailToMatch} para eliminar.`);
          logger.info('CLIENTS', `No se encontró lead con email ${emailToMatch} para eliminar`);
        }
      } catch (leadError) {
        console.error('❌ Error al eliminar lead:', leadError);
        logger.error('CLIENTS', 'Error al eliminar lead', leadError);
      }

      if (coachId && result.acknowledged) {
        try {
          await connectMongoose();
          const coach = await Coach.findById(coachId);
          if (coach) {
            const emailService = EmailService.getInstance();
            const appUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

            const clientName = decrypt(data.personalData.name || '');
            const clientEmail = data.personalData.email;
            const clientPhone = data.personalData.phone ? decrypt(data.personalData.phone) : '';
            const coachName = `${decrypt(coach.firstName)} ${decrypt(coach.lastName)}`;
            const coachEmail = decrypt(coach.email);
            const coachPhone = coach.phone ? decrypt(coach.phone) : '';
            const coachPhotoUrl = coach.profilePhoto?.url ? decrypt(coach.profilePhoto.url) : null;

            await emailService.sendEmail({
              to: [clientEmail],
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
                clientEmail,
                clientPhone: clientPhone || 'No disponible',
                clientId: result.insertedId.toString(),
                dashboardUrl: `${appUrl}/dashboard/clients/${result.insertedId}`,
                clientTimezone: resolvedTz,
              }),
            });

            logger.info('CLIENTS', 'Emails de notificación enviados', {
              clientId: result.insertedId.toString(),
              coachId,
            });
          }
        } catch (emailError) {
          logger.error('CLIENTS', 'Error enviando emails de notificación', emailError);
        }
      }
    }

    const uploadToken = generateToken({
      type: 'client-upload',
      clientId: result.insertedId.toString(),
    });

    const responseData = {
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        _id: result.insertedId.toString(),
        uploadToken,
      }
    };

    console.log('📤 Enviando respuesta al frontend:', responseData);
    logger.info('CLIENTS', 'Enviando respuesta al frontend', responseData);

    const decryptedName = decrypt(data.personalData.name || '');
    logAuditEvent({
      eventType: 'CLIENT_CREATED',
      severity: 'info',
      message: `Cliente creado: ${decryptedName}`,
      coachId: coachId,
      ...reqCtx,
      path: '/api/clients',
      method: 'POST',
      statusCode: 201,
    });
    
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    logger.error('CLIENTS', 'Error creando cliente', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor al registrar el cliente',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }), code: 'INTERNAL'},
      { status: 500 }
    );
  }
}

export const POST = apiHandler(postHandler);

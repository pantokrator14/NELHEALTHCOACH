// apps/api/src/app/api/waitlist/route.ts
// Lista de espera ÚNICA del proyecto (libro + sesiones gratuitas).
//
// POST (público): apunta un email. Si ya existe, fusiona el motivo
// (`sources`: book | sessions) sin duplicar. Protecciones: rate limit +
// Shield, honeypot anti-spam, dedupe por emailHash (HMAC) y email CIFRADO.

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getWaitlistCollection } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { waitlistSchema } from '@/app/lib/schemas';
import { apiHandler } from '@/app/lib/apiHandler';
import { secureRoute, securityBlockResponse } from '@/app/lib/security/routeGuard';
import { encrypt } from '@/app/lib/encryption';
import { hashEmail } from '@/app/models/Coach';
import { logAuditEvent } from '@/app/lib/auditLogger';

async function postHandler(request: NextRequest) {
  return logger.time('LEAD', 'Lista de espera', async () => {
    try {
      const body = await request.json();

      // Rate limiting + Shield (escritura pública)
      const security = await secureRoute(request, body);
      if (!security.passed) return securityBlockResponse(security);

      // HONEYPOT: 201 silencioso para no revelar la detección a los bots
      const raw = body as Record<string, unknown>;
      if (typeof raw.website === 'string' && raw.website.trim() !== '') {
        return NextResponse.json(
          { success: true, message: 'Registro recibido' },
          { status: 201 },
        );
      }

      const parsed = waitlistSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, message: parsed.error.issues[0]?.message ?? 'Email inválido', code: 'VALIDATION' },
          { status: 400 },
        );
      }

      const { email, source } = parsed.data;
      const emailHash = hashEmail(email);
      const collection = await getWaitlistCollection();

      const existing = await collection.findOne({ emailHash });
      if (existing) {
        // Ya estaba: fusionar el motivo si es nuevo (sin duplicar registros)
        const sources = Array.from(new Set([...(existing.sources ?? []), source]));
        if (sources.length !== (existing.sources ?? []).length) {
          await collection.updateOne(
            { _id: existing._id },
            { $set: { sources, updatedAt: new Date() } },
          );
        }
        return NextResponse.json(
          { success: true, message: 'Ya estabas en la lista' },
          { status: 200 },
        );
      }

      await collection.insertOne({
        _id: new ObjectId(),
        emailHash,
        email: encrypt(email),
        sources: [source],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logAuditEvent({
        eventType: 'BOOK_WAITLIST_JOINED',
        severity: 'info',
        message: `Nuevo registro en la lista de espera (${source})`,
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        path: '/api/waitlist',
        method: 'POST',
        statusCode: 201,
      });

      return NextResponse.json(
        { success: true, message: 'Registro recibido' },
        { status: 201 },
      );
    } catch (error: unknown) {
      logger.error('LEAD', 'Error registrando en la lista de espera', error);
      return NextResponse.json(
        { success: false, message: 'Error al registrar', code: 'INTERNAL' },
        { status: 500 },
      );
    }
  });
}

export const POST = apiHandler(postHandler);

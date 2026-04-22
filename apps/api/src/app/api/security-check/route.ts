// apps/api/src/app/api/security-check/route.ts
// API route para verificaciones de seguridad con Arcjet

import { NextRequest, NextResponse } from 'next/server';
import arcjet, { shield, detectBot, tokenBucket } from '@arcjet/next';

// Inicializar Arcjet con las reglas de seguridad
const aj = arcjet({
  key: process.env.ARCJET_KEY || 'demo',
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: [] }),
    tokenBucket({ mode: "LIVE", refillRate: 10, interval: 10, capacity: 10 }),
  ],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, method, ip, userAgent } = body;

    // Simular una request para Arcjet
    const mockRequest = new NextRequest(new URL(`https://example.com${path}`), {
      method: method || 'GET',
      headers: new Headers({
        'x-forwarded-for': ip || '',
        'user-agent': userAgent || '',
      }),
    });

    const decision = await aj.protect(mockRequest, {
      requested: 1,
    });

    if (decision.isDenied()) {
      const reason = decision.reason;
      
      return NextResponse.json({
        allowed: false,
        reason,
        message: getErrorMessage(reason),
        retryAfter: reason === 'RATE_LIMIT' as any ? 10 : undefined,
      }, {
        status: reason === 'RATE_LIMIT' as any ? 429 : 403,
        headers: reason === 'RATE_LIMIT' as any ? { 'Retry-After': '10' } : {},
      });
    }

    return NextResponse.json({
      allowed: true,
      message: 'Solicitud permitida',
    });

  } catch (error) {
    console.error('Error en security-check:', error);
    
    // En caso de error, permitir por defecto (fail-open)
    return NextResponse.json({
      allowed: true,
      message: 'Error en verificación de seguridad, permitiendo solicitud',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Security Check API',
    status: 'active',
    endpoints: {
      POST: '/api/security-check - Verificar seguridad de una solicitud',
    },
  });
}

function getErrorMessage(reason: any): string {
  const reasonStr = String(reason);
  switch (reasonStr) {
    case 'RATE_LIMIT':
      return 'Demasiadas solicitudes. Por favor, espera 10 segundos.';
    case 'BOT':
      return 'Los bots no están permitidos en esta API.';
    case 'SHIELD':
      return 'La solicitud fue bloqueada por medidas de seguridad.';
    default:
      return 'Solicitud bloqueada por medidas de seguridad.';
  }
}
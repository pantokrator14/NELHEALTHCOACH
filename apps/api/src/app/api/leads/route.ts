import { NextRequest, NextResponse } from 'next/server';
import { getLeadsCollection } from '@/app/lib/database';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  console.log('📥 [LEAD] Recibida solicitud POST');
  try {
    const body = await request.json();
    console.log('📦 [LEAD] Body recibido:', body);

    const { name, email, phone, objective } = body;

    // Validaciones básicas
    if (!name || !email || !objective) {
      console.warn('⚠️ [LEAD] Faltan campos requeridos', { name, email, objective });
      return NextResponse.json(
        { success: false, message: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Guardar en base de datos
    console.log('🔄 [LEAD] Intentando conectar a MongoDB...');
    const leadsCollection = await getLeadsCollection();
    console.log('✅ [LEAD] Conexión exitosa, insertando documento...');
    await leadsCollection.insertOne({
      name,
      email,
      phone,
      objective,
      createdAt: new Date(),
    });
    console.log('✅ [LEAD] Documento insertado correctamente');

    // Enviar correo al cliente
    console.log('📧 [LEAD] Enviando email al cliente...');
    await resend.emails.send({
      from: 'NELHEALTHCOACH <info@nelhealthcoach.com>',
      to: email,
      subject: 'Gracias por agendar tu sesión gratuita',
      html: `
        <h1>¡Gracias por contactarnos, ${name}!</h1>
        <p>Has solicitado agendar una sesión gratuita con el objetivo: <strong>${objective}</strong>.</p>
        <p>En breve recibirás la confirmación de tu cita. Si tienes alguna duda, responde a este correo.</p>
        <p>¡Te esperamos!</p>
      `,
    });
    console.log('✅ [LEAD] Email al cliente enviado');

    // Enviar correo al coach
    console.log('📧 [LEAD] Enviando email al coach...');
    await resend.emails.send({
      from: 'NELHEALTHCOACH <info@nelhealthcoach.com>',
      to: 'ceo@nelhealthcoach.com',
      subject: 'Nuevo lead - Sesión gratuita',
      html: `
        <h1>Nuevo lead para sesión gratuita</h1>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
        <p><strong>Objetivo:</strong> ${objective}</p>
      `,
    });
    console.log('✅ [LEAD] Email al coach enviado');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [LEAD] Error capturado:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
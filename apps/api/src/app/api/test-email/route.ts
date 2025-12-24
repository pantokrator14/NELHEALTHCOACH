import { NextResponse } from 'next/server';
import { EmailService } from '@/app/lib/email-service';

export async function GET() {
  const emailService = EmailService.getInstance();
  const testResult = await emailService.sendEmail({
    to: ['tucorreo@gmail.com'], // <-- Usa un email real PARA LA PRUEBA
    subject: '✅ Prueba de Resend desde NEL Health Coach',
    htmlBody: '<h1>Funciona!</h1><p>Si recibes esto, Resend está configurado.</p>',
    textBody: 'Funciona! Si recibes esto, Resend está configurado.'
  });
  
  return NextResponse.json({ success: testResult });
}
import { NextResponse } from 'next/server';
import { EmailService } from '@/app/lib/email-service';

export async function GET() {
  // Solo accesible en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: 'No disponible en producción' },
      { status: 403 }
    );
  }

  const emailService = EmailService.getInstance();
  const testResult = await emailService.sendEmail({
    to: ['tucorreo@gmail.com'],
    subject: '✅ Prueba de Resend desde NEL Health Coach',
    htmlBody: '<h1>Funciona!</h1><p>Si recibes esto, Resend está configurado.</p>',
    textBody: 'Funciona! Si recibes esto, Resend está configurado.'
  });
  
  return NextResponse.json({ success: testResult });
}
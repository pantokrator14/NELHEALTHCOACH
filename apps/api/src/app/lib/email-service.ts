import { Resend } from 'resend';
import { logger } from './logger';
import { 
  generateMonthlyPlanEmailHTML, 
  generateMonthlyPlanEmailText,
  EmailTemplateData 
} from './email-templates';

// 1. CONFIGURACIÓN INICIAL DE RESEND
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  logger.error('EMAIL', 'La variable de entorno RESEND_API_KEY no está configurada.');
  throw new Error('Falta la configuración de Resend');
}
const resendClient = new Resend(resendApiKey);

export interface EmailOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string[];
  cc?: string[];
  bcc?: string[];
}

export interface MonthlyPlanEmailData {
  clientName: string;
  monthNumber: number;
  summary: string;
  vision: string;
  weeks: Array<{
    weekNumber: number;
    nutritionFocus: string;
    exerciseFocus: string;
    habitsFocus: string;
    checklistItems: Array<{
      category: 'nutrition' | 'exercise' | 'habit';
      description: string;
      details?: string;
    }>;
  }>;
  coachName?: string;
  coachEmail?: string;
  clientId?: string;
  sessionId?: string;
}

export class EmailService {
  private static instance: EmailService;
  private fromEmail: string;
  private fromName: string;
  private enabled: boolean;

  private constructor() {
    this.fromEmail = process.env.EMAIL_FROM_ADDRESS || 'manuelmartinez@nelhealthcoach.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Manuel Martínez - NELHealthCoach';
    this.enabled = process.env.EMAIL_ENABLED !== 'false';
    
    logger.info('EMAIL', 'EmailService (Resend) inicializado', {
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      enabled: this.enabled,
      provider: 'Resend'
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Enviar email usando Resend
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('EMAIL', 'Servicio de email deshabilitado. Simulando éxito.');
      return true;
    }

    const logContext = {
      to: options.to,
      subject: options.subject,
      from: this.fromEmail,
      provider: 'Resend'
    };

    return logger.time('EMAIL', 'Enviar email (Resend)', async () => {
      try {
        // Configuración del mensaje para Resend
        const { data, error } = await resendClient.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.htmlBody,
          text: options.textBody || this.htmlToText(options.htmlBody),
          cc: options.cc,
          bcc: options.bcc,
        });

        if (error) {
          throw error; // Resend devuelve errores en esta propiedad
        }

        logger.info('EMAIL', '✅ Email enviado exitosamente via Resend', {
          ...logContext,
          resendId: data?.id,
        });

        return true;

      } catch (error: any) {
        // Logging detallado del error de Resend
        logger.error('EMAIL', '❌ Error enviando email con Resend', error, {
          ...logContext,
          errorMessage: error.message,
          errorType: error.constructor.name,
        });

        // En desarrollo, puedes simular éxito para no romper el flujo
        if (process.env.NODE_ENV === 'development') {
          logger.warn('EMAIL', 'Modo desarrollo: Continuando a pesar del error de Resend');
          console.log('📧 CONTENIDO DEL EMAIL (Simulación por error):');
          console.log('Para:', options.to);
          console.log('Asunto:', options.subject);
          console.log('Texto (inicio):', options.textBody?.substring(0, 200));
          return true; // Simula éxito para no bloquear las pruebas
        }
        
        return false;
      }
    }, logContext);
  }

  /**
   * Enviar plan mensual al cliente (MÉTODO PRINCIPAL - se llama desde sendToClient)
   */
  public async sendMonthlyPlanEmail(
    clientEmail: string,
    clientName: string,
    sessionData: any,
    monthNumber: number,
    metadata?: {
        clientId?: string;
        sessionId?: string;
        requestId?: string;
    }
  ): Promise<boolean> {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;

    try {
        loggerWithContext.info('EMAIL', 'Preparando email de plan mensual con Resend', {
        clientEmail,
        clientName,
        monthNumber,
        });

        // Preparar datos para el template (igual que antes)
        const templateData: EmailTemplateData = {
        clientName,
        monthNumber,
        summary: sessionData.summary || '',
        vision: sessionData.vision || '',
        weeks: sessionData.weeks || [],
        baselineMetrics: sessionData.baselineMetrics,
        coachName: this.fromName,
        coachEmail: this.fromEmail,
        replyToEmail: this.fromEmail,
        websiteUrl: 'https://nelhealthcoach.com',
        };

        // Generar contenido (usando tus mismos templates)
        const htmlContent = generateMonthlyPlanEmailHTML(templateData);
        const textContent = generateMonthlyPlanEmailText(templateData);

        // Enviar usando el método central sendEmail
        const result = await this.sendEmail({
        to: [clientEmail],
        subject: `📋 Tu Plan de Salud Personalizado - Mes ${monthNumber} | NEL Health Coach`,
        htmlBody: htmlContent,
        textBody: textContent,
        replyTo: [this.fromEmail]
        });

        loggerWithContext.info('EMAIL', 'Proceso de email de plan mensual completado', {
        clientEmail,
        clientName,
        monthNumber,
        emailSent: result,
        provider: 'Resend'
        });

        return result;
    } catch (error: any) {
        loggerWithContext.error('EMAIL', 'Error en sendMonthlyPlanEmail', error, {
        clientEmail,
        clientName,
        monthNumber
        });
        return false;
    }
  }

  /**
  /**
   * Convertir HTML a texto plano (método auxiliar)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  /**
   * Verificar configuración
   */
  public async testConfiguration(): Promise<{
    configured: boolean;
    fromEmail: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    if (!this.enabled) {
      issues.push('EMAIL_ENABLED está en false');
    }
    
    if (!this.fromEmail) {
      issues.push('EMAIL_FROM_ADDRESS no configurado');
    }
    
    if (!process.env.RESEND_API_KEY) {
      issues.push('RESEND_API_KEY no configurada');
    }
    
    return {
      configured: issues.length === 0,
      fromEmail: this.fromEmail,
      issues
    };
  }
}
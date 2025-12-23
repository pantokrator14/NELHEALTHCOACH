import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { logger } from './logger';
import { safeDecrypt } from './encryption';
import { 
  generateMonthlyPlanEmailHTML, 
  generateMonthlyPlanEmailText,
  EmailTemplateData 
} from './email-templates';

// Configuración de AWS SES
const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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
  private replyTo: string[];
  private enabled: boolean;
  private isDomainVerified: boolean;

  private constructor() {
    this.fromEmail = process.env.AWS_SES_FROM_EMAIL || 'coach@nelhealthcoach.com';
    this.fromName = process.env.AWS_SES_FROM_NAME || 'Manuel Martínez - NEL Health Coach';
    this.replyTo = process.env.AWS_SES_REPLY_TO 
      ? process.env.AWS_SES_REPLY_TO.split(',') 
      : [this.fromEmail];
    this.enabled = process.env.EMAIL_ENABLED !== 'false';
    this.isDomainVerified = this.fromEmail.includes('@nelhealthcoach.com');
    
    logger.info('EMAIL', 'EmailService inicializado', {
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      replyTo: this.replyTo,
      enabled: this.enabled,
      isDomainVerified: this.isDomainVerified
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Enviar email usando AWS SES
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('EMAIL', 'Servicio de email deshabilitado. No se enviará email.');
      return true; // Simular éxito en desarrollo
    }

    const logContext = {
      to: options.to,
      subject: options.subject,
      emailEnabled: this.enabled,
      isDomainVerified: this.isDomainVerified
    };

    return logger.time('EMAIL', 'Enviar email', async () => {
      try {
        // En desarrollo, si el dominio no está verificado, usar modo simulado
        if (process.env.NODE_ENV === 'development' && !this.isDomainVerified) {
          logger.warn('EMAIL', 'Modo desarrollo: Simulando envío de email', logContext);
          console.log('📧 EMAIL SIMULADO (desarrollo):');
          console.log('De:', `${this.fromName} <${this.fromEmail}>`);
          console.log('Para:', options.to);
          console.log('Asunto:', options.subject);
          console.log('Body (primeras 500 chars):', options.textBody?.substring(0, 500));
          return true;
        }

        const params: SendEmailCommandInput = {
          Source: `${this.fromName} <${this.fromEmail}>`,
          Destination: {
            ToAddresses: options.to,
            CcAddresses: options.cc,
            BccAddresses: options.bcc,
          },
          Message: {
            Subject: {
              Data: options.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: options.htmlBody,
                Charset: 'UTF-8',
              },
              Text: {
                Data: options.textBody || this.htmlToText(options.htmlBody),
                Charset: 'UTF-8',
              },
            },
          },
          ReplyToAddresses: options.replyTo || this.replyTo,
        };

        const command = new SendEmailCommand(params);
        const result = await sesClient.send(command);

        logger.info('EMAIL', 'Email enviado exitosamente', {
          to: options.to,
          subject: options.subject,
          messageId: result.MessageId,
          ...logContext
        });

        return true;
      } catch (error: any) {
        logger.error('EMAIL', 'Error enviando email', error, logContext);
        
        // En desarrollo, permitir continuar aunque falle
        if (process.env.NODE_ENV === 'development') {
          logger.warn('EMAIL', 'Continuando en modo desarrollo después de error de email');
          return true;
        }
        
        return false;
      }
    }, logContext);
  }

  /**
  * Enviar plan mensual al cliente
  */
    public async sendMonthlyPlanEmail(
    clientEmail: string,
    clientName: string,
    sessionData: any, // AIRecommendationSession desencriptado
    monthNumber: number,
    metadata?: {
        clientId?: string;
        sessionId?: string;
        requestId?: string;
    }
    ): Promise<boolean> {
    const loggerWithContext = metadata ? logger.withContext(metadata) : logger;

    try {
        loggerWithContext.info('EMAIL', 'Preparando email de plan mensual', {
        clientEmail,
        clientName,
        monthNumber,
        hasSessionData: !!sessionData
        });

        // 1. Preparar datos para el template
        const templateData: EmailTemplateData = {
        clientName,
        monthNumber,
        summary: sessionData.summary || '',
        vision: sessionData.vision || '',
        weeks: sessionData.weeks || [],
        baselineMetrics: sessionData.baselineMetrics,
        coachName: 'Coach Manuel Martinez',
        coachEmail: this.replyTo[0],
        replyToEmail: this.replyTo[0],
        websiteUrl: 'https://nelhealthcoach.com',
        dashboardUrl: 'https://app.nelhealthcoach.com'
        };

        // 2. Generar contenido del email usando los templates
        const htmlContent = generateMonthlyPlanEmailHTML(templateData);
        const textContent = generateMonthlyPlanEmailText(templateData);

        // 3. Enviar email
        const result = await this.sendEmail({
        to: [clientEmail],
        subject: `📋 Tu Plan de Salud Personalizado - Mes ${monthNumber} | NEL Health Coach`,
        htmlBody: htmlContent,
        textBody: textContent,
        replyTo: this.replyTo
        });

        loggerWithContext.info('EMAIL', 'Email de plan mensual procesado', {
        clientEmail,
        clientName,
        monthNumber,
        emailSent: result,
        htmlLength: htmlContent.length,
        textLength: textContent.length
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
   * Generar versión en texto plano
   */
  private generateMonthlyPlanText(
    clientName: string,
    monthNumber: number,
    summary: string,
    vision: string,
    weeks: any[],
    baselineMetrics: any
  ): string {
    let text = `NELHealthCoach - Plan Mensual de Salud
================================================

Hola ${clientName},

Tu coach ha aprobado tu plan personalizado para el Mes ${monthNumber}.

ANÁLISIS DE TU ESTADO ACTUAL:
${summary}

VISIÓN A 12 MESES:
${vision}

MÉTRICAS DE PROGRESO:
Estilo de Vida Actual:
${(baselineMetrics.currentLifestyle || []).map(item => `• ${item}`).join('\n')}

Objetivos a Alcanzar:
${(baselineMetrics.targetLifestyle || []).map(item => `• ${item}`).join('\n')}

PLAN SEMANAL PROGRESIVO:
(Cada semana agregas nuevos hábitos mientras mantienes los anteriores)

${weeks.map(week => `
SEMANA ${week.weekNumber}:
---------------------
NUTRICIÓN: ${week.nutrition?.focus || 'Nutrición Keto'}
${(week.nutrition?.checklistItems || []).map((item: any) => `✓ ${item.description}`).join('\n')}

${week.nutrition?.shoppingList?.length > 0 ? `
LISTA DE COMPRAS Semana ${week.weekNumber}:
${week.nutrition.shoppingList.map((item: any) => `• ${item.item} - ${item.quantity} (${item.priority})`).join('\n')}
` : ''}

EJERCICIO: ${week.exercise?.focus || 'Ejercicio Adaptado'}
${(week.exercise?.checklistItems || []).map((item: any) => `✓ ${item.description}`).join('\n')}

HÁBITOS:
${(week.habits?.checklistItems || []).map((item: any) => `✓ ${item.description}`).join('\n')}

${week.habits?.motivationTip ? `💡 Consejo: ${week.habits.motivationTip}` : ''}
`).join('\n')}

INSTRUCCIONES IMPORTANTES:
✅ Progresión Acumulativa: Cada semana agregas nuevos elementos mientras mantienes los anteriores.
✅ Método de Seguimiento: Marca cada ítem a medida que lo completas durante la semana.
✅ Revisión Semanal: Al final de cada semana, revisa tu progreso y prepárate para la siguiente sesión con tu coach.
✅ Flexibilidad: Este plan es personalizado pero puedes ajustarlo según cómo te sientas. Comunica cualquier cambio a tu coach.

SOPORTE Y CONTACTO:
📧 Email: ${this.replyTo[0]}
🌐 Sitio Web: https://nelhealthcoach.com
---
NELHealthCoach
Transformando vidas a través de la salud keto y hábitos sostenibles
© ${new Date().getFullYear()} NELHealthCoach. Todos los derechos reservados.

Este es un email automático generado por nuestro sistema de recomendaciones de IA.
Si tienes preguntas, por favor responde a este correo.
    `;

    return text;
  }

  /**
   * Convertir HTML a texto plano (simplificado)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Verificar si el servicio está configurado correctamente
   */
  public async testConfiguration(): Promise<{
    configured: boolean;
    domainVerified: boolean;
    fromEmail: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    if (!this.enabled) {
      issues.push('EMAIL_ENABLED está en false');
    }
    
    if (!this.fromEmail) {
      issues.push('AWS_SES_FROM_EMAIL no configurado');
    }
    
    if (!this.isDomainVerified && process.env.NODE_ENV === 'production') {
      issues.push('El dominio no está verificado en SES (usando email no verificado)');
    }
    
    return {
      configured: issues.length === 0,
      domainVerified: this.isDomainVerified,
      fromEmail: this.fromEmail,
      issues
    };
  }
}
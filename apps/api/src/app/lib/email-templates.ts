// apps/api/src/lib/email-templates.ts
import { safeDecrypt } from './encryption';

/**
 * Plantillas de email para NEL Health Coach
 */

export interface EmailTemplateData {
  clientName: string;
  monthNumber: number;
  summary: string;
  vision: string;
  weeks: Array<{
    weekNumber: number;
    nutrition: {
      focus: string;
      checklistItems: Array<{
        description: string;
        type?: string;
        details?: any;
      }>;
      shoppingList: Array<{
        item: string;
        quantity: string;
        priority: 'high' | 'medium' | 'low';
      }>;
    };
    exercise: {
      focus: string;
      checklistItems: Array<{
        description: string;
        type?: string;
        details?: any;
      }>;
      equipment?: string[];
    };
    habits: {
      checklistItems: Array<{
        description: string;
        type?: string;
      }>;
      trackingMethod?: string;
      motivationTip?: string;
    };
  }>;
  baselineMetrics?: {
    currentLifestyle: string[];
    targetLifestyle: string[];
  };
  coachName?: string;
  coachEmail?: string;
  coachPhone?: string;
  coachPhotoUrl?: string | null;
  replyToEmail?: string;
  websiteUrl?: string;
  dashboardUrl?: string;
  pdfDownloadUrl?: string;
  // URLs de los logos
  logoWhiteUrl?: string;
  logoBlueUrl?: string;
}

/**
 * Generar email HTML para plan mensual (versión mejorada, estilo modal)
 */
export function generateMonthlyPlanEmailHTML(data: EmailTemplateData): string {
  const currentYear = new Date().getFullYear();
  const contactEmail = data.coachEmail || 'contact@nelhealthcoach.com';
  const replyTo = data.replyToEmail || contactEmail;
  const websiteUrl = data.websiteUrl || 'https://nelhealthcoach.com';
  const logoWhite = data.logoWhiteUrl || 'https://nelhealthcoach.com/images/logo-white.png';
  const logoBlue = data.logoBlueUrl || 'https://nelhealthcoach.com/images/logo-blue.png';

  // Función para escapar HTML
  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  };

  const coachName = data.coachName || 'Tu asesor';
  const coachEmail = data.coachEmail || contactEmail;
  const coachPhone = data.coachPhone || '';
  const coachPhotoHtml = data.coachPhotoUrl
    ? `<img src="${data.coachPhotoUrl}" alt="${escapeHtml(coachName)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #4CAF50; margin: 0 auto 15px; display: block;">`
    : `<div style="
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4CAF50, #2E7D32);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: bold;
        margin: 0 auto 15px;
    ">
        ${escapeHtml(coachName.charAt(0).toUpperCase())}
    </div>`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tus Recomendaciones de Salud | NELHEALTHCOACH</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                padding: 15px !important;
            }
            .header {
                padding: 25px !important;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <!-- Header: banner azul con logo centrado -->
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 50px 30px; text-align: center;">
            <img src="${logoWhite}" alt="NEL Health Coach" style="max-width: 200px; height: auto;">
        </div>

        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            <h1 style="margin: 0 0 15px 0; color: #1976D2; font-size: 26px;">
                Hola ${escapeHtml(data.clientName)},
            </h1>
            <p style="margin: 0 0 30px 0; color: #444; font-size: 18px; line-height: 1.6;">
                Tu asesor ha revisado y aprobado tus recomendaciones de salud.
            </p>

            <!-- Botón / enlace de descarga -->
            ${data.pdfDownloadUrl ? `
            <div style="text-align: center; margin-bottom: 40px;">
                <a href="${data.pdfDownloadUrl}" style="
                    display: inline-block;
                    padding: 14px 40px;
                    background: #4CAF50;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(76,175,80,0.3);
                ">
                    Haz clic acá para descargarlas
                </a>
            </div>
            ` : `
            <div style="text-align: center; margin-bottom: 40px;">
                <span style="
                    display: inline-block;
                    padding: 14px 40px;
                    background: #e0e0e0;
                    color: #999;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                ">
                    Pronto podrás descargar tus recomendaciones
                </span>
            </div>
            `}

            <!-- Tarjeta del coach (fondo verde) -->
            <div style="
                background: #e8f5e9;
                border-radius: 12px;
                padding: 30px;
                margin-bottom: 30px;
                border: 1px solid #c8e6c9;
                text-align: center;
            ">
                ${coachPhotoHtml}
                <h3 style="margin: 0 0 5px; color: #1b5e20; font-size: 20px;">${escapeHtml(coachName)}</h3>
                <p style="margin: 0 0 15px; color: #2e7d32; font-size: 14px;">Tu asesor de salud</p>
                <div style="display: inline-block; text-align: left; color: #2e7d32;">
                    <div style="margin-bottom: 8px;">
                        <strong>📧</strong> <a href="mailto:${coachEmail}" style="color: #1b5e20; text-decoration: none;">${coachEmail}</a>
                    </div>
                    ${coachPhone ? `
                    <div style="margin-bottom: 8px;">
                        <strong>📞</strong> ${escapeHtml(coachPhone)}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Footer con datos de contacto -->
        <div style="
            background: #263238;
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 14px;
        ">
            <img src="${logoBlue}" alt="NELHEALTHCOACH" style="max-width: 150px; height: auto; margin-bottom: 20px;">
            <div style="margin-bottom: 10px; opacity: 0.8; max-width: 400px; margin-left: auto; margin-right: auto;">
                <strong>NELHEALTHCOACH</strong><br>
                Ayudándote a descubrir el verdadero potencial de tu cuerpo.
            </div>
            <div style="margin-bottom: 8px; opacity: 0.6; font-size: 12px;">
                <a href="${websiteUrl}" style="color: #90CAF9; text-decoration: none;">${websiteUrl}</a>
            </div>
            <div style="margin-bottom: 8px; opacity: 0.5; font-size: 11px;">
                33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)
            </div>
            <div style="margin-bottom: 15px; opacity: 0.5; font-size: 11px;">
                📧 <a href="mailto:${contactEmail}" style="color: #90CAF9; text-decoration: none;">${contactEmail}</a>
                &nbsp;|&nbsp; 📞 +1 (442) 342-5050
            </div>
            <div style="opacity: 0.6;">
                &copy; ${currentYear} NELHEALTHCOACH, LLC. Todos los derechos reservados.
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Generar versión en texto plano para el email (se mantiene igual pero con datos de contacto actualizados)
 */
export function generateMonthlyPlanEmailText(data: EmailTemplateData): string {
  const coachEmail = data.coachEmail || 'coach@nelhealthcoach.com';
  const coachName = data.coachName || 'Tu asesor';
  const coachPhone = data.coachPhone || '';
  const pdfUrl = data.pdfDownloadUrl || '';

  let text = `NELHealthCoach - Recomendaciones de Salud
================================================

Hola ${data.clientName},

Tu asesor ha revisado y aprobado tus recomendaciones de salud.

`;
  if (pdfUrl) {
    text += `Para descargar tus recomendaciones, visita:
${pdfUrl}

`;
  }

  text += `DATOS DE CONTACTO DE TU ASESOR:
--------------------------------
Nombre: ${coachName}
Email: ${coachEmail}
${coachPhone ? `Teléfono: ${coachPhone}` : ''}

================================================
NELHEALTHCOACH
Ayudándote a descubrir el verdadero potencial de tu cuerpo.
© ${new Date().getFullYear()} NELHEALTHCOACH, LLC. Todos los derechos reservados.

Este es un mensaje automático de NELHEALTHCOACH.
`;

  return text;
}

// ─────────────────────────────────────────────
// Plantillas para sesiones de videollamada
// ─────────────────────────────────────────────

export interface SessionEmailData {
  clientName: string;
  sessionNumber: number;
  scheduledDate: Date;
  scheduledTime: string;
  durationMinutes: number;
  joinLink: string;
  coachName?: string;
  coachEmail?: string;
  timeZone?: string;
}

/**
 * Email HTML para invitar al cliente a una videollamada.
 * Incluye el enlace con token temporal para unirse a la sala.
 */
export function generateSessionInviteHTML(data: SessionEmailData): string {
  const currentYear = new Date().getFullYear();
  const coachName = data.coachName || 'Tu coach';
  const coachEmail = data.coachEmail || 'contact@nelhealthcoach.com';
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  if (data.timeZone) dateOpts.timeZone = data.timeZone;
  const formattedDate = data.scheduledDate.toLocaleDateString('es-MX', dateOpts);
  const logoWhiteUrl = 'https://nelhealthcoach.com/images/logo-white.png';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sesión de Seguimiento - NELHEALTHCOACH</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 15px !important; }
            .header { padding: 25px !important; }
            .button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .container {
            overflow: hidden;
        }
        .button {
            box-sizing: border-box;
            max-width: 100%;
        }
        .detail-card {
            word-break: break-word;
            overflow-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <!-- Header: banner azul con logo NELHEALTHCOACH en blanco -->
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 50px 30px; text-align: center;">
            <img src="${logoWhiteUrl}" alt="NELHEALTHCOACH" style="max-width: 200px; height: auto;">
        </div>

        <!-- Contenido principal -->
        <div style="padding: 35px 30px;">
            <p style="font-size: 16px; margin-bottom: 25px;">
                Hola <strong>${data.clientName}</strong>, tu asesor ha agendado una
                sesión de seguimiento contigo. Aquí están los detalles:
            </p>

            <!-- Tarjeta de detalles de la sesión -->
            <div class="detail-card" style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 1px solid #e0e0e0;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 20px; margin-right: 10px;">📅</span>
                    <span style="font-weight: 600;">${formattedDate}</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 20px; margin-right: 10px;">🕒</span>
                    <span>${data.scheduledTime} (${data.durationMinutes} minutos)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 20px; margin-right: 10px;">📹</span>
                    <span>Videollamada segura con cifrado</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 20px; margin-right: 10px;">🔒</span>
                    <span>Solo tú y tu asesor tienen acceso</span>
                </div>
            </div>

            <!-- Botón de unirse -->
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${data.joinLink}" class="button" style="
                    display: inline-block;
                    padding: 15px 40px;
                    background: #4CAF50;
                    color: white;
                    text-decoration: none;
                    font-size: 18px;
                    font-weight: 600;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(76,175,80,0.3);
                ">
                    🎥 Unirme a la videollamada
                </a>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    Este enlace es personal y solo funciona para ti.
                    No lo compartas con nadie.
                </p>
            </div>

            <!-- Tarjeta de preparación -->
            <div style="background: #e3f2fd; border-radius: 10px; padding: 20px; border-left: 4px solid #2196F3;">
                <h3 style="margin: 0 0 10px 0; color: #1976D2; font-size: 16px;">💡 Preparación para tu sesión</h3>
                <ul style="margin: 0; padding-left: 20px; color: #555;">
                    <li>Conéctate desde un lugar tranquilo con buena iluminación</li>
                    <li>Asegura tener buena conexión a internet</li>
                    <li>Ten a mano tus notas de progreso</li>
                    <li>Llega puntual — la sala se abre automáticamente a la hora</li>
                </ul>
            </div>
        </div>

        <!-- Footer con datos de contacto -->
        <div style="
            background: #263238;
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 14px;
        ">
            <img src="https://nelhealthcoach.com/images/logo-blue.png" alt="NELHEALTHCOACH" style="max-width: 150px; height: auto; margin-bottom: 20px;">
            <div style="margin-bottom: 10px; opacity: 0.8; max-width: 400px; margin-left: auto; margin-right: auto;">
                Ayudándote a descubrir el verdadero potencial de tu cuerpo.
            </div>
            <div style="margin-bottom: 8px; opacity: 0.6; font-size: 12px;">
                <a href="https://nelhealthcoach.com" style="color: #90CAF9; text-decoration: none;">nelhealthcoach.com</a>
            </div>
            <div style="margin-bottom: 8px; opacity: 0.5; font-size: 11px;">
                33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)
            </div>
            <div style="margin-bottom: 15px; opacity: 0.5; font-size: 11px;">
                📧 <a href="mailto:${coachEmail}" style="color: #90CAF9; text-decoration: none;">${coachEmail}</a>
                &nbsp;|&nbsp; 📞 +1 (442) 342-5050
            </div>
            <div style="opacity: 0.6; font-size: 12px;">
                &copy; ${currentYear} NELHEALTHCOACH, LLC. Todos los derechos reservados.
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Plantillas para sistema multi-usuario
// ─────────────────────────────────────────────

/**
 * Email de verificación de cuenta para nuevos coaches.
 */
export function generateVerificationEmailHTML(data: {
  coachName: string;
  verifyUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu cuenta - NELHEALTHCOACH</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h1 style="margin: 0; font-size: 22px;">Verifica tu cuenta</h1>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">
                Hola <strong>${data.coachName}</strong>,
            </p>
            <p style="color: #555;">
                Gracias por registrarte como coach en NELHEALTHCOACH. Para activar tu cuenta, haz clic en el botón de abajo:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.verifyUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Verificar mi cuenta
                </a>
            </div>
            <p style="color: #999; font-size: 13px;">
                Si no creaste esta cuenta, puedes ignorar este mensaje.
            </p>
        </div>
        <div style="background: #263238; color: white; padding: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
            NELHEALTHCOACH &copy; ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Email de bienvenida al coach después de registrarse.
 */
export function generateWelcomeCoachEmailHTML(data: {
  coachName: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a NELHEALTHCOACH</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <h1 style="margin: 0; font-size: 22px;">¡Bienvenido a NELHEALTHCOACH!</h1>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">
                Hola <strong>${data.coachName}</strong>,
            </p>
            <p style="color: #555;">
                Tu cuenta ha sido verificada exitosamente. Ya puedes acceder al panel de coach para gestionar tus clientes.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Ir al panel de coach
                </a>
            </div>
        </div>
        <div style="background: #263238; color: white; padding: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
            NELHEALTHCOACH &copy; ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Email de recuperación de contraseña.
 */
export function generatePasswordResetHTML(data: {
  coachName: string;
  resetUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recupera tu contraseña - NELHEALTHCOACH</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🔑</div>
            <h1 style="margin: 0; font-size: 22px;">Recupera tu contraseña</h1>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">
                Hola <strong>${data.coachName}</strong>,
            </p>
            <p style="color: #555;">
                Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Restablecer contraseña
                </a>
            </div>
            <p style="color: #999; font-size: 13px;">
                Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este mensaje.
            </p>
        </div>
        <div style="background: #263238; color: white; padding: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
            NELHEALTHCOACH &copy; ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Email al cliente: bienvenida con datos de su coach.
 */
export function generateNewClientClientNotificationHTML(data: {
  clientName: string;
  coachName: string;
  coachEmail: string;
  coachPhone: string;
  coachPhoto?: string | null;
}): string {
  const coachPhotoHtml = data.coachPhoto
    ? `<img src="${data.coachPhoto}" alt="${data.coachName}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #2196F3; margin: 0 auto 15px; display: block;">`
    : `<div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #2196F3, #1976D2); color: white; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; margin: 0 auto 15px;">${data.coachName.charAt(0)}</div>`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Bienvenido a NELHEALTHCOACH!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🌟</div>
            <h1 style="margin: 0; font-size: 22px;">¡Bienvenido a NELHEALTHCOACH!</h1>
            <p style="opacity: 0.9; margin-top: 10px;">Tu viaje hacia una mejor salud comienza ahora</p>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">
                Hola <strong>${data.clientName}</strong>,
            </p>
            <p style="color: #555;">
                Tu registro ha sido exitoso. A continuación te presentamos a tu coach de salud, quien te acompañará en este proceso:
            </p>
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 20px 0; text-align: center; border: 1px solid #e0e0e0;">
                ${coachPhotoHtml}
                <h2 style="margin: 0 0 5px; color: #1976D2; font-size: 20px;">${data.coachName}</h2>
                <p style="margin: 0 0 10px; color: #888; font-size: 14px;">Tu Health Coach</p>
                <div style="display: inline-block; text-align: left;">
                    <div style="margin: 8px 0; color: #555;">
                        <span style="margin-right: 10px;">📧</span> <a href="mailto:${data.coachEmail}" style="color: #1976D2;">${data.coachEmail}</a>
                    </div>
                    ${data.coachPhone ? `
                    <div style="margin: 8px 0; color: #555;">
                        <span style="margin-right: 10px;">📞</span> ${data.coachPhone}
                    </div>
                    ` : ''}
                </div>
            </div>
            <p style="color: #555;">
                Tu coach se pondrá en contacto contigo pronto para comenzar con tu plan de salud personalizado.
            </p>
        </div>
        <div style="background: #263238; color: white; padding: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
            NELHEALTHCOACH &copy; ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Email al coach: notificación de nuevo cliente registrado.
 */
export function generateNewClientCoachNotificationHTML(data: {
  coachName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientId: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo cliente registrado - NELHEALTHCOACH</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">👤</div>
            <h1 style="margin: 0; font-size: 22px;">Nuevo Cliente Registrado</h1>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">
                Hola <strong>${data.coachName}</strong>,
            </p>
            <p style="color: #555;">
                Un nuevo cliente se ha registrado a través de tu enlace de registro:
            </p>
            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
                <div style="margin: 8px 0; color: #333;">
                    <strong>Nombre:</strong> ${data.clientName}
                </div>
                <div style="margin: 8px 0; color: #333;">
                    <strong>Email:</strong> <a href="mailto:${data.clientEmail}" style="color: #1976D2;">${data.clientEmail}</a>
                </div>
                ${data.clientPhone && data.clientPhone !== 'N/A' ? `
                <div style="margin: 8px 0; color: #333;">
                    <strong>Teléfono:</strong> ${data.clientPhone}
                </div>
                ` : ''}
            </div>
            <div style="text-align: center; margin: 25px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Ver perfil del cliente
                </a>
            </div>
        </div>
        <div style="background: #263238; color: white; padding: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
            NELHEALTHCOACH &copy; ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Email para el coach: notifica que se agendó una videollamada con un cliente
 * e incluye enlace para que el coach se una.
 */
export function generateCoachSessionNotificationHTML(data: {
  clientName: string;
  sessionNumber: number;
  scheduledDate?: Date;
  scheduledTime?: string;
  durationMinutes?: number;
  progressNotes?: string;
  dashboardUrl?: string;
  joinLink?: string;
  timeZone?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const logoWhiteUrl = 'https://nelhealthcoach.com/images/logo-white.png';
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  if (data.timeZone) dateOpts.timeZone = data.timeZone;
  const formattedDate = data.scheduledDate
    ? data.scheduledDate.toLocaleDateString('es-MX', dateOpts)
    : null;

  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (data.timeZone) timeOpts.timeZone = data.timeZone;
  const timeStr = data.scheduledTime || (data.scheduledDate
    ? data.scheduledDate.toLocaleTimeString('es-MX', timeOpts)
    : null);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Videollamada Agendada - NELHEALTHCOACH</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 15px !important; }
            .header { padding: 25px !important; }
            .button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .container {
            overflow: hidden;
        }
        .button {
            box-sizing: border-box;
            max-width: 100%;
        }
        .detail-card {
            word-break: break-word;
            overflow-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <!-- Header: banner azul con logo NELHEALTHCOACH en blanco -->
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 50px 30px; text-align: center;">
            <img src="${logoWhiteUrl}" alt="NELHEALTHCOACH" style="max-width: 200px; height: auto;">
        </div>

        <!-- Contenido principal -->
        <div style="padding: 35px 30px;">
            <!-- Tarjeta de detalles -->
            <div class="detail-card" style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 1px solid #e0e0e0;">
                ${formattedDate ? `<div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 20px; margin-right: 10px;">📅</span>
                    <span style="font-weight: 600;">${formattedDate}</span>
                </div>` : ''}
                ${timeStr ? `<div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 20px; margin-right: 10px;">🕒</span>
                    <span>${timeStr}${data.durationMinutes ? ` (${data.durationMinutes} minutos)` : ''}</span>
                </div>` : ''}
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 20px; margin-right: 10px;">👤</span>
                    <span><strong>${data.clientName}</strong> — Sesión #${data.sessionNumber}</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 20px; margin-right: 10px;">🔒</span>
                    <span>Videollamada segura con cifrado</span>
                </div>
            </div>

            <!-- Botón de unirse -->
            ${data.joinLink ? `
            <div style="text-align: center; margin-bottom: 25px;">
                <a href="${data.joinLink}" class="button" style="
                    display: inline-block;
                    padding: 15px 40px;
                    background: #4CAF50;
                    color: white;
                    text-decoration: none;
                    font-size: 18px;
                    font-weight: 600;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(76,175,80,0.3);
                ">
                    🔗 Unirme a la videollamada
                </a>
                <p style="font-size: 12px; color: #999; margin-top: 5px;">El enlace expira en 7 días</p>
            </div>` : ''}

            <!-- Notas de progreso -->
            ${data.progressNotes ? `
            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #2196F3;">
                <strong style="color: #1976D2;">Notas de progreso del cliente:</strong>
                <p style="color: #555; white-space: pre-wrap; margin: 10px 0 0 0;">${data.progressNotes}</p>
            </div>` : ''}

            <!-- Botón al dashboard -->
            ${data.dashboardUrl ? `
            <div style="text-align: center; margin-top: 5px;">
                <a href="${data.dashboardUrl}" style="
                    display: inline-block;
                    padding: 12px 30px;
                    background: #FF9800;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                ">
                    👤 Ver perfil del cliente
                </a>
            </div>` : ''}
        </div>

        <!-- Footer con datos de contacto -->
        <div style="
            background: #263238;
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 14px;
        ">
            <img src="https://nelhealthcoach.com/images/logo-blue.png" alt="NELHEALTHCOACH" style="max-width: 150px; height: auto; margin-bottom: 20px;">
            <div style="margin-bottom: 10px; opacity: 0.8; max-width: 400px; margin-left: auto; margin-right: auto;">
                Ayudándote a descubrir el verdadero potencial de tu cuerpo.
            </div>
            <div style="margin-bottom: 8px; opacity: 0.6; font-size: 12px;">
                <a href="https://nelhealthcoach.com" style="color: #90CAF9; text-decoration: none;">nelhealthcoach.com</a>
            </div>
            <div style="margin-bottom: 8px; opacity: 0.5; font-size: 11px;">
                33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)
            </div>
            <div style="margin-bottom: 15px; opacity: 0.5; font-size: 11px;">
                📧 <a href="mailto:contact@nelhealthcoach.com" style="color: #90CAF9; text-decoration: none;">contact@nelhealthcoach.com</a>
                &nbsp;|&nbsp; 📞 +1 (442) 342-5050
            </div>
            <div style="opacity: 0.6; font-size: 12px;">
                &copy; ${currentYear} NELHEALTHCOACH, LLC. Todos los derechos reservados.
            </div>
        </div>
    </div>
</body>
</html>`;
}
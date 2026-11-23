// apps/api/src/app/lib/program-completion-template.ts

export interface ProgramCompletionEmailData {
  clientName: string;
  planName: string;
  durationLabel: string;
  evaluationsCount: number;
  summaryText: string;
  visionText?: string;
  habitStats: {
    completed: number;
    total: number;
    highlights: string[];
  };
  biomarkerComparison?: string;
  coachName: string;
  renewUrl: string;
  portalUrl: string;
}

function escapeText(value: string): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeMultiline(value: string): string {
  return escapeText(value).replace(/\n/g, '<br>');
}

function safeHref(url: string, fallback: string): string {
  if (/^https?:\/\//i.test(url)) {
    return escapeText(url);
  }
  return escapeText(fallback);
}

export function generateProgramCompletionEmailHTML(data: ProgramCompletionEmailData): string {
  const currentYear = new Date().getFullYear();
  const logoWhiteUrl = process.env.LOGO_WHITE_URL || 'https://app.nelhealthcoach.com/logo.png';
  const adherencePercent =
    data.habitStats.total > 0
      ? Math.round((data.habitStats.completed / data.habitStats.total) * 100)
      : null;

  const renewHref = safeHref(data.renewUrl, 'https://app.nelhealthcoach.com/dashboard/plans');
  const portalHref = safeHref(data.portalUrl, 'https://app.nelhealthcoach.com/dashboard');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Felicidades por completar ${escapeText(data.planName)}! — NELHEALTHCOACH</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 !important; }
      .content { padding: 20px !important; }
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
  </style>
</head>
<body>
  <div class="container" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #059669 0%, #0f766e 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
      <img src="${escapeText(logoWhiteUrl)}" alt="NELHEALTHCOACH" style="max-width: 180px; height: auto; margin-bottom: 16px;">
      <div style="font-size: 40px; line-height: 1; margin-bottom: 10px;">🏆</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
        ¡Felicidades, ${escapeText(data.clientName)}!
      </h1>
      <p style="margin: 8px 0 0; font-size: 15px; color: #d1fae5;">
        Completaste tu programa <strong>${escapeText(data.planName)}</strong> (${escapeText(data.durationLabel)})
      </p>
    </div>

    <div class="content" style="padding: 32px 30px;">
      <p style="margin: 0 0 18px; color: #374151; font-size: 15px;">
        Queremos reconocer tu disciplina y compromiso durante todo este proceso junto a <strong>${escapeText(data.coachName)}</strong>. Aquí tienes un resumen de tu recorrido:
      </p>

      <!-- Métricas clave -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.04em;">
          📊 Resumen de tu proceso
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;">
          • <strong>Programa completado:</strong> ${escapeText(data.planName)} (${escapeText(data.durationLabel)})
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;">
          • <strong>Evaluaciones entregadas:</strong> ${data.evaluationsCount}
        </p>
        ${
          data.habitStats.total > 0
            ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;">
          • <strong>Hábitos y acciones cumplidas:</strong> ${data.habitStats.completed} de ${data.habitStats.total}${adherencePercent !== null ? ` (${adherencePercent}%)` : ''}
        </p>`
            : ''
        }
      </div>

      ${
        data.summaryText
          ? `<div style="background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px 18px; margin-bottom: 18px;">
        <h3 style="margin: 0 0 6px; font-size: 15px; color: #065f46;">✨ Evolución General</h3>
        <p style="margin: 0; font-size: 14px; color: #374151;">${escapeMultiline(data.summaryText)}</p>
      </div>`
          : ''
      }

      ${
        data.visionText
          ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px 18px; margin-bottom: 18px;">
        <h3 style="margin: 0 0 6px; font-size: 15px; color: #1e40af;">🎯 Tu Visión de Bienestar</h3>
        <p style="margin: 0; font-size: 14px; color: #374151;">${escapeMultiline(data.visionText)}</p>
      </div>`
          : ''
      }

      ${
        data.habitStats.highlights.length > 0
          ? `<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px; margin-bottom: 18px;">
        <h3 style="margin: 0 0 8px; font-size: 15px; color: #111827;">✅ Logros y Hábitos Trabajados</h3>
        <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 14px;">
          ${data.habitStats.highlights.map((h) => `<li style="margin-bottom: 4px;">${escapeText(h)}</li>`).join('')}
        </ul>
      </div>`
          : ''
      }

      ${
        data.biomarkerComparison
          ? `<div style="background: #f0fdfa; border-left: 4px solid #14b8a6; border-radius: 8px; padding: 16px 18px; margin-bottom: 22px;">
        <h3 style="margin: 0 0 6px; font-size: 15px; color: #115e59;">🔬 Comparativa de Biomarcadores</h3>
        <p style="margin: 0; font-size: 14px; color: #374151;">${escapeMultiline(data.biomarkerComparison)}</p>
      </div>`
          : ''
      }

      <!-- Nota de continuidad y CTA de renovación -->
      <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fcd34d; border-radius: 12px; padding: 24px; text-align: center; margin-top: 22px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #92400e;">
          🚀 ¿Listo para tu siguiente etapa?
        </h2>
        <p style="margin: 0 0 18px; font-size: 14px; color: #78350f;">
          Tu cuenta y todo tu historial médico siguen activos y seguros en tu portal. Puedes renovar este mismo programa o dar el salto a un plan superior cuando quieras.
        </p>
        <a href="${renewHref}" class="button" style="display: inline-block; padding: 14px 28px; background: #059669; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 8px;">
          Renovar o Cambiar de Plan →
        </a>
        <div style="margin-top: 12px;">
          <a href="${portalHref}" style="font-size: 13px; color: #0f766e; text-decoration: underline;">
            Ir a mi portal y revisar mis PDFs
          </a>
        </div>
      </div>
    </div>

    <div style="background: #263238; color: #ffffff; padding: 26px; text-align: center; font-size: 13px;">
      <div style="margin-bottom: 8px; opacity: 0.85;">
        Ayudándote a descubrir el verdadero potencial de tu cuerpo.
      </div>
      <div style="margin-bottom: 8px; opacity: 0.65; font-size: 12px;">
        <a href="https://nelhealthcoach.com" style="color: #90CAF9; text-decoration: none;">nelhealthcoach.com</a>
      </div>
      <div style="opacity: 0.6; font-size: 11px;">
        &copy; ${currentYear} NELHEALTHCOACH, LLC. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;
}

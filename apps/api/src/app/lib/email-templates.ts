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
  replyToEmail?: string;
  websiteUrl?: string;
  dashboardUrl?: string;
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

  // Formatear lista de compras con prioridades (igual que antes, pero mejorado)
  const formatShoppingList = (shoppingList: any[]) => {
    if (!shoppingList || shoppingList.length === 0) return '';
    
    return `
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #4CAF50; color: white;">
          <th style="padding: 12px; text-align: left; font-weight: 600;">Producto</th>
          <th style="padding: 12px; text-align: left; font-weight: 600;">Cantidad</th>
          <th style="padding: 12px; text-align: left; font-weight: 600;">Prioridad</th>
        </tr>
      </thead>
      <tbody>
        ${shoppingList.map((item, index) => `
        <tr style="border-bottom: 1px solid #e0e0e0; ${index % 2 === 0 ? 'background: #fafafa;' : 'background: white;'}">
          <td style="padding: 12px;">${escapeHtml(item.item)}</td>
          <td style="padding: 12px;">${escapeHtml(item.quantity)}</td>
          <td style="padding: 12px;">
            <span style="
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              ${item.priority === 'high' ? 'background: #ffebee; color: #c62828;' : 
                item.priority === 'medium' ? 'background: #fff3e0; color: #ef6c00;' : 
                'background: #e8f5e9; color: #2e7d32;'}
            ">
              ${item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
            </span>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    `;
  };

  // Formatear checklist items con estilo de tarjetas (similar al modal)
  const formatChecklistItems = (items: any[], category: string) => {
    if (!items || items.length === 0) return '<p style="color: #666; font-style: italic;">No hay items para esta semana.</p>';
    
    return items.map((item, index) => {
      let icon = '✓';
      let bgColor = '#e8f5e9';
      let borderColor = '#4CAF50';
      
      if (category === 'exercise') {
        icon = '🏋️';
        bgColor = '#e3f2fd';
        borderColor = '#2196F3';
      } else if (category === 'habits') {
        icon = '🌟';
        bgColor = '#f3e5f5';
        borderColor = '#9C27B0';
      }
      
      let detailsHtml = '';
      if (item.details) {
        if (item.details.recipe) {
          const recipe = item.details.recipe;
          detailsHtml = `
          <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 6px; border-left: 3px solid #FF9800;">
            <strong style="color: #FF9800; display: block; margin-bottom: 8px;">📝 Receta:</strong>
            ${recipe.ingredients && recipe.ingredients.length > 0 ? `
            <div style="margin-bottom: 8px;">
              <strong>Ingredientes:</strong>
              <ul style="margin: 5px 0; padding-left: 20px;">
                ${recipe.ingredients.map((ing: any) => 
                  `<li>${escapeHtml(ing.name)}: ${escapeHtml(ing.quantity)}${ing.notes ? ` (${escapeHtml(ing.notes)})` : ''}</li>`
                ).join('')}
              </ul>
            </div>
            ` : ''}
            ${recipe.preparation ? `<div style="margin-bottom: 8px;"><strong>Preparación:</strong><br>${escapeHtml(recipe.preparation)}</div>` : ''}
            ${recipe.tips ? `<div><strong>💡 Consejo:</strong> ${escapeHtml(recipe.tips)}</div>` : ''}
          </div>
          `;
        }
        
        if (item.details.frequency || item.details.duration) {
          detailsHtml += `
          <div style="margin-top: 8px; font-size: 14px; color: #555;">
            ${item.details.frequency ? `<span style="margin-right: 15px;">🕒 ${escapeHtml(item.details.frequency)}</span>` : ''}
            ${item.details.duration ? `<span>⏱️ ${escapeHtml(item.details.duration)}</span>` : ''}
          </div>
          `;
        }
        
        if (item.details.equipment && item.details.equipment.length > 0) {
          detailsHtml += `
          <div style="margin-top: 8px; font-size: 14px;">
            <strong>Equipo necesario:</strong> ${item.details.equipment.map((eq: string) => escapeHtml(eq)).join(', ')}
          </div>
          `;
        }
      }
      
      return `
      <div style="
        background: ${bgColor};
        border-left: 4px solid ${borderColor};
        padding: 12px 15px;
        margin-bottom: 8px;
        border-radius: 4px;
      ">
        <div style="display: flex; align-items: flex-start;">
          <span style="font-size: 18px; margin-right: 10px;">${icon}</span>
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #333;">${escapeHtml(item.description)}</div>
            ${detailsHtml}
          </div>
        </div>
      </div>
      `;
    }).join('');
  };

  // Generar HTML para cada semana (estilo acordeón, pero siempre visible en email)
  const weeksHTML = data.weeks.map(week => {
    const nutritionFocus = escapeHtml(week.nutrition.focus || 'Nutrición Keto');
    const exerciseFocus = escapeHtml(week.exercise.focus || 'Ejercicio Adaptado');
    
    return `
    <div style="
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      margin-bottom: 25px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    ">
      <!-- Encabezado de semana (gradiente como en el modal) -->
      <div style="
        background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
        color: white;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; align-items: center;">
          <div style="
            background: white;
            color: #4CAF50;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            margin-right: 15px;
          ">
            ${week.weekNumber}
          </div>
          <div>
            <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Semana ${week.weekNumber}</h3>
            <div style="opacity: 0.9; font-size: 14px;">Progresión acumulativa</div>
          </div>
        </div>
        <div style="
          background: rgba(255,255,255,0.2);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        ">
          ${week.nutrition.checklistItems.length} alimentos, ${week.exercise.checklistItems.length} ejercicios, ${week.habits.checklistItems.length} hábitos
        </div>
      </div>
      
      <!-- Contenido de la semana (igual que modal) -->
      <div style="padding: 25px;">
        <!-- Nutrición - Verde -->
        <div style="margin-bottom: 25px;">
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #4CAF50;
          ">
            <span style="font-size: 24px; margin-right: 10px;">🍽️</span>
            <div>
              <h4 style="margin: 0; color: #2E7D32; font-size: 18px; font-weight: 600;">Nutrición</h4>
              <div style="color: #666; font-size: 14px; margin-top: 4px;">${nutritionFocus}</div>
            </div>
          </div>
          
          ${formatChecklistItems(week.nutrition.checklistItems, 'nutrition')}
          
          ${week.nutrition.shoppingList && week.nutrition.shoppingList.length > 0 ? `
          <div style="margin-top: 20px;">
            <div style="
              display: flex;
              align-items: center;
              margin-bottom: 12px;
              color: #333;
              font-weight: 600;
            ">
              <span style="font-size: 20px; margin-right: 8px;">🛒</span>
              Lista de Compras - Semana ${week.weekNumber}
            </div>
            ${formatShoppingList(week.nutrition.shoppingList)}
          </div>
          ` : ''}
        </div>
        
        <!-- Ejercicio - Azul -->
        <div style="margin-bottom: 25px;">
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2196F3;
          ">
            <span style="font-size: 24px; margin-right: 10px;">🏋️</span>
            <div>
              <h4 style="margin: 0; color: #1976D2; font-size: 18px; font-weight: 600;">Ejercicio</h4>
              <div style="color: #666; font-size: 14px; margin-top: 4px;">${exerciseFocus}</div>
            </div>
          </div>
          
          ${formatChecklistItems(week.exercise.checklistItems, 'exercise')}
          
          ${week.exercise.equipment && week.exercise.equipment.length > 0 ? `
          <div style="margin-top: 15px; padding: 12px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196F3;">
            <strong>🎒 Equipo necesario:</strong> ${week.exercise.equipment.map((eq: string) => escapeHtml(eq)).join(', ')}
          </div>
          ` : ''}
        </div>
        
        <!-- Hábitos - Púrpura -->
        <div>
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #9C27B0;
          ">
            <span style="font-size: 24px; margin-right: 10px;">🌟</span>
            <h4 style="margin: 0; color: #7B1FA2; font-size: 18px; font-weight: 600;">Hábitos</h4>
          </div>
          
          ${formatChecklistItems(week.habits.checklistItems, 'habits')}
          
          ${week.habits.motivationTip ? `
          <div style="
            margin-top: 20px;
            padding: 15px;
            background: #f3e5f5;
            border-radius: 8px;
            border-left: 4px solid #9C27B0;
          ">
            <div style="display: flex; align-items: flex-start;">
              <span style="font-size: 20px; margin-right: 10px;">💡</span>
              <div>
                <strong style="color: #7B1FA2;">Consejo motivacional:</strong><br>
                ${escapeHtml(week.habits.motivationTip)}
              </div>
            </div>
          </div>
          ` : ''}
          
          ${week.habits.trackingMethod ? `
          <div style="margin-top: 15px; font-size: 14px; color: #666;">
            <strong>📋 Método de seguimiento:</strong> ${escapeHtml(week.habits.trackingMethod)}
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    `;
  }).join('');

  // Generar el HTML completo con cabecera y footer mejorados
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu Plan de Salud - Mes ${data.monthNumber} | NELHEALTHCOACH</title>
    <style>
        /* Estilos responsive para móvil */
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                padding: 15px !important;
            }
            .header {
                padding: 20px !important;
            }
            .week-header {
                flex-direction: column !important;
                align-items: flex-start !important;
            }
            .week-stats {
                margin-top: 10px !important;
            }
            .grid-2 {
                grid-template-columns: 1fr !important;
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
        <!-- Header con logo blanco sobre azul -->
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 40px 30px; text-align: center;">
            <img src="${logoWhite}" alt="NEL Health Coach" style="max-width: 200px; height: auto; margin-bottom: 20px;">
            <div style="opacity: 0.9; font-size: 16px; max-width: 500px; margin: 0 auto;">
                Transformando vidas a través de la salud integral y hábitos sostenibles
            </div>
        </div>
        
        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            <!-- Saludo y aprobación -->
            <div style="margin-bottom: 30px;">
                <h1 style="margin: 0 0 10px 0; color: #1976D2; font-size: 28px;">
                    Hola ${escapeHtml(data.clientName)},
                </h1>
                <p style="margin: 0; color: #666; font-size: 18px;">
                    Tu coach ha revisado y aprobado tu <strong>plan personalizado para el Mes ${data.monthNumber}</strong>.
                </p>
                <div style="
                    display: inline-block;
                    background: #E3F2FD;
                    color: #1976D2;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 600;
                    margin-top: 15px;
                    font-size: 14px;
                ">
                    📅 Fecha de aprobación: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
            
            <!-- Resumen y Visión en tarjetas (como modal) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;" class="grid-2">
                <!-- Resumen -->
                <div style="
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    border-left: 5px solid #1976D2;
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 24px; margin-right: 10px;">🔍</span>
                        <h3 style="margin: 0; color: #1976D2; font-size: 18px;">Resumen del Estado Actual</h3>
                    </div>
                    <p style="color: #444; line-height: 1.7; font-size: 14px;">
                        ${escapeHtml(data.summary)}
                    </p>
                </div>
                <!-- Visión -->
                <div style="
                    background: #fff8e1;
                    border-radius: 10px;
                    padding: 20px;
                    border-left: 5px solid #FF9800;
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 24px; margin-right: 10px;">🎯</span>
                        <h3 style="margin: 0; color: #EF6C00; font-size: 18px;">Visión para el siguiente mes</h3>
                    </div>
                    <p style="color: #5d4037; line-height: 1.7; font-size: 14px;">
                        ${escapeHtml(data.vision)}
                    </p>
                </div>
            </div>
            
            <!-- Métricas (opcional) -->
            ${data.baselineMetrics ? `
            <div style="margin-bottom: 30px;">
                <h2 style="color: #333; font-size: 22px; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
                    📈 Métricas de Progreso
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;" class="grid-2">
                    <div style="
                        background: #f8f9fa;
                        border-radius: 10px;
                        padding: 20px;
                        border: 1px solid #e0e0e0;
                    ">
                        <h3 style="margin: 0 0 15px 0; color: #666; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                            Estilo de Vida Actual
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #444;">
                            ${data.baselineMetrics.currentLifestyle.map((item: string) => 
                                `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div style="
                        background: #e8f5e9;
                        border-radius: 10px;
                        padding: 20px;
                        border: 1px solid #c8e6c9;
                    ">
                        <h3 style="margin: 0 0 15px 0; color: #2E7D32; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                            Objetivos a Alcanzar
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #1b5e20;">
                            ${data.baselineMetrics.targetLifestyle.map((item: string) => 
                                `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Plan Semanal -->
            <div style="margin-bottom: 30px;">
                <h2 style="color: #333; font-size: 22px; margin-bottom: 25px; text-align: center;">
                    📅 Plan Semanal Progresivo
                </h2>
                <p style="text-align: center; color: #666; margin-bottom: 25px; font-style: italic;">
                    <strong>IMPORTANTE:</strong> Cada semana agregas nuevos elementos mientras mantienes los anteriores.
                    Esta progresión acumulativa te permite construir hábitos sólidos paso a paso.
                </p>
                
                ${weeksHTML}
            </div>
            
            <!-- Instrucciones -->
            <div style="
                background: #e3f2fd;
                border-radius: 10px;
                padding: 25px;
                margin-bottom: 30px;
                border: 2px solid #2196F3;
            ">
                <h2 style="margin: 0 0 20px 0; color: #1976D2; font-size: 22px; text-align: center;">
                    📝 Instrucciones Importantes
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;" class="grid-2">
                    <div style="text-align: center;">
                        <div style="
                            background: white;
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            margin: 0 auto 15px;
                            color: #4CAF50;
                            border: 2px solid #4CAF50;
                        ">
                            🔄
                        </div>
                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Progresión Acumulativa</h3>
                        <p style="margin: 0; color: #666; font-size: 14px;">
                            Cada semana agregas nuevos elementos mientras mantienes los anteriores
                        </p>
                    </div>
                    <div style="text-align: center;">
                        <div style="
                            background: white;
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            margin: 0 auto 15px;
                            color: #FF9800;
                            border: 2px solid #FF9800;
                        ">
                            ✓
                        </div>
                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Seguimiento</h3>
                        <p style="margin: 0; color: #666; font-size: 14px;">
                            Marca cada ítem a medida que lo completas durante la semana
                        </p>
                    </div>
                    <div style="text-align: center;">
                        <div style="
                            background: white;
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            margin: 0 auto 15px;
                            color: #9C27B0;
                            border: 2px solid #9C27B0;
                        ">
                            📊
                        </div>
                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Revisión Semanal</h3>
                        <p style="margin: 0; color: #666; font-size: 14px;">
                            Al final de cada semana, revisa tu progreso con tu coach
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Contacto (con datos reales del footer) -->
            <div style="
                background: #f3e5f5;
                border-radius: 10px;
                padding: 25px;
                text-align: center;
            ">
                <h2 style="margin: 0 0 20px 0; color: #7B1FA2; font-size: 22px;">
                    💬 Soporte y Contacto
                </h2>
                <p style="margin: 0 0 20px 0; color: #4a148c;">
                    Tu coach está disponible para resolver dudas y ajustar el plan según sea necesario
                </p>
                <div style="display: inline-block; text-align: left; background: white; padding: 20px; border-radius: 8px;">
                    <div style="margin-bottom: 10px;">
                        <strong>📧 Email:</strong> <a href="mailto:${contactEmail}" style="color: #1976D2; text-decoration: none;">${contactEmail}</a>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>📞 Teléfonos:</strong> +1 (442) 342-5050 (español) / +1 (760) 980-5880 (inglés)
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>📍 Dirección:</strong> 33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>🌐 Sitio Web:</strong> <a href="${websiteUrl}" style="color: #1976D2; text-decoration: none;">${websiteUrl}</a>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer con logo azul sobre fondo oscuro -->
        <div style="
            background: #263238;
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 14px;
        ">
            <img src="${logoBlue}" alt="NELHEALTHCOACH" style="max-width: 150px; height: auto; margin-bottom: 20px;">
            <div style="margin-bottom: 15px; opacity: 0.8;">
                <strong>NELHEALTHCOACH</strong><br>
                Transformando vidas a través de la salud keto y hábitos sostenibles
            </div>
            <div style="margin-bottom: 15px; opacity: 0.6;">
                © ${currentYear} NELHEALTHCOACH, LLC. Todos los derechos reservados.
            </div>
            <div style="opacity: 0.5; font-size: 12px; max-width: 500px; margin: 0 auto; line-height: 1.5;">
                Este es un email automático generado por nuestro sistema de recomendaciones de IA.<br>
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
  const websiteUrl = data.websiteUrl || 'https://nelhealthcoach.com';

  let text = `NELHealthCoach - Plan Mensual de Salud
================================================

Hola ${data.clientName},

Tu coach ha aprobado tu plan personalizado para el Mes ${data.monthNumber}.

📊 ANÁLISIS DE TU ESTADO ACTUAL:
${data.summary}

🎯 VISIÓN A 12 MESES:
${data.vision}

`;

  if (data.baselineMetrics) {
    text += `📈 MÉTRICAS DE PROGRESO:
Estilo de Vida Actual:
${data.baselineMetrics.currentLifestyle.map(item => `• ${item}`).join('\n')}

Objetivos a Alcanzar:
${data.baselineMetrics.targetLifestyle.map(item => `• ${item}`).join('\n')}

`;
  }

  text += `📅 PLAN SEMANAL PROGRESIVO:
================================

IMPORTANTE: Cada semana agregas nuevos elementos mientras mantienes los anteriores.
Esta progresión acumulativa te permite construir hábitos sólidos paso a paso.

`;

  data.weeks.forEach((week, weekIndex) => {
    text += `
SEMANA ${week.weekNumber}:
${'='.repeat(50)}

NUTRICIÓN: ${week.nutrition.focus || 'Nutrición Keto'}
${week.nutrition.checklistItems.map((item, i) => 
  `${i + 1}. ${item.description}${item.details?.recipe ? ' (ver receta en versión HTML)' : ''}`
).join('\n')}

${week.nutrition.shoppingList.length > 0 ? `
LISTA DE COMPRAS - Semana ${week.weekNumber}:
${week.nutrition.shoppingList.map(item => 
  `• ${item.item} - ${item.quantity} [Prioridad: ${item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}]`
).join('\n')}
` : ''}

EJERCICIO: ${week.exercise.focus || 'Ejercicio Adaptado'}
${week.exercise.checklistItems.map((item, i) => 
  `${i + 1}. ${item.description}`
).join('\n')}

${week.exercise.equipment && week.exercise.equipment.length > 0 ? `
Equipo necesario: ${week.exercise.equipment.join(', ')}
` : ''}

HÁBITOS:
${week.habits.checklistItems.map((item, i) => 
  `${i + 1}. ${item.description}`
).join('\n')}

${week.habits.motivationTip ? `💡 Consejo motivacional: ${week.habits.motivationTip}` : ''}
${week.habits.trackingMethod ? `📋 Método de seguimiento: ${week.habits.trackingMethod}` : ''}
`;
  });

  text += `

📝 INSTRUCCIONES IMPORTANTES:
✅ Progresión Acumulativa: Cada semana agregas nuevos elementos mientras mantienes los anteriores
✅ Método de Seguimiento: Marca cada ítem a medida que lo completas durante la semana
✅ Revisión Semanal: Al final de cada semana, revisa tu progreso con tu coach
✅ Flexibilidad: Este plan es personalizado pero puedes ajustarlo según cómo te sientas

💬 SOPORTE Y CONTACTO:
📧 Email: ${coachEmail}
📞 Teléfonos: +1 (442) 342-5050 (español) / +1 (760) 980-5880 (inglés)
📍 Dirección: 33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)
🌐 Sitio Web: ${websiteUrl}

================================================
NELHealthCoach
Transformando vidas a través de la salud keto y hábitos sostenibles
© ${new Date().getFullYear()} NELHealthCoach. Todos los derechos reservados.

Este es un email automático generado por nuestro sistema de recomendaciones de IA.
Si tienes preguntas, por favor consulta conmigo.
`;

  return text;
}
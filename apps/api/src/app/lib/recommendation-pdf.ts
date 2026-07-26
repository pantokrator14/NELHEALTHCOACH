/**
 * Generador de PDF para recomendaciones de salud (Plan Mensual)
 * 
 * - Paginación Modular Estricta: Cada sección inicia en una hoja nueva.
 * - Resumen y Visión: Retorno al diseño de múltiples tarjetas por párrafo.
 * - Diseño Mixto: 1 hoja por día en nutrición / Flujo continuo en ejercicios.
 * - Aviso Legal: Integrado como banner superior para evitar páginas blancas finales.
 */

import PDFDocument from 'pdfkit';
import * as PDFKit from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// ─── CONSTANTS ────────────────────────────────────────────────────────────

const MARGIN = 50; 
const SAFE_BOTTOM = 50; 
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  darkBlue: '#1A237E',
  lightBlue: '#42A5F5',
  blue: '#1976D2',
  green: '#4CAF50',
  darkGreen: '#2E7D32',
  exerciseBlue: '#2196F3',
  purple: '#9C27B0',
  darkPurple: '#7B1FA2',
  yellow: '#FFF9C4',
  yellowBorder: '#FDD835',
  lightGray: '#F5F5F5',
  mediumGray: '#E0E0E0',
  darkGray: '#666666',
  text: '#333333',
  white: '#FFFFFF',
  footer: '#263238',
  greenBg: '#E8F5E9',
  blueBg: '#E3F2FD',
  purpleBg: '#F3E5F5',
};

const FONT_SIZES = {
  clientName: 20,
  clientSub: 11,
  sectionTitle: 14,
  bannerText: 12,
  subTitle: 10,
  body: 9,
  small: 7.5,
  recipeTitle: 10,
  macroNumber: 14,
  macroLabel: 8,
  coachName: 12,
  footer: 8,
};

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface PDFRecipeData {
  title: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  ingredients: Array<string | { name: string; quantity: string; notes?: string }>;
  instructions: string[];
  macros: {
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
  };
  cookTime?: number;
  difficulty?: string;
  tips?: string;
}

export interface PDFExerciseData {
  name: string;
  description?: string;
  demoUrl?: string;
  demoBuffer?: Buffer;
  instructions: string[];
  sets: number;
  repetitions: string;
  timeUnderTension?: string;
  restBetweenSets?: string;
  equipment?: string[];
  muscleGroups?: string[];
  difficulty?: string;
}

export interface PDFChecklistItem {
  id: string;
  description: string;
  weekNumber: number;
  category: 'nutrition' | 'exercise' | 'habit' | 'medical' | 'supplement';
  type?: string;
  recipeId?: string;
  details?: {
    recipe?: {
      ingredients: Array<string | { name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    };
    macros?: { protein?: string; fat?: string; carbs?: string; ratio?: string };
    calories?: number;
    sets?: number;
    repetitions?: string;
    timeUnderTension?: string;
    frequency?: string;
    duration?: string;
    equipment?: string[];
    progression?: string;
  };
}

export interface PDFWeekData {
  weekNumber: number;
  nutrition: { focus: string; shoppingList: Array<{ item: string; quantity: string; priority: string }> };
  exercise: { focus: string; equipment?: string[] };
  habits: { trackingMethod?: string; motivationTip?: string };
}

export interface PDFRecommendationData {
  client: { name: string; photoBuffer?: Buffer | null; sex?: string; age?: string; };
  session: {
    summary: string;
    vision: string;
    medicalSummary?: string;
    medicalComparativeAnalysis?: string;
    index?: number;
    labResults?: Array<{ name: string; value: string; range: string; status: 'normal' | 'alto' | 'bajo' }>;
    structuredMedicalAnalysis?: {
      exams: Array<{ intro: string; table: Array<any>; analysis: string; }>;
      supplements: Array<{ name: string; dosage: string; timing: string; rationale: string; contraindications?: string; }>;
    };
  };
  checklist: PDFChecklistItem[];
  weeks: PDFWeekData[];
  recipes: Record<string, PDFRecipeData>;
  exercises: Record<string, PDFExerciseData>;
  habitData?: { toAdopt?: string[]; toEliminate?: string[]; trackingMethod?: string; motivationTip?: string; tips?: string[]; };
  coach: { name: string; email: string; phone: string; photoBuffer?: Buffer | null; };
  websiteUrl?: string;
  currentYear?: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

function deeplyCleanEmojis(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    let cleaned = obj.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u2013-\u201D\u2022\n\r]/g, '');
    cleaned = cleaned.replace(/Ø[A-Z0-9=]+/g, '•'); 
    return cleaned.trim();
  }
  if (Array.isArray(obj)) return obj.map(deeplyCleanEmojis);
  if (typeof obj === 'object') {
    if (Buffer.isBuffer(obj)) return obj;
    const cleaned: any = {};
    for (const key in obj) cleaned[key] = deeplyCleanEmojis(obj[key]);
    return cleaned;
  }
  return obj;
}

function drawLine(doc: PDFKit.PDFDocument, y: number, color: string, width?: number) {
  doc.save().moveTo(MARGIN, y).lineTo(MARGIN + (width || USABLE_WIDTH), y)
    .strokeColor(color).lineWidth(1.5).stroke().restore();
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.save().rect(x, y, w, h).fillColor(color).fill().restore();
}

function drawRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, color: string) {
  doc.save().roundedRect(x, y, w, h, r).fillColor(color).fill().restore();
}

function drawBanner(doc: PDFKit.PDFDocument, y: number, label: string, bgColor: string): number {
  const bannerH = 26; 
  drawRect(doc, MARGIN, y, USABLE_WIDTH, bannerH, bgColor);
  doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(FONT_SIZES.bannerText);
  const textW = doc.widthOfString(label);
  doc.text(label, MARGIN + (USABLE_WIDTH - textW) / 2, y + (bannerH - doc.currentLineHeight()) / 2);
  doc.restore();
  return y + bannerH + 12;
}

function drawJustifiedText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, maxWidth: number, fontSize: number): number {
  if (!text) { doc.y = y; return doc.y; }
  doc.save().font('Helvetica').fontSize(fontSize).fillColor(COLORS.text);
  doc.text(text, x, y, { width: maxWidth, align: 'left', lineGap: 1 });
  doc.restore();
  return doc.y; 
}

function drawCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, bgColor: string, borderColor?: string) {
  doc.save();
  doc.roundedRect(x, y, w, h, 4).fillColor(bgColor).fill();
  if (borderColor) doc.roundedRect(x, y, w, h, 4).strokeColor(borderColor).lineWidth(1).stroke();
  doc.restore();
}

function drawInfoBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, value: string, label: string, bgColor: string, textColor: string) {
  drawRoundedRect(doc, x, y, w, h, 4, bgColor);
  doc.save().fillColor(textColor).font('Helvetica-Bold').fontSize(FONT_SIZES.macroNumber);
  const valW = doc.widthOfString(value);
  doc.text(value, x + (w - valW) / 2, y + 4);
  doc.font('Helvetica').fontSize(FONT_SIZES.macroLabel).fillColor(textColor);
  const lblW = doc.widthOfString(label);
  doc.text(label, x + (w - lblW) / 2, y + 18);
  doc.restore();
}

function checkSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - SAFE_BOTTOM) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function forceNewPage(doc: PDFKit.PDFDocument) {
  // Evita añadir una página si ya estamos limpios arriba
  if (doc.y > MARGIN + 10) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

/** 
 * Dibuja cajitas individuales por párrafo (Retorno al diseño de tarjetas múltiples para fluidez visual)
 */
function buildHighlightBlock(doc: PDFKit.PDFDocument, text: string, startY: number, accentColor: string, bgColor: string): number {
  doc.y = startY;
  const paragraphs = text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  const textW = USABLE_WIDTH - 16;

  for (const p of paragraphs) {
    doc.font('Helvetica').fontSize(FONT_SIZES.body);
    const pHeight = doc.heightOfString(p, { width: textW, lineGap: 2 });
    const blockH = pHeight + 16; // Padding limpio

    doc.y = checkSpace(doc, doc.y, blockH);
    const currentY = doc.y;

    doc.save().roundedRect(MARGIN, currentY, USABLE_WIDTH, blockH, 4).fillColor(bgColor).fill().restore();
    doc.save().roundedRect(MARGIN, currentY, 4, blockH, 4).fillColor(accentColor).fill().restore();

    doc.save().fillColor(COLORS.text).font('Helvetica').fontSize(FONT_SIZES.body);
    doc.text(p, MARGIN + 8, currentY + 8, { width: textW, lineGap: 2, align: 'left' });
    doc.restore();

    doc.y = currentY + blockH + 6; // Espacio entre cajitas
  }

  return doc.y + 4;
}

// ─── SECTION BUILDERS ─────────────────────────────────────────────────────

function buildClientHeader(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = startY;
  const photoSize = 60; 
  const initialY = doc.y;
  
  if (data.client.photoBuffer) {
    try {
      doc.save().roundedRect(MARGIN, initialY, photoSize, photoSize, 30).clip();
      doc.image(data.client.photoBuffer as Buffer, MARGIN, initialY, { fit: [photoSize, photoSize], align: 'center', valign: 'center' });
      doc.restore();
    } catch {
      doc.save().roundedRect(MARGIN, initialY, photoSize, photoSize, 30).fillColor(COLORS.blue).fill().restore();
    }
  } else {
    doc.save().roundedRect(MARGIN, initialY, photoSize, photoSize, 30).fillColor(COLORS.blue).fill().restore();
  }
  
  const textX = MARGIN + photoSize + 15;
  const nameY = initialY + 10; 
  doc.save().fillColor(COLORS.darkBlue).font('Helvetica-Bold').fontSize(FONT_SIZES.clientName);
  
  let displayName = data.client.name;
  if (doc.widthOfString(displayName) > USABLE_WIDTH - photoSize - 15) {
    displayName = displayName.substring(0, 30) + '…';
  }
  doc.text(displayName, textX, nameY);
  doc.restore();
  
  const subY = nameY + 24;
  const subParts: string[] = [];
  if (data.client.sex) subParts.push(data.client.sex);
  if (data.client.age) subParts.push(`${data.client.age} años`);
  if (subParts.length > 0) {
    doc.save().fillColor(COLORS.lightBlue).font('Helvetica').fontSize(FONT_SIZES.clientSub).text(subParts.join('  |  '), textX, subY).restore();
  }
  
  return Math.max(initialY + photoSize, subY + 15) + 5;
}

function buildDisclaimer(doc: PDFKit.PDFDocument, startY: number): number {
  doc.y = checkSpace(doc, startY, 40);
  const currentY = doc.y;
  
  const blockH = 32;
  // Fondo amarillo claro con borde elegante
  doc.save().roundedRect(MARGIN, currentY, USABLE_WIDTH, blockH, 4).fillColor('#FFF9C4').fill().restore();
  doc.save().roundedRect(MARGIN, currentY, USABLE_WIDTH, blockH, 4).strokeColor('#FBC02D').lineWidth(1).stroke().restore();

  doc.save().fillColor('#E65100').font('Helvetica-Bold').fontSize(8);
  doc.text('⚠️ Las presentes recomendaciones no son un substituto a las consultas médicas profesionales.', MARGIN, currentY + 7, { width: USABLE_WIDTH, align: 'center' });
  doc.font('Helvetica').fillColor('#E65100').fontSize(8);
  doc.text('Consultar con un médico y/o profesional de la salud de confianza previamente.', MARGIN, currentY + 18, { width: USABLE_WIDTH, align: 'center' });
  doc.restore();

  return currentY + blockH + 15;
}

function buildSummarySection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = checkSpace(doc, startY, 40);
  doc.save().fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle);
  doc.text('Resumen de la situación actual', MARGIN, doc.y);
  doc.y += 8;
  doc.restore();
  if (data.session.summary) doc.y = buildHighlightBlock(doc, data.session.summary, doc.y, COLORS.blue, COLORS.blueBg);
  return doc.y;
}

function buildVisionSection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = checkSpace(doc, startY, 40);
  doc.save().fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle);
  doc.text('Visión para los próximos meses', MARGIN, doc.y);
  doc.y += 8;
  doc.restore();
  if (data.session.vision) doc.y = buildHighlightBlock(doc, data.session.vision, doc.y, COLORS.lightBlue, '#F5F9FF');
  return doc.y;
}

function buildMedicalAnalysisSection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number, sessionIndex: number): number {
  doc.y = startY; 
  const hasStructured = data.session.structuredMedicalAnalysis && data.session.structuredMedicalAnalysis.exams.length > 0;
  const hasLabResults = data.session.labResults && data.session.labResults.length > 0;
  const hasMedicalText = data.session.medicalSummary;

  if (!hasStructured && !hasLabResults && !hasMedicalText) return doc.y;

  drawRect(doc, MARGIN, doc.y, USABLE_WIDTH, 20, '#C62828');
  doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle - 2);
  doc.text('Análisis de documentos médicos', MARGIN + 8, doc.y + 4);
  doc.restore();
  doc.y += 28;

  if (hasStructured) {
    const structured = data.session.structuredMedicalAnalysis!;
    for (let ei = 0; ei < structured.exams.length; ei++) {
      const exam = structured.exams[ei];

      doc.y = checkSpace(doc, doc.y, 20);
      doc.save().fillColor(COLORS.text).font('Helvetica-Oblique').fontSize(FONT_SIZES.small);
      doc.y = drawJustifiedText(doc, exam.intro, MARGIN, doc.y, USABLE_WIDTH, FONT_SIZES.small);
      doc.y += 6;
      doc.restore();

      if (exam.table.length > 0) {
        doc.y = checkSpace(doc, doc.y, 20);
        const colWidths = [USABLE_WIDTH * 0.35, USABLE_WIDTH * 0.20, USABLE_WIDTH * 0.25, USABLE_WIDTH * 0.20];
        const headerY = doc.y;
        
        drawRect(doc, MARGIN, headerY, USABLE_WIDTH, 14, '#C62828');
        doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(7);
        ['Biomarcador', 'Valor', 'Rango Normal', 'Estado'].forEach((h, i) => {
          const cx = MARGIN + 4 + colWidths.slice(0, i).reduce((a, c) => a + c, 0);
          doc.text(h, cx, headerY + 3, { width: colWidths[i] - 4, align: 'left' });
        });
        doc.restore();
        doc.y = headerY + 14;

        for (let ri = 0; ri < exam.table.length; ri++) {
          const row = exam.table[ri];
          const vals = [row.biomarcador, row.valor, row.rango_normal, row.estado];
          
          doc.font('Helvetica').fontSize(7);
          let maxH = 12; 
          vals.forEach((v, i) => {
            const h = doc.heightOfString(String(v || ''), { width: colWidths[i] - 4 });
            if (h + 4 > maxH) maxH = h + 4; 
          });

          doc.y = checkSpace(doc, doc.y, maxH);
          const rowY = doc.y;
          drawRect(doc, MARGIN, rowY, USABLE_WIDTH, maxH, ri % 2 === 0 ? '#FFEBEE' : '#FFFFFF');

          doc.save();
          vals.forEach((v, i) => {
            const cx = MARGIN + 4 + colWidths.slice(0, i).reduce((a, c) => a + c, 0);
            if (i === 3) doc.fillColor(row.estado === 'Normal' ? '#2E7D32' : '#C62828').font('Helvetica-Bold');
            else doc.fillColor(COLORS.text).font('Helvetica');
            doc.text(String(v || '').replace(/\$/g,''), cx, rowY + 3, { width: colWidths[i] - 4, align: 'left' });
          });
          doc.restore();
          doc.y = rowY + maxH; 
        }
        doc.y += 8;
      }

      doc.y = checkSpace(doc, doc.y, 20);
      doc.save().fillColor(COLORS.text).fontSize(FONT_SIZES.small);
      doc.font('Helvetica-Bold').text('Análisis Clínico: ', MARGIN, doc.y, { continued: true });
      doc.font('Helvetica').text(exam.analysis, { continued: false, lineGap: 1 });
      doc.y += 10;
      doc.restore();

      if (ei < structured.exams.length - 1) {
        drawLine(doc, doc.y, '#FFCDD2', USABLE_WIDTH);
        doc.y += 10;
      }
    }

    if (structured.supplements.length > 0) {
      doc.y = checkSpace(doc, doc.y, 25);
      drawRect(doc, MARGIN, doc.y, USABLE_WIDTH, 18, '#F57F17');
      doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(10);
      doc.text('Suplementación Estratégica Recomendada', MARGIN + 8, doc.y + 4);
      doc.restore();
      doc.y += 24;

      for (const supp of structured.supplements) {
        doc.y = checkSpace(doc, doc.y, 20);
        doc.save().fillColor(COLORS.text).font('Helvetica-Bold').fontSize(FONT_SIZES.small);
        doc.text(`• ${supp.name}`, MARGIN + 5, doc.y);
        doc.y += 3;
        
        doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.darkGray);
        doc.text(`  Dosis: ${supp.dosage} | Momento: ${supp.timing}`, MARGIN + 5, doc.y);
        doc.y += 2;
        doc.text(`  Razón: ${supp.rationale}`, MARGIN + 5, doc.y, { width: USABLE_WIDTH - 10 });
        doc.y += 2;
        
        if (supp.contraindications) {
          doc.fillColor('#C62828').font('Helvetica-Bold');
          doc.text(`  ⚠️ Contraindicaciones: ${supp.contraindications}`, MARGIN + 5, doc.y, { width: USABLE_WIDTH - 10 });
          doc.y += 2;
        }
        doc.y += 6;
        doc.restore();
      }
    }
  }
  return doc.y;
}

function getRecipeCardHeight(doc: PDFKit.PDFDocument, recipe: PDFRecipeData, mealTypeStr: string, cardWidth: number): number {
  const pad = 10;
  const innerW = cardWidth - 2 * pad;
  const imgW = 120;
  const gap = 15;
  const hasImg = !!recipe.imageBuffer;
  const textW = hasImg ? innerW - imgW - gap : innerW;
  const colW = (textW - 10) / 2;

  let textH = 0;
  if (mealTypeStr) textH += 22;

  doc.font('Helvetica-Bold').fontSize(FONT_SIZES.recipeTitle);
  textH += doc.heightOfString(recipe.title, { width: textW }) + 4;

  doc.font('Helvetica-Oblique').fontSize(FONT_SIZES.macroLabel);
  textH += doc.heightOfString('M') + 6;

  doc.font('Helvetica-Bold').fontSize(FONT_SIZES.subTitle);
  textH += doc.heightOfString('Ingredientes', { width: colW }) + 4;

  doc.font('Helvetica').fontSize(FONT_SIZES.small);
  let ingH = 0;
  for (const ing of recipe.ingredients || []) {
      let text = '• ';
      if (typeof ing === 'string') text += ing;
      else if (ing && typeof ing === 'object') {
         if (ing.name && ing.quantity) text += `${ing.name} - ${ing.quantity}`;
         else text += ing.name || ing.quantity || '';
         if (ing.notes) text += ` (${ing.notes})`;
      }
      ingH += doc.heightOfString(text, { width: colW, lineGap: 1 }) + 2;
  }

  let instH = 0;
  for (let i = 0; i < (recipe.instructions || []).length; i++) {
      instH += doc.heightOfString(`${i + 1}. ${recipe.instructions[i]}`, { width: colW, lineGap: 1 }) + 2;
  }

  textH += Math.max(ingH, instH);

  const imgH = hasImg ? 80 : 0;
  return Math.max(imgH, textH) + (pad * 2) + 4;
}

function buildRecipeCard(doc: PDFKit.PDFDocument, recipe: PDFRecipeData, mealTypeStr: string, x: number, startY: number, cardWidth: number): number {
  doc.y = startY;
  const pad = 10;
  const cardHeight = getRecipeCardHeight(doc, recipe, mealTypeStr, cardWidth);
  doc.y = checkSpace(doc, doc.y, cardHeight);
  const cardStartY = doc.y;
  
  drawCard(doc, x, cardStartY, cardWidth, cardHeight, COLORS.greenBg);
  
  const innerX = x + pad;
  const innerW = cardWidth - 2 * pad;
  const imgW = 120;
  const gap = 15;
  const hasImg = !!recipe.imageBuffer;
  const textX = hasImg ? innerX + imgW + gap : innerX;
  const textW = hasImg ? innerW - imgW - gap : innerW;
  
  if (hasImg) {
      try {
        doc.save().roundedRect(innerX, cardStartY + pad, imgW, 80, 4).clip();
        doc.image(recipe.imageBuffer as Buffer, innerX, cardStartY + pad, { fit: [imgW, 80], align: 'center', valign: 'center' });
        doc.restore();
      } catch (err) {
        doc.restore();
      }
  } 
  
  let currentY = cardStartY + pad;

  if (mealTypeStr) {
      doc.save().font('Helvetica-Bold').fontSize(9);
      const pillW = doc.widthOfString(mealTypeStr) + 16;
      drawRoundedRect(doc, textX, currentY, pillW, 16, 8, '#FFF3E0');
      doc.fillColor('#F57C00');
      doc.text(mealTypeStr, textX + 8, currentY + 4);
      doc.restore();
      currentY += 22;
  }
  
  doc.save().fillColor(COLORS.darkGreen).font('Helvetica-Bold').fontSize(FONT_SIZES.recipeTitle);
  doc.text(recipe.title, textX, currentY, { width: textW });
  currentY += doc.heightOfString(recipe.title, { width: textW }) + 4;
  doc.restore();
  
  const macros = [];
  if (recipe.cookTime) macros.push(`Tiempo: ${recipe.cookTime} min`);
  if (recipe.macros?.calories) macros.push(`Calorías: ${Math.round(recipe.macros.calories)} kcal`);
  if (recipe.macros?.protein) macros.push(`Prot: ${Math.round(recipe.macros.protein)}g`);
  if (recipe.macros?.carbs) macros.push(`Carb: ${Math.round(recipe.macros.carbs)}g`);
  if (recipe.macros?.fat) macros.push(`Grasa: ${Math.round(recipe.macros.fat)}g`);
  
  doc.save().fillColor(COLORS.darkGray).font('Helvetica-Oblique').fontSize(FONT_SIZES.macroLabel);
  doc.text(macros.join('   |   '), textX, currentY, { width: textW });
  currentY += doc.heightOfString('M') + 6;
  doc.restore();

  doc.save().moveTo(textX, currentY - 2).lineTo(textX + textW, currentY - 2).strokeColor(COLORS.green).lineWidth(1).stroke().restore();
  
  const colW = (textW - 10) / 2;
  let leftY = currentY + 4;
  let rightY = currentY + 4;
  
  doc.save().fillColor(COLORS.darkGreen).font('Helvetica-Bold').fontSize(FONT_SIZES.subTitle);
  doc.text('Ingredientes', textX, leftY);
  leftY += doc.heightOfString('Ingredientes') + 4;
  
  doc.text('Preparación', textX + colW + 10, rightY);
  rightY += doc.heightOfString('Preparación') + 4;
  
  doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.text);
  for (const ing of recipe.ingredients || []) {
    let t = '• ';
    if (typeof ing === 'string') t += ing;
    else if (ing && typeof ing === 'object') {
       if (ing.name && ing.quantity) t += `${ing.name} - ${ing.quantity}`;
       else t += ing.name || ing.quantity || '';
       if (ing.notes) t += ` (${ing.notes})`;
    }
    doc.text(t, textX, leftY, { width: colW, lineGap: 1 });
    leftY += doc.heightOfString(t, { width: colW, lineGap: 1 }) + 2;
  }
  
  for (let i = 0; i < (recipe.instructions || []).length; i++) {
    const t = `${i + 1}. ${recipe.instructions[i]}`;
    doc.text(t, textX + colW + 10, rightY, { width: colW, lineGap: 1 });
    rightY += doc.heightOfString(t, { width: colW, lineGap: 1 }) + 2;
  }
  doc.restore();
  
  doc.y = cardStartY + cardHeight;
  return doc.y;
}

function buildNutritionPlan(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = startY;
  const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const mealMap: Record<string, string> = {
    desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', snack: 'Snack',
    breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena'
  };

  let isFirstDay = true;

  for (const week of data.weeks) {
    const weekItems = data.checklist.filter(item => item.weekNumber === week.weekNumber && item.category === 'nutrition');
    if (weekItems.length === 0) continue;
    
    const dayGroups: { day: string; items: PDFChecklistItem[] }[] = dayOrder.map(d => ({ day: d, items: [] }));
    const noDayItems: PDFChecklistItem[] = [];

    for (const item of weekItems) {
      let dayFound = dayOrder.find(d => item.details?.frequency?.toLowerCase().includes(d.toLowerCase())) || 
                     dayOrder.find(d => item.description.toLowerCase().startsWith(d.toLowerCase()));
      if (dayFound) {
        dayGroups.find(g => g.day === dayFound)!.items.push(item);
      } else {
        noDayItems.push(item);
      }
    }
    
    if (noDayItems.length > 0 && dayGroups.every(g => g.items.length === 0)) {
       dayGroups[0].items = noDayItems;
    }

    for (const group of dayGroups) {
      if (group.items.length === 0) continue;
      
      // Control Modular: 1 Día = 1 Hoja
      if (!isFirstDay) forceNewPage(doc);
      
      if (isFirstDay) {
         doc.y = drawBanner(doc, doc.y, 'Plan Nutricional', COLORS.green);
         isFirstDay = false;
      }

      doc.y = checkSpace(doc, doc.y, 40);
      drawCard(doc, MARGIN, doc.y, USABLE_WIDTH, 22, COLORS.green, COLORS.green);
      doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11);
      doc.text(group.day, MARGIN + 12, doc.y + 5);
      doc.restore();
      doc.y += 28; 

      for (const item of group.items) {
          const type = (item.type || '').toLowerCase();
          const mealTypeStr = mealMap[type] || 'Recomendación';

          let recipe: PDFRecipeData | undefined;
          if (item.recipeId && data.recipes[item.recipeId]) {
            recipe = data.recipes[item.recipeId];
          } else {
            recipe = Object.values(data.recipes).find(r => 
              r.title.toLowerCase().includes(item.description.toLowerCase()) || 
              item.description.toLowerCase().includes(r.title.toLowerCase())
            );
          }
          
          if (recipe) {
            doc.y = buildRecipeCard(doc, recipe, mealTypeStr, MARGIN, doc.y, USABLE_WIDTH);
            doc.y += 10; 
          } else {
             const fH = 40;
             doc.y = checkSpace(doc, doc.y, fH);
             drawCard(doc, MARGIN, doc.y, USABLE_WIDTH, fH, COLORS.greenBg);
             doc.save().fillColor(COLORS.darkGreen).font('Helvetica-Bold').fontSize(FONT_SIZES.body);
             doc.text(`[${mealTypeStr}] ${item.description}`, MARGIN + 10, doc.y + 10, { width: USABLE_WIDTH - 20 });
             doc.restore();
             doc.y += fH + 10;
          }
      }
    }
  }
  return doc.y;
}

function buildShoppingListSection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = startY;
  const allItems: Array<{ item: string; quantity: string; }> = [];
  for (const week of data.weeks) {
    if (week.nutrition.shoppingList) {
      for (const si of week.nutrition.shoppingList) allItems.push(si);
    }
  }
  if (allItems.length === 0) return doc.y;

  doc.y = drawBanner(doc, doc.y, 'Lista de compras', COLORS.darkGreen);

  doc.save().fillColor(COLORS.darkGray).font('Helvetica-Oblique').fontSize(FONT_SIZES.small);
  doc.text('Usa esta lista como guía para tu visita al supermercado.', MARGIN, doc.y);
  doc.y += 16;
  
  const listText = allItems.map(item => `• ${item.item}: ${item.quantity}`).join('\n');
  
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
  doc.text(listText, MARGIN, doc.y, { columns: 3, columnGap: 15, lineGap: 3, align: 'left' });
  doc.restore();
  
  doc.y += 15; 
  return doc.y;
}

function buildExercisePlan(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = startY;
  const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const exerciseItems = data.checklist.filter(item => item.category === 'exercise');

  if (exerciseItems.length > 0) {
    const weekSet = new Set(exerciseItems.map(item => item.weekNumber));
    const weeksWithExercises = Array.from(weekSet).sort();
    let isFirstRender = true;

    for (const weekNum of weeksWithExercises) {
      const week = data.weeks.find(w => w.weekNumber === weekNum);
      const weekItems = exerciseItems.filter(item => item.weekNumber === weekNum);
      const dayGroups: { day: string; items: PDFChecklistItem[] }[] = [];

      for (const item of weekItems) {
        let day = dayOrder.find(d => item.details?.frequency?.toLowerCase().includes(d.toLowerCase())) || 
                  dayOrder.find(d => item.description.toLowerCase().startsWith(d.toLowerCase())) || 'General';

        let existing = dayGroups.find(g => g.day === day);
        if (!existing) { existing = { day, items: [] }; dayGroups.push(existing); }
        existing.items.push(item);
      }

      dayGroups.sort((a, b) => {
        const ai = dayOrder.indexOf(a.day); const bi = dayOrder.indexOf(b.day);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      });

      for (const group of dayGroups) {
        if (group.items.length === 0) continue;

        // Control Modular: Cada día inicia en su propia hoja limpia
        if (!isFirstRender) forceNewPage(doc);

        if (isFirstRender) {
          doc.y = drawBanner(doc, doc.y, 'Plan de Ejercicios', COLORS.exerciseBlue);
          if (week?.exercise.focus) {
            doc.font('Helvetica-Oblique').fontSize(FONT_SIZES.body).fillColor(COLORS.darkGray);
            doc.text(`Enfoque: ${week.exercise.focus}`, MARGIN, doc.y, { lineGap: 2 });
            doc.y += doc.heightOfString(`Enfoque: ${week.exercise.focus}`, { lineGap: 2 }) + 8;
          }
          isFirstRender = false;
        }

        doc.y = checkSpace(doc, doc.y, 40);
        const dayCardY = doc.y;
        drawCard(doc, MARGIN, dayCardY, USABLE_WIDTH, 22, COLORS.exerciseBlue, COLORS.exerciseBlue);
        doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11);
        doc.text(group.day, MARGIN + 12, dayCardY + 5);
        doc.restore();
        doc.y = dayCardY + 28; 

        for (const item of group.items) {
          let exercise = Object.values(data.exercises).find(ex => ex.name.toLowerCase().includes(item.description.toLowerCase()) || item.description.toLowerCase().includes(ex.name.toLowerCase()));
          
          const exCardPad = 8;
          const exCardX = MARGIN + 4;
          const exCardW = USABLE_WIDTH - 8;
          const exName = exercise?.name || item.description;

          doc.font('Helvetica-Bold').fontSize(10);
          let exCardH = exCardPad + doc.heightOfString(exName, { width: exCardW - 2 * exCardPad }) + 2;
          
          doc.font('Helvetica').fontSize(8);
          if (exercise?.description) exCardH += doc.heightOfString(exercise.description, { width: exCardW - 2 * exCardPad, lineGap: 1 }) + 2;
          
          doc.fontSize(7.5);
          const instr2 = exercise?.instructions || [];
          if (instr2.length > 0) {
              const joinedInst = instr2.map((ins, i) => `${i + 1}. ${ins}`).join('  ');
              exCardH += doc.heightOfString(joinedInst, { width: exCardW - 2 * exCardPad, lineGap: 1 }) + 4;
          }
          
          const sets = exercise?.sets || item.details?.sets || '—';
          const reps = exercise?.repetitions || item.details?.repetitions || '—';
          const infoStr = `Series: ${sets}  |  Reps: ${reps}`;
          doc.font('Helvetica-Bold').fontSize(8);
          exCardH += doc.heightOfString(infoStr) + 2;
          
          exCardH += exCardPad; 

          doc.y = checkSpace(doc, doc.y, exCardH);
          const exCardStartY = doc.y;

          drawCard(doc, exCardX, exCardStartY, exCardW, exCardH, COLORS.blueBg, COLORS.exerciseBlue);
          let exContentY = exCardStartY + exCardPad;
          
          doc.save().fillColor(COLORS.exerciseBlue).font('Helvetica-Bold').fontSize(10);
          doc.text(exName, exCardX + exCardPad, exContentY, { width: exCardW - 2 * exCardPad });
          exContentY += doc.heightOfString(exName, { width: exCardW - 2 * exCardPad }) + 2;
          doc.restore();
          
          if (exercise?.description) {
            doc.save().fillColor(COLORS.text).font('Helvetica').fontSize(8);
            doc.text(exercise.description, exCardX + exCardPad, exContentY, { width: exCardW - 2 * exCardPad, lineGap: 1 });
            exContentY += doc.heightOfString(exercise.description, { width: exCardW - 2 * exCardPad, lineGap: 1 }) + 2;
            doc.restore();
          }

          if (instr2.length > 0) {
            doc.save().fillColor(COLORS.darkGray).font('Helvetica').fontSize(7.5);
            const joinedInst = instr2.map((ins, i) => `${i + 1}. ${ins}`).join('  ');
            doc.text(joinedInst, exCardX + exCardPad, exContentY, { width: exCardW - 2 * exCardPad, lineGap: 1 });
            exContentY += doc.heightOfString(joinedInst, { width: exCardW - 2 * exCardPad, lineGap: 1 }) + 4;
            doc.restore();
          }

          doc.save().fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8);
          doc.text(infoStr, exCardX + exCardPad, exContentY);
          doc.restore();

          doc.y = exCardStartY + exCardH + 8; // Mínima distancia
        }
      }
    }
  }
  return doc.y;
}

function buildHabits(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = startY;
  doc.y = drawBanner(doc, doc.y, 'Plan de Hábitos', COLORS.purple);
  
  const habitItems = data.checklist.filter(item => item.category === 'habit');
  const toAdopt = habitItems.filter(item => item.type === 'toAdopt' || !item.type);
  const toEliminate = habitItems.filter(item => item.type === 'toEliminate');
  
  const colW = (USABLE_WIDTH - 20) / 2;
  const startColsY = doc.y;
  let maxLeftY = startColsY;
  let maxRightY = startColsY;
  
  doc.y = startColsY;
  if (toAdopt.length > 0 || data.habitData?.toAdopt?.length) {
    doc.save().fillColor(COLORS.darkPurple).font('Helvetica-Bold').fontSize(10);
    doc.text('Hábitos a implementar', MARGIN, doc.y);
    maxLeftY = doc.y + 6;
    
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    const habits = toAdopt.length > 0 ? toAdopt.map(i => i.description) : (data.habitData?.toAdopt || []);
    for (const habit of habits) {
      doc.save().fillColor(COLORS.green).circle(MARGIN + 3, maxLeftY + 4, 2).fill().restore();
      doc.text(habit, MARGIN + 10, maxLeftY, { width: colW - 10, lineGap: 2 });
      maxLeftY += doc.heightOfString(habit, { width: colW - 10, lineGap: 2 }) + 8;
    }
    doc.restore();
  }
  
  doc.y = startColsY;
  if (toEliminate.length > 0 || data.habitData?.toEliminate?.length) {
    const rightX = MARGIN + colW + 20;
    doc.save().fillColor(COLORS.darkPurple).font('Helvetica-Bold').fontSize(10);
    doc.text('Hábitos a abandonar', rightX, doc.y);
    maxRightY = doc.y + 6;
    
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    const habits = toEliminate.length > 0 ? toEliminate.map(i => i.description) : (data.habitData?.toEliminate || []);
    for (const habit of habits) {
      doc.save().fillColor('#C62828').circle(rightX + 3, maxRightY + 4, 2).fill().restore();
      doc.text(habit, rightX + 10, maxRightY, { width: colW - 10, lineGap: 2 });
      maxRightY += doc.heightOfString(habit, { width: colW - 10, lineGap: 2 }) + 8;
    }
    doc.restore();
  }
  
  doc.y = Math.max(maxLeftY, maxRightY) + 15;
  return doc.y;
}

function buildMotivationMessage(doc: PDFKit.PDFDocument, startY: number): number {
  doc.y = startY;
  drawLine(doc, doc.y, COLORS.green, 150);
  doc.y += 10;
  
  const message = 'El verdadero potencial de tu cuerpo está esperando ser descubierto. Cada pequeño paso que das hoy te acerca más a la mejor versión de ti mismo. Confía en el proceso, mantén la constancia y permítete transformar tu vida. ¡Tú puedes lograrlo!';
  
  doc.save().fillColor(COLORS.darkBlue).font('Helvetica-Oblique').fontSize(10);
  doc.text(message, MARGIN, doc.y, { width: USABLE_WIDTH, align: 'left', lineGap: 2 });
  doc.y += doc.heightOfString(message, { width: USABLE_WIDTH, lineGap: 2 }) + 10;
  doc.restore();
  
  drawLine(doc, doc.y, COLORS.green, 150);
  doc.y += 10;
  return doc.y;
}

function buildCoachInfo(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  doc.y = checkSpace(doc, startY, 90);
  
  const cardStartY = doc.y;
  const cardH = 80;
  drawCard(doc, MARGIN, cardStartY, USABLE_WIDTH, cardH, COLORS.greenBg, COLORS.green);
  
  const innerX = MARGIN + 12;
  const innerY = cardStartY + 12;
  const photoSize = 56;
  
  if (data.coach.photoBuffer) {
    try {
      doc.save().roundedRect(innerX, innerY, photoSize, photoSize, 28).clip();
      doc.image(data.coach.photoBuffer as Buffer, innerX, innerY, { fit: [photoSize, photoSize], align: 'center', valign: 'center' });
      doc.restore();
    } catch {
      doc.restore();
    }
  } else {
    drawRoundedRect(doc, innerX, innerY, photoSize, photoSize, 28, COLORS.green);
    doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(18);
    const init = data.coach.name.charAt(0).toUpperCase();
    doc.text(init, innerX + (photoSize - doc.widthOfString(init)) / 2, innerY + 18);
    doc.restore();
  }
  
  const detailX = innerX + photoSize + 15;
  doc.save().fillColor(COLORS.darkGreen).font('Helvetica-Bold').fontSize(FONT_SIZES.coachName);
  doc.text(data.coach.name, detailX, innerY + 4);
  
  doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.darkGreen);
  doc.text(`Email: ${data.coach.email}`, detailX, innerY + 22);
  if (data.coach.phone) doc.text(`Teléfono: ${data.coach.phone}`, detailX, innerY + 36);
  doc.restore();
  
  return cardStartY + cardH + 10;
}

function buildFooter(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  if (startY + 90 > PAGE_HEIGHT - 20) { 
    forceNewPage(doc);
    startY = MARGIN;
  }
  
  doc.y = startY;
  const footerStartY = doc.y;
  drawRect(doc, MARGIN, footerStartY, USABLE_WIDTH, 90, COLORS.footer); 
  
  let currentY = footerStartY + 12;
  doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(10);
  doc.text('NELHEALTHCOACH', MARGIN + 12, currentY); currentY += 14;
  doc.font('Helvetica').fontSize(7.5).fillColor('rgba(255,255,255,0.7)');
  doc.text('Ayudándote a descubrir el verdadero potencial de tu cuerpo.', MARGIN + 12, currentY); currentY += 14;
  if (data.websiteUrl) doc.text(`Sitio web: ${data.websiteUrl}`, MARGIN + 12, currentY); currentY += 10;
  doc.text('33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)', MARGIN + 12, currentY); currentY += 10;
  doc.text(`Email: ${data.coach.email} | Tel: ${data.coach.phone || '+1 (442) 342-5050'}`, MARGIN + 12, currentY); currentY += 14;
  doc.fontSize(6).fillColor('rgba(255,255,255,0.6)');
  doc.text(`© ${data.currentYear || new Date().getFullYear()} NELHEALTHCOACH, LLC. Todos los derechos reservados.`, MARGIN + 12, currentY);
  doc.restore();
  return footerStartY + 90;
}

// ─── MAIN GENERATOR ───────────────────────────────────────────────────────

export function generateRecommendationPDF(raw_data: PDFRecommendationData): Promise<Buffer> {
  logger.info('PDF', '[PDF-GEN] Entrando a generateRecommendationPDF, sanitizando datos...');
  const data = deeplyCleanEmojis(raw_data) as PDFRecommendationData;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: MARGIN, bottom: 20, left: MARGIN, right: MARGIN }, 
        info: { Title: 'Recomendaciones', Author: data.coach.name, Subject: `Plan para ${data.client.name}` },
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      doc.y = MARGIN; 
      
      // -- SECCIÓN 1: Header, Disclaimer, Resumen y Visión
      doc.y = buildClientHeader(doc, data, doc.y);
      drawLine(doc, doc.y, COLORS.blue); doc.y += 15;
      
      doc.y = buildDisclaimer(doc, doc.y);
      
      doc.y = buildSummarySection(doc, data, doc.y);
      doc.y = buildVisionSection(doc, data, doc.y);
      
      // -- SECCIÓN 2: Análisis Médico (Hoja exclusiva)
      const hasMed = data.session.structuredMedicalAnalysis?.exams?.length || data.session.labResults?.length || data.session.medicalSummary;
      if (hasMed) {
        forceNewPage(doc);
        doc.y = buildMedicalAnalysisSection(doc, data, doc.y, data.session.index ?? 0);
      }
      
      // -- SECCIÓN 3: Nutrición (Cada día es una hoja exclusiva)
      const hasNut = data.checklist.some(i => i.category === 'nutrition');
      if (hasNut) {
        forceNewPage(doc);
        doc.y = buildNutritionPlan(doc, data, doc.y);
      }
      
      // -- SECCIÓN 4: Lista de Compras (Hoja exclusiva)
      const hasShop = data.weeks.some(w => w.nutrition.shoppingList?.length > 0);
      if (hasShop) {
        forceNewPage(doc);
        doc.y = buildShoppingListSection(doc, data, doc.y);
      }
      
      // -- SECCIÓN 5: Ejercicios (Flujo continuo, hoja nueva para el primer día)
      const hasEx = data.checklist.some(i => i.category === 'exercise');
      if (hasEx) {
        forceNewPage(doc);
        doc.y = buildExercisePlan(doc, data, doc.y);
      }
      
      // -- SECCIÓN 6: Hábitos (Hoja exclusiva)
      const hasHabits = data.checklist.some(i => i.category === 'habit') || data.habitData?.toAdopt?.length || data.habitData?.toEliminate?.length;
      if (hasHabits) {
        forceNewPage(doc);
        doc.y = buildHabits(doc, data, doc.y);
      }
      
      // -- SECCIÓN 7: Cierre y Coach (Se empacan todos juntos al final)
      doc.y = checkSpace(doc, doc.y, 200); 
      doc.y = buildMotivationMessage(doc, doc.y);
      doc.y += 10; 
      doc.y = buildCoachInfo(doc, data, doc.y);
      doc.y += 10;
      doc.y = buildFooter(doc, data, doc.y);
      
      doc.end();
    } catch (error) { reject(error); }
  });
}
export default generateRecommendationPDF;
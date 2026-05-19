/**
 * Generador de PDF para recomendaciones de salud (Plan Mensual)
 * 
 * Usa pdfkit para generar un PDF profesional con:
 * - Datos del cliente (foto, nombre, sexo, edad)
 * - Resumen y visión
 * - Plan nutricional completo con recetas
 * - Plan de ejercicios con demostraciones
 * - Plan de hábitos
 * - Información del coach
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── PATCH: Redirigir carga de fuentes .afm de pdfkit ──────────────────
// pdfkit 0.18 hace fs.readFileSync(__dirname + '/data/Helvetica.afm').
// Cuando Next.js bundlea el código, __dirname cambia y las fuentes no se
// encuentran. Este patch intercepta las llamadas y las redirige a las
// fuentes en múltiples ubicaciones posibles (local + node_modules).
function resolveFontPath(fontName: string): string | null {
  // 1. Junto a este mismo archivo (src/app/lib/pdf-fonts/)
  const localPath = path.join(__dirname, 'pdf-fonts', fontName);
  if (fs.existsSync(localPath)) return localPath;

  // 2. Ruta absoluta del proyecto (desarrollo local)
  const projectPath = path.join(process.cwd(), 'apps/api/src/app/lib/pdf-fonts', fontName);
  if (fs.existsSync(projectPath)) return projectPath;

  // 3. node_modules de pdfkit (producción con serverExternalModules)
  const nodeModulesPath = path.join(process.cwd(), 'node_modules/pdfkit/js/data', fontName);
  if (fs.existsSync(nodeModulesPath)) return nodeModulesPath;

  return null;
}

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function patchedReadFileSync(filePath: fs.PathOrFileDescriptor, options?: any): any {
  if (typeof filePath === 'string' && filePath.endsWith('.afm')) {
    const fontName = path.basename(filePath);
    const resolved = resolveFontPath(fontName);
    if (resolved) {
      return originalReadFileSync(resolved, 'utf8');
    }
  }
  return originalReadFileSync(filePath, options as any);
} as typeof fs.readFileSync;

// ─── CONSTANTS ────────────────────────────────────────────────────────────

const MARGIN = 85; // 3cm ≈ 85pt
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
  clientName: 26,
  clientSub: 14,
  sectionTitle: 18,
  bannerText: 20,
  subTitle: 14,
  body: 10,
  small: 8,
  recipeTitle: 13,
  macroNumber: 16,
  macroLabel: 7,
  coachName: 16,
  footer: 9,
  emojiLabel: 12,
};

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface PDFRecipeData {
  title: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  ingredients: string[];
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
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
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
  client: {
    name: string;
    photoBuffer?: Buffer | null;
    sex?: string;
    age?: string;
  };
  session: {
    summary: string;
    vision: string;
    medicalSummary?: string;
    medicalComparativeAnalysis?: string;
  };
  checklist: PDFChecklistItem[];
  weeks: PDFWeekData[];
  recipes: Record<string, PDFRecipeData>;
  exercises: Record<string, PDFExerciseData>;
  habitData?: {
    toAdopt?: string[];
    toEliminate?: string[];
    trackingMethod?: string;
    motivationTip?: string;
    tips?: string[];
  };
  coach: {
    name: string;
    email: string;
    phone: string;
    photoBuffer?: Buffer | null;
  };
  websiteUrl?: string;
  currentYear?: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

/** Draws a horizontal line */
function drawLine(doc: PDFKit.PDFDocument, y: number, color: string, width?: number) {
  doc.save()
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + (width || USABLE_WIDTH), y)
    .strokeColor(color)
    .lineWidth(1.5)
    .stroke()
    .restore();
}

/** Draws a filled rectangle */
function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.save()
    .rect(x, y, w, h)
    .fillColor(color)
    .fill()
    .restore();
}

/** Draws a banner (full-width colored bar with centered white text) */
function drawBanner(doc: PDFKit.PDFDocument, y: number, label: string, bgColor: string, icon?: string) {
  const bannerH = 40;
  drawRect(doc, MARGIN, y, USABLE_WIDTH, bannerH, bgColor);
  
  doc.save()
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.bannerText);
  
  const text = icon ? `${icon}  ${label}` : label;
  const textW = doc.widthOfString(text);
  const textX = MARGIN + (USABLE_WIDTH - textW) / 2;
  doc.text(text, textX, y + (bannerH - doc.currentLineHeight()) / 2);
  doc.restore();
  
  return y + bannerH + 15;
}

/** Wraps text to fit width, returns lines */
function wordWrap(text: string, doc: PDFKit.PDFDocument, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const w = doc.widthOfString(testLine);
    if (w > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Draws justified text within a given width. Returns final y position. */
function drawJustifiedText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight?: number
): number {
  const lh = lineHeight || fontSize * 1.5;
  doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.text);
  
  const lines = wordWrap(text, doc, maxWidth);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLastLine = i === lines.length - 1;
    
    if (isLastLine || line.split(' ').length <= 1) {
      // Last line or single word: left-aligned
      doc.text(line, x, y);
    } else {
      // Justified
      const words = line.split(' ');
      const wordWidths = words.map(w => doc.widthOfString(w));
      const totalCharsWidth = wordWidths.reduce((a, b) => a + b, 0);
      const spaceWidth = (maxWidth - totalCharsWidth) / (words.length - 1);
      
      let cursorX = x;
      for (let j = 0; j < words.length; j++) {
        doc.text(words[j], cursorX, y);
        cursorX += wordWidths[j] + (j < words.length - 1 ? spaceWidth : 0);
      }
    }
    y += lh;
  }
  
  return y;
}

/** Draws a rounded rectangle */
function drawRoundedRect(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number, r: number, color: string
) {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fillColor(color)
    .fill()
    .restore();
}

/** Draws a colored card (rounded rect) with optional border */
function drawCard(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  bgColor: string, borderColor?: string
) {
  doc.save();
  if (borderColor) {
    doc.roundedRect(x, y, w, h, 6)
      .fillColor(bgColor)
      .fill()
      .roundedRect(x, y, w, h, 6)
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();
  } else {
    doc.roundedRect(x, y, w, h, 6)
      .fillColor(bgColor)
      .fill();
  }
  doc.restore();
}

/** Draw a small info box for macros/TUT */
function drawInfoBox(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  value: string, label: string,
  bgColor: string, textColor: string
) {
  drawRoundedRect(doc, x, y, w, h, 4, bgColor);
  
  // Value (big number)
  doc.save()
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.macroNumber);
  const valW = doc.widthOfString(value);
  doc.text(value, x + (w - valW) / 2, y + 4);
  
  // Label (small text below)
  doc.font('Helvetica')
    .fontSize(FONT_SIZES.macroLabel)
    .fillColor(textColor);
  const lblW = doc.widthOfString(label);
  doc.text(label, x + (w - lblW) / 2, y + 22);
  
  doc.restore();
}

/** Ferifies we have space, adds a new page if needed */
function checkSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

// ─── SECTION BUILDERS ─────────────────────────────────────────────────────

/** Client header: photo + name + sex/age */
function buildClientHeader(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = startY;
  const photoSize = 70;
  
  // Photo
  if (data.client.photoBuffer) {
    try {
      doc.image(data.client.photoBuffer, MARGIN, y, { width: photoSize, height: photoSize });
    } catch {
      // If image fails, draw placeholder
      drawRoundedRect(doc, MARGIN, y, photoSize, photoSize, 35, COLORS.blue);
      doc.save()
        .fillColor(COLORS.white)
        .font('Helvetica-Bold')
        .fontSize(28);
      const initial = data.client.name.charAt(0).toUpperCase();
      const iw = doc.widthOfString(initial);
      doc.text(initial, MARGIN + (photoSize - iw) / 2, y + 18);
      doc.restore();
    }
  } else {
    // Placeholder circle with initial
    drawRoundedRect(doc, MARGIN, y, photoSize, photoSize, 35, COLORS.blue);
    doc.save()
      .fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(28);
    const initial = data.client.name.charAt(0).toUpperCase();
    const iw = doc.widthOfString(initial);
    doc.text(initial, MARGIN + (photoSize - iw) / 2, y + 18);
    doc.restore();
  }
  
  // Name (dark blue, large, bold)
  const textX = MARGIN + photoSize + 20;
  const nameY = y + 5;
  doc.save()
    .fillColor(COLORS.darkBlue)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.clientName);
  
  // Handle long names by truncating
  let displayName = data.client.name;
  if (doc.widthOfString(displayName) > USABLE_WIDTH - photoSize - 20) {
    while (doc.widthOfString(displayName + '…') > USABLE_WIDTH - photoSize - 20 && displayName.length > 5) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '…';
  }
  doc.text(displayName, textX, nameY);
  doc.restore();
  
  // Sex, Age (lighter blue)
  const subY = nameY + 32;
  const subParts: string[] = [];
  if (data.client.sex) subParts.push(data.client.sex);
  if (data.client.age) subParts.push(`${data.client.age} años`);
  const subText = subParts.join('  |  ');
  
  if (subText) {
    doc.save()
      .fillColor(COLORS.lightBlue)
      .font('Helvetica')
      .fontSize(FONT_SIZES.clientSub)
      .text(subText, textX, subY)
      .restore();
  }
  
  // Return bottom of the header area
  const bottomY = Math.max(y + photoSize, nameY + 32 + (subText ? 20 : 0) + 15);
  return bottomY;
}

/** Summary section */
function buildSummarySection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 60);
  
  // Title with decorative element
  doc.save()
    .fillColor(COLORS.blue)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.sectionTitle);
  
  const title = 'Resumen de la situación actual';
  doc.text(title, MARGIN, y);
  y += doc.currentLineHeight() + 8;
  doc.restore();
  
  // Body text - justified
  if (data.session.summary) {
    y = drawJustifiedText(doc, data.session.summary, MARGIN, y, USABLE_WIDTH, FONT_SIZES.body);
    y += 10;
  }
  
  return y;
}

/** Vision section */
function buildVisionSection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 60);
  
  doc.save()
    .fillColor(COLORS.blue)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.sectionTitle);
  doc.text('Visión para los próximos meses', MARGIN, y);
  y += doc.currentLineHeight() + 8;
  doc.restore();
  
  if (data.session.vision) {
    y = drawJustifiedText(doc, data.session.vision, MARGIN, y, USABLE_WIDTH, FONT_SIZES.body);
    y += 15;
  }
  
  return y;
}

/** Medical Analysis section */
function buildMedicalAnalysisSection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 60);
  const hasMedical = data.session.medicalSummary || data.session.medicalComparativeAnalysis;
  if (!hasMedical) return y;

  // Banner rojo para análisis médico
  doc.save();
  drawRect(doc, MARGIN, y, USABLE_WIDTH, 28, '#C62828');
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle);
  doc.text('Análisis de documentos médicos', MARGIN + 10, y + 6);
  y += 34;
  doc.restore();

  if (data.session.medicalSummary) {
    doc.save().fillColor('#C62828').font('Helvetica-Bold').fontSize(FONT_SIZES.body + 1);
    doc.text('Resumen de hallazgos clínicos', MARGIN, y);
    y += doc.currentLineHeight() + 8;
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(FONT_SIZES.body);
    y = drawJustifiedText(doc, data.session.medicalSummary, MARGIN, y, USABLE_WIDTH, FONT_SIZES.body);
    y += 12;
    doc.restore();
  }

  if (data.session.medicalComparativeAnalysis) {
    y = checkSpace(doc, y, 20);
    doc.save().fillColor('#C62828').font('Helvetica-Bold').fontSize(FONT_SIZES.body + 1);
    doc.text('Análisis comparativo entre documentos', MARGIN, y);
    y += doc.currentLineHeight() + 8;
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(FONT_SIZES.body);
    y = drawJustifiedText(doc, data.session.medicalComparativeAnalysis, MARGIN, y, USABLE_WIDTH, FONT_SIZES.body);
    y += 12;
    doc.restore();
  }

  // Disclaimer
  y = checkSpace(doc, y, 20);
  doc.save()
    .fillColor(COLORS.darkGray)
    .font('Helvetica-Oblique')
    .fontSize(8);
  const disclaimer = '⚠️ Las presentes recomendaciones no son un substituto a las consultas médicas profesionales. Consultar con un médico y/o profesional de la salud de confianza previamente.';
  drawRect(doc, MARGIN, y, USABLE_WIDTH, 28, '#FFF8E1');
  doc.fillColor(COLORS.darkGray);
  doc.text(disclaimer, MARGIN + 10, y + 8, { width: USABLE_WIDTH - 20, align: 'center' });
  y += 34;
  doc.restore();

  return y;
}

/** Build a single recipe card within a day+meal */
function buildRecipeCard(
  doc: PDFKit.PDFDocument,
  recipe: PDFRecipeData,
  x: number,
  startY: number,
  cardWidth: number
): number {
  let y = startY;
  const pad = 10;
  
  // Card background
  drawCard(doc, x, y, cardWidth, 1000, COLORS.greenBg); // height will be determined
  const innerX = x + pad;
  const innerW = cardWidth - 2 * pad;
  
  // Image
  let imageHeight = 0;
  if (recipe.imageBuffer) {
    try {
      const imgW = innerW;
      const imgH = 120;
      doc.image(recipe.imageBuffer, innerX, y + pad, { width: imgW, height: imgH });
      imageHeight = imgH + pad;
    } catch {
      imageHeight = 0;
    }
  }
  
  y += pad + imageHeight;
  
  // Title
  doc.save()
    .fillColor(COLORS.darkGreen)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.recipeTitle);
  const titleText = recipe.title;
  doc.text(titleText, innerX, y);
  y += doc.currentLineHeight() + 6;
  doc.restore();
  
  // Divider
  drawLine(doc, y, COLORS.green, innerW);
  y += 8;
  
  // Macros + cookTime in a row
  const boxH = 36;
  const boxGap = 6;
  const numBoxes = 4; // time, fat, carbs, calories
  const boxW = (innerW - boxGap * (numBoxes - 1)) / numBoxes;
  
  // Cook time
  const cookTimeStr = recipe.cookTime ? `${recipe.cookTime}` : '—';
  drawInfoBox(doc, innerX, y, boxW, boxH, cookTimeStr, 'mins', COLORS.white, COLORS.darkGreen);
  
  // Fat
  const fatStr = recipe.macros.fat !== undefined ? `${Math.round(recipe.macros.fat)}g` : '—';
  drawInfoBox(doc, innerX + boxW + boxGap, y, boxW, boxH, fatStr, 'grasas', COLORS.white, COLORS.darkGreen);
  
  // Carbs
  const carbsStr = recipe.macros.carbs !== undefined ? `${Math.round(recipe.macros.carbs)}g` : '—';
  drawInfoBox(doc, innerX + 2 * (boxW + boxGap), y, boxW, boxH, carbsStr, 'carbohidratos', COLORS.white, COLORS.darkGreen);
  
  // Calories
  const calStr = recipe.macros.calories !== undefined ? `${Math.round(recipe.macros.calories)}` : '—';
  drawInfoBox(doc, innerX + 3 * (boxW + boxGap), y, boxW, boxH, calStr, 'calorías', COLORS.white, COLORS.darkGreen);
  
  y += boxH + 10;
  
  // Two columns: Ingredients | Steps
  const colW = (innerW - 15) / 2;
  const colGap = 15;
  
  // Column 1: Ingredients
  doc.save()
    .fillColor(COLORS.darkGreen)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.subTitle);
  doc.text('Ingredientes', innerX, y);
  y += doc.currentLineHeight() + 4;
  
  doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.text);
  const ingredients = recipe.ingredients || [];
  for (const ing of ingredients) {
    const ingText = `• ${ing}`;
    const lines = wordWrap(ingText, doc, colW);
    for (const line of lines) {
      doc.text(line, innerX, y);
      y += 11;
    }
  }
  doc.restore();
  
  // Column 2: Instructions
  let instrY = startY + pad + imageHeight + doc.currentLineHeight() + 4;
  doc.save()
    .fillColor(COLORS.darkGreen)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.subTitle);
  const intsrTitle = 'Preparación';
  doc.text(intsrTitle, innerX + colW + colGap, instrY);
  instrY += doc.currentLineHeight() + 4;
  
  doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.text);
  const instructions = recipe.instructions || [];
  for (let i = 0; i < instructions.length; i++) {
    const stepText = `${i + 1}. ${instructions[i]}`;
    const lines = wordWrap(stepText, doc, colW);
    for (const line of lines) {
      doc.text(line, innerX + colW + colGap, instrY);
      instrY += 11;
    }
  }
  doc.restore();
  
  // Return the lower of the two columns
  const finalY = Math.max(y, instrY) + 5;
  return finalY;
}

/** Nutrition plan section */
function buildNutritionPlan(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 80);
  
  // Green banner
  y = drawBanner(doc, y, 'Plan Nutricional', COLORS.green);
  
  // Group checklist items by weekNumber, then organize by day
  // We have `data.weeks` with week info. For the PDF, we'll use weeks data.
  // Actually, the user wants "Lunes, Martes..." structure. The checklist items
  // have weekNumber but not dayOfWeek. Let's use a simplified approach:
  // Show each week's nutrition items organized by meal type.
  
  for (const week of data.weeks) {
    y = checkSpace(doc, y, 40);
    
    // Week header
    doc.save()
      .fillColor(COLORS.darkGreen)
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZES.sectionTitle);
    doc.text(`Semana ${week.weekNumber}`, MARGIN, y);
    y += doc.currentLineHeight() + 4;
    doc.restore();
    
    // Nutrition focus
    if (week.nutrition.focus) {
      doc.save()
        .fillColor(COLORS.darkGray)
        .font('Helvetica-Oblique')
        .fontSize(FONT_SIZES.body);
      doc.text(`Enfoque: ${week.nutrition.focus}`, MARGIN, y);
      y += doc.currentLineHeight() + 8;
      doc.restore();
    }
    
    // Get checklist items for this week's nutrition
    const weekItems = data.checklist.filter(
      item => item.weekNumber === week.weekNumber && item.category === 'nutrition'
    );
    
    if (weekItems.length === 0) {
      doc.save()
        .fillColor(COLORS.darkGray)
        .font('Helvetica')
        .fontSize(FONT_SIZES.body);
      doc.text('No hay items nutricionales para esta semana.', MARGIN, y);
      y += doc.currentLineHeight() + 10;
      doc.restore();
      continue;
    }
    
    // Group items by meal type (breakfast, lunch, dinner) based on description or type
    const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealLabels: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Snack',
    };
    
    for (const mealType of mealOrder) {
      const mealItems = weekItems.filter(
        item => (item.type || '').toLowerCase() === mealType
      );
      if (mealItems.length === 0) continue;
      
      y = checkSpace(doc, y, 30);
      
      // Meal label in bold
      doc.save()
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(FONT_SIZES.subTitle);
      doc.text(mealLabels[mealType] || mealType, MARGIN, y);
      y += doc.currentLineHeight() + 6;
      doc.restore();
      
      for (const item of mealItems) {
        y = checkSpace(doc, y, 200);
        
        let recipe: PDFRecipeData | undefined;
        
        // Try to find recipe by recipeId
        if (item.recipeId && data.recipes[item.recipeId]) {
          recipe = data.recipes[item.recipeId];
        }
        // Try by matching description with recipe title
        else {
          const match = Object.values(data.recipes).find(
            r => r.title.toLowerCase().includes(item.description.toLowerCase()) ||
                 item.description.toLowerCase().includes(r.title.toLowerCase())
          );
          if (match) recipe = match;
        }
        
        if (recipe) {
          const cardStartY = y;
          y = buildRecipeCard(doc, recipe, MARGIN, y, USABLE_WIDTH);
          y += 12;
        } else {
          // Fallback: show item description and inline recipe details
          drawCard(doc, MARGIN, y, USABLE_WIDTH, 50, COLORS.greenBg);
          
          doc.save()
            .fillColor(COLORS.darkGreen)
            .font('Helvetica-Bold')
            .fontSize(FONT_SIZES.body + 1);
          doc.text(item.description, MARGIN + 10, y + 8);
          y += doc.currentLineHeight() + 10;
          doc.restore();
          
          if (item.details?.recipe) {
            const r = item.details.recipe;
            // Macros inline
            if (item.details.macros || item.details.calories) {
              doc.save()
                .font('Helvetica')
                .fontSize(FONT_SIZES.small)
                .fillColor(COLORS.darkGray);
              const macros = item.details.macros;
              const parts: string[] = [];
              if (macros?.fat) parts.push(`Grasas: ${macros.fat}`);
              if (macros?.carbs) parts.push(`Carbohidratos: ${macros.carbs}`);
              if (item.details.calories) parts.push(`Calorías: ${item.details.calories}`);
              doc.text(parts.join('  |  '), MARGIN + 10, y);
              y += doc.currentLineHeight() + 6;
              doc.restore();
            }
            
            // Preparation
            if (r.preparation) {
              doc.save()
                .font('Helvetica')
                .fontSize(FONT_SIZES.small)
                .fillColor(COLORS.text);
              const prepLines = wordWrap(r.preparation, doc, USABLE_WIDTH - 20);
              for (const line of prepLines) {
                doc.text(line, MARGIN + 10, y);
                y += 11;
              }
              doc.restore();
            }
          }
          y += 10;
        }
      }
    }
    
    y += 10; // space between weeks
  }
  
  return y;
}

/** Shopping list section — hoja dedicada */
function buildShoppingListSection(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  // Recopilar TODOS los items de compras de todas las semanas
  const allItems: Array<{ item: string; quantity: string; }> = [];
  for (const week of data.weeks) {
    if (week.nutrition.shoppingList) {
      for (const si of week.nutrition.shoppingList) {
        allItems.push({ item: si.item, quantity: si.quantity });
      }
    }
  }
  if (allItems.length === 0) return startY;

  let y = checkSpace(doc, startY, 80);
  
  // Banner
  y = drawBanner(doc, y, 'Lista de compras semanal', COLORS.darkGreen);

  // Subtítulo
  doc.save()
    .fillColor(COLORS.darkGray)
    .font('Helvetica-Oblique')
    .fontSize(FONT_SIZES.small)
    .text('Usa esta lista como guía para tu visita al supermercado.', MARGIN, y);
  y += doc.currentLineHeight() + 14;
  doc.restore();

  // Tabla de compras
  for (const item of allItems) {
    y = checkSpace(doc, y, 14);
    doc.save()
      .fillColor(COLORS.text)
      .font('Helvetica')
      .fontSize(FONT_SIZES.body);
    
    const label = `${item.item}`;
    const qty = `${item.quantity}`;
    const labelW = doc.widthOfString(label);
    const qtyW = doc.widthOfString(qty);
    const dotX = MARGIN + 8;
    
    doc.text(`•  ${label}`, dotX, y);
    doc.text(qty, PAGE_WIDTH - MARGIN - qtyW, y);
    y += 14;
    doc.restore();
  }

  return y + 10;
}

/** Exercise plan section */
function buildExercisePlan(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 80);
  
  // Blue banner
  y = drawBanner(doc, y, 'Plan de Ejercicios', COLORS.exerciseBlue);
  
  // Group exercises by week
  for (const week of data.weeks) {
    y = checkSpace(doc, y, 40);
    
    doc.save()
      .fillColor(COLORS.exerciseBlue)
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZES.sectionTitle);
    doc.text(`Semana ${week.weekNumber}`, MARGIN, y);
    y += doc.currentLineHeight() + 4;
    
    if (week.exercise.focus) {
      doc.font('Helvetica-Oblique').fontSize(FONT_SIZES.body).fillColor(COLORS.darkGray);
      doc.text(`Enfoque: ${week.exercise.focus}`, MARGIN, y);
      y += doc.currentLineHeight() + 8;
    }
    doc.restore();
    
    const weekExercises = data.checklist.filter(
      item => item.weekNumber === week.weekNumber && item.category === 'exercise'
    );
    
    if (weekExercises.length === 0) {
      doc.save()
        .fillColor(COLORS.darkGray)
        .font('Helvetica')
        .fontSize(FONT_SIZES.body);
      doc.text('No hay ejercicios programados para esta semana.', MARGIN, y);
      y += doc.currentLineHeight() + 10;
      doc.restore();
      continue;
    }
    
    for (const item of weekExercises) {
      y = checkSpace(doc, y, 150);
      
      // Find full exercise data
      let exercise: PDFExerciseData | undefined;
      const match = Object.values(data.exercises).find(
        ex => ex.name.toLowerCase().includes(item.description.toLowerCase()) ||
              item.description.toLowerCase().includes(ex.name.toLowerCase())
      );
      if (match) exercise = match;
      
      // Exercise card (light blue bg)
      const cardPad = 10;
      const cardX = MARGIN;
      const cardStartY = y;
      
      // We'll draw the card after measuring content
      let contentY = y + cardPad;
      
      // Demo image / GIF static
      let imgW = 0;
      if (exercise?.demoBuffer) {
        try {
          const demoW = 100;
          const demoH = 80;
          doc.image(exercise.demoBuffer, cardX + cardPad, contentY, { width: demoW, height: demoH });
          imgW = demoW + cardPad;
          contentY += demoH + 5;
        } catch {
          imgW = 0;
        }
      }
      
      // Title
      const titleX = cardX + cardPad + (exercise?.demoBuffer ? imgW : 0);
      const titleW = USABLE_WIDTH - 2 * cardPad - (exercise?.demoBuffer ? imgW : 0);
      
      doc.save()
        .fillColor(COLORS.exerciseBlue)
        .font('Helvetica-Bold')
        .fontSize(FONT_SIZES.recipeTitle);
      const exTitle = exercise?.name || item.description;
      doc.text(exTitle, titleX > cardX + cardPad ? titleX : cardX + cardPad, y + cardPad);
      contentY = y + cardPad + doc.currentLineHeight() + 6;
      doc.restore();
      
      // TUT (Time Under Tension) boxes
      const tut = exercise?.timeUnderTension || item.details?.timeUnderTension;
      if (tut) {
        const phases = tut.split('-').filter(Boolean);
        const boxH = 30;
        const boxW = 35;
        const boxGap = 4;
        const tutX = titleX > cardX + cardPad ? titleX : cardX + cardPad;
        
        doc.save()
          .fillColor(COLORS.exerciseBlue)
          .font('Helvetica-Bold')
          .fontSize(FONT_SIZES.small);
        doc.text('TUT:', tutX, contentY);
        const tutLabelW = doc.widthOfString('TUT:');
        doc.restore();
        
        for (let i = 0; i < phases.length; i++) {
          const bx = tutX + tutLabelW + 8 + i * (boxW + boxGap);
          drawRoundedRect(doc, bx, contentY - 2, boxW, boxH, 3, COLORS.blueBg);
          
          doc.save()
            .fillColor(COLORS.exerciseBlue)
            .font('Helvetica-Bold')
            .fontSize(12);
          const valW = doc.widthOfString(phases[i]);
          doc.text(phases[i], bx + (boxW - valW) / 2, contentY + 2);
          
          doc.font('Helvetica').fontSize(6).fillColor(COLORS.darkGray);
          const phaseLabels = ['excéntrica', 'pausa', 'concéntrica'];
          const phaseLabel = phaseLabels[i] || '';
          const plW = doc.widthOfString(phaseLabel);
          doc.text(phaseLabel, bx + (boxW - plW) / 2, contentY + 16);
          doc.restore();
        }
        contentY += boxH + 8;
      }
      
      // Sets + Reps in a row
      const sets = exercise?.sets || item.details?.sets || 3;
      const reps = exercise?.repetitions || item.details?.repetitions || '—';
      
      const dataX = cardX + cardPad;
      doc.save()
        .fillColor(COLORS.text)
        .font('Helvetica')
        .fontSize(FONT_SIZES.small);
      doc.text(`Series: ${sets}    Repeticiones: ${reps}`, dataX, contentY);
      contentY += doc.currentLineHeight() + 4;
      doc.restore();
      
      // Equipment
      const equip = exercise?.equipment || item.details?.equipment || [];
      if (equip.length > 0) {
        doc.save()
          .fillColor(COLORS.darkGray)
          .font('Helvetica')
          .fontSize(FONT_SIZES.small);
        doc.text(`Equipo: ${equip.join(', ')}`, dataX, contentY);
        contentY += doc.currentLineHeight() + 4;
        doc.restore();
      }
      
      // Instructions
      const instr = exercise?.instructions || [];
      if (instr.length > 0) {
        doc.save()
          .fillColor(COLORS.text)
          .font('Helvetica')
          .fontSize(FONT_SIZES.small);
        const instrText = instr.join(' ');
        const instrLines = wordWrap(instrText, doc, USABLE_WIDTH - 2 * cardPad);
        for (const line of instrLines) {
          doc.text(line, cardX + cardPad, contentY);
          contentY += 10;
        }
        doc.restore();
      }
      
      contentY += cardPad;
      
      // Draw the card background
      const cardH = contentY - cardStartY;
      drawCard(doc, cardX, cardStartY, USABLE_WIDTH, cardH, COLORS.blueBg, COLORS.exerciseBlue);
      
      y = cardStartY + cardH + 12;
    }
    
    // Equipment list
    if (week.exercise.equipment && week.exercise.equipment.length > 0) {
      y = checkSpace(doc, y, 20);
      doc.save()
        .fillColor(COLORS.darkGray)
        .font('Helvetica-Oblique')
        .fontSize(FONT_SIZES.small);
      doc.text(`Equipo necesario: ${week.exercise.equipment.join(', ')}`, MARGIN, y);
      y += doc.currentLineHeight() + 10;
      doc.restore();
    }
    
    y += 5;
  }
  
  // YouTube tutorial suggestion
  y = checkSpace(doc, y, 60);
  const tutBoxY = y;
  const tutBoxH = 55;
  drawCard(doc, MARGIN, y, USABLE_WIDTH, tutBoxH, COLORS.blueBg, COLORS.exerciseBlue);
  
  doc.save()
    .fillColor(COLORS.exerciseBlue)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.body);
  doc.text('📺 Tutoriales en YouTube', MARGIN + 12, y + 8);
  
  doc.font('Helvetica')
    .fontSize(FONT_SIZES.small)
    .fillColor(COLORS.text);
  const tutMsg = 'Las imágenes en este PDF son estáticas. Para ver el movimiento completo y la técnica correcta de cada ejercicio, te recomendamos buscar el nombre del ejercicio en YouTube. Así podrás ejecutarlos de forma segura y efectiva.';
  const tutLines = wordWrap(tutMsg, doc, USABLE_WIDTH - 24);
  let tutY = y + 26;
  for (const line of tutLines) {
    doc.text(line, MARGIN + 12, tutY);
    tutY += 11;
  }
  doc.restore();
  
  y = tutBoxY + tutBoxH + 15;
  
  return y;
}

/** Habits section */
function buildHabits(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 80);
  
  // Purple banner
  y = drawBanner(doc, y, 'Plan de Hábitos', COLORS.purple);
  
  // Separate checklist items into toAdopt and toEliminate
  const habitItems = data.checklist.filter(item => item.category === 'habit');
  const toAdopt = habitItems.filter(item => item.type === 'toAdopt' || !item.type);
  const toEliminate = habitItems.filter(item => item.type === 'toEliminate');
  
  // Two columns
  const colW = (USABLE_WIDTH - 20) / 2;
  
  if (toAdopt.length > 0 || data.habitData?.toAdopt?.length) {
    y = checkSpace(doc, y, 30);
    
    // Column 1: Hábitos a implementar
    doc.save()
      .fillColor(COLORS.darkPurple)
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZES.subTitle);
    doc.text('Hábitos a implementar', MARGIN, y);
    y += doc.currentLineHeight() + 8;
    
    doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
    
    const habits = toAdopt.length > 0
      ? toAdopt.map(item => item.description)
      : (data.habitData?.toAdopt || []);
    
    for (const habit of habits) {
      const lines = wordWrap(`• ${habit}`, doc, colW);
      for (const line of lines) {
        doc.text(line, MARGIN + 5, y);
        y += 12;
      }
    }
    doc.restore();
  }
  
  const col2StartY = startY + 30; // align columns
  
  if (toEliminate.length > 0 || data.habitData?.toEliminate?.length) {
    // Column 2: Hábitos a abandonar
    doc.save()
      .fillColor(COLORS.darkPurple)
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZES.subTitle);
    doc.text('Hábitos a abandonar', MARGIN + colW + 20, col2StartY);
    
    doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
    
    const habits = toEliminate.length > 0
      ? toEliminate.map(item => item.description)
      : (data.habitData?.toEliminate || []);
    
    let hY = col2StartY + doc.currentLineHeight() + 8;
    for (const habit of habits) {
      const lines = wordWrap(`• ${habit}`, doc, colW);
      for (const line of lines) {
        doc.text(line, MARGIN + colW + 25, hY);
        hY += 12;
      }
    }
    doc.restore();
    
    y = Math.max(y, hY);
  }
  
  y += 10;
  
  // Motivation tip
  const tip = data.habitData?.motivationTip || 
    data.weeks.find(w => w.habits.motivationTip)?.habits.motivationTip;
  if (tip) {
    y = checkSpace(doc, y, 30);
    drawCard(doc, MARGIN, y, USABLE_WIDTH, 40, COLORS.purpleBg);
    
    doc.save()
      .fillColor(COLORS.darkPurple)
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZES.body);
    doc.text('💡 Consejo motivacional:', MARGIN + 10, y + 8);
    
    doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.text);
    const tipLines = wordWrap(tip, doc, USABLE_WIDTH - 30);
    let tipY = y + 26;
    for (const line of tipLines) {
      doc.text(line, MARGIN + 10, tipY);
      tipY += 11;
    }
    doc.restore();
    
    y += Math.max(40, tipY - y + 5);
  }
  
  // Tracking method
  const tracking = data.habitData?.trackingMethod ||
    data.weeks.find(w => w.habits.trackingMethod)?.habits.trackingMethod;
  if (tracking) {
    y += 8;
    doc.save()
      .fillColor(COLORS.darkPurple)
      .font('Helvetica')
      .fontSize(FONT_SIZES.small);
    doc.text(`Método de seguimiento: ${tracking}`, MARGIN, y);
    y += doc.currentLineHeight() + 5;
    doc.restore();
  }
  
  return y;
}

/** Tips list */
function buildTips(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 30);
  
  // Collect tips from checklist items' details
  const allTips: string[] = [];
  
  for (const item of data.checklist) {
    if (item.details?.recipe?.tips && !allTips.includes(item.details.recipe.tips)) {
      allTips.push(item.details.recipe.tips);
    }
  }
  
  // Also from habitData
  if (data.habitData?.tips) {
    for (const tip of data.habitData.tips) {
      if (!allTips.includes(tip)) allTips.push(tip);
    }
  }
  
  if (allTips.length === 0) return y;
  
  doc.save()
    .fillColor(COLORS.text)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.subTitle);
  doc.text('Tips y recomendaciones', MARGIN, y);
  y += doc.currentLineHeight() + 8;
  
  doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
  for (const tip of allTips) {
    const lines = wordWrap(`• ${tip}`, doc, USABLE_WIDTH);
    for (const line of lines) {
      doc.text(line, MARGIN, y);
      y += 13;
    }
  }
  doc.restore();
  
  y += 10;
  return y;
}

/** Motivational message */
function buildMotivationMessage(doc: PDFKit.PDFDocument, startY: number): number {
  let y = checkSpace(doc, startY, 80);
  
  y += 20;
  
  // Decorative top line
  drawLine(doc, y, COLORS.green, 150);
  y += 10;
  
  const message = 'El verdadero potencial de tu cuerpo está esperando ser descubierto. Cada pequeño paso que das hoy te acerca más a la mejor versión de ti mismo. Confía en el proceso, mantén la constancia y permítete transformar tu vida. ¡Tú puedes lograrlo!';
  
  doc.save()
    .fillColor(COLORS.darkBlue)
    .font('Helvetica-Oblique')
    .fontSize(FONT_SIZES.body + 2);
  
  const msgLines = wordWrap(message, doc, USABLE_WIDTH);
  for (const line of msgLines) {
    doc.text(line, MARGIN, y);
    y += 18;
  }
  doc.restore();
  
  // Decorative bottom line
  drawLine(doc, y, COLORS.green, 150);
  y += 10;
  
  return y;
}

/** Coach info section */
function buildCoachInfo(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 80);
  
  y += 10;
  
  // Coach card with green background
  const cardH = 110;
  drawCard(doc, MARGIN, y, USABLE_WIDTH, cardH, COLORS.greenBg, COLORS.green);
  
  const innerX = MARGIN + 15;
  let innerY = y + 15;
  
  // Coach photo
  const photoSize = 50;
  if (data.coach.photoBuffer) {
    try {
      doc.image(data.coach.photoBuffer, innerX, innerY, { width: photoSize, height: photoSize });
    } catch {
      drawRoundedRect(doc, innerX, innerY, photoSize, photoSize, 25, COLORS.green);
      doc.save()
        .fillColor(COLORS.white)
        .font('Helvetica-Bold')
        .fontSize(20);
      const init = data.coach.name.charAt(0).toUpperCase();
      const initW = doc.widthOfString(init);
      doc.text(init, innerX + (photoSize - initW) / 2, innerY + 14);
      doc.restore();
    }
  } else {
    drawRoundedRect(doc, innerX, innerY, photoSize, photoSize, 25, COLORS.green);
    doc.save()
      .fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(20);
    const init = data.coach.name.charAt(0).toUpperCase();
    const initW = doc.widthOfString(init);
    doc.text(init, innerX + (photoSize - initW) / 2, innerY + 14);
    doc.restore();
  }
  
  // Coach details
  const detailX = innerX + photoSize + 15;
  doc.save()
    .fillColor(COLORS.darkGreen)
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZES.coachName);
  doc.text(data.coach.name, detailX, innerY + 2);
  
  doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.darkGreen);
  doc.text(`Email: ${data.coach.email}`, detailX, innerY + 25);
  
  if (data.coach.phone) {
    doc.text(`Teléfono: ${data.coach.phone}`, detailX, innerY + 42);
  }
  doc.restore();
  
  y += cardH + 15;
  return y;
}

/** Footer */
function buildFooter(doc: PDFKit.PDFDocument, data: PDFRecommendationData, startY: number): number {
  let y = checkSpace(doc, startY, 100);
  
  // Dark footer background
  const footerH = 120;
  drawRect(doc, MARGIN, y, USABLE_WIDTH, footerH, COLORS.footer);
  
  const fX = MARGIN;
  doc.save()
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(11);
  doc.text('NELHEALTHCOACH', fX + 15, y + 12);
  
  doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.7)');
  doc.text('Ayudándote a descubrir el verdadero potencial de tu cuerpo.', fX + 15, y + 28);
  
  const year = data.currentYear || new Date().getFullYear();
  
  if (data.websiteUrl) {
    doc.fontSize(7).fillColor('rgba(255,255,255,0.5)');
    doc.text(`Sitio web: ${data.websiteUrl}`, fX + 15, y + 44);
  }
  
  doc.fontSize(7).fillColor('rgba(255,255,255,0.5)');
  doc.text('33450 Shifting Sands Trail, Cathedral City, CA 92234 (USA)', fX + 15, y + 56);
  
  const contactText = `Email: ${data.coach.email} | Tel: ${data.coach.phone || '+1 (442) 342-5050'}`;
  doc.text(contactText, fX + 15, y + 68);
  
  doc.fontSize(7).fillColor('rgba(255,255,255,0.6)');
  doc.text(`© ${year} NELHEALTHCOACH, LLC. Todos los derechos reservados.`, fX + 15, y + 84);
  doc.restore();
  
  y += footerH + 10;
  return y;
}

// ─── MAIN GENERATOR ───────────────────────────────────────────────────────

/**
 * Genera el PDF completo de recomendaciones de salud.
 * Devuelve un Buffer del PDF generado.
 */
export async function generateRecommendationPDF(data: PDFRecommendationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: MARGIN, bottom: MARGIN + 30, left: MARGIN, right: MARGIN },
        info: {
          Title: 'Recomendaciones de Salud - NELHEALTHCOACH',
          Author: data.coach.name,
          Subject: `Plan de salud para ${data.client.name}`,
        },
      });
      
      // Disclaimer en el pie de cada página
      const drawDisclaimer = () => {
        doc.save();
        doc.fontSize(7).fillColor(COLORS.darkGray).font('Helvetica-Oblique');
        doc.text(
          'Las presentes recomendaciones no son un substituto a las consultas médicas profesionales. Consultar con un médico y/o profesional de la salud de confianza previamente.',
          MARGIN, doc.page.height - 55,
          { width: USABLE_WIDTH, align: 'center' }
        );
        doc.restore();
      };
      doc.on('pageAdded', drawDisclaimer);
      
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      // Disclaimer en primera página
      drawDisclaimer();
      
      let y = MARGIN;
      
      // === CLIENT HEADER ===
      y = buildClientHeader(doc, data, y);
      
      // === BLUE DIVIDER ===
      drawLine(doc, y, COLORS.blue);
      y += 20;
      
      // === SUMMARY ===
      y = buildSummarySection(doc, data, y);
      
      // === VISION ===
      y = buildVisionSection(doc, data, y);
      
      // === MEDICAL ANALYSIS ===
      y = buildMedicalAnalysisSection(doc, data, y);
      
      // === NUTRITION PLAN ===
      y = buildNutritionPlan(doc, data, y + 10);
      
      // === SHOPPING LIST ===
      y = buildShoppingListSection(doc, data, y + 15);
      
      // === EXERCISE PLAN ===
      y = buildExercisePlan(doc, data, y + 15);
      
      // === HABITS ===
      y = buildHabits(doc, data, y + 15);
      
      // === TIPS ===
      y = buildTips(doc, data, y + 10);
      
      // === MOTIVATIONAL MESSAGE ===
      y = buildMotivationMessage(doc, y + 10);
      
      // === COACH INFO ===
      y = buildCoachInfo(doc, data, y + 10);
      
      // === FOOTER ===
      buildFooter(doc, data, y + 10);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default generateRecommendationPDF;

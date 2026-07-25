/**
 * PDF Worker - runs in a separate child process to avoid Next.js async context issues.
 * Usage: node pdf-worker.mjs <input.json >output.pdf
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ─── Constants ───
const MARGIN = 85;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const COLORS = {
  text: '#333333',
  darkGray: '#666666',
  white: '#FFFFFF',
  blue: '#1565C0',
  blueBg: '#E3F2FD',
  exerciseBlue: '#0D47A1',
};

const FONT_SIZES = {
  bannerText: 16,
  sectionTitle: 14,
  body: 10,
  small: 8.5,
  recipeTitle: 11,
  macroNumber: 14,
  macroLabel: 7,
};

// ─── Helpers ───
function drawLine(doc, y, color, width) {
  doc.save().moveTo(MARGIN, y).lineTo(MARGIN + (width || USABLE_WIDTH), y)
    .strokeColor(color).lineWidth(1.5).stroke().restore();
}

function drawRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fillColor(color).fill().restore();
}

function drawBanner(doc, y, label, bgColor) {
  const bannerH = 40;
  drawRect(doc, MARGIN, y, USABLE_WIDTH, bannerH, bgColor);
  doc.save().fillColor(COLORS.white).font('Helvetica-Bold').fontSize(FONT_SIZES.bannerText);
  const textW = doc.widthOfString(label);
  doc.text(label, MARGIN + (USABLE_WIDTH - textW) / 2, y + (bannerH - doc.currentLineHeight()) / 2);
  doc.restore();
  return y + bannerH + 15;
}

function checkSpace(doc, y, needed) {
  if (y + needed > PAGE_HEIGHT - 80) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function wordWrap(text, doc, maxWidth) {
  const safeText = (text && text.length > 50000) ? text.substring(0, 50000) + '...' : (text || '');
  const words = safeText.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (doc.widthOfString(testLine) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawJustifiedText(doc, text, x, y, maxWidth, fontSize, lineHeight) {
  const lh = lineHeight || fontSize * 1.5;
  doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.text);
  const lines = wordWrap(text, doc, maxWidth);
  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1;
    if (isLast || lines[i].split(' ').length <= 1) {
      doc.text(lines[i], x, y);
    } else {
      const words = lines[i].split(' ');
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

function drawRoundedRect(doc, x, y, w, h, r, color) {
  doc.save().roundedRect(x, y, w, h, r).fillColor(color).fill().restore();
}

function buildClientHeader(doc, data, y) {
  y = checkSpace(doc, y, 100);
  if (data.client.photoBuffer) {
    try {
      doc.image(data.client.photoBuffer, MARGIN, y, { width: 70, height: 70 });
    } catch (e) {}
  }
  const textX = data.client.photoBuffer ? MARGIN + 85 : MARGIN;
  doc.save().fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(FONT_SIZES.bannerText);
  doc.text(data.client.name || 'Cliente', textX, y + 5);
  doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.darkGray);
  const infoParts = [];
  if (data.client.sex) infoParts.push(data.client.sex);
  if (data.client.age) infoParts.push(data.client.age + ' años');
  doc.text(infoParts.join(' | '), textX, y + 30);
  doc.restore();
  return y + 80;
}

// ─── Read input ───
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const json = Buffer.concat(chunks).toString();
    const data = JSON.parse(json);
    
    // Reconstruct Buffer objects (serialized as {type:'Buffer', data:[...]} or base64 strings)
    function reconstructBuffers(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
        return Buffer.from(obj.data);
      }
      // Handle base64 string marked as photo buffers
      for (const key of Object.keys(obj)) {
        obj[key] = reconstructBuffers(obj[key]);
      }
      return obj;
    }
    
    const parsed = reconstructBuffers(data);
    generatePDF(parsed);
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message, stack: e.stack }));
    process.exit(1);
  }
});

// ─── Main Generator ───
function generatePDF(data) {
  try {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: MARGIN, bottom: MARGIN + 30, left: MARGIN, right: MARGIN },
      info: { Title: 'Recomendaciones de Salud - NELHEALTHCOACH' },
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      process.stdout.write(Buffer.concat(buffers));
      process.exit(0);
    });
    doc.on('error', (e) => {
      process.stderr.write(JSON.stringify({ error: e.message }));
      process.exit(1);
    });

    // Page footer disclaimer
    const drawDisclaimer = () => {
      doc.save();
      doc.fontSize(7).fillColor(COLORS.darkGray).font('Helvetica-Oblique');
      doc.text('Las presentes recomendaciones no son un substituto a las consultas médicas profesionales.', MARGIN, doc.page.height - 55, { width: USABLE_WIDTH, align: 'center' });
      doc.restore();
    };
    doc.on('pageAdded', drawDisclaimer);
    drawDisclaimer();

    let y = MARGIN;

    // CLIENT HEADER
    y = buildClientHeader(doc, data, y);
    drawLine(doc, y, COLORS.blue);
    y += 20;

    // SUMMARY
    if (data.session.summary) {
      y = checkSpace(doc, y, 40);
      doc.save().fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle);
      doc.text('Resumen', MARGIN, y);
      y += doc.currentLineHeight() + 6;
      doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      y = drawJustifiedText(doc, data.session.summary, MARGIN, y, USABLE_WIDTH, FONT_SIZES.body);
      y += 12;
      doc.restore();
    }

    // VISION
    if (data.session.vision) {
      y = checkSpace(doc, y, 40);
      doc.save().fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle);
      doc.text('Visión', MARGIN, y);
      y += doc.currentLineHeight() + 6;
      doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      y = drawJustifiedText(doc, data.session.vision, MARGIN, y, USABLE_WIDTH, FONT_SIZES.body);
      y += 12;
      doc.restore();
    }

    // MEDICAL ANALYSIS
    if (data.session.structuredMedicalAnalysis && data.session.structuredMedicalAnalysis.exams && data.session.structuredMedicalAnalysis.exams.length > 0) {
      y = checkSpace(doc, y, 60);
      y = drawBanner(doc, y, 'Análisis de Documentos Médicos', '#C62828');

      const structured = data.session.structuredMedicalAnalysis;
      for (const exam of structured.exams || []) {
        if (exam.intro) {
          y = checkSpace(doc, y, 30);
          doc.save().fillColor(COLORS.text).font('Helvetica-Oblique').fontSize(FONT_SIZES.small);
          y = drawJustifiedText(doc, exam.intro, MARGIN, y, USABLE_WIDTH, FONT_SIZES.small);
          y += 8;
          doc.restore();
        }
        if (exam.analysis) {
          y = checkSpace(doc, y, 30);
          doc.save().fillColor(COLORS.text).font('Helvetica').fontSize(FONT_SIZES.small);
          doc.font('Helvetica-Bold').text('Análisis Clínico: ', MARGIN, y);
          const labelW = doc.widthOfString('Análisis Clínico: ');
          y = drawJustifiedText(doc, exam.analysis, MARGIN + labelW, y, USABLE_WIDTH - labelW, FONT_SIZES.small);
          y += 8;
          doc.restore();
        }
      }
    }

    // NUTRITION PLAN - simplified
    const nutritionItems = (data.checklist || []).filter(i => i.category === 'nutrition');
    if (nutritionItems.length > 0) {
      y = checkSpace(doc, y, 60);
      y = drawBanner(doc, y, 'Plan Nutricional', '#2E7D32');
      for (const item of nutritionItems) {
        y = checkSpace(doc, y, 30);
        doc.save().font('Helvetica-Bold').fontSize(FONT_SIZES.body).fillColor('#2E7D32');
        doc.text(`• ${item.description || 'Comida'}`, MARGIN, y);
        y += doc.currentLineHeight() + 4;
        doc.restore();
      }
    }

    // EXERCISE PLAN - simplified
    const exerciseItems = (data.checklist || []).filter(i => i.category === 'exercise');
    if (exerciseItems.length > 0) {
      y = checkSpace(doc, y, 60);
      y = drawBanner(doc, y, 'Plan de Ejercicios', COLORS.exerciseBlue);
      for (const item of exerciseItems) {
        y = checkSpace(doc, y, 30);
        doc.save().font('Helvetica-Bold').fontSize(FONT_SIZES.body).fillColor(COLORS.exerciseBlue);
        doc.text(`• ${item.description || 'Ejercicio'}`, MARGIN, y);
        y += doc.currentLineHeight() + 4;
        doc.restore();
      }
    }

    // HABITS
    const habitItems = (data.checklist || []).filter(i => i.category === 'habit');
    if (habitItems.length > 0) {
      y = checkSpace(doc, y, 60);
      y = drawBanner(doc, y, 'Hábitos', '#6A1B9A');
      for (const item of habitItems) {
        y = checkSpace(doc, y, 25);
        doc.save().font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
        doc.text(`• ${item.description || 'Hábito'}`, MARGIN, y);
        y += doc.currentLineHeight() + 4;
        doc.restore();
      }
    }

    // COACH INFO
    if (data.coach && data.coach.name) {
      y = checkSpace(doc, y, 60);
      drawLine(doc, y, COLORS.blue);
      y += 15;
      doc.save().font('Helvetica-Bold').fontSize(FONT_SIZES.sectionTitle).fillColor(COLORS.blue);
      doc.text('Tu Asesor', MARGIN, y);
      y += doc.currentLineHeight() + 6;
      doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      doc.text(data.coach.name, MARGIN, y);
      if (data.coach.email) {
        y += doc.currentLineHeight() + 2;
        doc.text(data.coach.email, MARGIN, y);
      }
      if (data.coach.phone) {
        y += doc.currentLineHeight() + 2;
        doc.text(data.coach.phone, MARGIN, y);
      }
      doc.restore();
    }

    doc.end();
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message, stack: e.stack }));
    process.exit(1);
  }
}

// apps/api/src/app/lib/finance-report-pdf.ts
// Generates PDF tax reports (Schedule C, Form 568, Quarterly Estimated Tax)
// Uses pdfkit with the same monkey-patch pattern as recommendation-pdf.ts

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── Monkey-patch fs.readFileSync for pdfkit .afm fonts ───

function resolveFontPath(fontName: string): string | null {
  const localPath = path.join(__dirname, 'pdf-fonts', fontName);
  if (fs.existsSync(localPath)) return localPath;

  const projectPath = path.join(process.cwd(), 'apps/api/src/app/lib/pdf-fonts', fontName);
  if (fs.existsSync(projectPath)) return projectPath;

  const nodeModulesPath = path.join(process.cwd(), 'node_modules/pdfkit/js/data', fontName);
  if (fs.existsSync(nodeModulesPath)) return nodeModulesPath;

  return null;
}

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function patchedReadFileSync(filePath: fs.PathOrFileDescriptor, options?: any) {
  if (typeof filePath === 'string' && filePath.endsWith('.afm')) {
    const fontName = path.basename(filePath);
    const resolved = resolveFontPath(fontName);
    if (resolved) return originalReadFileSync(resolved, 'utf8');
  }
  return originalReadFileSync(filePath, options);
} as typeof fs.readFileSync;

// ─── Constants ───

const MARGIN = 50;
const USABLE_WIDTH = 510; // Letter (612) - 2*50
const COLORS = {
  primary: '#1e1b4b',    // indigo-950
  secondary: '#3730a3',  // indigo-800
  accent: '#7c3aed',     // purple-600
  green: '#166534',      // green-800
  red: '#991b1b',        // red-800
  darkGray: '#6b7280',   // gray-500
  lightGray: '#f3f4f6',  // gray-100
  border: '#d1d5db',     // gray-300
};

// ─── Types ───

export interface PDFScheduleCData {
  type: 'schedule_c';
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  selfEmploymentTax: number;
  lines: Array<{ line: number; label: string; amount: number; items?: Array<{ description: string; amount: number }> }>;
}

export interface PDFForm568Data {
  type: 'form_568';
  year: number;
  totalIncome: number;
  totalDeductibleExpenses: number;
  netIncome: number;
  estimatedTaxableIncome: number;
  californiaLLCFee: { amount: number; amountDollars: number; tier: string };
}

export interface PDFQuarterlyData {
  type: 'quarterly';
  year: number;
  quarters: Array<{ quarter: string; income: number; expenses: number; netIncome: number; estimatedTax: number }>;
  totalNetYTD: number;
  totalEstimatedTaxYTD: number;
  notes: string[];
}

export type FinanceReportData = PDFScheduleCData | PDFForm568Data | PDFQuarterlyData;

// ─── Helpers ───

function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = `$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return cents < 0 ? `(${formatted})` : formatted;
}

function formatDollars(dollars: number): string {
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Drawing helpers ───

function drawLine(doc: PDFKit.PDFDocument, y: number, color: string = COLORS.border, width?: number) {
  doc.save();
  doc.moveTo(MARGIN, y)
    .lineTo(MARGIN + (width ?? USABLE_WIDTH), y)
    .strokeColor(color)
    .lineWidth(1)
    .stroke();
  doc.restore();
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string, y: number): number {
  // Company name
  doc.fontSize(18).fillColor(COLORS.primary).font('Helvetica-Bold');
  doc.text('NELHEALTHCOACH, LLC', MARGIN, y, { width: USABLE_WIDTH, align: 'left' });

  // Report title
  doc.fontSize(14).fillColor(COLORS.secondary).font('Helvetica');
  doc.text(title, MARGIN, y + 28, { width: USABLE_WIDTH, align: 'left' });

  // Subtitle
  doc.fontSize(10).fillColor(COLORS.darkGray);
  doc.text(subtitle, MARGIN, y + 48, { width: USABLE_WIDTH, align: 'left' });

  const headerEnd = y + 70;
  drawLine(doc, headerEnd);
  return headerEnd + 15;
}

function drawSectionHeader(doc: PDFKit.PDFDocument, text: string, y: number): number {
  doc.fontSize(12).fillColor(COLORS.accent).font('Helvetica-Bold');
  doc.text(text, MARGIN, y, { width: USABLE_WIDTH });
  return y + 20;
}

function drawKpiRow(doc: PDFKit.PDFDocument, items: Array<{ label: string; value: string; color?: string }>, y: number): number {
  const boxWidth = (USABLE_WIDTH - 30) / items.length;
  let currentX = MARGIN;

  for (const item of items) {
    const boxY = y;
    const boxH = 55;

    // Background
    doc.save();
    doc.rect(currentX, boxY, boxWidth, boxH).fillColor('#f9fafb').fill();
    doc.restore();

    // Label
    doc.fontSize(7).fillColor(COLORS.darkGray).font('Helvetica');
    doc.text(item.label.toUpperCase(), currentX + 8, boxY + 6, { width: boxWidth - 16, align: 'center' });

    // Value
    doc.fontSize(12).fillColor(item.color || COLORS.primary).font('Helvetica-Bold');
    doc.text(item.value, currentX + 8, boxY + 24, { width: boxWidth - 16, align: 'center' });

    currentX += boxWidth + 10;
  }

  return y + 65;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: Array<string[]>,
  y: number,
  columnWidths: number[]
): number {
  const rowHeight = 20;
  const tableStartX = MARGIN;
  const tableWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  // Header row
  doc.save();
  doc.rect(tableStartX, y, tableWidth, rowHeight).fillColor(COLORS.primary).fill();
  doc.restore();

  let currentX = tableStartX;
  headers.forEach((header, i) => {
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text(header, currentX + 4, y + 5, { width: columnWidths[i] - 8, align: i === 0 ? 'left' : 'right' });
    currentX += columnWidths[i];
  });

  let currentY = y + rowHeight;

  // Data rows
  rows.forEach((row, rowIndex) => {
    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.save();
      doc.rect(tableStartX, currentY, tableWidth, rowHeight).fillColor('#f9fafb').fill();
      doc.restore();
    }

    currentX = tableStartX;
    row.forEach((cell, i) => {
      doc.fontSize(8).fillColor(COLORS.primary).font('Helvetica');
      doc.text(cell, currentX + 4, currentY + 5, { width: columnWidths[i] - 8, align: i === 0 ? 'left' : 'right' });
      currentX += columnWidths[i];
    });

    // Bottom border
    drawLine(doc, currentY + rowHeight, '#e5e7eb', tableWidth);

    currentY += rowHeight;
  });

  return currentY;
}

function checkPage(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawDisclaimer(doc: PDFKit.PDFDocument) {
  const disclaimer = [
    'This report is generated automatically by NELHEALTHCOACH, LLC for internal record-keeping purposes.',
    'It is not a substitute for professional tax advice. Consult a qualified CPA for accurate tax planning and filing.',
    'All figures are in USD and based on the data entered into the system.',
  ].join(' ');

  doc.save();
  doc.fontSize(7).fillColor(COLORS.darkGray).font('Helvetica-Oblique');
  doc.text(disclaimer, MARGIN, doc.page.height - 50, { width: USABLE_WIDTH, align: 'center' });
  doc.restore();
}

// ─── Schedule C PDF ───

function buildScheduleCPDF(doc: PDFKit.PDFDocument, data: PDFScheduleCData): void {
  let y = MARGIN;

  // Header
  y = drawHeader(
    doc,
    'Schedule C (Form 1040) — Profit or Loss from Business',
    `Tax Year: ${data.year} | NELHEALTHCOACH, LLC | Sole Proprietorship`,
    y
  );

  // KPI Row
  y = drawKpiRow(doc, [
    { label: 'Gross Income', value: formatCents(data.totalIncome), color: COLORS.green },
    { label: 'Total Expenses', value: formatCents(data.totalExpenses), color: COLORS.red },
    { label: 'Net Profit', value: formatCents(data.netProfit), color: data.netProfit >= 0 ? COLORS.primary : COLORS.red },
    { label: 'SE Tax (est.)', value: formatCents(data.selfEmploymentTax), color: '#d97706' },
  ], y);

  y += 10;

  // Schedule C Lines
  y = drawSectionHeader(doc, 'Schedule C — Line Items', y);

  const headers = ['Line', 'Description', 'Amount'];
  const colWidths = [50, 310, 100];
  const rows = data.lines.map(l => [
    String(l.line),
    l.label,
    formatCents(l.amount),
  ]);

  y = drawTable(doc, headers, rows, y, colWidths);
  y += 15;

  // Category breakdown
  y = checkPage(doc, y, 40);
  y = drawSectionHeader(doc, 'Expenses by Category', y);

  // Group lines by Part
  const partI = data.lines.filter(l => l.line <= 7);
  const partII = data.lines.filter(l => l.line >= 8);

  if (partI.length > 0) {
    y = checkPage(doc, y, 20);
    doc.fontSize(10).fillColor(COLORS.secondary).font('Helvetica-Bold');
    doc.text('Part I — Income', MARGIN, y);
    y += 18;

    const incomeHeaders = ['Line', 'Description', 'Amount'];
    const incomeRows = partI.map(l => [String(l.line), l.label, formatCents(l.amount)]);
    y = drawTable(doc, incomeHeaders, incomeRows, y, colWidths);
    y += 10;
  }

  if (partII.length > 0) {
    y = checkPage(doc, y, 20);
    doc.fontSize(10).fillColor(COLORS.secondary).font('Helvetica-Bold');
    doc.text('Part II — Expenses', MARGIN, y);
    y += 18;

    const expHeaders = ['Line', 'Description', 'Amount'];
    const expRows = partII.map(l => [String(l.line), l.label, formatCents(l.amount)]);
    y = drawTable(doc, expHeaders, expRows, y, colWidths);
    y += 10;
  }

  // Other expenses detail
  const line27 = data.lines.find(l => l.line === 27);
  if (line27?.items && line27.items.length > 0) {
    y = checkPage(doc, y, 20);
    doc.fontSize(10).fillColor(COLORS.secondary).font('Helvetica-Bold');
    doc.text('Other Expenses Detail (Line 27)', MARGIN, y);
    y += 18;

    const detailHeaders = ['', 'Description', 'Amount'];
    const detailColWidths = [50, 310, 100];
    const detailRows = line27.items.map((item, i) => [String(i + 1), item.description, formatCents(item.amount)]);

    y = drawTable(doc, detailHeaders, detailRows, y, detailColWidths);
    y += 10;
  }

  // SE Tax info
  y = checkPage(doc, y, 50);
  y = drawSectionHeader(doc, 'Self-Employment Tax Estimate', y);

  doc.fontSize(9).fillColor(COLORS.primary).font('Helvetica');
  doc.text(`Net profit: ${formatCents(data.netProfit)}`, MARGIN, y, { width: USABLE_WIDTH });
  y += 16;
  doc.text(`Estimated SE tax (15.3%): ${formatCents(data.selfEmploymentTax)}`, MARGIN, y, { width: USABLE_WIDTH });
  y += 16;
  doc.text(`SE tax deduction (50% of SE tax): ${formatCents(Math.round(data.selfEmploymentTax * 0.5))}`, MARGIN, y, { width: USABLE_WIDTH });
  y += 20;
  doc.fontSize(8).fillColor(COLORS.darkGray).font('Helvetica-Oblique');
  doc.text('Note: These are rough estimates. The actual SE tax calculation on Schedule SE may differ. Consult a CPA.', MARGIN, y, { width: USABLE_WIDTH });

  // Disclaimer on every page
  doc.on('pageAdded', () => drawDisclaimer(doc));
}

// ─── Form 568 PDF ───

function buildForm568PDF(doc: PDFKit.PDFDocument, data: PDFForm568Data): void {
  let y = MARGIN;

  y = drawHeader(
    doc,
    'Form 568 — California LLC Return of Income',
    `Tax Year: ${data.year} | NELHEALTHCOACH, LLC | California LLC`,
    y
  );

  y = drawKpiRow(doc, [
    { label: 'Total Income', value: formatCents(data.totalIncome), color: COLORS.green },
    { label: 'Deductible Expenses', value: formatCents(data.totalDeductibleExpenses), color: COLORS.red },
    { label: 'Net Income', value: formatCents(data.netIncome), color: data.netIncome >= 0 ? COLORS.primary : COLORS.red },
    { label: 'CA LLC Fee', value: formatDollars(data.californiaLLCFee.amountDollars), color: '#d97706' },
  ], y);

  y += 10;

  y = drawSectionHeader(doc, 'California LLC Annual Fee', y);

  doc.fontSize(9).fillColor(COLORS.primary).font('Helvetica');
  doc.text(`Income Tier: ${data.californiaLLCFee.tier}`, MARGIN, y, { width: USABLE_WIDTH });
  y += 16;
  doc.text(`Annual LLC Fee: ${formatDollars(data.californiaLLCFee.amountDollars)}`, MARGIN, y, { width: USABLE_WIDTH });
  y += 16;
  doc.text(`Total taxable income (after deductions): ${formatCents(data.estimatedTaxableIncome)}`, MARGIN, y, { width: USABLE_WIDTH });
  y += 20;

  doc.fontSize(8).fillColor(COLORS.darkGray).font('Helvetica-Oblique');
  doc.text(
    'Note: The CA LLC Annual Fee is based on California FTB guidelines. ' +
    'Tiers: $0-250k = $800, $250k-500k = $900, $500k-1M = $1,200, $1M-5M = $3,000, $5M+ = $6,000. ' +
    'Additional CA franchise tax of $800 applies to all LLCs.',
    MARGIN, y, { width: USABLE_WIDTH }
  );

  doc.on('pageAdded', () => drawDisclaimer(doc));
}

// ─── Quarterly Tax PDF ───

function buildQuarterlyPDF(doc: PDFKit.PDFDocument, data: PDFQuarterlyData): void {
  let y = MARGIN;

  y = drawHeader(
    doc,
    'Quarterly Estimated Tax Report',
    `Tax Year: ${data.year} | NELHEALTHCOACH, LLC | Combined Federal & CA`,
    y
  );

  // YTD summary
  y = drawKpiRow(doc, [
    { label: 'Net Income YTD', value: formatCents(data.totalNetYTD), color: COLORS.primary },
    { label: 'Est. Tax YTD', value: formatCents(data.totalEstimatedTaxYTD), color: '#d97706' },
    { label: 'Effective Rate', value: data.totalNetYTD > 0 ? `${Math.round((data.totalEstimatedTaxYTD / data.totalNetYTD) * 100)}%` : '—', color: COLORS.darkGray },
  ], y);

  y += 10;

  // Quarterly breakdown
  y = drawSectionHeader(doc, 'Quarterly Breakdown', y);

  const headers = ['Quarter', 'Income', 'Expenses', 'Net Income', 'Est. Tax'];
  const colWidths = [100, 100, 100, 110, 100];
  const rows = data.quarters.map(q => [
    q.quarter,
    formatCents(q.income),
    formatCents(q.expenses),
    formatCents(q.netIncome),
    formatCents(q.estimatedTax),
  ]);

  y = drawTable(doc, headers, rows, y, colWidths);
  y += 15;

  // Total row
  const totalRow = [
    'TOTAL YTD',
    formatCents(data.quarters.reduce((s, q) => s + q.income, 0)),
    formatCents(data.quarters.reduce((s, q) => s + q.expenses, 0)),
    formatCents(data.totalNetYTD),
    formatCents(data.totalEstimatedTaxYTD),
  ];

  doc.save();
  doc.rect(MARGIN, y, colWidths.reduce((s, w) => s + w, 0), 20).fillColor('#eef2ff').fill();
  doc.restore();

  let currentX = MARGIN;
  totalRow.forEach((cell, i) => {
    doc.fontSize(8).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text(cell, currentX + 4, y + 5, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'right' });
    currentX += colWidths[i];
  });

  y += 35;

  // Notes
  y = checkPage(doc, y, 20 + data.notes.length * 16);
  y = drawSectionHeader(doc, 'Notes', y);

  for (const note of data.notes) {
    doc.fontSize(8).fillColor(COLORS.darkGray).font('Helvetica-Oblique');
    doc.text(`• ${note}`, MARGIN, y, { width: USABLE_WIDTH });
    y += 16;
  }

  doc.on('pageAdded', () => drawDisclaimer(doc));
}

// ─── Main Generator ───

export async function generateFinanceReportPDF(data: FinanceReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: MARGIN, bottom: MARGIN + 30, left: MARGIN, right: MARGIN },
      info: {
        Title: `Tax Report ${data.year} - NELHEALTHCOACH, LLC`,
        Author: 'NELHEALTHCOACH Admin',
        Subject: `Tax Report - ${data.type.toUpperCase()}`,
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Add disclaimer to first page
    drawDisclaimer(doc);

    switch (data.type) {
      case 'schedule_c':
        buildScheduleCPDF(doc, data);
        break;
      case 'form_568':
        buildForm568PDF(doc, data);
        break;
      case 'quarterly':
        buildQuarterlyPDF(doc, data);
        break;
    }

    doc.end();
  });
}

// Quick test: pdftoppm → sharp → tesseract pipeline
import sharp from 'sharp';
import { execSync } from 'child_process';
import fs from 'fs';
import { createWorker } from 'tesseract.js';

const testPdf = '/tmp/test-ocr.pdf';
const outputPrefix = '/tmp/test-ocr-page';

// Create a minimal PDF with text
fs.writeFileSync(testPdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n351\n%%EOF');

try {
  // Step 1: pdftoppm (system dep - available on this machine)
  execSync(`pdftoppm -png -r 200 "${testPdf}" "${outputPrefix}"`, { timeout: 10000 });
  const pageFile = `${outputPrefix}-1.png`;
  
  if (fs.existsSync(pageFile)) {
    const img = sharp(pageFile);
    const m = await img.metadata();
    console.log('✅ pdftoppm + sharp:', m.format, `${m.width}x${m.height}`);
    
    // Read the image buffer
    const buffer = await sharp(pageFile).png().toBuffer();
    
    // Step 2: tesseract OCR
    const worker = await createWorker('spa');
    const { data } = await worker.recognize(buffer);
    console.log('✅ OCR result:', JSON.stringify(data.text.trim()));
    await worker.terminate();
  } else {
    console.log('❌ pdftoppm did not produce output');
  }
  
  // Cleanup
  execSync(`rm -f "${outputPrefix}"*`, { timeout: 3000 });
  
} catch(e) {
  console.log('❌ Error:', e.message.substring(0, 200));
}

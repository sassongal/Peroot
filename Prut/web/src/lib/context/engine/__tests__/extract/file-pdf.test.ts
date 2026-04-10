import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPdf } from '../../extract/file-pdf';

let pdfBuffer: Buffer;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('Hello World from pdf-lib — context engine test.', {
    x: 50, y: 700, size: 18, font,
  });
  const bytes = await doc.save();
  pdfBuffer = Buffer.from(bytes);
});

describe('extractPdf', () => {
  it('extracts non-empty text from a text PDF with no native binding errors', async () => {
    const result = await extractPdf(pdfBuffer);
    expect(result.text.length).toBeGreaterThan(10);
    expect(result.text).toContain('Hello World');
    expect(result.metadata.pages).toBeGreaterThan(0);
    expect(result.metadata.format).toBe('pdf');
  });
});

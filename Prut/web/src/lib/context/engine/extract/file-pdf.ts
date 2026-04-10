/**
 * PDF text extraction via pdfjs-dist/legacy. The legacy build is pure JS
 * and does not pull @napi-rs/canvas, so it works in Vercel Functions
 * without serverExternalPackages gymnastics.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface PdfExtractionResult {
  text: string;
  metadata: {
    pages: number;
    format: 'pdf';
  };
}

export async function extractPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data: uint8, useWorkerFetch: false, isEvalSupported: false });
  const doc = await Promise.race([
    loadingTask.promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF load timed out after 15s')), 15_000),
    ),
  ]);

  const MAX_PAGES = 200;
  const pages = doc.numPages;
  const pagesToRead = Math.min(pages, MAX_PAGES);
  const chunks: string[] = [];
  for (let i = 1; i <= pagesToRead; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .filter(Boolean);
    chunks.push(strings.join(' '));
    page.cleanup();
  }
  await doc.cleanup();
  await doc.destroy();

  return {
    text: chunks.join('\n\n').trim(),
    metadata: { pages, format: 'pdf' },
  };
}

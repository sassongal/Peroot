// src/app/api/context/__tests__/extract-files.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: 'pro' } }) }) }) }),
  }),
}));
vi.mock('@/lib/context/engine/extraction-rate-limit', () => ({
  checkExtractionLimit: async () => ({ allowed: true, remaining: 10, limit: 100 }),
}));
vi.mock('@/lib/context/engine/enrich', () => ({
  enrichContent: async () => ({
    title: 'Batch Doc', documentType: 'generic',
    summary: 'א'.repeat(120), keyFacts: ['fact1'], entities: [],
  }),
}));
vi.mock('@/lib/context/engine/cache', () => ({
  getCachedBlock: async () => null, putCachedBlock: async () => {},
}));

import { POST } from '../extract-files/route';

let pdfBytes: Uint8Array;

beforeAll(async () => {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText('Batch PDF test', { x: 50, y: 700, size: 12 });
  pdfBytes = await doc.save();
});

describe('POST /api/context/extract-files', () => {
  it(
    'returns blocks array with length 2 for two PDFs',
    async () => {
      const form = new FormData();
      form.append('files', new File([pdfBytes], 'a.pdf', { type: 'application/pdf' }));
      form.append('files', new File([pdfBytes], 'b.pdf', { type: 'application/pdf' }));
      const req = new Request('http://t', { method: 'POST', body: form });
      const res = await POST(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.blocks).toHaveLength(2);
      expect(body.blocks[0].type).toBe('file');
      expect(body.blocks[0].stage).toBe('ready');
    },
    15_000,
  );

  it('returns 400 when no files field is present', async () => {
    const form = new FormData();
    const req = new Request('http://t', { method: 'POST', body: form });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });
});

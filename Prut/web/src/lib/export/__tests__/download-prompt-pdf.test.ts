// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @react-pdf/renderer — we don't want to actually render a PDF in unit
// tests (it's slow and needs fontkit). We just verify the orchestration:
// dynamic import runs, blob is created, anchor is clicked, url is revoked.

const toBlobMock = vi.fn().mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
const pdfMock = vi.fn().mockReturnValue({ toBlob: toBlobMock });

vi.mock('@react-pdf/renderer', () => ({
  pdf: pdfMock,
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
}));

describe('downloadPromptPdf', () => {
  beforeEach(() => {
    toBlobMock.mockClear();
    pdfMock.mockClear();

    // Stub URL.createObjectURL / revokeObjectURL for jsdom.
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('dynamically imports renderer, produces a blob, and triggers a download anchor click', async () => {
    const clickSpy = vi.fn();
    const nativeCreateElement = Object.getPrototypeOf(document).createElement.bind(document) as typeof document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = nativeCreateElement(tag);
      if (tag === 'a') {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });

    const { downloadPromptPdf } = await import('../download-prompt-pdf');
    await downloadPromptPdf({
      title: 'בדיקה',
      original: 'פרומפט מקורי',
      enhanced: 'פרומפט משופר עם המון פרטים',
      score: { before: 45, after: 88 },
      createdAt: new Date('2026-04-07').toISOString(),
    });

    expect(pdfMock).toHaveBeenCalledTimes(1);
    expect(toBlobMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('sanitizes Hebrew title into a safe filename', async () => {
    // Save the native document.createElement BEFORE any spy — otherwise the
    // mock implementation recurses into itself through the spy.
    const nativeCreateElement = Object.getPrototypeOf(document).createElement.bind(document) as typeof document.createElement;
    const createdAnchors: HTMLAnchorElement[] = [];
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = nativeCreateElement(tag);
      if (tag === 'a') {
        (el as HTMLAnchorElement).click = vi.fn();
        createdAnchors.push(el as HTMLAnchorElement);
      }
      return el;
    });

    const { downloadPromptPdf } = await import('../download-prompt-pdf');
    await downloadPromptPdf({
      title: 'כותרת / עם : תווים ? אסורים *',
      original: '',
      enhanced: 'שלום',
    });

    const anchor = createdAnchors[0];
    expect(anchor.download.endsWith('.pdf')).toBe(true);
    // No filesystem-reserved characters in the name.
    expect(anchor.download).not.toMatch(/[\\/:*?"<>|]/);
  });
});

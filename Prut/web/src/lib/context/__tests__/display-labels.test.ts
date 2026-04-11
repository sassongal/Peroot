import { describe, it, expect } from 'vitest';
import { formatContextAttachmentSubtitle } from '../display-labels';
import type { ContextBlock } from '@/lib/context/engine/types';

function baseBlock(overrides: Partial<ContextBlock> & Pick<ContextBlock, 'type'>): ContextBlock {
  return {
    id: '1',
    sha256: 'x',
    stage: 'ready',
    display: {
      title: 'Title',
      documentType: 'דף אינטרנט',
      summary: '',
      keyFacts: [],
      entities: [],
      rawText: '',
      metadata: {},
      ...overrides.display,
    },
    injected: { header: '', body: '', tokenCount: 1500, ...overrides.injected },
    ...overrides,
  };
}

describe('formatContextAttachmentSubtitle', () => {
  it('formats url with hostname', () => {
    const b = baseBlock({
      type: 'url',
      display: {
        title: 'Page',
        documentType: 'דף אינטרנט',
        summary: '',
        keyFacts: [],
        entities: [],
        rawText: '',
        metadata: { sourceUrl: 'https://www.example.com/path' },
      },
    });
    expect(formatContextAttachmentSubtitle(b)).toContain('אתר · example.com');
    expect(formatContextAttachmentSubtitle(b)).toContain('1.5K טוקנים');
  });

  it('formats file with filename', () => {
    const b = baseBlock({
      type: 'file',
      display: {
        title: 'Doc',
        documentType: 'חוזה משפטי',
        summary: '',
        keyFacts: [],
        entities: [],
        rawText: '',
        metadata: { filename: 'report.pdf' },
      },
    });
    expect(formatContextAttachmentSubtitle(b)).toBe('קובץ · report.pdf · 1.5K טוקנים');
  });

  it('formats image with filename', () => {
    const b = baseBlock({
      type: 'image',
      display: {
        title: 'Shot',
        documentType: 'תמונה',
        summary: '',
        keyFacts: [],
        entities: [],
        rawText: '',
        metadata: { filename: 'pic.png' },
      },
    });
    expect(formatContextAttachmentSubtitle(b)).toBe('תמונה · pic.png · 1.5K טוקנים');
  });
});

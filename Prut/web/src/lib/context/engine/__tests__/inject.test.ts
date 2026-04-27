import { describe, it, expect } from 'vitest';
import { renderInjection, buildInjectedBlock } from '../inject';
import type { ContextBlock } from '../types';

function block(overrides: Partial<ContextBlock> = {}): ContextBlock {
  return {
    id: 'a', type: 'file', sha256: 'h', stage: 'ready',
    display: {
      title: 'contract_2026.pdf',
      documentType: 'חוזה משפטי',
      summary: 'חוזה שירותים בין חברת אלפא ליעקב כהן.',
      keyFacts: ['שווי 45000 ₪', 'תקופה 12 חודשים'],
      entities: [{ name: 'חברת אלפא', type: 'org' }],
      rawText: '...',
      metadata: { pages: 12 },
    },
    injected: { header: '', body: '', tokenCount: 0 },
    ...overrides,
  };
}

describe('buildInjectedBlock', () => {
  it('produces header + body with facts and summary', () => {
    const r = buildInjectedBlock(block(), 1);
    expect(r.header).toContain('📄');
    expect(r.header).toContain('contract_2026.pdf');
    expect(r.body).toContain('חוזה משפטי');
    expect(r.body).toContain('שווי 45000');
    expect(r.body).toContain('חברת אלפא');
    expect(r.tokenCount).toBeGreaterThan(0);
  });

  it('appends rawText after separator when rawText is present', () => {
    const b = block({ display: { ...block().display, rawText: 'full contract text here' } });
    const r = buildInjectedBlock(b, 1);
    expect(r.body).toContain('───');
    expect(r.body).toContain('full contract text here');
  });

  it('does not append separator when rawText is empty or missing', () => {
    const b = block({ display: { ...block().display, rawText: '' } });
    expect(buildInjectedBlock(b, 1).body).not.toContain('───');
    const b2 = block({ display: { ...block().display, rawText: undefined } });
    expect(buildInjectedBlock(b2, 1).body).not.toContain('───');
  });

  it('includes rawText in tokenCount', () => {
    const bNoRaw = block({ display: { ...block().display, rawText: '' } });
    const bWithRaw = block({ display: { ...block().display, rawText: 'a'.repeat(400) } });
    expect(buildInjectedBlock(bWithRaw, 1).tokenCount).toBeGreaterThan(
      buildInjectedBlock(bNoRaw, 1).tokenCount,
    );
  });
});

describe('renderInjection', () => {
  it('returns empty string on no blocks', () => {
    expect(renderInjection([])).toBe('');
  });
  it('includes role adaptation header and usage rules', () => {
    const out = renderInjection([block()]);
    expect(out).toContain('התאמת מומחה');
    expect(out).toContain('יועץ משפטי בכיר');
    expect(out).toContain('קונטקסט שסופק');
    expect(out).toContain('הנחיות שימוש בקונטקסט');
  });
});

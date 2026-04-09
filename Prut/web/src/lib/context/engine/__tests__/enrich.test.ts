import { describe, it, expect, vi } from 'vitest';

const generateTextMock = vi.fn();
vi.mock('ai', () => ({
  generateText: (args: unknown) => generateTextMock(args),
  Output: {
    object: <T,>(opts: { schema: T }) => ({ __kind: 'object', schema: opts.schema }),
  },
}));
vi.mock('@ai-sdk/google', () => ({ google: (model: string) => ({ model }) }));

import { enrichContent } from '../enrich';

describe('enrichContent', () => {
  it('returns schema-valid output and uses the right prompt', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        title: 'חוזה בין אלפא ליעקב',
        documentType: 'חוזה משפטי',
        summary: 'א'.repeat(120),
        keyFacts: ['שווי 45000', 'תקופה 12 חודשים'],
        entities: [{ name: 'אלפא בע"מ', type: 'org' }],
      },
    });
    const r = await enrichContent({
      text: 'הסכם בין הצדדים...',
      detectedType: 'חוזה משפטי',
      sourceType: 'file',
      title: 'contract.pdf',
    });
    expect(r.documentType).toBe('חוזה משפטי');
    expect(r.keyFacts).toHaveLength(2);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it('throws on AI SDK failure (caller decides fallback)', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(enrichContent({
      text: 'x',
      detectedType: 'generic',
      sourceType: 'file',
      title: 't',
    })).rejects.toThrow();
  });
});

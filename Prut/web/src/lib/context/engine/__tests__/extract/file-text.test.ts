import { describe, it, expect } from 'vitest';
import { extractText } from '../../extract/file-text';

describe('extractText', () => {
  it('returns UTF-8 decoded text with character count', async () => {
    const r = await extractText(Buffer.from('שלום עולם', 'utf-8'));
    expect(r.text).toBe('שלום עולם');
    expect(r.metadata.characters).toBe(9);
    expect(r.metadata.format).toBe('txt');
  });
});

import { describe, it, expect } from 'vitest';
import { compressToLimit } from '../compress';

describe('compressToLimit', () => {
  it('returns text unchanged when under limit', () => {
    const r = compressToLimit('short text', 1000);
    expect(r.text).toBe('short text');
    expect(r.truncated).toBe(false);
    expect(r.originalTokenCount).toBeLessThanOrEqual(10);
  });
  it('truncates when over limit and sets flag', () => {
    const long = 'x'.repeat(20000);
    const r = compressToLimit(long, 1000);
    expect(r.truncated).toBe(true);
    expect(r.originalTokenCount).toBeGreaterThan(1000);
    expect(r.text.length).toBeLessThanOrEqual(4000 + 20);
  });
});

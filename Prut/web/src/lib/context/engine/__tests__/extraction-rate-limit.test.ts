import { describe, it, expect, vi, beforeEach } from 'vitest';

const counts = new Map<string, number>();
vi.mock('@/lib/redis', () => ({
  redis: {
    set: vi.fn(async () => 'OK'),
    incr: vi.fn(async (k: string) => {
      const n = (counts.get(k) ?? 0) + 1; counts.set(k, n); return n;
    }),
    expire: vi.fn(async () => 1),
  },
}));

import { checkExtractionLimit } from '../extraction-rate-limit';

describe('checkExtractionLimit', () => {
  beforeEach(() => { counts.clear(); });
  it('allows up to the free daily cap', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await checkExtractionLimit('u1', 'free')).allowed).toBe(true);
    }
    const r = await checkExtractionLimit('u1', 'free');
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });
  it('allows up to pro daily cap', async () => {
    for (let i = 0; i < 100; i++) {
      expect((await checkExtractionLimit('u2', 'pro')).allowed).toBe(true);
    }
    expect((await checkExtractionLimit('u2', 'pro')).allowed).toBe(false);
  });
});

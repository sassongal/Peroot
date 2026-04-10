import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
    expire: vi.fn(async () => 1),
  },
}));

import { getCachedBlock, putCachedBlock } from '../cache';
import type { ContextBlock } from '../types';

const block: ContextBlock = {
  id: 'a1',
  type: 'file',
  sha256: 'abc',
  stage: 'ready',
  display: {
    title: 't', documentType: 'generic', summary: 's',
    keyFacts: [], entities: [], rawText: '', metadata: {},
  },
  injected: { header: 'h', body: 'b', tokenCount: 10 },
};

describe('context cache', () => {
  beforeEach(() => { store.clear(); });
  it('returns null on miss', async () => {
    expect(await getCachedBlock('abc', 'free')).toBeNull();
  });
  it('writes and reads back', async () => {
    await putCachedBlock(block, 'free');
    const hit = await getCachedBlock('abc', 'free');
    expect(hit?.injected.body).toBe('b');
  });
  it('is keyed by tier — free miss after pro write', async () => {
    await putCachedBlock(block, 'pro');
    expect(await getCachedBlock('abc', 'free')).toBeNull();
    expect(await getCachedBlock('abc', 'pro')).not.toBeNull();
  });
});

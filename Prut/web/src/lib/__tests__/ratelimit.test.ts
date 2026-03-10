import { describe, it, expect, vi } from 'vitest';

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class MockRatelimit {
    static slidingWindow() { return {}; }
    constructor() {}
    limit = vi.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 3600000 });
  },
}));

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    constructor() {}
  },
}));

describe('Rate Limiter', () => {
  it('exports rateLimiters for guest, free, and pro tiers', async () => {
    const { rateLimiters } = await import('../ratelimit');
    expect(rateLimiters).toHaveProperty('guest');
    expect(rateLimiters).toHaveProperty('free');
    expect(rateLimiters).toHaveProperty('pro');
  });

  it('exports checkRateLimit function', async () => {
    const { checkRateLimit } = await import('../ratelimit');
    expect(checkRateLimit).toBeInstanceOf(Function);
  });

  it('checkRateLimit returns success result', async () => {
    const { checkRateLimit } = await import('../ratelimit');
    const result = await checkRateLimit('test-user', 'free');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('remaining');
  });
});

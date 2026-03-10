import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '',
});

export const rateLimiters = {
  guest: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: '@peroot/ratelimit:guest',
  }),
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: '@peroot/ratelimit:free',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 h'),
    prefix: '@peroot/ratelimit:pro',
  }),
};

export type RateLimitTier = 'guest' | 'free' | 'pro';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(identifier: string, tier: RateLimitTier = 'guest'): Promise<RateLimitResult> {
  const limiter = rateLimiters[tier];
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

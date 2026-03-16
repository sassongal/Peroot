import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

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
    limiter: Ratelimit.slidingWindow(10, '24 h'),
    prefix: '@peroot/ratelimit:free',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 h'),
    prefix: '@peroot/ratelimit:pro',
  }),
  adminTestEngine: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: '@peroot/ratelimit:admin-test-engine',
  }),
  adminEmailCampaign: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: '@peroot/ratelimit:admin-email-campaign',
  }),
  share: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: '@peroot/ratelimit:share',
  }),
  referral: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: '@peroot/ratelimit:referral',
  }),
  folders: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'),
    prefix: '@peroot/ratelimit:folders',
  }),
};

export type RateLimitTier = 'guest' | 'free' | 'pro' | 'adminTestEngine' | 'adminEmailCampaign' | 'share' | 'referral' | 'folders';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory fallback when Redis is unavailable
// Limits to 10 requests per IP per hour to prevent abuse
const memoryFallback = new Map<string, { count: number; resetAt: number }>();
const MEMORY_LIMIT = 10;
const MEMORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkMemoryFallback(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = memoryFallback.get(identifier);

  if (!entry || now >= entry.resetAt) {
    memoryFallback.set(identifier, { count: 1, resetAt: now + MEMORY_WINDOW_MS });
    return { success: true, limit: MEMORY_LIMIT, remaining: MEMORY_LIMIT - 1, reset: now + MEMORY_WINDOW_MS };
  }

  entry.count++;
  if (entry.count > MEMORY_LIMIT) {
    return { success: false, limit: MEMORY_LIMIT, remaining: 0, reset: entry.resetAt };
  }

  return { success: true, limit: MEMORY_LIMIT, remaining: MEMORY_LIMIT - entry.count, reset: entry.resetAt };
}

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryFallback) {
    if (now >= entry.resetAt) memoryFallback.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export async function checkRateLimit(identifier: string, tier: RateLimitTier = 'guest'): Promise<RateLimitResult> {
  try {
    const limiter = rateLimiters[tier];
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.warn('[RateLimit] Redis unavailable, allowing request', { identifier, tier });
    logger.error('[RateLimit] Redis unavailable, using in-memory fallback:', error);
    return checkMemoryFallback(identifier);
  }
}

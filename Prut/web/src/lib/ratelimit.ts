
import Redis from 'ioredis';

// Singleton Redis client management for serverless/edge environments
const redisUrl = process.env.REDIS_URL;

let redis: Redis | null = null;

function getRedisClient() {
  if (redis) return redis;
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Redis] CRITICAL: REDIS_URL missing in production!');
    } else {
      console.warn('[Redis] REDIS_URL missing, rate limiting disabled.');
    }
    return null;
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });
  
  redis.on('error', (err) => {
    // Structured error logging for better observability
    console.error(`[Redis] Connection Error: ${err.message}`, { 
      stack: err.stack,
      url: redisUrl.split('@').pop() // Hide credentials in logs
    });
  });

  return redis;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if the request should be rate limited.
 * Simple fixed window counter.
 */
export async function checkRateLimit(identifier: string, tier: 'free' | 'pro' | 'guest' = 'guest'): Promise<RateLimitResult> {
    const redis = getRedisClient();
    if (!redis) {
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }

    const windowSize = 3600; // 1 hour in seconds
    let limit = 5;

    switch (tier) {
        case 'pro':
            limit = 200;
            break;
        case 'free':
            limit = 30;
            break;
        case 'guest':
        default:
            limit = 5;
            break;
    }

    const key = `@peroot/ratelimit:${identifier}`;

    try {
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        if (!results) {
            return { success: true, limit, remaining: limit, reset: 0 };
        }

        const count = (results[0][1] as number) || 1;
        let ttl = (results[1][1] as number);

        if (ttl === -1) {
            await redis.expire(key, windowSize);
            ttl = windowSize;
        }

        const success = count <= limit;
        const remaining = Math.max(0, limit - count);
        const reset = Date.now() + (ttl * 1000);

        return { success, limit, remaining, reset };

    } catch (err) {
        console.error('[RateLimit] Failed:', err);
        // Fail open
        return { success: true, limit, remaining: limit, reset: 0 };
    }
}

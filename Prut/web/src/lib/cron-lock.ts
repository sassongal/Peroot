import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '',
});

/**
 * Acquire a distributed lock for cron jobs to prevent concurrent execution.
 * Uses Redis SET NX EX for atomic lock acquisition.
 *
 * @param name - Unique name for the cron job (e.g., 'cron:send-emails')
 * @param ttlSeconds - Lock TTL in seconds (should match maxDuration + buffer)
 * @returns true if lock acquired, false if another instance is running
 */
export async function acquireCronLock(name: string, ttlSeconds: number = 60): Promise<boolean> {
  try {
    const result = await redis.set(`lock:${name}`, Date.now(), { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch (err) {
    // If Redis is down, allow execution (better to risk a duplicate than skip entirely)
    logger.warn(`[CronLock] Redis error acquiring lock ${name}, allowing execution:`, err);
    return true;
  }
}

/**
 * Release a distributed lock after cron job completion.
 */
export async function releaseCronLock(name: string): Promise<void> {
  try {
    await redis.del(`lock:${name}`);
  } catch (err) {
    logger.warn(`[CronLock] Redis error releasing lock ${name}:`, err);
  }
}

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '',
});

const PREFIX = '@peroot/cron-heartbeat';

/** Expected interval per cron job (in hours). */
const EXPECTED_INTERVALS: Record<string, number> = {
  'send-emails': 24,
  'content-factory': 7 * 24,
  'reengagement': 24,
  'sync-subscriptions': 24,
  'data-retention': 30 * 24,
};

const KNOWN_JOBS = Object.keys(EXPECTED_INTERVALS);

/** 48 hours in seconds — heartbeat TTL. */
const HEARTBEAT_TTL_SECONDS = 48 * 60 * 60;

interface HeartbeatPayload {
  timestamp: number;
  success: boolean;
}

export interface CronJobHealth {
  jobName: string;
  lastRun: number | null;
  isHealthy: boolean;
  status: 'healthy' | 'stale' | 'unknown';
  expectedIntervalHours: number;
}

/**
 * Record a successful cron execution. Call this at the end of a
 * successful cron handler, before returning the response.
 */
export async function recordCronSuccess(jobName: string): Promise<void> {
  try {
    const payload: HeartbeatPayload = { timestamp: Date.now(), success: true };
    await redis.set(`${PREFIX}:${jobName}`, JSON.stringify(payload), { ex: HEARTBEAT_TTL_SECONDS });
  } catch (err) {
    // Best-effort — never let heartbeat recording break the cron job itself.
    logger.warn(`[CronHeartbeat] Failed to record heartbeat for ${jobName}:`, err);
  }
}

/**
 * Read heartbeat status for all known cron jobs.
 * Returns unknown status (instead of throwing) if Redis is unavailable.
 */
export async function getCronHealth(): Promise<CronJobHealth[]> {
  try {
    const results: CronJobHealth[] = [];
    const keys = KNOWN_JOBS.map((name) => `${PREFIX}:${name}`);
    const values = await redis.mget<(string | null)[]>(...keys);

    for (let i = 0; i < KNOWN_JOBS.length; i++) {
      const jobName = KNOWN_JOBS[i];
      const raw = values[i];
      const expectedHours = EXPECTED_INTERVALS[jobName];

      if (!raw) {
        results.push({
          jobName,
          lastRun: null,
          isHealthy: false,
          status: 'unknown',
          expectedIntervalHours: expectedHours,
        });
        continue;
      }

      const payload: HeartbeatPayload = typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as HeartbeatPayload);
      const ageMs = Date.now() - payload.timestamp;
      // Healthy = ran within 2x the expected interval
      const maxAge = expectedHours * 2 * 60 * 60 * 1000;
      const isHealthy = ageMs <= maxAge;

      results.push({
        jobName,
        lastRun: payload.timestamp,
        isHealthy,
        status: isHealthy ? 'healthy' : 'stale',
        expectedIntervalHours: expectedHours,
      });
    }

    return results;
  } catch (err) {
    logger.warn('[CronHeartbeat] Redis unavailable, returning unknown status:', err);
    return KNOWN_JOBS.map((jobName) => ({
      jobName,
      lastRun: null,
      isHealthy: false,
      status: 'unknown' as const,
      expectedIntervalHours: EXPECTED_INTERVALS[jobName],
    }));
  }
}

import { redis } from '@/lib/redis';
import { getContextLimits } from '@/lib/plans';
import { logger } from '@/lib/logger';
import type { PlanTier } from './types';

interface ExtractionLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function dayKey(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

const DAY_TTL = 60 * 60 * 26; // 26h to cover timezone drift

// In-memory fallback when Redis is unavailable.
// Conservative per-instance counter — resets on cold start, so it under-counts
// across instances but still prevents a single instance from being abused.
const memFallback = new Map<string, number>();
const MEM_FALLBACK_LIMIT = 5; // generous per-instance cap while Redis is down

export async function checkExtractionLimit(
  userId: string,
  tier: PlanTier,
): Promise<ExtractionLimitResult> {
  const limit = getContextLimits(tier).extractionsPerDay;
  try {
    const k = `extract:${userId}:${dayKey()}`;
    await redis.set(k, 0, { ex: DAY_TTL, nx: true });
    const count = (await redis.incr(k)) as number;
    const allowed = count <= limit;
    return { allowed, remaining: Math.max(0, limit - count), limit };
  } catch (err) {
    logger.error('[extraction-rate-limit] Redis unavailable, using in-memory fallback', err);
    const today = dayKey();
    // Prune stale day entries to prevent unbounded growth
    if (memFallback.size > 500) {
      for (const k of memFallback.keys()) {
        if (!k.endsWith(today)) memFallback.delete(k);
      }
    }
    const mk = `${userId}:${today}`;
    const count = (memFallback.get(mk) ?? 0) + 1;
    memFallback.set(mk, count);
    const allowed = count <= MEM_FALLBACK_LIMIT;
    return { allowed, remaining: Math.max(0, MEM_FALLBACK_LIMIT - count), limit: MEM_FALLBACK_LIMIT };
  }
}

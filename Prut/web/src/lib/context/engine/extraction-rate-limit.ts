import { redis } from '@/lib/redis';
import { getContextLimits } from '@/lib/plans';
import type { PlanTier } from './types';

export interface ExtractionLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function dayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export async function checkExtractionLimit(
  userId: string,
  tier: PlanTier,
): Promise<ExtractionLimitResult> {
  const limit = getContextLimits(tier).extractionsPerDay;
  const key = `extract:${userId}:${dayKey()}`;
  const count = (await redis.incr(key)) as number;
  if (count === 1) await redis.expire(key, 60 * 60 * 26);
  const allowed = count <= limit;
  return { allowed, remaining: Math.max(0, limit - count), limit };
}

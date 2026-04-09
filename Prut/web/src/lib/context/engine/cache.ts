import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import type { ContextBlock, PlanTier } from './types';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PREFIX = 'ctx:';

function key(sha256: string, tier: PlanTier): string {
  return `${PREFIX}${sha256}:${tier}`;
}

export async function getCachedBlock(
  sha256: string,
  tier: PlanTier,
): Promise<ContextBlock | null> {
  try {
    const raw = await redis.get(key(sha256, tier));
    if (!raw) return null;
    return JSON.parse(raw as string) as ContextBlock;
  } catch (err) {
    logger.warn('[context-cache] get failed', err);
    return null;
  }
}

export async function putCachedBlock(
  block: ContextBlock,
  tier: PlanTier,
): Promise<void> {
  try {
    const k = key(block.sha256, tier);
    await redis.set(k, JSON.stringify(block));
    await redis.expire(k, TTL_SECONDS);
  } catch (err) {
    logger.warn('[context-cache] put failed', err);
  }
}

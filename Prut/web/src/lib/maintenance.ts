import { Redis } from '@upstash/redis';

const CACHE_KEY = '@peroot/maintenance_mode';
const CACHE_TTL = 60; // seconds

let redis: Redis | null = null;

function getRedis() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
    if (!url || !token) return null;
    redis = new Redis({ url, token });
  }
  return redis;
}

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const r = getRedis();
    if (!r) return false;
    const cached = await r.get<boolean>(CACHE_KEY);
    return cached ?? false;
  } catch {
    return false;
  }
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(CACHE_KEY, enabled, { ex: CACHE_TTL });
}

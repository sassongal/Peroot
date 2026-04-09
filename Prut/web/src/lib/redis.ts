/**
 * Shared Redis client — thin wrapper around @upstash/redis.
 * Lazy-initialised so module import doesn't fail when env vars are absent
 * (e.g. unit tests that mock this module entirely).
 */
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function getClient(): Redis {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
  if (!url || !token) {
    throw new Error('[redis] Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars');
  }
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Proxy object — forwards every property access to the lazily-created client.
 * Tests can `vi.mock('@/lib/redis', () => ({ redis: { get, set, expire } }))`.
 */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

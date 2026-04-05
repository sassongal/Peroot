import { logger } from '@/lib/logger';

/**
 * Retry a function with exponential backoff.
 * Use for external service calls (email, payment APIs) — NOT for user-facing DB queries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; backoff?: number[]; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, backoff = [1000, 2000, 4000], label = 'withRetry' } = opts;
  let lastError: Error;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1) {
        logger.warn(`[${label}] Attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${backoff[attempt] ?? backoff[backoff.length - 1]}ms:`, lastError.message);
        await new Promise(r => setTimeout(r, backoff[attempt] ?? backoff[backoff.length - 1]));
      }
    }
  }
  throw lastError!;
}

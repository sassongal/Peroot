/**
 * Concurrency limiter for AI API calls.
 * Prevents thundering herd when many users hit /api/enhance simultaneously.
 * Queues excess requests instead of firing them all at once.
 *
 * Note: This is per-serverless-instance. With Vercel, each instance gets its own limiter.
 * This is intentional - it prevents a single instance from overwhelming AI providers,
 * while Vercel's auto-scaling naturally distributes load across instances.
 */

const MAX_CONCURRENT = 10; // max simultaneous AI calls per instance
const MAX_QUEUE = 50; // max queued requests before rejecting
const QUEUE_TIMEOUT_MS = 15_000; // max wait time in queue (15s)

let active = 0;
const queue: Array<{ resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }> = [];

/**
 * Acquire a slot for an AI call. Resolves when a slot is available.
 * Rejects if the queue is full or timeout is reached.
 */
export function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }

  if (queue.length >= MAX_QUEUE) {
    return Promise.reject(new ConcurrencyError("Server is busy. Please try again in a moment."));
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = queue.findIndex((q) => q.resolve === resolve);
      if (idx !== -1) queue.splice(idx, 1);
      reject(new ConcurrencyError("Request timed out waiting for available capacity."));
    }, QUEUE_TIMEOUT_MS);

    queue.push({ resolve, reject, timer });
  });
}

/**
 * Release a slot after an AI call completes (success or failure).
 * Must always be called in a finally block.
 */
export function releaseSlot(): void {
  // Floor at 0: a double-release (e.g. both stream onFinish and safety timer firing)
  // would otherwise underflow and permanently inflate effective capacity above MAX_CONCURRENT.
  active = Math.max(0, active - 1);

  if (queue.length > 0 && active < MAX_CONCURRENT) {
    const next = queue.shift()!;
    clearTimeout(next.timer);
    active++;
    next.resolve();
  }
}

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyError";
  }
}

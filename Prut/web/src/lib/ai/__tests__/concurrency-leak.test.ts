import { describe, it, expect } from "vitest";
import { acquireSlot, releaseSlot } from "../concurrency";

const MAX_CONCURRENT = 10;

describe("concurrency limiter — leak regression (C1)", () => {
  it("double-release does not inflate effective capacity", async () => {
    // Simulate the C1 scenario: stream timeout fires safeRelease, then finally
    // block fires safeRelease again. The slotReleased guard plus the Math.max
    // floor in releaseSlot must keep `active` bounded.
    for (let i = 0; i < 50; i++) {
      await acquireSlot();
      releaseSlot();
      releaseSlot(); // double-release
    }

    // Capacity must still be exactly MAX_CONCURRENT — not more, not less.
    const slots: Promise<void>[] = [];
    for (let i = 0; i < MAX_CONCURRENT; i++) slots.push(acquireSlot());
    await Promise.all(slots);

    // The (MAX_CONCURRENT+1)th acquire must queue, not resolve immediately.
    let queued = false;
    await Promise.race([
      acquireSlot().then(() => {
        // If we get here within 50ms, capacity leaked above MAX_CONCURRENT.
      }),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          queued = true;
          resolve();
        }, 50),
      ),
    ]);
    expect(queued).toBe(true);

    // Drain: release the MAX_CONCURRENT we acquired (which also serves the
    // orphan queued acquire from the race above).
    for (let i = 0; i < MAX_CONCURRENT + 1; i++) releaseSlot();
  });
});

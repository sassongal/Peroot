import { describe, it, expect } from "vitest";
import { selectReengagementRecipients, type PriorSend } from "../select";

const TIERS = [
  { id: "inactive_7d", inactiveDays: 7 },
  { id: "inactive_14d", inactiveDays: 14 },
  { id: "inactive_30d", inactiveDays: 30 },
];

const NOW = Date.parse("2026-08-24T10:00:00Z");
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY);

const run = (opts: Partial<Parameters<typeof selectReengagementRecipients>[0]> = {}) =>
  selectReengagementRecipients({
    candidates: [],
    priorSends: [],
    tiers: TIERS,
    now: NOW,
    minGapMs: 7 * DAY,
    maxPerRun: 50,
    ...opts,
  });

describe("selectReengagementRecipients", () => {
  it("skips anyone inactive for less than the lowest tier", () => {
    const picked = run({ candidates: [{ userId: "u1", lastActiveAt: daysAgo(6) }] });
    expect(picked).toEqual([]);
  });

  it("sends the highest applicable tier, not the lowest", () => {
    const picked = run({ candidates: [{ userId: "u1", lastActiveAt: daysAgo(200) }] });
    expect(picked).toEqual([{ userId: "u1", tierId: "inactive_30d", daysInactive: 200 }]);
  });

  it("never re-sends a tier at or below one already received", () => {
    const prior: PriorSend[] = [
      {
        user_id: "u1",
        email_type: "inactive_30d",
        created_at: new Date(NOW - 60 * DAY).toISOString(),
      },
    ];
    const picked = run({
      candidates: [{ userId: "u1", lastActiveAt: daysAgo(200) }],
      priorSends: prior,
    });
    expect(picked).toEqual([]);
  });

  /**
   * The regression that mattered: matching only the exact template id meant a
   * long-inactive user received 30d, then 14d, then 7d on three consecutive
   * days. Simulating consecutive runs must yield exactly one email.
   */
  it("does not walk down the tiers on consecutive daily runs", () => {
    const prior: PriorSend[] = [];
    const emails: string[] = [];

    for (let day = 0; day < 5; day++) {
      const now = NOW + day * DAY;
      const picked = selectReengagementRecipients({
        candidates: [{ userId: "u1", lastActiveAt: daysAgo(200) }],
        priorSends: prior,
        tiers: TIERS,
        now,
        minGapMs: 7 * DAY,
        maxPerRun: 50,
      });
      for (const p of picked) {
        emails.push(p.tierId);
        prior.push({
          user_id: "u1",
          email_type: p.tierId,
          created_at: new Date(now).toISOString(),
        });
      }
    }

    expect(emails).toEqual(["inactive_30d"]);
  });

  it("escalates over time as a user keeps not returning", () => {
    const prior: PriorSend[] = [];
    const got: string[] = [];
    // Same user checked at 7, 14 and 30 days of inactivity, spaced far enough apart.
    for (const d of [7, 14, 30]) {
      const now = NOW + d * DAY;
      const picked = selectReengagementRecipients({
        candidates: [{ userId: "u1", lastActiveAt: new Date(now - d * DAY) }],
        priorSends: prior,
        tiers: TIERS,
        now,
        minGapMs: 7 * DAY,
        maxPerRun: 50,
      });
      for (const p of picked) {
        got.push(p.tierId);
        prior.push({
          user_id: "u1",
          email_type: p.tierId,
          created_at: new Date(now).toISOString(),
        });
      }
    }
    expect(got).toEqual(["inactive_7d", "inactive_14d", "inactive_30d"]);
  });

  it("honours the minimum gap between any two sends", () => {
    const prior: PriorSend[] = [
      {
        user_id: "u1",
        email_type: "inactive_7d",
        created_at: new Date(NOW - 2 * DAY).toISOString(),
      },
    ];
    const picked = run({
      candidates: [{ userId: "u1", lastActiveAt: daysAgo(40) }],
      priorSends: prior,
    });
    expect(picked).toEqual([]);
  });

  it("caps the number sent per run", () => {
    const candidates = Array.from({ length: 120 }, (_, i) => ({
      userId: `u${i}`,
      lastActiveAt: daysAgo(90),
    }));
    const picked = run({ candidates, maxPerRun: 50 });
    expect(picked).toHaveLength(50);
  });

  it("ignores prior sends of unknown template ids", () => {
    const prior: PriorSend[] = [
      {
        user_id: "u1",
        email_type: "some_removed_template",
        created_at: new Date(NOW - 60 * DAY).toISOString(),
      },
    ];
    const picked = run({
      candidates: [{ userId: "u1", lastActiveAt: daysAgo(200) }],
      priorSends: prior,
    });
    expect(picked.map((p) => p.tierId)).toEqual(["inactive_30d"]);
  });

  it("ignores prior rows with a null user_id", () => {
    const prior: PriorSend[] = [
      { user_id: null, email_type: "inactive_30d", created_at: new Date(NOW).toISOString() },
    ];
    const picked = run({
      candidates: [{ userId: "u1", lastActiveAt: daysAgo(200) }],
      priorSends: prior,
    });
    expect(picked.map((p) => p.tierId)).toEqual(["inactive_30d"]);
  });
});

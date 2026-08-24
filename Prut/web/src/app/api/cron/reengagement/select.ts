/**
 * Who gets a re-engagement email on this run.
 *
 * Extracted from the route handler deliberately. This is the highest-risk
 * decision in the product — it fans out to every customer's inbox — and while it
 * lived inline it could not be tested. A dedupe bug went unnoticed here until a
 * dry run showed it would send 641 emails across the customer base in 3 days.
 *
 * Pure: no Supabase, no clock, no email. Everything comes in as an argument.
 */

export type ReengagementTier = { id: string; inactiveDays: number };

export type Candidate = {
  userId: string;
  /** Last known activity. Fall back to signup time when there is none. */
  lastActiveAt: Date;
};

export type PriorSend = {
  user_id: string | null;
  email_type: string;
  created_at: string;
};

export type Selection = {
  userId: string;
  tierId: string;
  daysInactive: number;
};

export type SelectOptions = {
  candidates: Candidate[];
  priorSends: PriorSend[];
  tiers: ReengagementTier[];
  now: number;
  /** Minimum spacing between ANY two re-engagement emails to one person. */
  minGapMs: number;
  /** Hard cap per run so a cold list drains over days instead of one blast. */
  maxPerRun: number;
};

export function selectReengagementRecipients({
  candidates,
  priorSends,
  tiers,
  now,
  minGapMs,
  maxPerRun,
}: SelectOptions): Selection[] {
  const byId = new Map(tiers.map((t) => [t.id, t]));

  // Highest tier already delivered, and the most recent send, per user.
  const highestTierSent = new Map<string, number>();
  const lastSentAt = new Map<string, number>();
  for (const row of priorSends) {
    if (!row.user_id) continue;
    const tier = byId.get(row.email_type);
    if (!tier) continue;
    if (tier.inactiveDays > (highestTierSent.get(row.user_id) ?? 0)) {
      highestTierSent.set(row.user_id, tier.inactiveDays);
    }
    const at = new Date(row.created_at).getTime();
    if (!Number.isNaN(at) && at > (lastSentAt.get(row.user_id) ?? 0)) {
      lastSentAt.set(row.user_id, at);
    }
  }

  const lowestTier = Math.min(...tiers.map((t) => t.inactiveDays));
  const out: Selection[] = [];

  for (const c of candidates) {
    if (out.length >= maxPerRun) break;

    const daysInactive = Math.floor((now - c.lastActiveAt.getTime()) / 86_400_000);
    if (daysInactive < lowestTier) continue;

    const last = lastSentAt.get(c.userId);
    if (last !== undefined && now - last < minGapMs) continue;

    // Strictly escalating: only a tier ABOVE the highest already received.
    // Without this, someone inactive for months collects every tier on
    // consecutive days instead of the single highest one.
    const alreadyHighest = highestTierSent.get(c.userId) ?? 0;
    const tier = tiers
      .filter((t) => daysInactive >= t.inactiveDays)
      .filter((t) => t.inactiveDays > alreadyHighest)
      .sort((a, b) => b.inactiveDays - a.inactiveDays)[0];

    if (!tier) continue;
    out.push({ userId: c.userId, tierId: tier.id, daysInactive });
  }

  return out;
}

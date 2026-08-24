# ADR-0002: Quotas live in `site_settings`, never in constants

**Status:** accepted

Free-tier and guest limits are rows in `public.site_settings`, not literals:

- `daily_free_limit` drives the free tier (live value: **1**/day, rolling window)
- `allow_guest_access` gates the guest register-wall (live value: **true**)
- `GUEST_DAILY_LIMIT` in `src/lib/guest-service.ts` is the guest allowance (1/day)

**Why this is an ADR and not a preference:** the number was written as `2` in
CLAUDE.md and in UI copy while the database said `1`. Agents then produced
marketing copy and logic against the wrong value. A quota stored in two places is
a quota that will eventually disagree with itself.

Read the table. Do not hardcode a quota, and do not trust one you read in prose.

Related: [ADR-0006](0006-marketing-counts-split.md), the same class of bug.

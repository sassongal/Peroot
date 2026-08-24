# ADR-0007: `email_logs` is the dedupe key for every automated email

**Status:** accepted

`public.email_logs` is not just an audit trail. It is the **idempotency key** for
the re-engagement drip:

```ts
const { data: alreadySent } = await supabase.from("email_logs")...
const sentKeys = new Set(alreadySent.map(e => `${e.user_id}:${e.email_type}`))
```

A candidate is eligible only if `${user}:${template}` is absent from that set.

## The incident

The table was declared in `supabase/migrations/20260330_email_logs.sql` but the
migration was **never applied to production** — the only unapplied migration out
of 32 declared tables. With the table missing, the query returns `null`,
`sentKeys` is empty, and **every eligible user re-qualifies on every run**.

`/api/cron/reengagement` is scheduled daily at 10:00 in `vercel.json`. Enabling
`REENGAGEMENT_EMAILS_ENABLED` in that state would have emailed the entire
customer base **every day, indefinitely**, from a verified domain — burning
sender reputation on precisely the users who had already disengaged.

It was caught only because someone checked what the first run would actually send
before flipping the flag.

## Rules this establishes

1. **A cron whose dedupe lives in a table must verify that table exists** before
   it is enabled. Missing table must fail loudly, not degrade into "send to
   everyone".
2. **Never enable an outbound-email flag without a dry run first.** Count the
   recipients, then decide.
3. **Schema in git is not schema in production.** Verify migrations were applied,
   especially for anything a cron depends on.
4. Customer-facing sends are **outside** the standing DB authorization in the root
   `CLAUDE.md`. They get confirmed separately, every time.

`EmailService.send()` writes to `email_logs` on both success and failure, so the
table is also the only record that a send happened at all.

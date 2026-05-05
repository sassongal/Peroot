# 🤖 Agent Kickoff Prompt — Copy this into Claude Code in Peroot project

When you start working on this migration in Claude Code, paste this prompt as your first message:

---

```
You are now executing the Peroot Vercel→Cloudflare migration.

CONTEXT FILES (read these in order):
1. PEROOT-CLOUDFLARE-MIGRATION.md — The complete plan. Read it fully.
2. MIGRATION-STATUS.md — Live status. Update after every action.

YOUR ROLE:
- Read the plan, follow it phase by phase.
- Update MIGRATION-STATUS.md after every meaningful action.
- Stop at every Verification Gate. Do not skip them.
- When the plan says "STOP and ask user" — STOP. Wait for me.
- When the plan says "ROLLBACK" — execute rollback immediately, no debate.

HARD RULES:
- Zero customer-facing downtime. Production must always work.
- Never decommission Vercel until 7 consecutive clean days on Cloudflare at 100% traffic.
- Never push to main without testing on a branch first.
- Never modify Supabase schema or LemonSqueezy config except where the plan explicitly says to.
- Customer-impacting failure = automatic rollback. No discussion.

WORKING STYLE:
- Direct, terse, no fluff (per my preferences).
- After each action, write a 1-line entry in MIGRATION-STATUS.md action log.
- When you complete a phase, mark it ✅ in the status table.
- When you hit a verification gate, summarize findings and ask for explicit GO.

DO NOT START ANYTHING UNTIL I SAY "GO PHASE 0".

First: read both files end-to-end and confirm you understand the mission.
Then wait for my GO.
```

---

## How to set this up

1. Copy the entire `peroot-migration/` folder to the root of your Peroot project repo:
   ```
   cp -r C:\Users\sasso\dev\peroot-migration\* C:\path\to\your\peroot-repo\
   ```

2. Open Claude Code in your Peroot repo:
   ```bash
   cd C:\path\to\your\peroot-repo
   claude
   ```

3. Paste the kickoff prompt above.

4. Wait for Claude to confirm understanding.

5. When ready, type: **GO PHASE 0**.

---

## What to expect at each phase boundary

The agent will say something like:

> 🛑 **VERIFICATION GATE — Phase 3 → Phase 4**
> 
> Findings:
> - ✅ Both builds succeed
> - ✅ All 5 local tests passed
> - ⚠️ One issue: `bcrypt` was used in `lib/auth-helpers.ts`, replaced with `bcryptjs`
> - ✅ Branch `cloudflare-migration` pushed to GitHub
> 
> All gate criteria met. **Awaiting GO for Phase 4.**

You respond with either:
- **"GO PHASE 4"** — proceed
- **"STOP, explain the bcrypt change"** — agent explains, then waits
- **"ROLLBACK"** — agent reverts the branch, returns to main

---

## Emergency commands

If something goes wrong outside a normal phase:

| Situation | What to type |
|---|---|
| Agent missed a step | "BACK TO PHASE X" |
| Production is down | "EMERGENCY ROLLBACK" — agent reverts immediately |
| You want to pause | "PAUSE MIGRATION" — agent stops, status saved |
| Resume later | "RESUME FROM PHASE X" |
| You see an issue agent missed | Describe it. Agent will assess and propose fix. |

---

**Status of files in this folder:**
- `PEROOT-CLOUDFLARE-MIGRATION.md` (786 lines) — the complete plan
- `MIGRATION-STATUS.md` (85 lines) — live status board, updated continuously
- `AGENT-KICKOFF.md` (this file) — how to start the agent

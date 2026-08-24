# Running several agents on this repo at once

The rules below are not style preferences, they are scars this repo actually took:

- Two sessions sharing one working copy **hijacked each other's commits** onto
  stray branches (`feat/withuser-*`), twice. Recovery was manual.
- A worktree agent **junctioned `node_modules`** to save disk. It corrupted the
  main copy's dependency tree and produced ~18,000 `tsc` errors.
- Worktrees created inside `.claude/worktrees/` left an **undeletable directory**
  behind when a stray file handle held it open.
- A rebase-merge landed **commits that were never type-checked together**.

## The protocol

**1. One agent, one worktree. Never two agents in one working copy.**

```bash
cd Prut/web
node scripts/agent-worktree.mjs new <slug>     # creates ../Peroot-wt-<slug> on agent/<slug>
node scripts/agent-worktree.mjs list           # health of every worktree
node scripts/agent-worktree.mjs done <slug>    # refuses if dirty or unpushed
```

The script branches from `origin/main`, runs a real `npm ci`, and puts the tree
beside the repo rather than inside it. It refuses to remove a worktree that has
uncommitted or unpushed work.

**2. Never share `node_modules` between worktrees.** No junction, no symlink, no
`mklink`. Each worktree installs its own (~1.4 GB). The `list` subcommand flags a
linked `node_modules` as a corruption risk. Disk is cheaper than a day of
debugging phantom type errors.

**3. Declare your scope before editing.** Every new worktree gets an
`AGENT-SCOPE.md`. Fill in the files you will touch *before* you touch them.
Another agent reads it to stay out of your way. Two agents editing one file is
the failure this prevents.

**4. Split by seam, not by feature.** The safest division is the seams in
[CONTEXT.md](../../CONTEXT.md): `extract()`, `withUser`, `useAllPersonalPrompts()`.
Two agents on two different seams almost never conflict. Two agents both working
on "the library" will.

**5. Long or parallel work lands via PR, never a direct push to `main`.** Direct
pushes are fine for a single session doing small work. They are not fine while
someone else has a worktree open, which is exactly how the commit hijacking
happened.

**6. Re-verify after every merge or rebase.** A rebase can produce a commit that
nobody ever built. Treat `main` as trustworthy only after:

```bash
cd Prut/web && npm run typecheck && npm run test && npm run build
```

CI runs the same three on every push, but there is no branch protection
(deliberate, see [ADR-0005](../adr/0005-ci-is-advisory.md)), so **CI is advisory:
check the run yourself after pushing.**

## Quick reference

| Situation | Do |
|---|---|
| Short fix, nobody else running | Work in the main copy, push to `main`, check CI |
| Anything long-running | `agent-worktree.mjs new`, then PR |
| Two or more agents at once | One worktree each, `AGENT-SCOPE.md` filled in, PRs |
| Worktree finished | `agent-worktree.mjs done <slug>` |
| Worktree abandoned dirty | Commit or stash first; the script refuses otherwise |

## Before you claim a task is done

Read [the verification bar in CLAUDE.md](../../CLAUDE.md). Typecheck and tests
are hard gates in CI. Deploying is not "done" either — confirm the change is
actually live on peroot.space.

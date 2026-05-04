# Triage Labels

Five canonical triage states for this repo.

| Role | Label | Meaning |
|---|---|---|
| Needs evaluation | `needs-triage` | Maintainer needs to assess this |
| Waiting on reporter | `needs-info` | Blocked on more info from the reporter |
| Agent-ready | `ready-for-agent` | Fully specified; an AFK agent can implement with no extra context |
| Human-ready | `ready-for-human` | Needs human implementation |
| Closed without action | `wontfix` | Will not be actioned |

## Usage

Apply labels using the `gh` CLI:

```bash
gh issue edit <number> --add-label "needs-triage"
gh issue edit <number> --remove-label "needs-triage" --add-label "ready-for-agent"
```

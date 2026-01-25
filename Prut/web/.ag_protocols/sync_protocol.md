# 🔄 Sync Protocol (Agent Synchronization)

Every agent must follow these rules before and after every session to ensure harmony:

## 1. Pre-Session Audit

- Read `.ag_brain.md` to understand the current state and mission.
- Check `.ag_registry.json` for active "locks" on files.
- If another agent is working on a file, coordinate or wait.

## 2. Real-time Communication

- Update `.ag_registry.json` when starting to work on a specific set of files.
- Log significant architectural decisions in `.ag_brain.md` immediately.

## 3. Post-Session Sync

- Update `.ag_brain.md` with:
  - What was accomplished.
  - New state of the project.
  - Next steps for the next agent.
- Release locks in `.ag_registry.json`.

## 4. Conflict Resolution

- If two agents have conflicting instructions, **Antigravity** is the master orchestrator.
- User-defined rules in `MEMORY` blocks always take priority.

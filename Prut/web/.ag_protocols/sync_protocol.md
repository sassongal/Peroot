# 🔄 HIVE SYNCHRONIZATION PROTOCOL (HSP-1)

## 1. PRE-TASK (The "Look-Before-Leap")

- Read `.ag_brain.md` to identify the current `GLOBAL OBJECTIVE`.
- Run `hive status` to check if target files are locked by another Node.
- If a file is locked, **DO NOT TOUCH**. Wait for handover or ask user for override.

## 2. DURING TASK (The "Active Heartbeat")

- For major structural changes, update the `AG_BRAIN.md` halfway through to prevent logic-drift in case of Quota failure.
- If Quota limit warning appears: **STOP IMMEDIATELY**.

## 3. POST-TASK (The "Clean Handover")

- **Sync the Brain:** Update the `PROGRESS LOG` and `NEXT_NODE_GOAL`.
- **Release Locks:** Run `hive unlock <file>` for all files you touched.
- **Commit:** Use the format `[NODE-ID] brief description`.
- **Final Message:** Write the last instruction for the next agent clearly.

## 4. CONFLICT RESOLUTION

- If you find code written by another node that contradicts your goal:
  1. DO NOT delete it immediately.
  2. Document the conflict in the Brain.
  3. Ask the user (Gal) for a "Architectural Decision".
